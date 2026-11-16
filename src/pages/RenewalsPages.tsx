import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, inDays, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditRenewal, canSeeAccount, visibleAccounts } from '@/domain/access'
import { nextRenewalStatuses, renewalWindowDays } from '@/domain/rules'
import type { Renewal, RenewalDecision, RenewalStatus, Term } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, KeyValue, PageTitle, Panel, RecordHeader, ViewTabs, useView, type Column } from '@/components/patterns'
import { Button, cx } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AccessDenied, NotFound } from './SystemPages'

const VIEWS = ['Due in window', 'At risk', 'Remarketing']
const STEPS: RenewalStatus[] = ['Upcoming', 'In review', 'Remarketing', 'Presented', 'Decided', 'Done']

/** rules.md risk: High on +10% or more (claims and notices are not modelled yet in the mock). */
export const changePct = (r: Renewal, t?: Term) => (r.renewalPremium != null && t ? (r.renewalPremium - t.premium) / t.premium : null)
export const isHighRisk = (r: Renewal, t?: Term) => (changePct(r, t) ?? 0) >= 0.1 || !!t?.pendingCancellation

function Change({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted">Pending</span>
  const up = pct > 0
  return (
    <span className={cx('tabular inline-flex items-center gap-0.5 font-medium', up ? 'text-danger-text' : 'text-success-text')}>
      {up ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />}
      {up ? '+' : '−'}
      {Math.abs(Math.round(pct * 100))}%
    </span>
  )
}

type Row = Renewal & { term: Term; accountName: string; line: string }

export function RenewalsPage() {
  const { data, user } = useApp()
  const { account, policy, userName } = useLookups()
  const navigate = useNavigate()
  const view = useView(VIEWS)
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  const rows: Row[] = data.renewals
    .filter((r) => scoped.has(r.accountId) && r.status !== 'Done')
    .map((r) => ({ ...r, term: terms.get(r.termId)!, accountName: account(r.accountId)?.name ?? '', line: policy(r.policyId)?.line ?? '' }))
  const inView: Record<string, (r: Row) => boolean> = {
    'Due in window': (r) => r.status !== 'Decided',
    'At risk': (r) => isHighRisk(r, r.term),
    Remarketing: (r) => r.status === 'Remarketing',
  }
  const list = rows.filter(inView[view]).sort((a, b) => a.term.expirationOffset - b.term.expirationOffset)
  const counts = Object.fromEntries(VIEWS.map((v) => [v, rows.filter(inView[v]).length]))
  const cols: Column<Row>[] = [
    { key: 'account', label: 'Account', sort: (a, b) => a.accountName.localeCompare(b.accountName), render: (r) => <Link to={`/renewals/${r.id}`} className="font-medium text-strong hover:text-link hover:underline">{r.accountName}</Link> },
    { key: 'line', label: 'Line', width: 140, render: (r) => r.line },
    { key: 'status', label: 'Status', width: 130, render: (r) => <StatusCell status={r.status} /> },
    { key: 'exp', label: 'Expires', width: 190, sort: (a, b) => a.term.expirationOffset - b.term.expirationOffset, render: (r) => <span className={cx('tabular', r.term.expirationOffset <= 14 && 'font-medium text-warning-text')}>{dateOf(r.term.expirationOffset)} · {inDays(r.term.expirationOffset)}</span> },
    { key: 'premium', label: 'Expiring premium', width: 140, align: 'right', render: (r) => usd(r.term.premium) },
    { key: 'change', label: 'Change', width: 100, align: 'right', sort: (a, b) => (changePct(a, a.term) ?? 0) - (changePct(b, b.term) ?? 0), render: (r) => <Change pct={changePct(r, r.term)} /> },
    { key: 'risk', label: 'Risk', width: 90, render: (r) => (isHighRisk(r, r.term) ? <span className="font-medium text-danger-text">High</span> : <span className="text-label">Low</span>) },
    { key: 'owner', label: 'Account Manager', width: 160, render: (r) => userName(r.ownerId) },
  ]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Renewals" description="Terms inside their renewal window: 45 days personal, 120 FL residential property, 60 / 90 commercial." />
      <ViewTabs views={VIEWS} counts={counts} />
      <p className="tabular mt-3 mb-2 text-sm text-muted">Showing {list.length} renewals</p>
      <DataTable rows={list} columns={cols} minWidth={1100} onRowClick={(r) => navigate(`/renewals/${r.id}`)} empty={<EmptyState icon={RefreshCw} title="No renewals in this view" body="Terms enter the worklist when their window opens." />} />
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
        <ol aria-label="Renewal progress" className="flex gap-1">
          {STEPS.map((st) => {
            const reached = STEPS.indexOf(r.status) >= STEPS.indexOf(st)
            return (
              <li key={st} aria-current={st === r.status ? 'step' : undefined} className={cx('flex-1 border-t-2 pt-1.5 text-sm', reached ? 'border-primary font-medium text-strong' : 'border-fill text-muted')}>
                {st}
              </li>
            )
          })}
        </ol>
        <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <Panel title="Expiring term">
            <KeyValue items={[['Carrier', carrierName(p.carrierId)], ['Term', `${dateOf(term.effectiveOffset)} – ${dateOf(term.expirationOffset)}`], ['Premium', usd(term.premium)]]} />
          </Panel>
          <Panel title="Renewal offer">
            <KeyValue items={[['Renewal premium', r.renewalPremium != null ? usd(r.renewalPremium) : 'Not received yet'], ['Change', <Change key="c" pct={changePct(r, term)} />], ['Risk', isHighRisk(r, term) ? <span className="font-medium text-danger-text">High</span> : 'Low'], ['Decision', r.decision], ['Remarket', r.remarketOpportunityId ? <Link className="text-link hover:underline" to={`/pipeline/${r.remarketOpportunityId}`}>Open the Remarket Opportunity</Link> : null]]} />
          </Panel>
        </div>
        {r.status === 'Decided' && <p className="rounded-md bg-recessed px-4 py-3 text-base text-ink">Decided: {r.decision}. Done follows when the AMS confirms the outcome (Demo controls → Sync renewal outcome).</p>}
        <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'renewal', id: r.id }} />}>
          <ActivityTimeline linked={{ kind: 'renewal', id: r.id }} accountId={account.id} />
        </Panel>
      </div>
      <Confirm open={present} onOpenChange={setPresent} title="Mark presented?" body={`Logs that the renewal options were presented to ${account.name} today.`} confirmLabel="Mark presented" onConfirm={() => mutate((s) => s.setRenewalStatus(r.id, 'Presented', user.id, 'presented to the client'), 'Marked presented')} />
      <Confirm open={decide} onOpenChange={setDecide} title="Record the client’s decision" body="The expiring Term updates when the AMS confirms it." confirmLabel="Record decision" onConfirm={() => mutate((s) => s.decideRenewal(r.id, decision, user.id), `Decision recorded: ${decision}`)}>
        <Field label="Decision">
          <select className={inputCls} value={decision} onChange={(e) => setDecision(e.target.value as RenewalDecision)}>
            {(['Renew as is', 'Rewrite', 'Non-renewed'] as const).map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
      </Confirm>
    </div>
  )
}
