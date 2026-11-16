import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Trophy } from 'lucide-react'
import { useApp } from '@/app/store'
import { commissionFor } from '@/domain/commission'
import { TaskSheet } from './TaskSheet'
import { useIsMobile } from '@/app/media'
import { OpportunitySheet } from './OpportunitySheet'
import { dateOf, inDays, offsetOfDate, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditOpportunity, canSeeCommission, canSeeAccount, visibleAccounts } from '@/domain/access'
import { addMonths, checkStageMove } from '@/domain/rules'
import type { Line, Opportunity, OpportunityStage, Quote } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, KeyValue, PageTitle, Panel, RecordHeader, Sheet, SheetCancel, type Column } from '@/components/patterns'
import { Button, CountPill, cx, Tip } from '@/components/ui/primitives'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { StatusCell } from '@/components/ui/status'
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
        <div className="mt-4">
          <DataTable rows={[...open].sort((a, b) => OPEN_STAGES.indexOf(a.stage) - OPEN_STAGES.indexOf(b.stage))} columns={listCols} onRowClick={(o) => navigate(`/pipeline/${o.id}`)} />
        </div>
      </div>
    )
  const toggle = (
    <div role="group" aria-label="Layout" className="inline-flex rounded-md bg-recessed p-0.5">
      {(['board', 'list'] as const).map((v) => (
        <button key={v} aria-pressed={asList === (v === 'list')} onClick={() => { const n = new URLSearchParams(params); if (v === 'list') n.set('view', 'list'); else n.delete('view'); setParams(n, { replace: true }) }} className={cx('h-8 rounded-[5px] px-3 text-sm capitalize', asList === (v === 'list') ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:text-strong')}>
          {v}
        </button>
      ))}
    </div>
  )
  if (asList)
    return (
      <div className="px-8 pt-6 pb-10 max-sm:px-4">
        <PageTitle title="Pipeline" description={`${open.length} open Opportunities · ${usd(total)} estimated premium`} actions={user.role !== 'admin' && <Button variant="primary" onClick={() => setCreating(true)}><Plus aria-hidden className="size-4" /> {user.role === 'account-manager' ? 'Cross-sell opportunity' : 'Add opportunity'}</Button>} />
        <div className="mt-4 flex justify-end">{toggle}</div>
        <PipelineList opps={opps} />
        {creating && <OpportunitySheet onClose={() => setCreating(false)} />}
      </div>
    )
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle
        title="Pipeline"
        description={`${open.length} open Opportunities · ${usd(total)} estimated premium`}
        actions={
          user.role !== 'admin' && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus aria-hidden className="size-4" /> {user.role === 'account-manager' ? 'Cross-sell opportunity' : 'Add opportunity'}
            </Button>
          )
        }
      />
      {creating && <OpportunitySheet onClose={() => setCreating(false)} />}
      <div className="mt-4 flex justify-end">{toggle}</div>
      <div className="mt-3 grid grid-cols-5 gap-3 overflow-x-auto max-lg:min-w-[1000px]">
        {OPEN_STAGES.map((stage) => {
          const col = open.filter((o) => o.stage === stage).sort((a, b) => a.targetCloseOffset - b.targetCloseOffset)
          return (
            <section key={stage} aria-label={stage} className="flex min-w-0 flex-col rounded-md bg-recessed p-2">
              <h2 className="flex items-center justify-between px-1.5 pb-2 text-sm font-semibold text-strong">
                {stage}
                <span className="tabular font-normal text-label">{col.length} · {usd(col.reduce((s, o) => s + o.estimatedPremium, 0))}</span>
              </h2>
              <ol className="flex flex-col gap-2">
                {col.slice(0, 40).map((o) => (
                  <li key={o.id}>
                    <button onClick={() => navigate(`/pipeline/${o.id}`)} className="w-full rounded-md bg-surface p-2.5 text-left shadow-ring transition-shadow duration-150 hover:shadow-pop">
                      <span className="block truncate text-base font-medium text-strong">{account(o.accountId)?.name}</span>
                      <span className="block truncate text-sm text-label">{o.type} · {o.lines.join(', ')}</span>
                      <span className="tabular mt-1 flex justify-between text-sm text-muted">
                        <span>{usd(o.estimatedPremium)}</span>
                        <span className={cx(o.targetCloseOffset < 0 && 'text-danger-text')}>close {inDays(o.targetCloseOffset)}</span>
                      </span>
                      {user.role !== 'producer' && <span className="block truncate text-sm text-muted">{userName(o.ownerId)}</span>}
                      {!nextOf(o.id) && <span className="mt-0.5 block text-sm font-medium text-warning-text">No next step</span>}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
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
              <span className={cx(next && next.dueOffset < 0 && 'font-medium text-danger-text')}>
                Next step:{' '}
                {next ? (
                  `${next.title} · ${next.dueOffset < 0 ? `Overdue · due ${dateOf(next.dueOffset)}` : `due ${dateOf(next.dueOffset)}`}`
                ) : canEdit ? (
                  <button onClick={() => setNextStep(true)} className="text-link hover:underline">+ Add next step</button>
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
                    <Trophy aria-hidden className="size-4" /> Mark won
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
                    {d < 0 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
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
                    <Plus aria-hidden className="size-4" /> Add quote
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
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="h-10 border-b border-fill">
            <th className="px-3 text-base font-semibold text-strong">Carrier</th>
            <th className="w-36 px-3 text-base font-semibold text-strong">Status</th>
            {o.lines.map((l) => (
              <th key={l} className="w-44 px-3 text-right text-base font-semibold text-strong">{l}</th>
            ))}
            <th className="w-32 px-3" />
          </tr>
        </thead>
        <tbody>
          {incumbent && (
            <tr className="h-12 border-b border-fill bg-recessed">
              <td className="px-3 font-medium text-strong">Incumbent: {carrierName(incumbent.carrierId)} (renewal)</td>
              <td className="px-3 text-sm text-label">Baseline</td>
              {o.lines.map((line) => <td key={line} className="tabular px-3 text-right">{line === incumbent.line && incumbent.renewal != null ? usd(incumbent.renewal) : <span className="text-muted">—</span>}</td>)}
              <td />
            </tr>
          )}
          {quotes.map((q) => (
            <tr key={q.id} className="h-12 border-b border-fill last:border-0">
              <td className="px-3">
                <span className="font-medium text-strong">{carrierName(q.carrierId)}</span>
                {q.warnings.length > 0 && (
                  <Tip label={q.warnings.map((w) => w.message).join(' ')}>
                    <AlertTriangle aria-label="Warning" className="ml-1.5 inline size-4 text-warning-text" />
                  </Tip>
                )}
                {q.declineReason && <span className="block text-sm text-muted">{q.declineReason}</span>}
              </td>
              <td className="px-3"><StatusCell status={q.status} /></td>
              {o.lines.map((line) => {
                const ql = q.lines.find((l) => l.line === line)
                const isLow = ql?.premium != null && ql.premium === lowest[line]
                const acceptable = canEdit && ql?.premium != null && (q.status === 'Presented' || q.status === 'Quoted')
                return (
                  <td key={line} className="tabular px-3 text-right">
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
              <td className="px-3 text-right">
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
          <p key={w.message} role="alert" className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2 text-base text-ink shadow-ring">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-text" /> {w.message} You can still request it; the warning stays on the Quote.
          </p>
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
  const { user } = useApp()
  const mutate = useMutate()
  const [reason, setReason] = useState('Price')
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
          {['Price', 'Coverage', 'Stayed with current carrier', 'No response', 'All carriers declined', 'Not eligible', 'Duplicate', 'Other'].map((r) => <option key={r}>{r}</option>)}
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
              <input type="date" aria-label={`${line} X-date`} value={picked[line].date} onChange={(e) => setPicked({ ...picked, [line]: { on: true, date: e.target.value } })} className="h-8 rounded-md bg-surface px-2 text-sm shadow-control" />
            </label>
          ))}
        </fieldset>
      )}
    </Confirm>
  )
}

const LIST_VIEWS = ['My open', 'Closing this month', 'Cross-sell', 'Remarket']
/** US-PIP-002: list with saved views, filters in the URL, sort, 50 per page, and a row menu. */
function PipelineList({ opps }: { opps: Opportunity[] }) {
  const { data, user } = useApp()
  const { account, userName, office } = useLookups()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [lostFor, setLostFor] = useState<Opportunity | null>(null)
  const view = (() => { const v = params.get('saved'); return LIST_VIEWS.find((x) => x.toLowerCase().replace(/\s+/g, '-') === v) ?? LIST_VIEWS[0] })()
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true }) }
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
  const f = { stage: params.get('stage'), type: params.get('type'), line: params.get('line'), carrier: params.get('carrier'), producer: params.get('producer'), office: params.get('office'), nonext: params.get('nonext') }
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
    .filter((o) => (!f.type || o.type === f.type) && (!f.line || o.lines.includes(f.line as Line)) && (!f.carrier || carriersOf(o.id).has(f.carrier)) && (!f.producer || o.ownerId === f.producer) && (!f.office || account(o.accountId)?.officeId === f.office) && (!f.nonext || (isOpen(o) && !hasNext(o.id))))
  const counts = Object.fromEntries(LIST_VIEWS.map((v) => [v, opps.filter(inView[v]).length]))
  const sorted = params.get('sort') ? rows : [...rows].sort((a, b) => a.targetCloseOffset - b.targetCloseOffset)
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageRows = sorted.slice((page - 1) * 50, page * 50)
  const cols: Column<Opportunity>[] = [
    { key: 'name', label: 'Opportunity', render: (o) => <span className="flex min-w-0 items-baseline gap-2"><Link to={`/pipeline/${o.id}`} className="truncate font-medium text-strong hover:text-link hover:underline">{o.name ?? `${account(o.accountId)?.name} · ${o.lines.join(', ')}`}</Link><span className="shrink-0 font-mono text-xs text-muted">{oppCode(o.id)}</span></span>, csv: (o) => o.name ?? `${account(o.accountId)?.name} · ${o.lines.join(', ')}` },
    { key: 'type', label: 'Type', width: 110, sort: (a, b) => a.type.localeCompare(b.type), render: (o) => o.type },
    { key: 'status', label: 'Stage', width: 140, sort: (a, b) => OPEN_STAGES.indexOf(a.stage) - OPEN_STAGES.indexOf(b.stage), render: (o) => <StatusCell status={o.stage} />, csv: (o) => o.stage },
    { key: 'lines', label: 'Lines', width: 130, render: (o) => o.lines.join(', ') },
    { key: 'premium', label: 'Premium', width: 120, align: 'right', sort: (a, b) => best(a).v - best(b).v, render: (o) => { const b = best(o); return <span>{usd(b.v)}{b.est && <span className="text-sm text-muted"> est.</span>}</span> }, csv: (o) => best(o).v },
    { key: 'close', label: 'Target close', width: 120, mobile: true, sort: (a, b) => a.targetCloseOffset - b.targetCloseOffset, render: (o) => <span className={cx('tabular', isOpen(o) && o.targetCloseOffset < 0 && 'font-medium text-danger-text')}>{dateOf(o.targetCloseOffset)}</span>, csv: (o) => dateOf(o.targetCloseOffset) },
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
          <Menu.Trigger aria-label={`Actions for ${oppCode(o.id)}`} className="grid size-7 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong"><MoreHorizontal className="size-4" /></Menu.Trigger>
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
  const select = (k: string, label: string, opts: [string, string][]) => (
    <select aria-label={label} value={params.get(k) ?? ''} onChange={(e) => set(k, e.target.value || null)} className="h-8 rounded-md bg-surface px-2 text-sm shadow-control">
      <option value="">{label}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
  return (
    <>
      <nav aria-label="Saved views" className="mt-2 flex gap-1 overflow-x-auto border-b border-line">
        {LIST_VIEWS.map((v) => (
          <button key={v} aria-current={v === view ? 'page' : undefined} onClick={() => set('saved', v === LIST_VIEWS[0] ? null : v.toLowerCase().replace(/\s+/g, '-'))} className={cx('-mb-px flex items-center gap-2 border-b-2 px-2.5 py-2 text-base whitespace-nowrap', v === view ? 'border-strong font-medium text-strong' : 'border-transparent text-label hover:text-strong')}>
            {v} <CountPill n={counts[v]} />
          </button>
        ))}
      </nav>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {select('stage', 'Stage', [...OPEN_STAGES, 'Won', 'Lost'].map((x) => [x, x]))}
        {select('type', 'Type', ['New business', 'Cross-sell', 'Remarket'].map((x) => [x, x]))}
        {select('line', 'Line', lines.map((x) => [x, x]))}
        {select('carrier', 'Carrier quoted', data.carriers.map((c) => [c.id, c.name]))}
        {agency && select('producer', 'Producer', data.users.filter((u) => u.role === 'producer').map((u) => [u.id, u.name]))}
        {agency && select('office', 'Office', data.offices.map((o) => [o.id, o.name]))}
        <label className="inline-flex items-center gap-1.5 text-sm text-label"><input type="checkbox" checked={!!f.nonext} onChange={(e) => set('nonext', e.target.checked ? '1' : null)} className="size-4 accent-primary" /> No next step</label>
        {Object.values(f).some(Boolean) && <button onClick={() => { const n = new URLSearchParams(); n.set('view', 'list'); if (params.get('saved')) n.set('saved', params.get('saved')!); setParams(n, { replace: true }) }} className="text-sm text-link hover:underline">Clear filters</button>}
      </div>
      {f.stage && <p className="mt-2 text-sm text-label">Stage filter replaces the saved view.</p>}
      <div className="mt-3">
        <DataTable rows={pageRows} columns={cols} minWidth={1300} listId="pipeline" exportName="opportunities" onRowClick={(o) => navigate(`/pipeline/${o.id}`)} empty={<p className="p-6 text-center text-base text-muted">No opportunities match.</p>} />
      </div>
      {sorted.length > 50 && (
        <div className="tabular mt-3 flex items-center justify-between text-sm text-label">
          <span>{(page - 1) * 50 + 1}–{Math.min(page * 50, sorted.length)} of {sorted.length}</span>
          <span className="flex gap-2">
            <Button size="sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</Button>
            <Button size="sm" disabled={page * 50 >= sorted.length} onClick={() => set('page', String(page + 1))}>Next</Button>
          </span>
        </div>
      )}
      {lostFor && <LostDialog o={lostFor} onClose={() => setLostFor(null)} />}
    </>
  )
}
