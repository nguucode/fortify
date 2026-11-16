import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Clock, Minus, Plus, RefreshCw, X } from 'lucide-react'
import { compareRenewal, riskReasons } from '@/domain/renewals'
import { TaskSheet, useCompleteTask } from './TaskSheet'
import { useApp } from '@/app/store'
import { dateOf, inDays, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditRenewal, canSeeAccount, visibleAccounts } from '@/domain/access'
import { nextRenewalStatuses, renewalWindowDays } from '@/domain/rules'
import type { Renewal, RenewalDecision, RenewalStatus, Term } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, KeyValue, PageTitle, Panel, RecordHeader, TabBar, ViewTabs, useTab, useView, AttentionCallout, type AttentionItem, type Column } from '@/components/patterns'
import { Button, cx, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AccessDenied, NotFound } from './SystemPages'

const VIEWS = ['Due in window', 'At risk', 'Remarketing']
const STEPS: RenewalStatus[] = ['Upcoming', 'In review', 'Remarketing', 'Presented', 'Decided', 'Done']

/** rules.md risk: High on +10% or more (claims and notices are not modelled yet in the mock). */
export const changePct = (r: Renewal, t?: Term) => (r.renewalPremium != null && t ? (r.renewalPremium - t.premium) / t.premium : null)
export const isHighRisk = (r: Renewal, t?: Term) => (changePct(r, t) ?? 0) >= 0.1 || !!t?.pendingCancellation

/** US-REN-002: "+$1,214 · +38%"; +10% or more danger with an up arrow, −5% or less success with a down arrow. */
function Change({ pct, dollars }: { pct: number | null; dollars?: number | null }) {
  if (pct == null) return <span className="text-muted">Awaiting terms</span>
  const tone = pct >= 0.1 ? 'text-danger-text' : pct <= -0.05 ? 'text-success-text' : 'text-ink'
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return (
    <span className={cx('tabular inline-flex items-center gap-0.5 font-medium', tone)}>
      {pct >= 0.1 && <ArrowUp aria-hidden className="size-3.5" />}
      {pct <= -0.05 && <ArrowDown aria-hidden className="size-3.5" />}
      {dollars != null && `${sign}${usd(Math.abs(dollars))} · `}
      {sign}
      {Math.abs(pct * 100).toFixed(0)}%
    </span>
  )
}

/** Risk reasons for a Renewal from the store (claims on the policy this term, last-resort carrier). */
export function useRisk() {
  const { data } = useApp()
  return (r: Renewal, t: Term) => {
    const p = data.policies.find((x) => x.id === r.policyId)
    const claims = data.serviceRequests.filter((x) => x.policyId === r.policyId && x.type === 'Claim report' && x.createdOffset >= t.effectiveOffset).length
    const lastResort = !!data.carriers.find((c) => c.id === p?.carrierId)?.note?.includes('last resort')
    return riskReasons(r, t, { claimsThisTerm: claims, lastResort })
  }
}
const Risk = ({ reasons }: { reasons: string[] }) =>
  reasons.length ? (
    <Tip label={reasons.join(' · ')}>
      <span tabIndex={0}><StatusCell status="High" /></span>
    </Tip>
  ) : (
    <StatusCell status="Low" />
  )

type Row = Renewal & { term: Term; accountName: string; line: string }

