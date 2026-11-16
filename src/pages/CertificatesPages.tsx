import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, Clock, FileBadge } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, useLookups, useMutate } from '@/app/hooks'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import { businessHoursBetween } from '@/domain/sla'
import type { Account, Certificate, CertMarks, Holder, Policy, Term } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, PageTitle, Panel, RecordHeader, Sheet, SheetCancel, type Column } from '@/components/patterns'
import { Button, cx } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { AccessDenied, NotFound } from './SystemPages'

const ABBR: Record<string, string> = { GL: 'GL', BOP: 'BOP', WC: 'WC', 'Commercial auto': 'Auto', 'Commercial umbrella': 'Umb' }
const flagsOf = (c: Certificate) => [c.additionalInsured && 'AI', c.waiver && 'WVD', c.primaryNonContrib && 'P&NC'].filter(Boolean) as string[]
const currentTerm = (terms: Term[], pid: string) => terms.filter((t) => t.policyId === pid).sort((a, b) => b.effectiveOffset - a.effectiveOffset).find((t) => t.status === 'Active' || t.status === 'Bound')
const fmtAt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—')

/** US-CRT-009: an issued certificate is due when a cited policy's successor term starts within ±30 days. */
export function dueForReissue(c: Certificate, policies: Policy[], terms: Term[]) {
  if ((c.status !== 'Issued' && c.status !== 'Re-issued') || c.noReissueReason) return false
  return c.policyIds.some((pid) => {
    const own = terms.filter((t) => t.policyId === pid).sort((a, b) => a.effectiveOffset - b.effectiveOffset)
    const succ = own.find((t, i) => i > 0 && (t.status === 'Bound' || t.status === 'Active') && Math.abs(t.effectiveOffset) <= 30)
    const repl = policies.find((p) => p.id === pid)?.replacedByPolicyId
    const replTerm = repl ? terms.find((t) => t.policyId === repl && Math.abs(t.effectiveOffset) <= 30) : undefined
    return !!succ || !!replTerm
  })
}

function Flags({ c }: { c: Certificate }) {
  const f = flagsOf(c)
  return f.length ? <span className="flex gap-1">{f.map((x) => <span key={x} className="rounded-sm bg-fill px-1.5 text-xs leading-5 font-medium text-label">{x}</span>)}</span> : <span className="text-muted">—</span>
}

