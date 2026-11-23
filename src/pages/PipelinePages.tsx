import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight, MoreHorizontal, Plus, SearchX, Trophy } from 'lucide-react'
import { useApp } from '@/app/store'
import { commissionFor } from '@/domain/commission'
import { TaskSheet } from './TaskSheet'
import { useIsMobile } from '@/app/media'
import { OpportunitySheet } from './OpportunitySheet'
import { dateOf, inDays, offsetOfDate, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditOpportunity, canSeeCommission, canSeeAccount, visibleAccounts } from '@/domain/access'
import { addMonths, checkStageMove } from '@/domain/rules'
import type { Dataset, Line, Opportunity, OpportunityStage, Quote } from '@/domain/types'
import { BOARD_CAP, BoardColumn, boardCard, Confirm, DataTable, Field, Gate, inputCls, KeyValue, ListToolbar, mini, PageTitle, Panel, PrimaryCell, RecordHeader, Sheet, SheetCancel, AttentionCallout, useView, ViewTabs, type AttentionItem, type Column, type FilterDef } from '@/components/patterns'
import { Button, Callout, controlCls, cx, Due, Segmented, Tip } from '@/components/ui/primitives'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AccessDenied, NotFound } from './SystemPages'

const OPEN_STAGES: OpportunityStage[] = ['New', 'Contacted', 'Gathering info', 'Quoting', 'Proposed']
export const oppCode = (id: string) => `OPP-${2000 + Number(id.replace(/\D/g, ''))}`

/** US-PIP-001: board by stage, scoped to the user's Accounts; moves go through checkStageMove. */
export function PipelinePage() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const navigate = useNavigate()
  const accounts = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const opps = data.opportunities.filter((o) => accounts.has(o.accountId) && (user.role !== 'producer' || o.ownerId === user.id))
  const open = opps.filter((o) => OPEN_STAGES.includes(o.stage))
  const total = open.reduce((s, o) => s + o.estimatedPremium, 0)
  const [creating, setCreating] = useState(false)
  const [params, setParams] = useSearchParams()
  const mobile = useIsMobile()
  const asList = params.get('view') === 'list' || mobile
  const nextOf = (oid: string) => data.tasks.some((t) => t.status === 'Open' && t.linked?.kind === 'opportunity' && t.linked.id === oid)
  const listCols: Column<Opportunity>[] = [
    { key: 'account', label: 'Account', render: (o) => <span className="font-medium text-strong">{account(o.accountId)?.name}</span> },
    { key: 'stage', label: 'Stage', width: 150, render: (o) => <StatusCell status={o.stage} /> },
    { key: 'premium', label: 'Est. premium', width: 130, align: 'right', render: (o) => usd(o.estimatedPremium) },
  ]
  if (mobile)
    return (
      <div className="px-4 pt-6 pb-10">
        <PageTitle title="Pipeline" description={`${open.length} open Opportunities · ${usd(total)} estimated premium`} />
        <DataTable className="mt-4" rows={[...open].sort((a, b) => OPEN_STAGES.indexOf(a.stage) - OPEN_STAGES.indexOf(b.stage))} columns={listCols} onRowClick={(o) => navigate(`/pipeline/${o.id}`)} />
      </div>
    )
  const toggle = (
    <Segmented
      label="Layout"
      value={asList ? 'list' : 'board'}
      onChange={(v) => { const n = new URLSearchParams(params); if (v === 'list') n.set('view', 'list'); else n.delete('view'); setParams(n, { replace: true }) }}
      options={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }]}
    />
  )
  const create = user.role !== 'admin' && (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus aria-hidden className="size-4" strokeWidth={1.75} /> {user.role === 'account-manager' ? 'Cross-sell opportunity' : 'Add opportunity'}
    </Button>
  )
  if (asList)
    return (
      <div className="px-8 pt-6 pb-10 max-sm:px-4">
        <PageTitle title="Pipeline" description={`${open.length} open Opportunities · ${usd(total)} estimated premium`} />
        <div className="mt-4"><PipelineNudges opps={opps} /></div>
        <PipelineList opps={opps} toggle={toggle} actions={create} />
        {creating && <OpportunitySheet onClose={() => setCreating(false)} />}
      </div>
    )
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Pipeline" description={`${open.length} open Opportunities · ${usd(total)} estimated premium`} />
      {creating && <OpportunitySheet onClose={() => setCreating(false)} />}
      <div className="mt-4"><PipelineNudges opps={opps} /></div>
      <ListToolbar className="mt-4" end={create}>{toggle}</ListToolbar>
      <div className="mt-3 grid grid-cols-5 gap-3 overflow-x-auto max-lg:min-w-[1000px]">
        {OPEN_STAGES.map((stage) => {
          const col = open.filter((o) => o.stage === stage).sort((a, b) => a.targetCloseOffset - b.targetCloseOffset)
          return (
            <BoardColumn key={stage} title={stage} count={col.length} figure={usd(col.reduce((s, o) => s + o.estimatedPremium, 0))}>
                {col.slice(0, BOARD_CAP).map((o) => (
                  <li key={o.id}>
                    <button onClick={() => navigate(`/pipeline/${o.id}`)} className={cx(boardCard, 'w-full')}>
                      <span className="block truncate text-base font-medium text-strong">{account(o.accountId)?.name}</span>
                      <span className="block truncate text-sm text-label">{o.type} · {o.lines.join(', ')}</span>
                      <span className="tabular mt-1 flex justify-between text-sm text-muted">
                        <span>{usd(o.estimatedPremium)}</span>
                        <Due tone={o.targetCloseOffset < 0 ? 'overdue' : null}>close {inDays(o.targetCloseOffset)}</Due>
                      </span>
                      {user.role !== 'producer' && <span className="block truncate text-sm text-muted">{userName(o.ownerId)}</span>}
                      {!nextOf(o.id) && <span className="mt-0.5 block text-sm font-medium text-warning-text">No next step</span>}
                    </button>
                  </li>
                ))}
                {col.length > BOARD_CAP && <li className="px-1.5 text-sm text-muted">Showing {BOARD_CAP} of {col.length}. Switch to List to see all.</li>}
            </BoardColumn>
          )
        })}
      </div>
    </div>
  )
}

