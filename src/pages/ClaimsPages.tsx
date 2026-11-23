import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { AlertTriangle, MoreHorizontal, Pencil, Plus, ShieldAlert } from 'lucide-react'
import { followUps } from '@/domain/claimFollowUp'
import { useApp } from '@/app/store'
import { dateOf, offsetOfDate, usd, useLookups, useMutate } from '@/app/hooks'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import type { Claim, ClaimStatus } from '@/domain/types'
import { Confirm, DataTable, Field, inputCls, KeyValue, PageTitle, Panel, RecordHeader, PrimaryCell, ViewTabs, useView, AttentionCallout, type Column, type FilterDef } from '@/components/patterns'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { Button, cx, Due, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { ServiceRequestSheet } from './ServiceRequestSheet'
import { AccessDenied, NotFound } from './SystemPages'

const FORM: Record<Claim['lossType'], string> = { Property: 'ACORD 1', Auto: 'ACORD 2', Liability: 'ACORD 3', "Workers' compensation": 'ACORD 4' }
const STEPS: ClaimStatus[] = ['Reported', 'Submitted to carrier', 'Claim # assigned', 'Open', 'Closed']
const VIEWS = ['Open', 'All', 'Closed']
const statusText = (c: Claim) => (c.status === 'Closed' && c.outcome ? `Closed · ${c.outcome}` : c.status)
const daysOpen = (c: Claim) => (c.closedOffset != null ? c.closedOffset - c.createdOffset : -c.createdOffset)

/** US-CLM-001 */
export function ClaimsPage() {
  const { data, user } = useApp()
  const { account, carrierName } = useLookups()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const view = useView(VIEWS)
  const [reporting, setReporting] = useState(false)
  const scoped = new Map(visibleAccounts(user, data.accounts).map((a) => [a.id, a]))
  const all = (data.claims ?? []).filter((c) => scoped.has(c.accountId))
  const inView: Record<string, (c: Claim) => boolean> = { Open: (c) => c.status !== 'Closed', All: () => true, Closed: (c) => c.status === 'Closed' }
  const fl = { status: params.get('status'), loss: params.get('loss'), carrier: params.get('carrier'), office: params.get('office') }
  const pol = (c: Claim) => data.policies.find((p) => p.id === c.policyId)
  const rows = all.filter(inView[view]).filter((c) => (!fl.status || c.status === fl.status) && (!fl.loss || c.lossType === fl.loss) && (!fl.carrier || pol(c)?.carrierId === fl.carrier) && (!fl.office || scoped.get(c.accountId)!.officeId === fl.office)).sort((a, b) => b.lossOffset - a.lossOffset)
  const filters: FilterDef[] = [
    { k: 'status', label: 'Status', opts: STEPS.map((x) => [x, x]) },
    { k: 'loss', label: 'Loss type', opts: Object.keys(FORM).map((x) => [x, x]) },
    { k: 'carrier', label: 'Carrier', opts: data.carriers.map((c): [string, string] => [c.id, c.name]) },
    ...(user.role === 'principal' || user.role === 'admin' ? [{ k: 'office', label: 'Office', opts: data.offices.map((o): [string, string] => [o.id, o.name]) }] : []),
  ]
  const cols: Column<Claim>[] = [
    { key: 'id', label: 'Claim', render: (c) => <PrimaryCell mono={c.id} name={account(c.accountId)?.name ?? '—'} to={`/claims/${c.id}`} token={c.lossType} />, csv: (c) => c.id },
    { key: 'loss', label: 'Loss type', width: 170, render: (c) => <span>{c.lossType} <span className="text-sm text-muted">{FORM[c.lossType]}</span></span>, csv: (c) => c.lossType },
    { key: 'date', label: 'Date of loss', width: 110, sort: (a, b) => a.lossOffset - b.lossOffset, render: (c) => dateOf(c.lossOffset) },
    { key: 'policy', label: 'Policy', width: 220, render: (c) => <span className="flex min-w-0 flex-col leading-tight"><span className="truncate font-mono text-sm">{pol(c)?.policyNumber ?? '—'}</span><span className="truncate text-sm text-muted">{pol(c) ? carrierName(pol(c)!.carrierId) : ''}</span></span>, csv: (c) => pol(c)?.policyNumber ?? '' },
    { key: 'num', label: 'Carrier claim #', width: 150, render: (c) => c.carrierClaimNumber ? <span className="font-mono text-sm">{c.carrierClaimNumber}</span> : <span className="text-muted">—</span>, csv: (c) => c.carrierClaimNumber ?? '' },
    { key: 'adj', label: 'Adjuster', width: 140, render: (c) => c.adjuster?.name ?? <span className="text-muted">—</span>, csv: (c) => c.adjuster?.name ?? '' },
    { key: 'status', label: 'Status', width: 170, render: (c) => <StatusCell status={c.status} reason={c.status === 'Closed' && c.outcome ? c.outcome : undefined} />, csv: statusText },
    { key: 'days', label: 'Days open', width: 90, align: 'right', mobile: true, sort: (a, b) => daysOpen(a) - daysOpen(b), render: (c) => { const fu = followUps(c, data, new Date()); return fu.length ? <Tip label={fu[0].text}><span tabIndex={0}><Due tone="overdue">{daysOpen(c)}</Due></span></Tip> : daysOpen(c) } },
    { key: 'office', label: 'Office', width: 100, render: (c) => data.offices.find((o) => o.id === scoped.get(c.accountId)!.officeId)?.name ?? '' },
  ]
  const open = rows.filter((c) => c.status !== 'Closed')
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Claims" description="Claims your agency reported. The carrier’s adjuster handles each claim; Fortify tracks it." />
      <div className="mt-4"><ClaimFollowUps claims={all} /></div>
      <ViewTabs views={VIEWS} counts={Object.fromEntries(VIEWS.map((v) => [v, all.filter(inView[v]).length]))} />
      <DataTable
        className="mt-4"
        filters={filters}
        search={{ label: 'Search claims', placeholder: 'Search claim, Account, or carrier', match: (c, q) => [c.id, c.carrierClaimNumber, account(c.accountId)?.name, pol(c) && carrierName(pol(c)!.carrierId)].some((x) => x?.toLowerCase().includes(q)) }}
        actions={user.role !== 'admin' && <Button variant="primary" onClick={() => setReporting(true)}><Plus aria-hidden className="size-4" strokeWidth={1.75} /> Report a claim</Button>}
        meta={<>Showing {rows.length} claims · {open.filter((c) => !c.carrierClaimNumber).length} open without a carrier claim #</>}
        rows={rows}
        columns={cols}
        minWidth={1300}
        pageSize={50}
        listId="claims"
        exportName="claims"
        onRowClick={(c) => navigate(`/claims/${c.id}`)}
        empty={<EmptyState icon={ShieldAlert} title="No claims in this view" body="Claims start from a Claim report request." />}
      />
      {reporting && <ServiceRequestSheet type="Claim report" onClose={() => setReporting(false)} />}
    </div>
  )
}

/** US-CLM-002..005 */
export function ClaimPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, userName, carrierName } = useLookups()
  const followUpTask = useFollowUpTask()
  const mutate = useMutate()
  const toast = useToast()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'submit' | 'number' | 'close' | 'reopen' | 'withdraw' | null>(null)
  const c = data.claims?.find((x) => x.id === id)
  if (!c) return <NotFound what="claim" />
  const account = getAccount(c.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="claim" owner={userName(account.accountManagerId)} />
  const pol = data.policies.find((p) => p.id === c.policyId)
  const carrier = pol ? carrierName(pol.carrierId) : 'the carrier'
  const sr = c.serviceRequestId ? data.serviceRequests.find((r) => r.id === c.serviceRequestId) : undefined
  const canEdit = user.role !== 'admin'
  const d = c.details as Record<string, unknown>
  const offerDone = () => {
    if (sr && sr.status !== 'Done') toast('Claim updated', 'success', { duration: 8000, action: { label: `Mark ${sr.id} done`, onClick: () => navigate(`/service/${sr.id}?close=1`) } })
  }
  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/claims', label: 'Claims' }}
        icon={ShieldAlert}
        title={`${c.lossType} claim · ${dateOf(c.lossOffset)}`}
        status={<StatusCell status={c.status} reason={c.status === 'Closed' && c.outcome ? c.outcome : undefined} />}
        meta={
          <>
            <span className="font-mono text-sm">{c.id}</span>
            <Link to={`/accounts/${account.id}`} className="text-link hover:underline">{account.name}</Link>
            {pol && <Link to={`/policies/${pol.id}`} className="text-link hover:underline">{pol.policyNumber} · {carrier}</Link>}
            <span>{c.carrierClaimNumber ? <>Claim # <span className="font-mono text-sm">{c.carrierClaimNumber}</span></> : 'Claim # not assigned yet'}</span>
            <span>{daysOpen(c)} days {c.status === 'Closed' ? 'to close' : 'open'}</span>
          </>
        }
        actions={
          canEdit && (
            <span className="flex gap-2">
              {followUps(c, data, new Date()).length > 0 && !data.tasks.some((t) => t.status === 'Open' && t.linked?.kind === 'claim' && t.linked.id === c.id) && <Tip label={followUps(c, data, new Date())[0].text}><Button onClick={() => followUpTask(c)}><AlertTriangle aria-hidden className="size-4 text-warning-text" strokeWidth={1.75} />Create follow-up task</Button></Tip>}
              {c.status === 'Reported' && <Button variant="primary" onClick={() => setDialog('submit')}>Submit to carrier</Button>}
              {c.status === 'Submitted to carrier' && <Button variant="primary" onClick={() => setDialog('number')}>Add claim #</Button>}
              {c.status === 'Claim # assigned' && <Button onClick={() => setDialog('number')}>Add adjuster</Button>}
              {(c.status === 'Claim # assigned' || c.status === 'Open') && <Button variant="primary" onClick={() => setDialog('close')}>Close claim</Button>}
              {c.status === 'Closed' && (
                (c.closedOffset ?? 0) >= -90 ? <Button onClick={() => setDialog('reopen')}>Reopen</Button> : <Tip label="Closed more than 90 days ago. Report a new claim instead."><span tabIndex={0}><Button disabled>Reopen</Button></span></Tip>
              )}
              {c.status === 'Reported' && (
                <Menu.Root>
                  <Menu.Trigger aria-label="More actions" className="grid size-9 place-items-center rounded-md bg-surface text-label shadow-ring hover:bg-recessed"><MoreHorizontal aria-hidden className="size-4" strokeWidth={1.75} /></Menu.Trigger>
                  <Menu.Portal><Menu.Content align="end" sideOffset={4} className={menuContent}><Menu.Item className={menuItem} onSelect={() => setDialog('withdraw')}>Withdraw</Menu.Item></Menu.Content></Menu.Portal>
                </Menu.Root>
              )}
            </span>
          )
        }
      />
      <div className="px-8 pt-5 max-sm:px-4">
        <ol aria-label="Claim progress" className="mb-4 flex gap-1 overflow-x-auto">
          {STEPS.map((st) => {
            const reached = STEPS.indexOf(c.status) >= STEPS.indexOf(st)
            const when = c.statusDates?.[st]
            return (
              <li key={st} aria-current={st === c.status ? 'step' : undefined} className={cx('min-w-[120px] flex-1 border-t-2 pt-1.5 text-sm', st === c.status ? 'border-strong font-semibold text-strong' : reached ? 'border-label text-label' : 'border-fill text-muted')}>
                {st}
                {reached && when != null && <span className="block font-normal text-muted">{dateOf(when)}</span>}
              </li>
            )
          })}
        </ol>
        <p className="mb-4 rounded-md bg-recessed px-4 py-2 text-sm text-label">Fortify tracks this claim. The carrier’s adjuster handles it.</p>
        <div className="grid grid-cols-[1fr_360px] gap-4 max-lg:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-4">
            {c.status === 'Closed' && c.outcome && (
              <div className="rounded-md bg-surface px-4 py-3 text-base font-medium shadow-ring">
                {c.outcome}{c.paidAmount ? ` · ${usd(c.paidAmount)}` : ''}{c.closedOffset != null ? ` · closed ${dateOf(c.closedOffset)}` : ''}
                {c.denialReason && <span className="block text-sm font-normal text-label">{c.denialReason}</span>}
                {c.withdrawReason && <span className="block text-sm font-normal text-label">{c.withdrawReason}</span>}
              </div>
            )}
            <Panel title="Loss details">
              <KeyValue items={[['Loss type', `${c.lossType} (${FORM[c.lossType]})`], ['Date and time', `${dateOf(c.lossOffset)}${c.lossTime ? ` ${c.lossTime}` : ''}`], ['Location', (d.location as string) ?? null], ['Description', c.description], ['Cause', (d.cause as string) ?? null], ['Reported by', d.reportedBy && d.reportedBy !== 'other' ? data.contacts.find((x) => x.id === d.reportedBy)?.name ?? null : ((d.reporterName as string) ?? null)], ['Police or fire report #', (d.reportNumber as string) ?? null], ['Injuries', (d.injuries as string) ?? null], ['Estimated amount', d.estimate ? usd(Number(d.estimate)) : null]]} />
            </Panel>
            <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'claim', id: c.id }} />}>
              <ActivityTimeline linked={{ kind: 'claim', id: c.id }} accountId={account.id} />
            </Panel>
          </div>
          <div className="flex flex-col gap-4">
            <Panel title="Carrier" actions={canEdit && c.carrierClaimNumber && <button aria-label="Edit claim number" onClick={() => setDialog('number')} className="grid size-8 place-items-center rounded-md text-muted hover:bg-recessed"><Pencil aria-hidden className="size-4" strokeWidth={1.75} /></button>}>
              <KeyValue items={[['Carrier', carrier], ['Claim #', c.carrierClaimNumber ?? 'Not assigned yet'], ['Submitted', c.submittedOffset != null ? `${dateOf(c.submittedOffset)} · ${c.submittedVia}` : null]]} />
            </Panel>
            <Panel title="Adjuster" actions={canEdit && c.adjuster && <button aria-label="Edit adjuster" onClick={() => setDialog('number')} className="grid size-8 place-items-center rounded-md text-muted hover:bg-recessed"><Pencil aria-hidden className="size-4" strokeWidth={1.75} /></button>}>
              {c.adjuster ? (
                <>
                  <KeyValue items={[['Name', c.adjuster.name], ['Type', c.adjuster.type ?? null], ['Phone', c.adjuster.phone ?? null], ['Email', c.adjuster.email ?? null], ['Assigned', c.adjuster.assignedOffset != null ? dateOf(c.adjuster.assignedOffset) : null]]} />
                  {canEdit && <div className="mt-3"><LogActivityButton accountId={account.id} linked={{ kind: 'claim', id: c.id }} /></div>}
                </>
              ) : (
                <p className="text-base text-muted">No adjuster yet. The carrier assigns one after it opens the claim.</p>
              )}
            </Panel>
            <Panel title="Related">
              <ul className="flex flex-col gap-1.5 text-base">
                {sr && <li><Link to={`/service/${sr.id}`} className="text-link hover:underline">{sr.id} · {sr.status}</Link></li>}
                <li><Link to={`/accounts/${account.id}`} className="text-link hover:underline">{account.name}</Link></li>
                {pol && <li><Link to={`/policies/${pol.id}`} className="text-link hover:underline">{pol.policyNumber}</Link></li>}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
      {dialog === 'submit' && <SubmitDialog claim={c} carrier={carrier} onClose={() => setDialog(null)} />}
      {dialog === 'number' && <NumberDialog claim={c} onClose={() => setDialog(null)} onDone={offerDone} />}
      {dialog === 'close' && <CloseDialog claim={c} onClose={() => setDialog(null)} onDone={offerDone} />}
      {(dialog === 'reopen' || dialog === 'withdraw') && (
        <ReasonDialog
          title={dialog === 'reopen' ? 'Reopen claim' : 'Withdraw claim'}
          placeholder={dialog === 'reopen' ? 'Supplement for hidden damage' : 'Client paid out of pocket'}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => mutate((s) => (dialog === 'reopen' ? s.reopenClaim(c.id, reason, user.id) : s.withdrawClaim(c.id, reason, user.id)), dialog === 'reopen' ? 'Claim reopened' : 'Claim withdrawn')}
        />
      )}
    </div>
  )
}