/** US-CRT-008 */
export function CertificatesPage() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [reissue, setReissue] = useState<Certificate[] | null>(null)
  const view = params.get('view') === 'needs-review' ? 'Needs review' : 'All'
  const scoped = new Map(visibleAccounts(user, data.accounts).map((a) => [a.id, a]))
  const all = (data.certificates ?? []).filter((c) => scoped.has(c.accountId))
  const now = new Date()
  const ageH = (c: Certificate) => businessHoursBetween(new Date(c.submittedAt ?? c.history?.[0]?.at ?? new Date(Date.now() - 86_400_000).toISOString()), now)
  const fl = { status: params.get('status'), office: params.get('office'), am: params.get('am'), flag: params.get('flag') }
  const rows = all
    .filter((c) => (view === 'Needs review' ? c.status === 'Needs review' : true))
    .filter((c) => (!fl.status || c.status === fl.status) && (!fl.office || scoped.get(c.accountId)!.officeId === fl.office) && (!fl.am || scoped.get(c.accountId)!.accountManagerId === fl.am) && (!fl.flag || flagsOf(c).includes(fl.flag)))
    .sort((a, b) => (view === 'Needs review' ? ageH(b) - ageH(a) : b.createdOffset - a.createdOffset))
  const due = all.filter((c) => dueForReissue(c, data.policies, data.terms))
  const holder = (id: string) => data.holders?.find((h) => h.id === id)
  const setP = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }) }
  const cols: Column<Certificate>[] = [
    { key: 'id', label: 'ID', width: 120, render: (c) => <Link to={`/certificates/${c.id}${c.status === 'Needs review' && user.role === 'principal' ? '?mode=review' : ''}`} className="font-mono text-sm text-link hover:underline">{c.id}</Link>, csv: (c) => c.id },
    { key: 'holder', label: 'Holder', render: (c) => <span className="flex min-w-0 flex-col leading-tight"><span className="truncate font-medium text-strong">{holder(c.holderId)?.name}</span><span className="truncate text-sm text-muted">{account(c.accountId)?.name}</span></span>, csv: (c) => holder(c.holderId)?.name ?? '' },
    { key: 'policies', label: 'Policies', width: 150, render: (c) => c.policyIds.map((p) => ABBR[data.policies.find((x) => x.id === p)?.line ?? ''] ?? '').join(' · ') },
    { key: 'flags', label: 'Flags', width: 140, render: (c) => <Flags c={c} />, csv: (c) => flagsOf(c).join(' ') },
    { key: 'status', label: 'Status', width: 140, render: (c) => <StatusCell status={c.status} />, csv: (c) => c.status },
    { key: 'requested', label: 'Requested', width: 110, sort: (a, b) => a.createdOffset - b.createdOffset, render: (c) => dateOf(c.createdOffset) },
    {
      key: 'age',
      label: 'Age',
      width: 90,
      align: 'right',
      mobile: true,
      render: (c) => {
        if (c.status !== 'Needs review' && c.status !== 'Requested') return <span className="text-muted">—</span>
        const h = ageH(c)
        return <span className={cx('inline-flex items-center gap-1', h > 9 ? 'font-medium text-danger-text' : h > 4 ? 'font-medium text-warning-text' : '')}>{h > 4 && <Clock aria-hidden className="size-3.5" />}{h >= 9 ? `${Math.floor(h / 9)}d` : `${Math.round(h)}h`}</span>
      },
      csv: (c) => Math.round(ageH(c)),
    },
    { key: 'am', label: 'Account Manager', width: 150, render: (c) => userName(scoped.get(c.accountId)!.accountManagerId) },
  ]
  const nr = all.filter((c) => c.status === 'Needs review').length
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Certificates" description="Certificates start from a Certificate request in Service." />
      {due.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-surface px-4 py-2.5 text-base shadow-ring">
          <span className="flex-1">{due.length} certificate{due.length === 1 ? '' : 's'} cite policies that renew soon.</span>
          <Button size="sm" onClick={() => setReissue(due)}>Review re-issue</Button>
        </p>
      )}
      <nav aria-label="Saved views" className="mt-6 flex gap-1 border-b border-line">
        {(['All', 'Needs review'] as const).map((v) => (
          <button key={v} aria-current={v === view ? 'page' : undefined} onClick={() => setP('view', v === 'All' ? null : 'needs-review')} className={cx('-mb-px border-b-2 px-2.5 py-2 text-base', v === view ? 'border-strong font-medium text-strong' : 'border-transparent text-label hover:text-strong')}>
            {v} <span className="tabular ml-1 rounded-full bg-fill px-1.5 text-xs text-label">{v === 'All' ? all.length : nr}</span>
          </button>
        ))}
      </nav>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {([['status', 'Status', ['Requested', 'Needs review', 'Issued', 'Re-issued', 'Replaced']], ['flag', 'Flag', ['AI', 'WVD', 'P&NC']]] as [string, string, string[]][]).map(([k, l, o]) => (
          <select key={k} aria-label={l} value={params.get(k) ?? ''} onChange={(e) => setP(k, e.target.value || null)} className="h-8 rounded-md bg-surface px-2 text-sm shadow-control"><option value="">{l}</option>{o.map((x) => <option key={x}>{x}</option>)}</select>
        ))}
        {(user.role === 'principal' || user.role === 'admin') && (
          <select aria-label="Office" value={params.get('office') ?? ''} onChange={(e) => setP('office', e.target.value || null)} className="h-8 rounded-md bg-surface px-2 text-sm shadow-control"><option value="">Office</option>{data.offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        )}
        <select aria-label="Account Manager" value={params.get('am') ?? ''} onChange={(e) => setP('am', e.target.value || null)} className="h-8 rounded-md bg-surface px-2 text-sm shadow-control"><option value="">Account Manager</option>{data.users.filter((u) => u.role === 'account-manager').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      </div>
      <p className="tabular mt-3 mb-2 text-sm text-muted">Showing {rows.length} of {all.length} certificates · {nr} need review</p>
      <DataTable rows={rows} columns={cols} minWidth={1100} listId="certificates" exportName="certificates" onRowClick={(c) => navigate(`/certificates/${c.id}${c.status === 'Needs review' && user.role === 'principal' ? '?mode=review' : ''}`)} empty={<EmptyState icon={FileBadge} title="No certificates in this view" body="Certificates start from a Certificate request in Service." />} />
      {reissue && <ReissueDialog certs={reissue} onClose={() => setReissue(null)} />}
    </div>
  )
}