export function RenewalsPage() {
  const { data, user } = useApp()
  const { account, policy, userName } = useLookups()
  const navigate = useNavigate()
  const view = useView(VIEWS)
  const risk = useRisk()
  const [params, setParams] = useSearchParams()
  const big = params.get('change') === '20'
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  const rows: Row[] = data.renewals
    .filter((r) => scoped.has(r.accountId) && r.status !== 'Done')
    .map((r) => ({ ...r, term: terms.get(r.termId)!, accountName: account(r.accountId)?.name ?? '', line: policy(r.policyId)?.line ?? '' }))
  const inView: Record<string, (r: Row) => boolean> = {
    'Due in window': (r) => r.status !== 'Decided',
    'At risk': (r) => risk(r, r.term).length > 0,
    Remarketing: (r) => r.status === 'Remarketing',
  }
  // US-REN-003: nudges filter the worklist through ?nudge=.
  const nudge = params.get('nudge')
  const NUDGES: Record<string, { test: (r: Row) => boolean; label: (n: number) => string }> = {
    'no-remarket': { test: (r) => r.term.expirationOffset <= 30 && (r.status === 'Upcoming' || r.status === 'In review'), label: (n) => `${n} renewal${n === 1 ? '' : 's'} expire in the next 30 days with no remarket started` },
    'risky-upcoming': { test: (r) => r.status === 'Upcoming' && risk(r, r.term).length > 0, label: (n) => `${n} high-risk renewal${n === 1 ? ' is' : 's are'} still Upcoming` },
  }
  const setNudge = (k: string | null) => { const n = new URLSearchParams(params); if (k) n.set('nudge', k); else n.delete('nudge'); setParams(n, { replace: true }) }
  const nudgeItems: AttentionItem[] = Object.entries(NUDGES).map(([k, v]) => ({ k, v, n: rows.filter(v.test).length })).filter((x) => x.n > 0).map(({ k, v, n }) => ({ key: k, title: v.label(n), onClick: () => setNudge(k) }))
  const list = rows
    .filter(inView[view])
    .filter((r) => !big || (changePct(r, r.term) ?? -1) >= 0.2)
    .filter((r) => !nudge || NUDGES[nudge]?.test(r))
    .sort((a, b) => (view === 'At risk' ? (changePct(b, b.term) ?? -9) - (changePct(a, a.term) ?? -9) || a.term.expirationOffset - b.term.expirationOffset : a.term.expirationOffset - b.term.expirationOffset))
  const counts = Object.fromEntries(VIEWS.map((v) => [v, rows.filter(inView[v]).length]))
  const cols: Column<Row>[] = [
    { key: 'account', label: 'Account', sort: (a, b) => a.accountName.localeCompare(b.accountName), render: (r) => <Link to={`/renewals/${r.id}`} className="font-medium text-strong hover:text-link hover:underline">{r.accountName}</Link> },
    { key: 'line', label: 'Line', width: 140, render: (r) => r.line },
    { key: 'status', label: 'Status', width: 130, render: (r) => <StatusCell status={r.status} /> },
    { key: 'exp', label: 'Expires', width: 230, sort: (a, b) => a.term.expirationOffset - b.term.expirationOffset, render: (r) => <span className={cx('tabular inline-flex items-center gap-1', r.term.expirationOffset <= 14 && 'font-medium text-warning-text')}>{r.term.expirationOffset <= 14 && <Clock aria-hidden className="size-3.5" />}{dateOf(r.term.expirationOffset)} · {inDays(r.term.expirationOffset)}</span> },
    { key: 'premium', label: 'Expiring premium', width: 140, align: 'right', render: (r) => usd(r.term.premium) },
    { key: 'renewal', label: 'Renewal premium', width: 140, align: 'right', render: (r) => (r.renewalPremium != null ? usd(r.renewalPremium) : <span className="text-muted">Awaiting terms</span>), csv: (r) => r.renewalPremium ?? '' },
    { key: 'change', label: 'Change', width: 160, align: 'right', sort: (a, b) => (changePct(a, a.term) ?? -9) - (changePct(b, b.term) ?? -9), render: (r) => <Change pct={changePct(r, r.term)} dollars={r.renewalPremium != null ? r.renewalPremium - r.term.premium : null} />, csv: (r) => { const p = changePct(r, r.term); return p == null ? '' : `${(p * 100).toFixed(1)}%` } },
    { key: 'risk', label: 'Risk', width: 90, render: (r) => <Risk reasons={risk(r, r.term)} />, csv: (r) => risk(r, r.term).join('; ') || 'Low' },
    { key: 'owner', label: 'Account Manager', width: 160, render: (r) => userName(r.ownerId) },
  ]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Renewals" description="Terms inside their renewal window: 45 days personal, 120 FL residential property, 60 / 90 commercial." />
      <div className="mt-4"><AttentionCallout items={nudgeItems} storageKey="fortify.renewals.nudges.collapsed" max={3} /></div>
      <ViewTabs views={VIEWS} counts={counts} />
      <div className="mt-3 flex items-center gap-3">
        {nudge && NUDGES[nudge] && <span className="inline-flex h-6 items-center gap-1 rounded-md bg-fill px-2 text-sm">{NUDGES[nudge].label(list.length)}<button aria-label="Remove filter" onClick={() => setNudge(null)}><X aria-hidden className="size-3" /></button></span>}
        <label className="inline-flex items-center gap-2 text-sm text-label">
          <input type="checkbox" checked={big} onChange={(e) => { const n = new URLSearchParams(params); if (e.target.checked) n.set('change', '20'); else n.delete('change'); setParams(n, { replace: true }) }} className="size-4 accent-primary" />
          Change ≥ 20%
        </label>
      </div>
      <p className="tabular mt-2 mb-2 text-sm text-muted">Showing {list.length} renewals</p>
      <DataTable rows={list} columns={cols} minWidth={1100} listId="renewals" exportName="renewals" onRowClick={(r) => navigate(`/renewals/${r.id}`)} empty={<EmptyState icon={RefreshCw} title="No renewals in this view" body="Terms enter the worklist when their window opens." />} />
    </div>
  )
}