function SubmitDialog({ claim: c, carrier, onClose }: { claim: Claim; carrier: string; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const [via, setVia] = useState<NonNullable<Claim['submittedVia']>>('Carrier portal')
  const a = data.accounts.find((x) => x.id === c.accountId)!
  const pol = data.policies.find((p) => p.id === c.policyId)
  const d = c.details as Record<string, unknown>
  const summary = [`${FORM[c.lossType]} loss notice`, `Named insured: ${a.details?.legalName ?? a.name}`, `Policy: ${pol?.policyNumber ?? '—'}`, `Date of loss: ${dateOf(c.lossOffset)}${c.lossTime ? ` ${c.lossTime}` : ''}`, `Location: ${d.location ?? `${a.city}, ${a.state}`}`, `Description: ${c.description}`, d.cause ? `Cause: ${d.cause}` : '', d.injuries ? `Injuries: ${d.injuries}` : ''].filter(Boolean).join('\n')
  return (
    <Confirm open onOpenChange={(o) => !o && onClose()} title={`Submit ${c.id} to ${carrier}`} body={`Claims line ${carrier}: (555) 010-0400 · claims@${carrier.split(' ')[0].toLowerCase()}.example`} confirmLabel="Record submission" onConfirm={async () => { await mutate((s) => s.submitClaim(c.id, via, user.id), 'Submitted to carrier'); onClose() }}>
      <pre tabIndex={0} className="max-h-56 overflow-auto rounded-md bg-recessed p-3 font-sans text-sm whitespace-pre-wrap text-ink">{summary}</pre>
      <Button size="sm" onClick={() => navigator.clipboard?.writeText(summary).then(() => toast('Copied.', 'success'))}>Copy details</Button>
      <Field label="Submitted via">
        <select className={inputCls} value={via} onChange={(e) => setVia(e.target.value as typeof via)}><option>Carrier portal</option><option>Email to carrier claims</option><option>Phone</option></select>
      </Field>
    </Confirm>
  )
}

function NumberDialog({ claim: c, onClose, onDone }: { claim: Claim; onClose: () => void; onDone: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [num, setNum] = useState(c.carrierClaimNumber ?? '')
  const [name, setName] = useState(c.adjuster?.name ?? '')
  const [type, setType] = useState<'Carrier staff' | 'Independent'>(c.adjuster?.type ?? 'Carrier staff')
  const [phone, setPhone] = useState(c.adjuster?.phone ?? '')
  const [email, setEmail] = useState(c.adjuster?.email ?? '')
  const carrierId = data.policies.find((p) => p.id === c.policyId)?.carrierId
  const dup = num && (data.claims ?? []).find((x) => x.id !== c.id && x.carrierClaimNumber === num && data.policies.find((p) => p.id === x.policyId)?.carrierId === carrierId)
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={c.carrierClaimNumber ? 'Carrier claim # and adjuster' : 'Add claim #'}
      body="Saving a number moves the claim to Claim # assigned; adding an adjuster opens it."
      confirmLabel="Save"
      onConfirm={async () => {
        await mutate((s) => s.recordClaimNumber(c.id, { number: num.trim(), adjuster: name.trim() ? { name: name.trim(), type, phone: phone || undefined, email: email || undefined } : null }, user.id))
        onClose()
        onDone()
      }}
    >
      <Field label="Carrier claim #" hint="4 to 30 letters, digits, or dashes"><input className={cx(inputCls, 'font-mono')} value={num} onChange={(e) => setNum(e.target.value)} /></Field>
      {dup && <p className="text-sm font-medium text-warning-text">{num} is already on {dup.id}. Check the number.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adjuster name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Type"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}><option>Carrier staff</option><option>Independent</option></select></Field>
        <Field label="Phone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
    </Confirm>
  )
}

function CloseDialog({ claim: c, onClose, onDone }: { claim: Claim; onClose: () => void; onDone: () => void }) {
  const { user } = useApp()
  const mutate = useMutate()
  const [outcome, setOutcome] = useState<'Paid' | 'Denied' | 'Withdrawn'>('Paid')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const today = new Date()
  const [closed, setClosed] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Close ${c.id}`}
      body="Record what the carrier decided."
      confirmLabel="Close claim"
      onConfirm={async () => {
        await mutate((s) => s.closeClaim(c.id, { outcome, amount: outcome === 'Paid' && amount ? Number(amount) : null, note: note || null, denialReason: outcome === 'Denied' ? reason || null : null, closedOffset: offsetOfDate(new Date(`${closed}T12:00:00`)) }, user.id), `Closed · ${outcome}`)
        onClose()
        onDone()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Outcome"><select className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}><option>Paid</option><option>Denied</option><option>Withdrawn</option></select></Field>
        <Field label="Closed on"><input type="date" className={inputCls} value={closed} onChange={(e) => setClosed(e.target.value)} /></Field>
      </div>
      {outcome === 'Paid' && <Field label="Amount paid (as reported by the carrier)"><input inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} /></Field>}
      {outcome === 'Denied' && <Field label="Denial reason"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
      <Field label="Note (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Confirm>
  )
}

function ReasonDialog({ title, placeholder, onClose, onConfirm }: { title: string; placeholder: string; onClose: () => void; onConfirm: (reason: string) => Promise<unknown> }) {
  const [reason, setReason] = useState('')
  return (
    <Confirm open onOpenChange={(o) => !o && onClose()} title={title} body="A reason is required." confirmLabel={title.split(' ')[0]} onConfirm={async () => { if (!reason.trim()) throw new Error('Add a reason.'); await onConfirm(reason.trim()); onClose() }}>
      <Field label="Reason"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} /></Field>
    </Confirm>
  )
}

/** US-CLM-006: a 1-business-day follow-up Task for the Claim's Account Manager. */
function useFollowUpTask() {
  const { data, user } = useApp()
  const mutate = useMutate()
  return (c: Claim) => {
    const a = data.accounts.find((x) => x.id === c.accountId)!
    const carrier = data.carriers.find((x) => x.id === data.policies.find((p) => p.id === c.policyId)?.carrierId)?.name ?? 'the carrier'
    const d = new Date()
    let due = 0
    do { d.setDate(d.getDate() + 1); due++ } while (d.getDay() === 0 || d.getDay() === 6)
    return mutate((s) => s.saveTask(null, { accountId: a.id, title: `Follow up with ${carrier} on claim ${c.carrierClaimNumber ?? c.id}`, type: 'Call', priority: 'Normal', assigneeId: a.accountManagerId, dueOffset: due, linked: { kind: 'claim', id: c.id }, dueTime: '17:00', durationMin: null, description: null }, user.id), 'Follow-up task created')
  }
}
function ClaimFollowUps({ claims }: { claims: Claim[] }) {
  const { data, user } = useApp()
  const create = useFollowUpTask()
  const hits = claims.map((c) => ({ c, fu: followUps(c, data, new Date()) })).filter((x) => x.fu.length)
  const canTask = user.role !== 'admin'
  return (
    <AttentionCallout title={`${hits.length} claim${hits.length === 1 ? ' needs' : 's need'} follow-up`} badge={false} storageKey="fortify.claims.followup.collapsed" max={0} items={hits.map(({ c }) => ({ key: c.id, title: '' }))}>
      {hits.slice(0, 8).map(({ c, fu }) => (
        <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
          <Link to={`/claims/${c.id}`} className="font-medium text-link underline">{c.id}</Link><span>· {fu[0].text}</span>
          {canTask && !data.tasks.some((t) => t.status === 'Open' && t.linked?.kind === 'claim' && t.linked.id === c.id) && <button onClick={() => create(c)} className="text-link underline">Create follow-up task</button>}
        </li>
      ))}
      {hits.length > 8 && <li className="text-sm text-label">and {hits.length - 8} more</li>}
    </AttentionCallout>
  )
}