export function OpportunityPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, userName, carrierName } = useLookups()
  const mutate = useMutate()
  const [addQuote, setAddQuote] = useState(false)
  const [respond, setRespond] = useState<Quote | null>(null)
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nextStep, setNextStep] = useState(false)
  const o = data.opportunities.find((x) => x.id === id)
  if (!o) return <NotFound what="Opportunity" />
  const account = getAccount(o.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="Opportunity" owner={userName(o.ownerId)} />
  const quotes = data.quotes.filter((q) => q.opportunityId === o.id)
  const canEdit = canEditOpportunity(user, account, o.type) && (user.role !== 'producer' || o.ownerId === user.id)
  const closed = o.stage === 'Won' || o.stage === 'Lost'
  const editReason = user.role === 'admin' ? 'Admins can view Opportunities only.' : 'Only the Producer or a Principal can edit this Opportunity.'
  const accepted = quotes.flatMap((q) => q.lines.filter((l) => l.accepted).map((l) => ({ q, l })))

  const move = (to: OpportunityStage) => mutate((s) => s.moveStage(o.id, to, user.id), `Stage moved to ${to}`)
  const renewal = o.renewalId ? data.renewals.find((r) => r.id === o.renewalId) : undefined
  const incTerm = renewal ? data.terms.find((t) => t.id === renewal.termId) : undefined
  const incPolicy = renewal ? data.policies.find((p) => p.id === renewal.policyId) : undefined
  const incumbent = renewal && incTerm && incPolicy ? { carrierId: incPolicy.carrierId, line: incPolicy.line, current: incTerm.premium, renewal: renewal.renewalPremium, policyNumber: incPolicy.policyNumber, expires: incTerm.expirationOffset } : undefined
  const next = data.tasks.filter((t) => t.status === 'Open' && t.linked?.kind === 'opportunity' && t.linked.id === o.id).sort((a, b) => a.dueOffset - b.dueOffset)[0]
  const showCommission = canSeeCommission(user, o.ownerId)
  const comm = showCommission ? commissionFor(o, quotes, data.carriers) : null
  const canReopen = o.stage === 'Lost' && (o.closedOffset ?? 0) >= -90 && (user.role === 'principal' || (user.role === 'producer' && o.ownerId === user.id))

  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/pipeline', label: 'Pipeline' }}
        icon={Briefcase}
        title={`${account.name} · ${o.lines.join(', ')}`}
        status={<StatusCell status={o.stage} reason={o.lostReason ?? undefined} />}
        meta={
          <>
            <span className="font-mono text-sm">{oppCode(o.id)}</span>
            <span>{o.type}</span>
            <span>Owner {userName(o.ownerId)}</span>
            <span>Target close {dateOf(o.targetCloseOffset)}</span>
            <Link className="text-link hover:underline" to={`/accounts/${account.id}`}>{account.name}</Link>
            {incumbent && (
              <Link className="text-link hover:underline" to={`/renewals/${renewal!.id}`}>Remarket for Renewal of {incumbent.policyNumber} · expires {dateOf(incumbent.expires)}</Link>
            )}
            {!closed && (
              <span>
                Next step:{' '}
                {next ? (
                  <Due tone={next.dueOffset < 0 ? 'overdue' : null}>{`${next.title} · ${next.dueOffset < 0 ? `Overdue · due ${dateOf(next.dueOffset)}` : `due ${dateOf(next.dueOffset)}`}`}</Due>
                ) : canEdit ? (
                  <button onClick={() => setNextStep(true)} className="inline-flex items-center gap-1 text-link hover:underline"><Plus aria-hidden className="size-3.5" />Add next step</button>
                ) : (
                  'No next step'
                )}
              </span>
            )}
          </>
        }
        actions={
          canReopen ? (
            <Button onClick={() => mutate((s) => s.reopenOpportunity(o.id, user.id), 'Opportunity reopened')}>Reopen</Button>
          ) : (
          !closed && (
            <Gate allowed={canEdit} reason={editReason}>
              <span className="flex gap-2">
                <Button onClick={() => setEditing(true)}>Edit</Button>
                <Button onClick={() => setLost(true)}>Mark lost</Button>
                {o.type === 'Remarket' && o.renewalId && <Button onClick={() => mutate((s) => s.markWonWithIncumbent(o.id, user.id), 'Renewed with incumbent')}>Renew with incumbent</Button>}
                <Gate allowed={accepted.length > 0} reason="Accept at least one Quote line first.">
                  <Button variant="primary" onClick={() => setWon(true)}>
                    <Trophy aria-hidden className="size-4" strokeWidth={1.75} /> Mark won
                  </Button>
                </Gate>
              </span>
            </Gate>
          )
          )
        }
      />
      <div className="flex flex-col gap-4 px-8 pt-5 max-sm:px-4">
        {/* US-PIP-005 stage bar. One Blue Rule: reached stages are a neutral fill, the current stage is strong text with an underline. */}
        <div className="flex items-stretch gap-1">
          {(() => {
            const cur = OPEN_STAGES.indexOf(o.stage as OpportunityStage)
            const step = (d: -1 | 1) => {
              const st = OPEN_STAGES[cur + d]
              const check = st ? checkStageMove(o, st, quotes) : null
              const ok = !!check?.ok && !closed && canEdit
              return (
                <Tip label={!st ? 'No more stages' : !canEdit ? editReason : ok ? `Move to ${st}` : check && !check.ok ? check.message : st}>
                  <button aria-label={d < 0 ? 'Previous stage' : 'Next stage'} disabled={!ok} onClick={() => ok && move(st)} className="grid w-9 shrink-0 place-items-center rounded-md bg-surface text-label shadow-ring hover:bg-recessed disabled:text-muted disabled:hover:bg-surface min-[900px]:hidden">
                    {d < 0 ? <ChevronLeft className="size-4" strokeWidth={1.75} /> : <ChevronRight className="size-4" strokeWidth={1.75} />}
                  </button>
                </Tip>
              )
            }
            return (
              <>
                {step(-1)}
                <ol aria-label="Stage" className="flex flex-1 overflow-hidden rounded-md shadow-ring">
                  {OPEN_STAGES.map((st, i) => {
                    const current = st === o.stage
                    const reached = (cur >= i || o.stage === 'Won') && !current
                    const check = checkStageMove(o, st, quotes)
                    const disabled = closed || !canEdit || current || !check.ok
                    return (
                      <li key={st} className={cx('flex-1 border-r border-fill last:border-r-0', !current && 'max-[899px]:hidden')}>
                        <Tip label={!check.ok ? check.message : current ? 'Current stage' : `Move to ${st}`}>
                          <button
                            disabled={disabled}
                            onClick={() => move(st)}
                            aria-current={current ? 'step' : undefined}
                            className={cx(
                              'h-9 w-full text-sm transition-colors duration-150 disabled:cursor-default',
                              current ? 'bg-surface font-semibold text-strong' : reached ? 'bg-recessed text-label hover:bg-fill' : 'bg-surface text-muted hover:bg-recessed',
                            )}
                          >
                            <span className="font-normal text-label min-[900px]:hidden">{`${cur + 1} of ${OPEN_STAGES.length} · `}</span>
                            <span className={cx(current && 'underline decoration-strong decoration-2 underline-offset-[10px]')}>{st}</span>
                          </button>
                        </Tip>
                      </li>
                    )
                  })}
                </ol>
                {step(1)}
              </>
            )
          })()}
        </div>

        <Panel
          title="Quotes"
          actions={
            !closed && (
              <Gate allowed={canEdit} reason={editReason}>
                <span className="flex gap-2">
                  <Gate allowed={quotes.some((q) => q.status === 'Quoted')} reason="Record a carrier response first.">
                    <Button size="sm" onClick={() => mutate((s) => s.markPresented(quotes.filter((q) => q.status === 'Quoted').map((q) => q.id), user.id), 'Quotes marked Presented')}>Mark presented</Button>
                  </Gate>
                  <Button size="sm" onClick={() => setAddQuote(true)}>
                    <Plus aria-hidden className="size-4" strokeWidth={1.75} /> Add quote
                  </Button>
                </span>
              </Gate>
            )
          }
        >
          {quotes.length === 0 ? (
            <p className="text-base text-muted">No quotes yet. Add one per carrier you are submitting to.</p>
          ) : (
            <QuoteMatrix o={o} quotes={quotes} canEdit={canEdit && !closed} onRespond={setRespond} incumbent={incumbent} commission={showCommission} />
          )}
        </Panel>

        <div className="grid grid-cols-[1fr_360px] gap-4 max-lg:grid-cols-1">
          <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'opportunity', id: o.id }} />}>
            <ActivityTimeline linked={{ kind: 'opportunity', id: o.id }} accountId={account.id} />
          </Panel>
          <Panel title="Details">
            <KeyValue
              items={[
                ['Type', o.type],
                ['Lines', o.lines.join(', ')],
                ['Estimated premium', usd(o.estimatedPremium)],
                ...(o.probability != null ? ([['Probability', `${o.probability}%`]] as [string, string][]) : []),
                ['Source', o.source],
                ['Created', dateOf(o.createdOffset)],
                ['Carriers quoted', quotes.map((q) => carrierName(q.carrierId)).join(', ') || null],
                ...(incumbent
                  ? ([
                      ['Incumbent', carrierName(incumbent.carrierId)],
                      ['Renewal premium', incumbent.renewal != null ? `${usd(incumbent.current)} → ${usd(incumbent.renewal)} · ${incumbent.renewal >= incumbent.current ? '+' : '−'}${Math.abs(Math.round(((incumbent.renewal - incumbent.current) / incumbent.current) * 100))}%` : 'Not received'],
                    ] as [string, string][])
                  : []),
                ...(comm
                  ? ([
                      [
                        'Est. commission',
                        <Tip key="c" label="Estimated from the carrier's commission schedule synced from the AMS. Final commission comes from the AMS.">
                          <span tabIndex={0} className="tabular">
                            {user.role === 'producer' ? `${usd(comm.agency)} agency · Your share ${Math.round(comm.share * 100)}% · ${usd(comm.producer)}` : `Agency ${usd(comm.agency)} · ${userName(o.ownerId)} ${Math.round(comm.share * 100)}% · ${usd(comm.producer)}`}
                          </span>
                        </Tip>,
                      ],
                    ] as [string, React.ReactNode][])
                  : []),
              ]}
            />
          </Panel>
        </div>
      </div>

      {addQuote && <AddQuoteSheet o={o} onClose={() => setAddQuote(false)} />}
      {respond && <RespondSheet quote={respond} onClose={() => setRespond(null)} />}
      {editing && <OpportunitySheet opportunity={o} onClose={() => setEditing(false)} />}
      {won && <WonSheet o={o} accepted={accepted} onClose={() => setWon(false)} />}
      {lost && <LostDialog o={o} onClose={() => setLost(false)} />}
      {nextStep && <TaskSheet accountId={o.accountId} linked={{ kind: 'opportunity' as const, id: o.id }} defaultAssignee={o.ownerId} onClose={() => setNextStep(false)} />}
    </div>
  )
}