/** US-CRT-004 + 005 + 006 + 007 */
export function CertificatePage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, userName, carrierName } = useLookups()
  const mutate = useMutate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [preparing, setPreparing] = useState(false)
  const [reissuing, setReissuing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [reviewing, setReviewing] = useState(params.get('mode') === 'review')
  const c = data.certificates?.find((x) => x.id === id)
  if (!c) return <NotFound what="certificate" />
  const account = getAccount(c.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="certificate" owner={userName(account.accountManagerId)} />
  const holder = data.holders?.find((h) => h.id === c.holderId)
  const canPrepare = (user.role === 'account-manager' && user.officeId === account.officeId) || user.role === 'principal'
  // US-CRT-010: follow the replacement chain to the newest Certificate.
  let latest = c.id
  for (let i = 0; i < 20; i++) { const nx = data.certificates?.find((x) => x.id === latest)?.replacedById; if (!nx) break; latest = nx }
  const involved = [c.preparedById, c.submittedById, c.createdById].includes(user.id)
  const terms = c.policyIds.map((pid) => ({ p: data.policies.find((x) => x.id === pid)!, t: currentTerm(data.terms, pid) ?? data.terms.filter((t) => t.policyId === pid).sort((a, b) => b.effectiveOffset - a.effectiveOffset)[0] }))
  const pending = terms.find(({ t }) => t?.status === 'Canceled' || t?.pendingCancellation)
  const sr = c.serviceRequestId ? data.serviceRequests.find((r) => r.id === c.serviceRequestId) : undefined
  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/certificates', label: 'Certificates' }}
        icon={FileBadge}
        title={<><span className="font-mono">{c.id}</span> · {holder?.name}</>}
        status={<StatusCell status={c.status} />}
        meta={
          <>
            <Link to={`/accounts/${account.id}?tab=service&sub=certificates`} className="text-link hover:underline">{account.name}</Link>
            {sr && <Link to={`/service/${sr.id}`} className="text-link hover:underline">From {sr.id}</Link>}
            {c.reissueOfId && <Link to={`/certificates/${c.reissueOfId}`} className="text-link hover:underline">Re-issue of {c.reissueOfId}</Link>}
            {c.replacedById && <Link to={`/certificates/${c.replacedById}`} className="text-link hover:underline">Replaced by {c.replacedById}</Link>}
            {c.status === 'Needs review' && involved && <span className="text-label">Waiting for Principal review since {fmtAt(c.submittedAt)}</span>}
          </>
        }
        actions={
          <span className="flex flex-wrap gap-2">
            <Button onClick={() => setPreview(true)}>Preview</Button>
            {c.status === 'Requested' && <Gate allowed={canPrepare} reason="Only Account Managers in this Office and Principals prepare certificates."><Button variant="primary" onClick={() => setPreparing(true)}>Prepare certificate</Button></Gate>}
            {c.status === 'Needs review' && user.role === 'principal' && !involved && <Button variant="primary" onClick={() => setReviewing(true)}>Review</Button>}
            {c.status === 'Needs review' && c.submittedById === user.id && <Button onClick={() => mutate((s) => s.reviewCertificate(c.id, 'withdraw', null, user.id), 'Withdrawn from review')}>Withdraw</Button>}
            {c.status === 'Replaced' && latest !== c.id && <Link to={`/certificates/${latest}`} className="inline-flex h-9 items-center text-base text-link underline">Latest: {latest}</Link>}
            {(c.status === 'Issued' || c.status === 'Re-issued') && (
              <>
                {canPrepare && <Button onClick={() => setReissuing(true)}>Re-issue</Button>}
                <Button onClick={() => mutate((s) => s.resendCertificate(c.id, user.id), 'Certificate resent')}>Resend</Button>
                <Button onClick={() => toast('PDF download is simulated in this demo', 'info')}>Download PDF</Button>
              </>
            )}
          </span>
        }
      />
      {pending && <p className="border-b border-line bg-warning-tint px-8 py-2.5 text-base text-ink max-sm:px-4">Policy {pending.p.policyNumber} is {pending.t?.status === 'Canceled' ? 'canceled' : 'pending cancellation'}. Do not re-issue until it is resolved.</p>}
      {c.returnNote && c.status === 'Requested' && <p className="border-b border-line bg-recessed px-8 py-2.5 text-base text-ink max-sm:px-4">Returned: {c.returnNote}</p>}
      <div className="grid grid-cols-[1fr_380px] gap-4 px-8 pt-5 max-lg:grid-cols-1 max-sm:px-4">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Coverage">
            <div className="overflow-x-auto">
              <table className="tabular w-full min-w-[640px] border-collapse text-left">
                <thead><tr className="h-9 border-b border-fill text-sm font-semibold text-strong"><th className="px-2">Line</th><th className="px-2">Carrier</th><th className="px-2">Policy</th><th className="px-2">Term</th><th className="px-2">Status</th><th className="px-2">Marks</th></tr></thead>
                <tbody>
                  {terms.map(({ p, t }) => {
                    const m = c.marks?.[p.id]
                    return (
                      <tr key={p.id} className="h-10 border-b border-fill last:border-0">
                        <td className="px-2">{p.line}</td>
                        <td className="px-2">{carrierName(p.carrierId)}</td>
                        <td className="px-2 font-mono text-sm"><Link to={`/policies/${p.id}`} className="text-link hover:underline">{p.policyNumber}</Link></td>
                        <td className="px-2">{t ? `${dateOf(t.effectiveOffset)} – ${dateOf(t.expirationOffset)}` : '—'}</td>
                        <td className="px-2"><StatusCell status={t?.status} /></td>
                        <td className="px-2 text-sm">{m ? [m.ai && 'AI', m.wvd && 'WVD', m.pnc && 'P&NC'].filter(Boolean).join(' · ') || '—' : <Flags c={c} />}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-muted">Term data is synced from the AMS and read-only here.</p>
          </Panel>
          <Panel title="Description of operations"><p className="text-base text-ink">{c.operations || '—'}</p></Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel title="Holder">
            <p className="text-base font-medium text-strong">{holder?.name}</p>
            <p className="text-sm text-label">{holder?.address}, {holder?.city}, {holder?.state} {holder?.zip}</p>
            <p className="text-sm text-label">{holder?.email || 'No email'} · {holder?.type ?? 'Holder-only'}</p>
          </Panel>
          <Panel title="History">
            <ol className="flex flex-col gap-2 text-base">
              {[...(c.history ?? [])].reverse().map((h, i) => (
                <li key={i} className="flex justify-between gap-3"><span>{h.text}</span><span className="shrink-0 text-sm text-muted">{fmtAt(h.at)}</span></li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
      {preparing && <IssueSheet cert={c} account={account} onClose={() => setPreparing(false)} />}
      {reissuing && <IssueSheet reissue cert={c} account={account} onClose={() => setReissuing(false)} />}
      {preview && <AcordPreview cert={c} onClose={() => setPreview(false)} />}
      {reviewing && c.status === 'Needs review' && <ReviewSheet cert={c} onClose={() => setReviewing(false)} />}
    </div>
  )
}

const MARKABLE: Record<keyof CertMarks, string[]> = { ai: ['GL', 'BOP', 'Commercial auto', 'Commercial umbrella'], wvd: ['GL', 'WC', 'Commercial auto', 'BOP'], pnc: ['GL', 'BOP', 'Commercial umbrella'] }

/** US-CRT-005: prefilled from the request; marks per term; unmarked issues now, marked goes to review. */
function IssueSheet({ cert, account, onClose, reissue }: { cert: Certificate; account: Account; onClose: () => void; reissue?: boolean }) {
  const { data, user } = useApp()
  const { carrierName } = useLookups()
  const mutate = useMutate()
  const holder = data.holders?.find((h) => h.id === cert.holderId)
  const live = data.policies.filter((p) => p.accountId === account.id && currentTerm(data.terms, p.id))
  const [marks, setMarks] = useState<Record<string, CertMarks>>(() => Object.fromEntries(live.filter((p) => cert.policyIds.includes(p.id)).map((p) => [p.id, cert.marks?.[p.id] ?? { ai: cert.additionalInsured && MARKABLE.ai.includes(p.line), wvd: cert.waiver && MARKABLE.wvd.includes(p.line), pnc: cert.primaryNonContrib && MARKABLE.pnc.includes(p.line) }])))
  const [delivery, setDelivery] = useState(holder?.email || '')
  const [ack, setAck] = useState(false)
  const anyMark = Object.values(marks).some((m) => m.ai || m.wvd || m.pnc)
  const had = (k: keyof CertMarks) => Object.values(cert.marks ?? {}).some((m) => m[k]) || (k === 'ai' ? cert.additionalInsured : k === 'wvd' ? cert.waiver : cert.primaryNonContrib)
  const addedFlags = (['ai', 'wvd', 'pnc'] as const).some((k) => Object.values(marks).some((m) => m[k]) && !had(k))
  const toast = useToast()
  const navigate = useNavigate()
  const pending = live.filter((p) => marks[p.id] && currentTerm(data.terms, p.id)?.pendingCancellation)
  const toggle = (pid: string, k: keyof CertMarks) => setMarks({ ...marks, [pid]: { ...marks[pid], [k]: !marks[pid][k] } })
  const submit = async () => {
    if (pending.length && !ack) throw new Error('Confirm the pending cancellation warning.')
    if (reissue) {
      const r = await mutate((s) => s.reissueCertificate(cert.id, { marks, delivery, policyIds: Object.keys(marks).filter((k) => marks[k]) }, user.id))
      toast(r.review ? `${r.id} sent for Principal review` : `Re-issued as ${r.id}`, 'success')
      onClose()
      navigate(`/certificates/${r.id}`)
      return
    }
    await mutate((s) => s.prepareCertificate(cert.id, { marks, delivery, requireAi: holder?.type === 'Additional insured', policyIds: Object.keys(marks) }, user.id), anyMark ? 'Submitted for Principal review' : 'Certificate issued')
    onClose()
  }
  const [err, setErr] = useState<string | null>(null)
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title={reissue ? `Re-issue ${cert.id}` : `Prepare ${cert.id}`} description={holder?.name} footer={<><SheetCancel /><Button variant="primary" onClick={() => submit().catch((e) => setErr((e as Error).message))}>{reissue ? (addedFlags ? 'Submit for review' : 'Re-issue') : anyMark ? 'Submit for review' : 'Issue certificate'}</Button></>}>
      <div className="flex flex-col gap-4">
        {reissue && holder?.addressChangedOffset != null && cert.issuedOffset != null && holder.addressChangedOffset >= cert.issuedOffset && <p className="rounded-md bg-recessed px-3 py-2 text-base">Holder address changed on {dateOf(holder.addressChangedOffset)}. The re-issue uses the new address.</p>}
        {reissue && addedFlags && <p className="text-sm text-label">You added a flag the original didn’t have, so this goes to Principal review.</p>}
        {err && <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-base text-ink shadow-ring">{err}</p>}
        <section>
          <h3 className="mb-2 text-base font-semibold text-strong">Policies</h3>
          <ul className="flex flex-col gap-2">
            {live.map((p) => {
              const t = currentTerm(data.terms, p.id)!
              const on = !!marks[p.id]
              return (
                <li key={p.id} className="rounded-md p-2.5 shadow-ring">
                  <label className="flex items-center gap-2 text-base">
                    <input type="checkbox" checked={on} onChange={(e) => { const n = { ...marks }; if (e.target.checked) n[p.id] = { ai: false, wvd: false, pnc: false }; else delete n[p.id]; setMarks(n) }} className="size-4 accent-primary" />
                    <span className="font-medium">{p.line}</span> · {carrierName(p.carrierId)} · <span className="font-mono text-sm">{p.policyNumber}</span>
                  </label>
                  <p className="ml-6 text-sm text-muted">{dateOf(t.effectiveOffset)} – {dateOf(t.expirationOffset)}</p>
                  {on && (
                    <span className="ml-6 mt-1 flex flex-wrap gap-x-4">
                      {(['ai', 'wvd', 'pnc'] as const).filter((k) => MARKABLE[k].includes(p.line)).map((k) => (
                        <label key={k} className="inline-flex min-h-6 items-center gap-1.5 text-sm"><input type="checkbox" checked={marks[p.id][k]} onChange={() => toggle(p.id, k)} className="size-4 accent-primary" /> {k === 'ai' ? 'ADDL INSD' : k === 'wvd' ? 'SUBR WVD' : 'P&NC'}</label>
                      ))}
                    </span>
                  )}
                  {on && t.pendingCancellation && <p className="ml-6 mt-1 text-sm font-medium text-warning-text">Pending cancellation. The holder may receive no notice if it cancels.</p>}
                </li>
              )
            })}
          </ul>
        </section>
        {pending.length > 0 && <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="size-4 accent-primary" /> I understand</label>}
        <Field label="Delivery" hint="Mock email; nothing is sent."><input className={inputCls} value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
        {anyMark && <p className="rounded-md bg-warning-tint px-3 py-2 text-sm text-ink shadow-ring">Marks need a Principal’s review before the certificate is issued{user.role === 'principal' ? '. You can’t approve your own.' : '.'}</p>}
        <div aria-hidden className="origin-top-left scale-[0.42] [width:238%]"><AcordBody cert={{ ...cert, marks, additionalInsured: Object.values(marks).some((m) => m.ai), waiver: Object.values(marks).some((m) => m.wvd), primaryNonContrib: Object.values(marks).some((m) => m.pnc), policyIds: Object.keys(marks) }} /></div>
      </div>
    </Sheet>
  )
}

/** US-CRT-007: reasons with endorsement hints; four-eyes rule; Return needs a note. */
function ReviewSheet({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  const mutate = useMutate()
  const [returning, setReturning] = useState(false)
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const involved = [cert.preparedById, cert.submittedById, cert.createdById].includes(user.id)
  const reasons = cert.policyIds.flatMap((pid) => {
    const p = data.policies.find((x) => x.id === pid)!
    const m = cert.marks?.[pid] ?? { ai: cert.additionalInsured, wvd: cert.waiver, pnc: cert.primaryNonContrib }
    // Mock endorsement on file: stable per policy.
    const onFile = Number(pid.replace(/\D/g, '')) % 3 !== 0
    return [m.ai && `ADDL INSD on ${p.policyNumber}`, m.wvd && `SUBR WVD on ${p.policyNumber}`, m.pnc && `P&NC on ${p.policyNumber}`].filter(Boolean).map((r) => ({ r: r as string, onFile }))
  })
  const missing = reasons.filter((x) => !x.onFile).length
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Review ${cert.id}`}
      description={`Submitted by ${userName(cert.submittedById)}${cert.createdById !== cert.submittedById ? ` · requested by ${userName(cert.createdById)}` : ''}`}
      footer={
        <>
          <SheetCancel>Close</SheetCancel>
          <Gate allowed={!involved} reason="You prepared this certificate. Another Principal must review it.">
            <span className="flex gap-2">
              <Button onClick={() => setReturning(true)}>Return</Button>
              <Button variant="primary" onClick={() => (missing ? setConfirm(true) : mutate((s) => s.reviewCertificate(cert.id, 'approve', null, user.id), 'Approved and issued').then(onClose))}>Approve and issue</Button>
            </span>
          </Gate>
        </>
      }
    >
      {!reasons.length && <p className="text-base text-muted">No AI, waiver, or P&NC marks on this certificate.</p>}
      <ul className="flex flex-col gap-2">
        {reasons.map((x) => (
          <li key={x.r} className="rounded-md px-3 py-2 shadow-ring">
            <p className="text-base font-medium text-strong">{x.r}</p>
            <p className={cx('text-sm', x.onFile ? 'text-label' : 'font-medium text-warning-text')}>{x.onFile ? 'Blanket endorsement on file' : 'No endorsement on file'}</p>
          </li>
        ))}
      </ul>
      {returning && (
        <div className="mt-4 flex flex-col gap-2">
          <Field label="Note for the preparer (at least 10 characters)"><textarea className={cx(inputCls, 'h-20 py-2')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="WC policy has no blanket waiver. Ask the carrier for an endorsement first." /></Field>
          <Button onClick={() => mutate((s) => s.reviewCertificate(cert.id, 'return', note, user.id), 'Returned to preparer').then(onClose)}>Return with note</Button>
        </div>
      )}
      <Confirm open={confirm} onOpenChange={setConfirm} title="Approve and issue?" body={`${missing} flag${missing === 1 ? ' has' : 's have'} no endorsement on file. Approve anyway?`} confirmLabel="Approve anyway" onConfirm={() => mutate((s) => s.reviewCertificate(cert.id, 'approve', null, user.id), 'Approved and issued').then(onClose)} />
    </Sheet>
  )
}

/** US-CRT-006: sample layout modeled on ACORD 25 (not a real form). */
function AcordPreview({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title={`Preview ${cert.id}`} footer={<SheetCancel>Close</SheetCancel>}>
      <AcordBody cert={cert} />
    </Sheet>
  )
}
function AcordBody({ cert }: { cert: Certificate }) {
  const { data } = useApp()
  const { userName, carrierName } = useLookups()
  const a = data.accounts.find((x) => x.id === cert.accountId)!
  const office = data.offices.find((o) => o.id === a.officeId)!
  const holder = data.holders?.find((h) => h.id === cert.holderId)
  const pols = cert.policyIds.map((pid) => data.policies.find((p) => p.id === pid)!).filter(Boolean)
  const insurers = [...new Set(pols.map((p) => p.carrierId))]
  const letter = (cid: string) => String.fromCharCode(65 + insurers.indexOf(cid))
  const issued = cert.status === 'Issued' || cert.status === 'Re-issued'
  const rows: [string, string[]][] = [['Commercial general liability', ['GL', 'BOP']], ['Automobile liability', ['Commercial auto']], ['Umbrella / excess', ['Commercial umbrella']], ["Workers compensation and employers' liability", ['WC']]]
  const box = 'border border-strong/40 p-2'
  return (
    <div className="relative bg-white p-4 font-sans text-xs text-strong">
      {!issued && <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-3xl font-semibold tracking-widest text-danger/25 [transform:rotate(-24deg)]">DRAFT · NOT ISSUED</span>}
      <p className="text-center text-sm font-semibold">CERTIFICATE OF LIABILITY INSURANCE</p>
      <div className="mt-2 grid grid-cols-2">
        <div className={box}><p className="font-semibold">DATE</p><p>{issued && cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-US') : '—'}</p></div>
        <div className={box}><p className="font-semibold">PRODUCER</p><p>Fortify Insurance · {office.name} office</p><p>{office.city}, {office.state} · (555) 010-0100</p></div>
        <div className={box}><p className="font-semibold">INSURED</p><p>{a.details?.legalName ?? a.name}</p><p>{a.details?.street}, {a.city}, {a.state} {a.zip}</p></div>
        <div className={box}><p className="font-semibold">INSURERS</p>{insurers.map((c) => <p key={c}>INSURER {letter(c)}: {carrierName(c)}</p>)}</div>
      </div>
      <table className="mt-2 w-full border-collapse">
        <thead><tr><th className={cx(box, 'text-left')}>Type</th><th className={box}>INSR</th><th className={box}>ADDL INSD</th><th className={box}>SUBR WVD</th><th className={box}>Policy number</th><th className={box}>Eff / Exp</th></tr></thead>
        <tbody>
          {rows.map(([label, lines]) => {
            const p = pols.find((x) => lines.includes(x.line))
            const t = p ? currentTerm(data.terms, p.id) : undefined
            const m = p ? cert.marks?.[p.id] : undefined
            return (
              <tr key={label}>
                <td className={box}>{label}</td>
                <td className={cx(box, 'text-center')}>{p ? letter(p.carrierId) : ''}</td>
                <td className={cx(box, 'text-center')}>{m?.ai ? 'Y' : ''}</td>
                <td className={cx(box, 'text-center')}>{m?.wvd ? 'Y' : ''}</td>
                <td className={box}>{p?.policyNumber ?? ''}</td>
                <td className={box}>{t ? `${dateOf(t.effectiveOffset)} – ${dateOf(t.expirationOffset)}` : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className={cx(box, 'mt-2')}>
        <p className="font-semibold">DESCRIPTION OF OPERATIONS</p>
        <p>{cert.operations}</p>
        {pols.filter((p) => cert.marks?.[p.id]?.pnc).map((p) => <p key={p.id}>Coverage under policy {p.policyNumber} is primary and noncontributory where required by written contract.</p>)}
      </div>
      <div className="mt-2 grid grid-cols-2">
        <div className={box}><p className="font-semibold">CERTIFICATE HOLDER</p><p>{holder?.name}</p><p>{holder?.address}, {holder?.city}, {holder?.state} {holder?.zip}</p></div>
        <div className={box}><p className="font-semibold">AUTHORIZED REPRESENTATIVE</p><p>{issued ? userName(cert.issuedById) : ''}</p></div>
      </div>
      <p className="mt-3 border-t border-fill pt-2 text-center text-label">Sample layout modeled on ACORD 25. Not a certificate of insurance. · Sample data</p>
    </div>
  )
}

/** US-CRT-009 */
export function ReissueDialog({ certs, onClose }: { certs: Certificate[]; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const [picked, setPicked] = useState<Record<string, boolean>>(Object.fromEntries(certs.map((c) => [c.id, true])))
  const [skip, setSkip] = useState<Record<string, string>>({})
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title="Re-issue certificates"
      body="Unflagged certificates re-issue now; certificates with AI, waiver, or P&NC go to Principal review."
      confirmLabel="Re-issue selected"
      onConfirm={async () => {
        for (const [id, r] of Object.entries(skip)) if (!picked[id] && r) await mutate((s) => s.skipReissue(id, r, user.id))
        const ids = Object.entries(picked).filter(([, v]) => v).map(([k]) => k)
        if (!ids.length) return onClose()
        const r = await mutate((s) => s.reissueCertificates(ids, user.id))
        toast(`${r.reissued} re-issued · ${r.review} sent for Principal review`, 'success')
        onClose()
      }}
    >
      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {certs.map((c) => {
          const h = data.holders?.find((x) => x.id === c.holderId)
          return (
            <li key={c.id} className="rounded-md p-2 shadow-ring">
              <label className="flex items-center gap-2 text-base">
                <input type="checkbox" checked={picked[c.id]} onChange={(e) => setPicked({ ...picked, [c.id]: e.target.checked })} className="size-4 accent-primary" />
                <span className="font-mono text-sm">{c.id}</span> · {h?.name} <Flags c={c} />
              </label>
              {!picked[c.id] && (
                <select aria-label="Reason" value={skip[c.id] ?? ''} onChange={(e) => setSkip({ ...skip, [c.id]: e.target.value })} className="mt-1 ml-6 h-8 rounded-md bg-surface px-2 text-sm shadow-control">
                  <option value="">Don’t re-issue because…</option>
                  <option>Project ended</option>
                  <option>Holder no longer needs it</option>
                  <option>Other</option>
                </select>
              )}
            </li>
          )
        })}
      </ul>
    </Confirm>
  )
}

/** US-CRT-002 */
export function HolderDrawer({ accountId, holder, onClose, onSaved }: { accountId: string; holder?: Holder; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [h, setH] = useState<Omit<Holder, 'id'>>(holder ?? { accountId, name: '', address: '', city: '', state: 'TX', zip: '', email: '', type: 'Holder-only', project: '', status: 'Active' })
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof Holder, v: string) => setH({ ...h, [k]: v })
  const dup = (data.holders ?? []).find((x) => x.id !== holder?.id && x.accountId === accountId && x.status !== 'Inactive' && x.name.trim().toLowerCase() === h.name.trim().toLowerCase() && x.zip === h.zip && h.name)
  const issued = holder ? (data.certificates ?? []).filter((c) => c.holderId === holder.id && (c.status === 'Issued' || c.status === 'Re-issued')).length : 0
  const changedAddr = holder && (holder.name !== h.name || holder.address !== h.address)
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={holder ? `Edit ${holder.name}` : 'Add holder'}
      footer={
        <>
          {holder && <Button className="mr-auto" onClick={() => mutate((s) => s.setHolderStatus(holder.id, holder.status === 'Inactive' ? 'Active' : 'Inactive', user.id), holder.status === 'Inactive' ? 'Holder reactivated' : 'Holder deactivated').then(onClose)}>{holder.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}</Button>}
          <SheetCancel />
          <Button variant="primary" onClick={() => mutate((s) => s.saveHolder(holder?.id ?? null, h, user.id), holder ? 'Holder saved' : `Holder added: ${h.name}`).then((id) => { onSaved?.(id); onClose() }).catch((e) => setErr((e as Error).message))}>Save holder</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {err && <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-base text-ink shadow-ring">{err}</p>}
        <Field label="Name"><input className={inputCls} value={h.name} onChange={(e) => set('name', e.target.value)} /></Field>
        {dup && <p className="flex items-center gap-2 rounded-md bg-warning-tint px-3 py-2 text-sm text-ink shadow-ring"><AlertTriangle aria-hidden className="size-4 text-warning-text" /> A holder with this name and ZIP already exists. <button onClick={() => { onSaved?.(dup.id); onClose() }} className="text-link underline">Use existing</button></p>}
        <Field label="Address line 1"><input className={inputCls} value={h.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <div className="grid grid-cols-[1fr_72px_110px] gap-3">
          <Field label="City"><input className={inputCls} value={h.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><input className={inputCls} value={h.state} onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))} /></Field>
          <Field label="ZIP"><input className={inputCls} value={h.zip} onChange={(e) => set('zip', e.target.value.replace(/[^\d-]/g, '').slice(0, 10))} /></Field>
        </div>
        <Field label="Email"><input className={inputCls} value={h.email} onChange={(e) => set('email', e.target.value.trim())} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><select className={inputCls} value={h.type} onChange={(e) => set('type', e.target.value)}><option>Holder-only</option><option>Additional insured</option></select></Field>
          <Field label="Project (optional)"><input className={inputCls} value={h.project ?? ''} onChange={(e) => set('project', e.target.value)} /></Field>
        </div>
        {changedAddr && issued > 0 && <p className="text-sm text-label">{issued} issued certificate{issued === 1 ? ' shows' : 's show'} the old address. Re-issue them from the Certificates sub-tab.</p>}
      </div>
    </Sheet>
  )
}

/** US-CRT-001 Holders and US-CRT-003 Certificates sub-tabs on a Business Account. */
export function AccountCertificates({ account, sub }: { account: Account; sub: 'certificates' | 'holders' }) {
  const { data, user } = useApp()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [holderSheet, setHolderSheet] = useState<Holder | 'new' | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [reissue, setReissue] = useState<Certificate[] | null>(null)
  const canManage = (user.role === 'account-manager' && user.officeId === account.officeId) || user.role === 'principal'
  const holders = (data.holders ?? []).filter((h) => h.accountId === account.id)
  const certs = (data.certificates ?? []).filter((c) => c.accountId === account.id)
  const issuedFor = (hid: string) => certs.filter((c) => c.holderId === hid && (c.status === 'Issued' || c.status === 'Re-issued'))
  if (sub === 'holders') {
    const visible = holders.filter((h) => showInactive || h.status !== 'Inactive')
    const lastIssued = (hid: string) => Math.max(-99999, ...issuedFor(hid).map((c) => c.issuedOffset ?? -99999))
    return (
      <Panel title="Holders" actions={<Gate allowed={canManage} reason="Only Account Managers and Principals can manage Holders."><Button size="sm" onClick={() => setHolderSheet('new')}>+ Add holder</Button></Gate>}>
        <div className="mb-2 flex items-center gap-3 text-sm text-label">
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-4 accent-primary" /> Show inactive</label>
          <span>Showing {holders.filter((h) => h.status !== 'Inactive').length} active holders{showInactive ? '' : ` · ${holders.filter((h) => h.status === 'Inactive').length} inactive hidden`}</span>
        </div>
        <ul className="divide-y divide-fill">
          {[...visible].sort((a, b) => lastIssued(b.id) - lastIssued(a.id)).map((h) => {
            const issued = issuedFor(h.id)
            return (
              <li key={h.id} className="grid grid-cols-[1fr_140px_120px_100px_110px_80px_auto] items-center gap-3 py-2 text-base max-lg:grid-cols-[1fr_auto]">
                <span className="min-w-0"><span className="block truncate font-medium text-strong">{h.name}</span><span className="block truncate text-sm text-muted">{h.city}, {h.state}</span></span>
                <span className="text-sm max-lg:hidden">{h.type ?? 'Holder-only'}</span>
                <span className="truncate text-sm text-label max-lg:hidden">{h.project ?? '—'}</span>
                <button onClick={() => setParams({ tab: 'service', sub: 'certificates', holder: h.id }, { replace: true })} className="text-left text-sm text-link hover:underline max-lg:hidden">Issued {issued.length}</button>
                <span className="tabular text-sm text-label max-lg:hidden">{issued.length ? dateOf(Math.max(...issued.map((c) => c.issuedOffset ?? -9999))) : '—'}</span>
                <span className="max-lg:hidden"><StatusCell status={h.status === 'Inactive' ? 'Inactive' : 'Active'} /></span>
                <Gate allowed={canManage} reason="Only Account Managers and Principals can manage Holders."><Button size="sm" onClick={() => setHolderSheet(h)}>Edit</Button></Gate>
              </li>
            )
          })}
        </ul>
        {!visible.length && <p className="text-base text-muted">No holders yet.</p>}
        {holderSheet && <HolderDrawer accountId={account.id} holder={holderSheet === 'new' ? undefined : holderSheet} onClose={() => setHolderSheet(null)} />}
      </Panel>
    )
  }
  const holderFilter = params.get('holder')
  const due = certs.filter((c) => dueForReissue(c, data.policies, data.terms))
  const rows = certs.filter((c) => !holderFilter || c.holderId === holderFilter).sort((a, b) => b.createdOffset - a.createdOffset)
  return (
    <Panel title="Certificates">
      <p className="mb-3 text-sm text-label">Certificates start from a Certificate request. <Link to={`/service?new=certificate&account=${account.id}`} className="text-link underline">New service request</Link></p>
      {due.length > 0 && <p className="mb-3 flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-base shadow-ring"><span className="flex-1">{due.length} certificate{due.length === 1 ? '' : 's'} cite policies that renew soon.</span><Button size="sm" onClick={() => setReissue(due)}>Review re-issue</Button></p>}
      {holderFilter && <button onClick={() => { const n = new URLSearchParams(params); n.delete('holder'); setParams(n, { replace: true }) }} className="mb-2 h-7 rounded-md bg-surface px-2.5 text-sm shadow-ring">Holder: {holders.find((h) => h.id === holderFilter)?.name} ×</button>}
      <ul className="divide-y divide-fill">
        {rows.map((c) => {
          const expiring = (c.status === 'Issued' || c.status === 'Re-issued') && c.policyIds.map((pid) => currentTerm(data.terms, pid)).find((t) => t && t.expirationOffset <= 30)
          return (
            <li key={c.id}>
              <button onClick={() => navigate(`/certificates/${c.id}`)} className="grid w-full grid-cols-[110px_1fr_150px_120px_130px_100px] items-center gap-3 py-2 text-left text-base hover:bg-recessed max-lg:grid-cols-[1fr_auto]">
                <span className="font-mono text-sm text-link max-lg:hidden">{c.id}</span>
                <span className="truncate">{holders.find((h) => h.id === c.holderId)?.name}</span>
                <span className="text-sm max-lg:hidden">{c.policyIds.map((p) => ABBR[data.policies.find((x) => x.id === p)?.line ?? ''] ?? '').join(' · ')}{expiring && <span className="block text-sm text-muted">Term expires {dateOf(expiring.expirationOffset)}</span>}</span>
                <span className="max-lg:hidden"><Flags c={c} /></span>
                <StatusCell status={c.status} />
                <span className="tabular text-sm text-label max-lg:hidden">{c.issuedOffset != null ? dateOf(c.issuedOffset) : '—'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {!rows.length && <p className="text-base text-muted">No certificates yet.</p>}
      {reissue && <ReissueDialog certs={reissue} onClose={() => setReissue(null)} />}
    </Panel>
  )
}

