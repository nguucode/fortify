import { useMemo, useState } from 'react'
import { bulkSummary } from '@/app/bulk'
import { useToast } from '@/components/ui/toast'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, offsetOfDate, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditOpportunity, visibleAccounts } from '@/domain/access'
import type { Account, InterestLevel, Line, XDate } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, KeyValue, PageTitle, Sheet, SheetCancel, ViewTabs, useView, type Column } from '@/components/patterns'
import { Button, cx, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'

const PL: Line[] = ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat']
const CL: Line[] = ['BOP', 'GL', 'WC', 'Commercial auto']
const VIEWS = ['Next 90 days', 'Passed', 'All']
export const quoteWindow = (a: Pick<Account, 'kind'>) => (a.kind === 'Business' ? 90 : 45)
const isoOf = (off: number) => {
  const d = new Date()
  d.setDate(d.getDate() + off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromIso = (v: string) => offsetOfDate(new Date(`${v}T12:00:00`))

/** US-XDT-001 */
export function XDatesPage() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const [params, setParams] = useSearchParams()
  const view = useView(VIEWS)
  const [adding, setAdding] = useState(false)
  const listMutate = useMutate()
  const listToast = useToast()
  const scoped = new Map(visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active').map((a) => [a.id, a]))
  const all = data.xDates.filter((x) => scoped.has(x.accountId))
  const inView: Record<string, (x: XDate) => boolean> = { 'Next 90 days': (x) => x.xDateOffset >= 0 && x.xDateOffset <= 90 && x.interestLevel !== 'Closed', Passed: (x) => x.xDateOffset < 0, All: () => true }
  const rows = all.filter(inView[view]).sort((a, b) => a.xDateOffset - b.xDateOffset)
  const opp = (x: XDate) => (x.opportunityId ? data.opportunities.find((o) => o.id === x.opportunityId) : undefined)
  const due = (x: XDate) => { const a = scoped.get(x.accountId)!; return x.xDateOffset >= 0 && x.xDateOffset <= quoteWindow(a) && x.interestLevel !== 'Closed' && (!opp(x) || opp(x)!.stage === 'Lost') }
  const dueCount = all.filter(due).length
  const openId = params.get('xdate')
  const open = openId ? data.xDates.find((x) => x.id === openId) : undefined
  const setOpen = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set('xdate', id); else n.delete('xdate'); setParams(n, { replace: true }) }
  const cols: Column<XDate>[] = [
    { key: 'account', label: 'Account', sort: (a, b) => (account(a.accountId)?.name ?? '').localeCompare(account(b.accountId)?.name ?? ''), render: (x) => <button onClick={() => setOpen(x.id)} className="truncate text-left font-medium text-strong hover:text-link hover:underline">{account(x.accountId)?.name}</button>, csv: (x) => account(x.accountId)?.name ?? '' },
    { key: 'line', label: 'Line', width: 130, render: (x) => x.line },
    { key: 'carrier', label: 'Current carrier', width: 190, render: (x) => x.currentCarrier },
    { key: 'premium', label: 'Premium', width: 110, align: 'right', render: (x) => (x.premium ? usd(x.premium) : '—'), csv: (x) => x.premium ?? '' },
    { key: 'xdate', label: 'X-date', width: 110, sort: (a, b) => a.xDateOffset - b.xDateOffset, render: (x) => dateOf(x.xDateOffset) },
    {
      key: 'days',
      label: 'Days out',
      width: 100,
      align: 'right',
      mobile: true,
      render: (x) => (due(x) ? <Tip label={`Inside the ${quoteWindow(scoped.get(x.accountId)!)}-day quote window, no Opportunity yet`}><span tabIndex={0} className="inline-flex items-center gap-1 font-medium text-warning-text"><AlertTriangle aria-hidden className="size-3.5" />{x.xDateOffset}</span></Tip> : x.xDateOffset < 0 ? <span className="text-muted">passed</span> : x.xDateOffset),
      csv: (x) => x.xDateOffset,
    },
    { key: 'status', label: 'Interest', width: 100, render: (x) => x.interestLevel },
    { key: 'producer', label: 'Producer', width: 150, render: (x) => userName(scoped.get(x.accountId)!.producerId) },
    { key: 'opp', label: 'Opportunity', width: 140, render: (x) => { const o = opp(x); return o ? <Link to={`/pipeline/${o.id}`} className="text-link hover:underline"><StatusCell status={o.stage} /></Link> : <span className="text-muted">—</span> }, csv: (x) => opp(x)?.stage ?? '' },
  ]
  const counts = Object.fromEntries(VIEWS.map((v) => [v, all.filter(inView[v]).length]))
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="X-dates" description="When coverage written elsewhere renews. Quote 45 days ahead for personal lines, 90 for commercial." actions={user.role !== 'admin' && <Button variant="primary" onClick={() => setAdding(true)}>+ Add X-date</Button>} />
      {dueCount > 0 && <p className="mt-4 flex items-center gap-2 rounded-md bg-warning-tint px-4 py-2.5 text-base text-ink shadow-ring"><AlertTriangle aria-hidden className="size-4 text-warning-text" /> {dueCount} X-date{dueCount === 1 ? ' is' : 's are'} inside the quote window with no Opportunity.</p>}
      <ViewTabs views={VIEWS} counts={counts} />
      <p className="tabular mt-3 mb-2 text-sm text-muted">Showing {rows.length} X-dates</p>
      <DataTable bulkMax={{ n: 50, message: "Select up to 50 at a time" }} bulkActions={view === 'Passed' && user.role !== 'admin' ? [{ label: 'Roll forward', run: async (ids) => { const r = await listMutate((s) => s.bulk(ids, (id) => { s.rollForwardXDate(id, user.id) })); listToast(r.skipped.length ? bulkSummary(r, 'rolled forward') : `${r.updated} X-dates rolled forward`, 'success') } }] : undefined} rows={rows} columns={cols} minWidth={1200} listId="xdates" exportName="x-dates" onRowClick={(x) => setOpen(x.id)} empty={<EmptyState icon={CalendarClock} title="No X-dates in this view" body="Add one when a client mentions coverage they buy elsewhere." />} />
      {open && <XDateDrawer xdate={open} onClose={() => setOpen(null)} />}
      {adding && <XDateDrawer onClose={() => setAdding(false)} />}
    </div>
  )
}

/** US-XDT-002: view (with source, follow-up, opportunity), add, and edit. */
export function XDateDrawer({ xdate, accountId: lockedAccount, onClose }: { xdate?: XDate; accountId?: string; onClose: () => void }) {
  const { data, user } = useApp()
  const { account: getAccount, carrierName } = useLookups()
  const mutate = useMutate()
  const toast = useToast()
  const [editing, setEditing] = useState(!xdate)
  const [quoting, setQuoting] = useState(false)
  const [q, setQ] = useState('')
  const [accountId, setAccountId] = useState(xdate?.accountId ?? lockedAccount ?? '')
  const account = accountId ? getAccount(accountId) : undefined
  const [line, setLine] = useState<Line>(xdate?.line ?? 'Home')
  const [carrier, setCarrier] = useState(xdate?.currentCarrier ?? '')
  const [agency, setAgency] = useState(xdate?.currentAgency ?? '')
  const [policyNo, setPolicyNo] = useState(xdate?.policyNumber ?? '')
  const [date, setDate] = useState(xdate ? isoOf(xdate.xDateOffset) : '')
  const [term, setTerm] = useState<6 | 12>(xdate?.termMonths ?? 12)
  const [premium, setPremium] = useState(xdate?.premium ? String(xdate.premium) : '')
  const [interest, setInterest] = useState<InterestLevel>(xdate?.interestLevel ?? 'Medium')
  const [notes, setNotes] = useState(xdate?.notes ?? '')
  const [rollAsk, setRollAsk] = useState(false)
  const matches = useMemo(() => (q.trim().length < 2 ? [] : visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active' && a.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)), [q, user, data.accounts])
  const dup = account && data.policies.find((p) => p.accountId === account.id && p.line === line && data.terms.some((t) => t.policyId === p.id && (t.status === 'Active' || t.status === 'Bound')))
  const dupTerm = dup ? data.terms.filter((t) => t.policyId === dup.id && (t.status === 'Active' || t.status === 'Bound')).sort((a, b) => b.expirationOffset - a.expirationOffset)[0] : undefined
  const opp = xdate?.opportunityId ? data.opportunities.find((o) => o.id === xdate.opportunityId) : undefined
  const task = xdate?.followUpTaskId ? data.tasks.find((t) => t.id === xdate.followUpTaskId) : undefined
  const save = async (offset?: number) => {
    if (!accountId || !carrier.trim() || !date) throw new Error('Account, line, current carrier, and X-date are required.')
    const off = offset ?? fromIso(date)
    await mutate((s) => s.saveXDate(xdate?.id ?? null, { accountId, line, currentCarrier: carrier.trim(), currentAgency: agency || null, policyNumber: policyNo || null, xDateOffset: off, termMonths: term, premium: Number(premium) || null, interestLevel: interest, notes: notes || null }, user.id), 'X-date saved')
    onClose()
  }
  const trySave = async () => {
    if (date && fromIso(date) < -30) return setRollAsk(true)
    await save()
  }
  const sourceLabel = xdate?.source?.kind === 'lead' ? `Lead ${xdate.source.id}` : xdate?.source?.kind === 'lost-opportunity' ? 'Lost opportunity' : xdate?.source?.kind === 'cancellation' ? 'Cancellation request' : 'Manual'
  const canQuote = account ? canEditOpportunity(user, account, account.status === 'Client' ? 'Cross-sell' : 'New business') && (user.role !== 'account-manager' || account.status === 'Client') : false
  const quoteReason = user.role === 'admin' ? 'Admins have read-only access to Opportunities' : 'Account Managers can create Cross-sell Opportunities only'
  if (!editing && xdate)
    return (
      <Sheet open onOpenChange={(v) => !v && onClose()} title={`${xdate.line} · ${xdate.currentCarrier}`} description={account?.name} footer={<><SheetCancel>Close</SheetCancel>{user.role !== 'admin' && <Button onClick={() => setEditing(true)}>Edit</Button>}{user.role !== 'admin' && xdate.xDateOffset < 0 && (!opp || ['Won', 'Lost'].includes(opp.stage)) && (xdate.interestLevel === 'Closed' ? <Tip label="Change the interest level from Closed first."><span tabIndex={0}><Button disabled>Roll forward</Button></span></Tip> : <Button onClick={() => mutate((s) => s.rollForwardXDate(xdate.id, user.id)).then((d) => toast(`Rolled forward to ${d}`, 'success'))}>Roll forward</Button>)}{opp && opp.stage !== 'Lost' ? <Link to={`/pipeline/${opp.id}`} className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-base font-medium text-white">Open Opportunity</Link> : <Gate allowed={canQuote} reason={quoteReason}><Button variant="primary" onClick={() => setQuoting(true)}>Start quote</Button></Gate>}</>}>
        <KeyValue
          items={[
            ['Account', <Link key="a" to={`/accounts/${xdate.accountId}?tab=sales`} className="text-link hover:underline">{account?.name}</Link>],
            ['Line', xdate.line],
            ['Current carrier', xdate.currentCarrier],
            ['Current agency', xdate.currentAgency ?? null],
            ['Policy number', xdate.policyNumber ?? null],
            ['X-date', `${dateOf(xdate.xDateOffset)} (${xdate.xDateOffset < 0 ? 'passed' : `${xdate.xDateOffset} days`})`],
            ['Term', `${xdate.termMonths ?? 12} months`],
            ['Premium', xdate.premium ? usd(xdate.premium) : null],
            ['Interest', xdate.interestLevel],
            ['Source', xdate.source?.kind === 'lost-opportunity' && xdate.source.id ? <Link key="s" to={`/pipeline/${xdate.source.id}`} className="text-link hover:underline">{sourceLabel}</Link> : sourceLabel],
            ['Follow-up', task ? `${task.title} · ${task.status === 'Open' ? `due ${dateOf(task.dueOffset)}` : task.status === 'Canceled' ? 'Follow-up canceled' : 'Done'}` : null],
            ['Opportunity', opp ? <Link key="o" to={`/pipeline/${opp.id}`} className="text-link hover:underline">{opp.stage}</Link> : null],
            ['Notes', xdate.notes ?? null],
          ]}
        />
        {quoting && <StartQuoteDialog xdate={xdate} onClose={() => setQuoting(false)} />}
      </Sheet>
    )
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title={xdate ? 'Edit X-date' : 'Add X-date'} footer={<><SheetCancel /><Button variant="primary" onClick={() => trySave().catch(() => {})}>Save X-date</Button></>}>
      <div className="flex flex-col gap-4">
        {lockedAccount || xdate ? (
          <Field label="Account"><p className="rounded-md bg-recessed px-2.5 py-2 text-base">{account?.name}</p></Field>
        ) : account ? (
          <Field label="Account"><span className="flex justify-between rounded-md bg-recessed px-2.5 py-2 text-base">{account.name}<button onClick={() => setAccountId('')} className="text-sm text-link hover:underline">Change</button></span></Field>
        ) : (
          <Field label="Account">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Accounts" className={inputCls} />
            {matches.map((a) => <button key={a.id} type="button" onClick={() => { setAccountId(a.id); setLine(a.kind === 'Business' ? 'BOP' : 'Home'); setQ('') }} className="block w-full rounded-md px-2.5 py-1.5 text-left text-base hover:bg-recessed">{a.name}</button>)}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Line"><select className={inputCls} value={line} onChange={(e) => setLine(e.target.value as Line)}>{(account?.kind === 'Business' ? CL : PL).map((l) => <option key={l}>{l}</option>)}</select></Field>
          <Field label="Current carrier"><input className={inputCls} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></Field>
          <Field label="Current agency"><input className={inputCls} value={agency} onChange={(e) => setAgency(e.target.value)} /></Field>
          <Field label="Policy number"><input className={inputCls} value={policyNo} onChange={(e) => setPolicyNo(e.target.value)} /></Field>
          <Field label="X-date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Term length"><select className={inputCls} value={term} onChange={(e) => setTerm(Number(e.target.value) as 6 | 12)}><option value={12}>12 months</option><option value={6}>6 months</option></select></Field>
          <Field label="Premium"><input inputMode="numeric" className={cx(inputCls, 'tabular')} value={premium} onChange={(e) => setPremium(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Interest"><select className={inputCls} value={interest} onChange={(e) => setInterest(e.target.value as InterestLevel)}>{(['High', 'Medium', 'Low', 'Closed'] as const).map((l) => <option key={l}>{l}</option>)}</select></Field>
        </div>
        {dup && <p className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2 text-sm text-ink shadow-ring"><AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-text" /> {account?.name} already has {line} with the agency ({carrierName(dup.carrierId)}, renews {dupTerm ? dateOf(dupTerm.expirationOffset) : '—'}). Record an X-date only for coverage written elsewhere.</p>}
        {interest === 'Closed' && task?.status === 'Open' && <p className="text-sm text-label">Saving as Closed cancels the open follow-up task.</p>}
        <Field label="Notes"><textarea className={cx(inputCls, 'h-20 py-2')} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
      <Confirm
        open={rollAsk}
        onOpenChange={setRollAsk}
        title="This date has passed"
        body={`Roll it forward to ${date ? dateOf(fromIso(date) + Math.ceil(-fromIso(date) / (term * 30.4)) * Math.round(term * 30.4)) : ''}?`}
        confirmLabel="Roll forward"
        onConfirm={() => save(fromIso(date) + Math.ceil(-fromIso(date) / (term * 30.4)) * Math.round(term * 30.4))}
      >
        <button type="button" onClick={() => { setRollAsk(false); save().catch(() => {}) }} className="text-left text-sm text-link hover:underline">Save as entered</button>
      </Confirm>
    </Sheet>
  )
}

/** US-XDT-005: bundle open X-dates on the same Account within 60 days of this one. */
export function StartQuoteDialog({ xdate, onClose }: { xdate: XDate; onClose: () => void }) {
  const { data, user } = useApp()
  const { account } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const a = account(xdate.accountId)!
  const others = data.xDates.filter((x) => x.id !== xdate.id && x.accountId === a.id && x.interestLevel !== 'Closed' && !x.opportunityId && Math.abs(x.xDateOffset - xdate.xDateOffset) <= 60)
  const [picked, setPicked] = useState<string[]>([xdate.id, ...others.map((x) => x.id)])
  const chosen = data.xDates.filter((x) => picked.includes(x.id))
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title="Start quote"
      body={`${a.status === 'Client' ? 'Cross-sell' : 'New business'} for ${a.name}. Target effective ${dateOf(Math.min(...chosen.map((x) => x.xDateOffset)))} · estimated ${usd(chosen.reduce((n, x) => n + (x.premium ?? 0), 0))}.`}
      confirmLabel="Start quote"
      onConfirm={async () => {
        const id = await mutate((s) => s.startQuoteFromXDates(picked, user.id), 'Opportunity created')
        onClose()
        navigate(`/pipeline/${id}`)
      }}
    >
      {[xdate, ...others].map((x) => (
        <label key={x.id} className="flex items-center gap-2 text-base">
          <input type="checkbox" disabled={x.id === xdate.id} checked={picked.includes(x.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, x.id] : picked.filter((p) => p !== x.id))} className="size-4 accent-primary" />
          {x.line} · {x.currentCarrier} · {dateOf(x.xDateOffset)}
        </label>
      ))}
    </Confirm>
  )
}