/** US-PIP-008 / US-PIP-009: carriers as rows, lines as columns, lowest premium labelled; accept per line. */
function QuoteMatrix({ o, quotes, canEdit, onRespond, incumbent, commission }: { o: Opportunity; quotes: Quote[]; canEdit: boolean; onRespond: (q: Quote) => void; incumbent?: { carrierId: string; line: Line; renewal: number | null }; commission?: boolean }) {
  const { data } = useApp()
  const { carrierName } = useLookups()
  const mutate = useMutate()
  const lowest = Object.fromEntries(o.lines.map((line) => [line, Math.min(...quotes.flatMap((q) => q.lines.filter((l) => l.line === line && l.premium != null && ['Quoted', 'Presented', 'Accepted'].includes(q.status)).map((l) => l.premium!)))]))
  const accept = (line: Line, quoteId: string, on: boolean) => mutate((s) => s.acceptLines(o.id, { [line]: on ? quoteId : null }), on ? `${line} accepted` : `${line} cleared`)
  return (
    <div className="overflow-x-auto">
      <table className={cx(mini.table, 'min-w-[640px]')}>
        <thead>
          <tr className={mini.head}>
            <th className={mini.th}>Carrier</th>
            <th className={cx(mini.th, 'w-36')}>Status</th>
            {o.lines.map((l) => (
              <th key={l} className={cx(mini.th, 'w-44 text-right')}>{l}</th>
            ))}
            <th className={cx(mini.th, 'w-32')} />
          </tr>
        </thead>
        <tbody>
          {incumbent && (
            <tr className={cx(mini.tr, 'bg-recessed')}>
              <td className={cx(mini.td, 'font-medium text-strong')}>Incumbent: {carrierName(incumbent.carrierId)} (renewal)</td>
              <td className={cx(mini.td, 'text-sm text-label')}>Baseline</td>
              {o.lines.map((line) => <td key={line} className={cx(mini.td, 'tabular text-right')}>{line === incumbent.line && incumbent.renewal != null ? usd(incumbent.renewal) : <span className="text-muted">—</span>}</td>)}
              <td className={mini.td} />
            </tr>
          )}
          {quotes.map((q) => (
            <tr key={q.id} className={mini.tr}>
              <td className={mini.td}>
                <span className="font-medium text-strong">{carrierName(q.carrierId)}</span>
                {q.warnings.length > 0 && (
                  <Tip label={q.warnings.map((w) => w.message).join(' ')}>
                    <AlertTriangle aria-label="Warning" className="ml-1.5 inline size-4 text-warning-text" strokeWidth={1.75} />
                  </Tip>
                )}
                {q.declineReason && <span className="block text-sm text-muted">{q.declineReason}</span>}
              </td>
              <td className={mini.td}><StatusCell status={q.status} /></td>
              {o.lines.map((line) => {
                const ql = q.lines.find((l) => l.line === line)
                const isLow = ql?.premium != null && ql.premium === lowest[line]
                const acceptable = canEdit && ql?.premium != null && (q.status === 'Presented' || q.status === 'Quoted')
                return (
                  <td key={line} className={cx(mini.td, 'tabular text-right')}>
                    {ql?.premium != null ? (
                      <span className="inline-flex items-center gap-2">
                        {isLow && <span className="text-sm font-medium text-success-text">Lowest</span>}
                        <span className={cx(ql.accepted && 'font-semibold text-strong')}>{usd(ql.premium)}</span>
                        {incumbent?.renewal != null && line === incumbent.line && (
                          <span className={cx('text-sm', ql.premium < incumbent.renewal ? 'text-success-text' : 'text-danger-text')}>
                            {ql.premium < incumbent.renewal ? '−' : '+'}{usd(Math.abs(ql.premium - incumbent.renewal))} ({ql.premium < incumbent.renewal ? '−' : '+'}{Math.abs(((ql.premium - incumbent.renewal) / incumbent.renewal) * 100).toFixed(1)}%)
                          </span>
                        )}
                        {acceptable && (
                          // One carrier per line, so a radio group per line; clicking the chosen radio again clears it.
                          <input type="radio" name={`accept-${o.id}-${line}`} aria-label={`Accept ${line} from ${carrierName(q.carrierId)}`} checked={ql.accepted} onChange={() => accept(line, q.id, true)} onClick={() => ql.accepted && accept(line, q.id, false)} className="size-4 accent-primary" />
                        )}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )
              })}
              <td className={cx(mini.td, 'text-right')}>
                {canEdit && (q.status === 'Requested' || q.status === 'Referred') && (
                  <Button size="sm" onClick={() => onRespond(q)}>Record response</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {commission && (
        <p className="tabular mt-2 text-sm text-label">
          Est. commission:{' '}
          {quotes.filter((q) => q.lines.some((l) => l.premium != null)).map((q) => `${carrierName(q.carrierId)} ${usd(q.lines.reduce((sum, l) => sum + (l.premium ?? 0) * (data.carriers.find((c) => c.id === q.carrierId)?.commission?.[l.line] ?? 0.12), 0))}`).join(' · ')}
        </p>
      )}
      <p className="mt-2 text-sm text-muted">Tick one carrier per line to accept it. Different carriers per line is fine.</p>
    </div>
  )
}

/** US-PIP-006: warnings for carrier appointment by state; never blocks. */
function AddQuoteSheet({ o, onClose }: { o: Opportunity; onClose: () => void }) {
  const { data, user } = useApp()
  const { account } = useLookups()
  const mutate = useMutate()
  const a = account(o.accountId)!
  const writers = data.carriers.filter((c) => o.lines.some((l) => c.lines.includes(l)))
  const [carrierId, setCarrierId] = useState(writers[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const used = new Set(data.quotes.filter((q) => q.opportunityId === o.id).map((q) => q.carrierId))
  const carrier = data.carriers.find((c) => c.id === carrierId)
  const warnings: Quote['warnings'] = carrier && !carrier.states.includes(a.state) ? [{ kind: 'appointment', message: `The agency isn’t appointed with ${carrier.name} in ${a.state}.` }] : []
  const save = async () => {
    setBusy(true)
    try {
      await mutate((s) => s.addQuote(o.id, { carrierId, lines: o.lines.filter((l) => carrier!.lines.includes(l)), warnings }, user.id), 'Quote requested')
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title="Add quote"
      description={`${a.name} · ${o.lines.join(', ')}`}
      busy={busy}
      footer={
        <>
          <SheetCancel />
          <Button variant="primary" disabled={busy || !carrierId || used.has(carrierId)} onClick={save}>{busy ? 'Saving…' : 'Request quote'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Carrier" error={used.has(carrierId) ? 'This carrier is already quoted on this Opportunity.' : undefined}>
          <select className={inputCls} value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
            {writers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.note ? ` (${c.note})` : ''}</option>
            ))}
          </select>
        </Field>
        <p className="text-base text-label">Lines quoted: {carrier ? o.lines.filter((l) => carrier.lines.includes(l)).join(', ') : '—'}</p>
        {warnings.map((w) => (
          <Callout key={w.message} tone="warning" role="alert">
            {w.message} You can still request it; the warning stays on the Quote.
          </Callout>
        ))}
      </div>
    </Sheet>
  )
}

/** US-PIP-007 */
function RespondSheet({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const { user } = useApp()
  const { carrierName } = useLookups()
  const mutate = useMutate()
  const [status, setStatus] = useState<'Quoted' | 'Declined' | 'Referred'>('Quoted')
  const [premiums, setPremiums] = useState<Record<string, string>>({})
  const [declineReason, setDeclineReason] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = status !== 'Quoted' || quote.lines.every((l) => Number(premiums[l.line]) > 0)
  const save = async () => {
    setBusy(true)
    try {
      await mutate(
        (s) => s.recordQuoteResponse(quote.id, { status, premiums: Object.fromEntries(Object.entries(premiums).map(([k, v]) => [k, Number(v)])), declineReason: declineReason || undefined }, user.id),
        `${carrierName(quote.carrierId)}: ${status}`,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title="Record carrier response" description={carrierName(quote.carrierId)} busy={busy} footer={<><SheetCancel /><Button variant="primary" disabled={busy || !valid} onClick={save}>{busy ? 'Saving…' : 'Save response'}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Response">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {(quote.status === 'Referred' ? ['Quoted', 'Declined'] : ['Quoted', 'Declined', 'Referred']).map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        {status === 'Quoted' &&
          quote.lines.map((l) => (
            <Field key={l.line} label={`${l.line} annual premium`}>
              <input inputMode="numeric" className={inputCls} placeholder="$0" value={premiums[l.line] ?? ''} onChange={(e) => setPremiums({ ...premiums, [l.line]: e.target.value.replace(/[^\d]/g, '') })} />
            </Field>
          ))}
        {status === 'Declined' && (
          <Field label="Decline reason">
            <input className={inputCls} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="e.g. Roof age over 15 years" />
          </Field>
        )}
      </div>
    </Sheet>
  )
}

/** US-PIP-010: creates Bound Terms that show "Awaiting AMS" until the next sync matches the binder number. */
function WonSheet({ o, accepted, onClose }: { o: Opportunity; accepted: { q: Quote; l: Quote['lines'][number] }[]; onClose: () => void }) {
  const { user } = useApp()
  const { carrierName } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const [form, setForm] = useState(() => accepted.map(({ q, l }) => ({ line: l.line, quoteId: q.id, boundPremium: String(l.premium ?? ''), effective: iso(tomorrow), termMonths: l.line === 'Auto' ? 6 : 12, binderNumber: '' })))
  const [busy, setBusy] = useState(false)
  const valid = form.every((f) => Number(f.boundPremium) > 0 && f.binderNumber.trim().length >= 3 && f.effective)
  const save = async () => {
    setBusy(true)
    try {
      await mutate(
        (s) =>
          s.markWon(
            o.id,
            { lines: form.map((f) => ({ line: f.line, quoteId: f.quoteId, boundPremium: Number(f.boundPremium), effectiveDate: new Date(`${f.effective}T00:00`), termMonths: f.termMonths, binderNumber: f.binderNumber.trim() })) },
            user.id,
          ),
        'Opportunity won. Bound Terms are awaiting the AMS.',
      )
      onClose()
      navigate(`/accounts/${o.accountId}?tab=policies`)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title="Mark won" description="One Bound Term per accepted line. They show “Awaiting AMS” until the next sync." busy={busy} footer={<><SheetCancel /><Button variant="primary" disabled={busy || !valid} onClick={save}>{busy ? 'Binding…' : 'Mark won'}</Button></>}>
      <div className="flex flex-col gap-5">
        {form.map((f, i) => {
          const set = (patch: Partial<typeof f>) => setForm(form.map((x, j) => (j === i ? { ...x, ...patch } : x)))
          return (
            <fieldset key={f.line} className="flex flex-col gap-3 rounded-md p-3 shadow-ring">
              <legend className="px-1 text-base font-medium text-strong">{f.line} · {carrierName(accepted[i].q.carrierId)}</legend>
              <Field label="Bound premium" hint={`Quoted ${usd(accepted[i].l.premium)}`}>
                <input inputMode="numeric" className={inputCls} value={f.boundPremium} onChange={(e) => set({ boundPremium: e.target.value.replace(/[^\d]/g, '') })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Effective date">
                  <input type="date" className={inputCls} value={f.effective} min={iso(new Date())} onChange={(e) => set({ effective: e.target.value })} />
                </Field>
                <Field label="Term">
                  <select className={inputCls} value={f.termMonths} onChange={(e) => set({ termMonths: Number(e.target.value) })}>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                  </select>
                </Field>
              </div>
              <Field label="Binder number" hint="Required: the AMS sync matches Won Terms by binder number." error={f.binderNumber && f.binderNumber.trim().length < 3 ? 'At least 3 characters.' : undefined}>
                <input className={inputCls} value={f.binderNumber} onChange={(e) => set({ binderNumber: e.target.value })} placeholder="e.g. BND-48213" />
              </Field>
              <p className="text-sm text-muted">Expires {f.effective ? dateOf(offsetOfDate(addMonths(new Date(`${f.effective}T00:00`), f.termMonths))) : '—'}</p>
            </fieldset>
          )
        })}
      </div>
    </Sheet>
  )
}

/** US-PIP-011: reason (Other needs a note) and an X-date per line, checked by default where the line has one. */
export function LostDialog({ o, onClose }: { o: Opportunity; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const reasons = (data.settings?.lostReasons ?? []).filter((r) => !r.retired).map((r) => r.name)
  const [reason, setReason] = useState(reasons[0] ?? 'Other')
  const [note, setNote] = useState('')
  const lines = o.lines.map((line) => ({ line, d: o.lineDetails?.[line] }))
  const iso = (off: number) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const [picked, setPicked] = useState<Record<string, { on: boolean; date: string }>>(() => Object.fromEntries(lines.map(({ line, d }) => [line, { on: d?.xDateOffset != null, date: d?.xDateOffset != null ? iso(d.xDateOffset) : '' }])))
  return (
    <Confirm
      open
      onOpenChange={(v) => !v && onClose()}
      title="Mark as Lost"
      body="Open Quotes become Not taken and any acceptance is cleared. You can reopen within 90 days."
      confirmLabel="Mark lost"
      danger
      onConfirm={async () => {
        const xDates = reason === 'Duplicate' ? [] : lines.filter(({ line }) => picked[line].on && picked[line].date).map(({ line, d }) => ({ line, carrier: d?.currentCarrier ?? 'Unknown carrier', premium: d?.currentPremium ?? null, offset: offsetOfDate(new Date(`${picked[line].date}T12:00:00`)) }))
        await mutate((s) => s.markLost(o.id, reason, user.id, { note: note.trim() || undefined, xDates }), xDates.length ? `Marked Lost · ${xDates.length} X-date${xDates.length === 1 ? '' : 's'} saved` : 'Opportunity marked Lost')
        onClose()
      }}
    >
      <Field label="Reason">
        <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label={reason === 'Other' ? 'Note (required)' : 'Note (optional)'}><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {reason !== 'Duplicate' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-label">X-dates</legend>
          {lines.map(({ line, d }) => (
            <label key={line} className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={picked[line].on} onChange={(e) => setPicked({ ...picked, [line]: { ...picked[line], on: e.target.checked } })} className="size-4 accent-primary" />
              Create X-date: {line}{d?.currentCarrier ? `, current carrier ${d.currentCarrier}` : ''}{d?.currentPremium ? `, ${usd(d.currentPremium)}` : ''}
              <input type="date" aria-label={`${line} X-date`} value={picked[line].date} onChange={(e) => setPicked({ ...picked, [line]: { on: true, date: e.target.value } })} className={controlCls('sm')} />
            </label>
          ))}
        </fieldset>
      )}
    </Confirm>
  )
}

const LIST_VIEWS = ['My open', 'Closing this month', 'Cross-sell', 'Remarket']
/** US-PIP-002: list with saved views, filters in the URL, sort, 50 per page, and a row menu. */
function PipelineList({ opps, toggle, actions }: { opps: Opportunity[]; toggle: ReactNode; actions: ReactNode }) {
  const { data, user } = useApp()
  const { account, userName, office } = useLookups()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [lostFor, setLostFor] = useState<Opportunity | null>(null)
  const view = useView(LIST_VIEWS, 'saved')
  const agency = user.role === 'principal' || user.role === 'admin'
  const today = new Date()
  const firstOff = -(today.getDate() - 1)
  const lastOff = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()
  const isOpen = (o: Opportunity) => o.stage !== 'Won' && o.stage !== 'Lost'
  const mine = (o: Opportunity) => (user.role === 'producer' ? o.ownerId === user.id : user.role === 'account-manager' ? account(o.accountId)?.accountManagerId === user.id : true)
  const inView: Record<string, (o: Opportunity) => boolean> = {
    'My open': (o) => isOpen(o) && mine(o),
    'Closing this month': (o) => isOpen(o) && o.targetCloseOffset <= lastOff && (o.targetCloseOffset >= firstOff || o.targetCloseOffset < 0),
    'Cross-sell': (o) => isOpen(o) && o.type === 'Cross-sell',
    Remarket: (o) => isOpen(o) && o.type === 'Remarket',
  }
  const f = { stage: params.get('stage'), type: params.get('type'), line: params.get('line'), carrier: params.get('carrier'), producer: params.get('producer'), office: params.get('office'), nonext: params.get('nonext'), nudge: params.get('nudge') }
  const nudgeOk = nudgeTest(data)
  const hasNext = (id: string) => data.tasks.some((t) => t.status === 'Open' && t.linked?.kind === 'opportunity' && t.linked.id === id)
  const carriersOf = (id: string) => new Set(data.quotes.filter((q) => q.opportunityId === id).map((q) => q.carrierId))
  // Best quoted = lowest quoted premium per line, summed; else the estimate.
  const best = (o: Opportunity) => {
    const qs = data.quotes.filter((q) => q.opportunityId === o.id)
    const per = o.lines.map((line) => Math.min(...qs.flatMap((q) => q.lines.filter((l) => l.line === line && l.premium != null).map((l) => l.premium!))))
    return per.some(Number.isFinite) ? { v: per.filter(Number.isFinite).reduce((a, b) => a + b, 0), est: false } : { v: o.estimatedPremium, est: true }
  }
  const rows = opps
    .filter((o) => (f.stage ? o.stage === f.stage : inView[view](o)))
    .filter((o) => (!f.type || o.type === f.type) && (!f.line || o.lines.includes(f.line as Line)) && (!f.carrier || carriersOf(o.id).has(f.carrier)) && (!f.producer || o.ownerId === f.producer) && (!f.office || account(o.accountId)?.officeId === f.office) && (!f.nonext || (isOpen(o) && !hasNext(o.id))) && (!f.nudge || nudgeOk(f.nudge, o)))
  const counts = Object.fromEntries(LIST_VIEWS.map((v) => [v, opps.filter(inView[v]).length]))
  const sorted = params.get('sort') ? rows : [...rows].sort((a, b) => a.targetCloseOffset - b.targetCloseOffset)
  const cols: Column<Opportunity>[] = [
    { key: 'name', label: 'Opportunity', render: (o) => <PrimaryCell mono={oppCode(o.id)} name={o.name ?? `${account(o.accountId)?.name} · ${o.lines.join(', ')}`} to={`/pipeline/${o.id}`} />, csv: (o) => o.name ?? `${account(o.accountId)?.name} · ${o.lines.join(', ')}` },
    { key: 'type', label: 'Type', width: 110, sort: (a, b) => a.type.localeCompare(b.type), render: (o) => o.type },
    { key: 'status', label: 'Stage', width: 140, sort: (a, b) => OPEN_STAGES.indexOf(a.stage) - OPEN_STAGES.indexOf(b.stage), render: (o) => <StatusCell status={o.stage} />, csv: (o) => o.stage },
    { key: 'lines', label: 'Lines', width: 130, render: (o) => o.lines.join(', ') },
    { key: 'premium', label: 'Premium', width: 120, align: 'right', sort: (a, b) => best(a).v - best(b).v, render: (o) => { const b = best(o); return <span>{usd(b.v)}{b.est && <span className="text-sm text-muted"> est.</span>}</span> }, csv: (o) => best(o).v },
    { key: 'close', label: 'Target close', width: 120, mobile: true, sort: (a, b) => a.targetCloseOffset - b.targetCloseOffset, render: (o) => <Due tone={isOpen(o) && o.targetCloseOffset < 0 ? 'overdue' : null}>{dateOf(o.targetCloseOffset)}</Due>, csv: (o) => dateOf(o.targetCloseOffset) },
    { key: 'prob', label: 'Prob.', width: 70, align: 'right', sort: (a, b) => (a.probability ?? 0) - (b.probability ?? 0), render: (o) => (o.probability != null ? `${o.probability}%` : '—') },
    { key: 'producer', label: 'Producer', width: 140, sort: (a, b) => userName(a.ownerId).localeCompare(userName(b.ownerId)), render: (o) => userName(o.ownerId) },
    { key: 'office', label: 'Office', width: 100, render: (o) => office(account(o.accountId)!.officeId)?.name ?? '' },
    { key: 'days', label: 'Days in stage', width: 110, align: 'right', sort: (a, b) => a.stageEnteredOffset - b.stageEnteredOffset, render: (o) => -o.stageEnteredOffset },
    { key: 'comm', label: 'Est. commission', width: 130, align: 'right', hidden: !agency, render: (o) => usd(commissionFor(o, data.quotes, data.carriers).agency), csv: (o) => Math.round(commissionFor(o, data.quotes, data.carriers).agency) },
    {
      key: 'menu',
      label: '',
      width: 48,
      render: (o) => (
        <Menu.Root>
          <Menu.Trigger aria-label={`Actions for ${oppCode(o.id)}`} className="grid size-7 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong"><MoreHorizontal className="size-4" strokeWidth={1.75} /></Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={4} className={menuContent}>
              <Menu.Item className={menuItem} onSelect={() => navigate(`/pipeline/${o.id}`)}>Open</Menu.Item>
              <Menu.Item className={menuItem} onSelect={() => navigate(`/accounts/${o.accountId}`)}>Open Account</Menu.Item>
              {isOpen(o) && (user.role === 'principal' || o.ownerId === user.id) && <Menu.Item className={menuItem} onSelect={() => navigate(`/pipeline/${o.id}`)}>Mark as Won…</Menu.Item>}
              {isOpen(o) && (user.role === 'principal' || o.ownerId === user.id) && <Menu.Item className={menuItem} onSelect={() => setLostFor(o)}>Mark as Lost…</Menu.Item>}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      ),
      csv: () => '',
    },
  ]
  const lines = [...new Set(opps.flatMap((o) => o.lines))]
  const filters: FilterDef[] = [
    { k: 'stage', label: 'Stage', opts: [...OPEN_STAGES, 'Won', 'Lost'].map((x) => [x, x]) },
    { k: 'type', label: 'Type', opts: ['New business', 'Cross-sell', 'Remarket'].map((x) => [x, x]) },
    { k: 'line', label: 'Line', opts: lines.map((x) => [x, x]) },
    { k: 'carrier', label: 'Carrier quoted', opts: data.carriers.map((c) => [c.id, c.name]) },
    ...(agency
      ? ([
          { k: 'producer', label: 'Producer', opts: data.users.filter((u) => u.role === 'producer').map((u) => [u.id, u.name]) },
          { k: 'office', label: 'Office', opts: data.offices.map((o) => [o.id, o.name]) },
        ] as FilterDef[])
      : []),
    { k: 'nonext', label: 'Next step', opts: [['1', 'Missing']] },
  ]
  return (
    <>
      <ViewTabs param="saved" views={LIST_VIEWS} counts={counts} />
      <DataTable
        className="mt-4"
        toolbar={toggle}
        search={{ label: 'Search opportunities', placeholder: 'Search Account, ID, or line', match: (o, q) => `${account(o.accountId)?.name ?? ''} ${o.id} ${o.lines.join(' ')}`.toLowerCase().includes(q) }}
        filters={filters}
        actions={actions}
        extraChips={f.nudge ? [{ k: 'nudge', label: NUDGE_CHIP[f.nudge] }] : undefined}
        meta={f.stage ? 'Stage filter replaces the saved view.' : undefined}
        rows={sorted}
        pageSize={50}
        columns={cols}
        minWidth={1300}
        listId="pipeline"
        exportName="opportunities"
        onRowClick={(o) => navigate(`/pipeline/${o.id}`)}
        empty={<EmptyState icon={SearchX} title="No opportunities match these filters" body="Try a different search, or clear the filters." />}
      />
      {lostFor && <LostDialog o={lostFor} onClose={() => setLostFor(null)} />}
    </>
  )
}

const NUDGE_CHIP: Record<string, string> = { stale: 'In stage past stale threshold', expiring: 'Presented Quote expires within 7 days', overdue: 'Past target close date' }
/** US-PIP-016: shared tests for the nudge callout and the list filter. */
function nudgeTest(data: Dataset) {
  return (kind: string, o: Opportunity) => {
    if (!OPEN_STAGES.includes(o.stage)) return false
    if (kind === 'stale') return -o.stageEnteredOffset >= (data.settings?.stages[o.stage]?.staleDays ?? 14)
    if (kind === 'expiring') return data.quotes.some((q) => q.opportunityId === o.id && q.status === 'Presented' && q.validUntilOffset != null && q.validUntilOffset >= 0 && q.validUntilOffset <= 7)
    if (kind === 'overdue') return o.targetCloseOffset < 0
    return true
  }
}
function PipelineNudges({ opps }: { opps: Opportunity[] }) {
  const { data } = useApp()
  const test = nudgeTest(data)
  const n = (k: string) => opps.filter((o) => test(k, o)).length
  const q = data.quotes.filter((x) => opps.some((o) => o.id === x.opportunityId && OPEN_STAGES.includes(o.stage)) && x.status === 'Presented' && x.validUntilOffset != null && x.validUntilOffset >= 0 && x.validUntilOffset <= 7).length
  const items: AttentionItem[] = []
  if (n('stale')) items.push({ key: 'stale', title: `${n('stale')} Opportunities past their stage's stale threshold`, to: '/pipeline?view=list&nudge=stale' })
  if (q) items.push({ key: 'expiring', title: `${q} presented Quotes expire in the next 7 days`, to: '/pipeline?view=list&nudge=expiring' })
  if (n('overdue')) items.push({ key: 'overdue', title: `${n('overdue')} open Opportunities are past their target close date`, to: '/pipeline?view=list&nudge=overdue' })
  return <AttentionCallout items={items} storageKey="fortify.pipeline.nudges.collapsed" storage="session" max={3} />
}