export function RenewalPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, policy, carrierName, userName } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const [present, setPresent] = useState(false)
  const [decide, setDecide] = useState(false)
  const [decision, setDecision] = useState<RenewalDecision>('Renew as is')
  const [decisionCarrier, setDecisionCarrier] = useState('')
  const [taskOpen, setTaskOpen] = useState(false)
  const tab = useTab('summary')
  const risk = useRisk()
  const complete = useCompleteTask()
  const r = data.renewals.find((x) => x.id === id)
  if (!r) return <NotFound what="Renewal" />
  const account = getAccount(r.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="Renewal" owner={userName(r.ownerId)} />
  const term = data.terms.find((t) => t.id === r.termId)!
  const p = policy(r.policyId)!
  const canEdit = canEditRenewal(user, account, r.status)
  const next = nextRenewalStatuses(r.status)
  const reason = user.role === 'producer' ? 'Producers can update a renewal only while it is remarketing.' : 'Admins can view Renewals only.'
  const window = renewalWindowDays(r.segment)
  const reasons = risk(r, term)
  const compare = compareRenewal(r, term, p)
  const remOpp = r.remarketOpportunityId ? data.opportunities.find((o) => o.id === r.remarketOpportunityId) : undefined
  const remQuotes = remOpp ? data.quotes.filter((q) => q.opportunityId === remOpp.id) : []
  const bestQuote = remQuotes.filter((q) => q.status !== 'Declined').flatMap((q) => q.lines.filter((l) => l.premium != null).map((l) => ({ q, prem: l.premium! }))).sort((a, b) => a.prem - b.prem)[0]
  const wonQuote = remQuotes.find((q) => q.status === 'Accepted')
  const openDecision = (d: RenewalDecision, carrierId = '') => {
    setDecision(d)
    setDecisionCarrier(carrierId)
    setDecide(true)
  }
  const renTasks = data.tasks.filter((t) => t.status === 'Open' && t.linked?.kind === 'renewal' && t.linked.id === r.id).sort((a, b) => a.dueOffset - b.dueOffset)
  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/renewals', label: 'Renewals' }}
        icon={RefreshCw}
        title={`${account.name} · ${p.line}`}
        status={<StatusCell status={r.status} />}
        meta={
          <>
            <span>{carrierName(p.carrierId)} · <span className="font-mono text-sm">{p.policyNumber}</span></span>
            <span>Expires {dateOf(term.expirationOffset)} ({inDays(term.expirationOffset)})</span>
            <span>{window}-day window</span>
            <span>Owner {userName(r.ownerId)}</span>
          </>
        }
        actions={
          <Gate allowed={canEdit} reason={reason}>
            <span className="flex flex-wrap gap-2">
              {next.includes('In review') && <Button variant="primary" onClick={() => mutate((s) => s.setRenewalStatus(r.id, 'In review', user.id), 'Review started')}>Start review</Button>}
              {next.includes('Remarketing') && (
                <Button
                  onClick={async () => {
                    const oppId = await mutate((s) => s.startRemarket(r.id, user.id), 'Remarket Opportunity created')
                    navigate(`/pipeline/${oppId}`)
                  }}
                >
                  Start remarketing
                </Button>
              )}
              {next.includes('Presented') && <Button variant={next.includes('Remarketing') ? 'secondary' : 'primary'} onClick={() => setPresent(true)}>Mark presented</Button>}
              {next.includes('Decided') && <Button variant="primary" onClick={() => setDecide(true)}>Record decision</Button>}
            </span>
          </Gate>
        }
      />
      <div className="flex flex-col gap-4 px-8 pt-5 max-sm:px-4">
        <ol aria-label="Renewal progress" className="flex gap-1 overflow-x-auto pb-1.5 max-sm:[&>li]:min-w-[96px]">
          {STEPS.map((st) => {
            const reached = STEPS.indexOf(r.status) >= STEPS.indexOf(st)
            return (
              <li key={st} aria-current={st === r.status ? 'step' : undefined} className={cx('flex-1 border-t-2 pt-1.5 text-sm', st === r.status ? 'border-strong font-semibold text-strong' : reached ? 'border-label text-label' : 'border-fill text-muted')}>
                {st}
              </li>
            )
          })}
        </ol>
        <TabBar tabs={[{ id: 'summary', label: 'Summary' }, { id: 'compare', label: compare ? 'Compare' : 'Compare · awaiting terms' }]} />
        {tab === 'compare' ? (
          compare ? (
            <CompareTable compare={compare} />
          ) : (
            <Panel title="Compare"><p className="flex items-center gap-2 text-base text-muted"><Clock aria-hidden className="size-4" /> Compare is available once {carrierName(p.carrierId)} sends renewal terms.</p></Panel>
          )
        ) : (
        <>
        <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <Panel title="Expiring term">
            <KeyValue items={[['Carrier', carrierName(p.carrierId)], ['Term', `${dateOf(term.effectiveOffset)} – ${dateOf(term.expirationOffset)}`], ['Premium', usd(term.premium)]]} />
          </Panel>
          <Panel title="Renewal offer">
            <KeyValue items={[['Renewal premium', r.renewalPremium != null ? usd(r.renewalPremium) : 'Awaiting terms'], ['Change', <Change key="c" pct={changePct(r, term)} dollars={r.renewalPremium != null ? r.renewalPremium - term.premium : null} />], ['Risk', <Risk key="r" reasons={reasons} />], ['Reasons', reasons.length ? reasons.join(' · ') : null], ['Decision', r.decision]]} />
          </Panel>
        </div>
        {remOpp && (
          <Panel title="Remarket">
            <Link to={`/pipeline/${remOpp.id}`} className="text-base font-medium text-link hover:underline">{remOpp.name ?? `${account.name} · ${remOpp.lines.join(', ')}`}</Link>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
              <StatusCell status={remOpp.stage} reason={remOpp.lostReason ?? undefined} />
              <span className="text-label">Producer {userName(remOpp.ownerId)}</span>
              <span className="text-label">{remQuotes.filter((q) => ['Quoted', 'Presented', 'Accepted'].includes(q.status)).length} quoted · {remQuotes.filter((q) => q.status === 'Declined').length} declined · {remQuotes.filter((q) => q.status === 'Requested').length} requested</span>
            </div>
            {bestQuote && r.renewalPremium != null && remOpp.stage !== 'Won' && (
              <p className="tabular mt-2 text-base">Best: {carrierName(bestQuote.q.carrierId)} {usd(bestQuote.prem)} · <span className={bestQuote.prem < r.renewalPremium ? 'text-success-text' : 'text-danger-text'}>{bestQuote.prem < r.renewalPremium ? '−' : '+'}{usd(Math.abs(bestQuote.prem - r.renewalPremium))} vs renewal</span></p>
            )}
            {remOpp.stage === 'Won' && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-base text-ink">Won · {remOpp.renewedWithIncumbent ? 'renewed with incumbent' : wonQuote ? carrierName(wonQuote.carrierId) : ''}</span>
                {!r.decision && <Gate allowed={canEdit} reason={reason}><Button variant="primary" onClick={() => (remOpp.renewedWithIncumbent ? openDecision('Renew as is') : openDecision('Rewrite', wonQuote?.carrierId))}>{remOpp.renewedWithIncumbent ? 'Record decision: Renew as is' : 'Record decision: Rewrite'}</Button></Gate>}
              </div>
            )}
            {remOpp.stage === 'Lost' && !r.decision && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-base text-label">Remarket lost · {remOpp.lostReason}</span>
                <Gate allowed={canEdit} reason={reason}><Button onClick={() => openDecision('Renew as is')}>Record decision: Renew as is</Button></Gate>
              </div>
            )}
          </Panel>
        )}
        {r.status === 'Decided' && <p className="rounded-md bg-recessed px-4 py-3 text-base text-ink">Decided: {r.decision}. Done follows when the AMS confirms the outcome (Demo controls → Sync renewal outcome).</p>}
        <div className="grid grid-cols-[1fr_380px] gap-4 max-lg:grid-cols-1">
          <Panel title="Open tasks" actions={user.role !== 'admin' && <Button size="sm" onClick={() => setTaskOpen(true)}>Add task</Button>}>
            {renTasks.length ? (
              <ul className="divide-y divide-fill">
                {renTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <input type="checkbox" aria-label={`Complete ${t.title}`} onChange={() => complete(t)} className="size-4 accent-primary" />
                    <span className="min-w-0 flex-1 truncate text-base">{t.title}</span>
                    <span className={cx('tabular text-sm', t.dueOffset < 0 ? 'font-medium text-danger-text' : 'text-muted')}>{dateOf(t.dueOffset)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted">No open tasks on this renewal.</p>
            )}
          </Panel>
          <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'renewal', id: r.id }} />}>
            <ActivityTimeline linked={{ kind: 'renewal', id: r.id }} accountId={account.id} limit={8} />
            <Link to={`/accounts/${account.id}?tab=activity`} className="mt-2 inline-block text-sm text-link hover:underline">View all activity</Link>
          </Panel>
        </div>
        </>
        )}
      </div>
      {taskOpen && <TaskSheet accountId={account.id} linked={{ kind: 'renewal', id: r.id }} presets={[['30 days before expiration', term.expirationOffset - 30], ['15 days before expiration', term.expirationOffset - 15], ['On expiration', term.expirationOffset]] as [string, number][]} onClose={() => setTaskOpen(false)} />}
      <Confirm open={present} onOpenChange={setPresent} title="Mark presented?" body={`Logs that the renewal options were presented to ${account.name} today.`} confirmLabel="Mark presented" onConfirm={() => mutate((s) => s.setRenewalStatus(r.id, 'Presented', user.id, 'presented to the client'), 'Marked presented')} />
      <Confirm open={decide} onOpenChange={setDecide} title="Record the client’s decision" body="The expiring Term updates when the AMS confirms it." confirmLabel="Record decision" onConfirm={() => mutate((s) => s.decideRenewal(r.id, decision, user.id, decision === 'Rewrite' ? decisionCarrier || null : null), `Decision recorded: ${decision}`)}>
        <Field label="Decision">
          <select className={inputCls} value={decision} onChange={(e) => setDecision(e.target.value as RenewalDecision)}>
            {(['Renew as is', 'Rewrite', 'Non-renewed'] as const).map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        {decision === 'Rewrite' && (
          <Field label="New carrier">
            <select className={inputCls} value={decisionCarrier} onChange={(e) => setDecisionCarrier(e.target.value)}>
              <option value="">Choose…</option>
              {data.carriers.filter((c) => c.lines.includes(p.line)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
      </Confirm>
    </div>
  )
}

/** US-REN-006: changed rows first; unchanged rows behind a toggle; premium total. */
function CompareTable({ compare }: { compare: NonNullable<ReturnType<typeof compareRenewal>> }) {
  const [all, setAll] = useState(false)
  const changed = compare.rows.filter((r) => r.kind !== 'Unchanged')
  const unchanged = compare.rows.filter((r) => r.kind === 'Unchanged')
  const icon = { Added: <Plus aria-hidden className="size-3.5" />, Removed: <Minus aria-hidden className="size-3.5" />, Changed: <span aria-hidden className="size-1.5 rounded-full bg-label" />, Unchanged: null }
  const t = compare.total
  return (
    <Panel title="Expiring vs renewal">
      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[600px] border-collapse text-left">
          <thead><tr className="h-10 border-b border-fill"><th className="px-2 text-base font-semibold text-strong">Item</th><th className="px-2 text-base font-semibold text-strong">Expiring</th><th className="px-2 text-base font-semibold text-strong">Renewal</th><th className="px-2 text-base font-semibold text-strong">Change</th></tr></thead>
          <tbody>
            <tr className="h-10 border-b border-fill font-medium">
              <td className="px-2">Premium</td>
              <td className="px-2">{usd(t.expiring)}</td>
              <td className="px-2">{usd(t.renewal)}</td>
              <td className="px-2"><Change pct={t.pct} dollars={t.change} /></td>
            </tr>
            {[...changed, ...(all ? unchanged : [])].map((r) => (
              <tr key={r.item} className="h-10 border-b border-fill last:border-0">
                <td className="px-2">{r.item}</td>
                <td className="px-2">{r.expiring}</td>
                <td className="px-2">{r.renewal}</td>
                <td className="px-2">{r.kind === 'Unchanged' ? <span className="text-muted">—</span> : <span className="inline-flex items-center gap-1.5 text-label">{icon[r.kind]} {r.kind}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unchanged.length > 0 && <button onClick={() => setAll(!all)} className="mt-2 text-sm text-link hover:underline">{all ? 'Hide' : 'Show'} {unchanged.length} unchanged</button>}
    </Panel>
  )
}
