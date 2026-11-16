import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight, Plus, Trophy } from 'lucide-react'
import { useApp } from '@/app/store'
import { OpportunitySheet } from './OpportunitySheet'
import { dateOf, inDays, offsetOfDate, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditOpportunity, canSeeAccount, visibleAccounts } from '@/domain/access'
import { addMonths, checkStageMove } from '@/domain/rules'
import type { Line, Opportunity, OpportunityStage, Quote } from '@/domain/types'
import { Confirm, Field, Gate, inputCls, KeyValue, PageTitle, Panel, RecordHeader, Sheet, SheetCancel } from '@/components/patterns'
import { Button, cx, Tip } from '@/components/ui/primitives'
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
      <div className="mt-6 grid grid-cols-5 gap-3 overflow-x-auto max-lg:min-w-[1000px]">
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
  const [lostReason, setLostReason] = useState('Price')
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
          </>
        }
        actions={
          !closed && (
            <Gate allowed={canEdit} reason={editReason}>
              <span className="flex gap-2">
                <Button onClick={() => setEditing(true)}>Edit</Button>
                <Button onClick={() => setLost(true)}>Mark lost</Button>
                <Gate allowed={accepted.length > 0} reason="Accept at least one Quote line first.">
                  <Button variant="primary" onClick={() => setWon(true)}>
                    <Trophy aria-hidden className="size-4" /> Mark won
                  </Button>
                </Gate>
              </span>
            </Gate>
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
            <QuoteMatrix o={o} quotes={quotes} canEdit={canEdit && !closed} onRespond={setRespond} />
          )}
        </Panel>

        <div className="grid grid-cols-[1fr_360px] gap-4 max-lg:grid-cols-1">
          <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'opportunity', id: o.id }} />}>
            <ActivityTimeline linked={{ kind: 'opportunity', id: o.id }} accountId={account.id} />
          </Panel>
          <Panel title="Details">
            <KeyValue items={[['Type', o.type], ['Lines', o.lines.join(', ')], ['Estimated premium', usd(o.estimatedPremium)], ['Source', o.source], ['Created', dateOf(o.createdOffset)], ['Carriers quoted', quotes.map((q) => carrierName(q.carrierId)).join(', ') || null]]} />
          </Panel>
        </div>
      </div>

      {addQuote && <AddQuoteSheet o={o} onClose={() => setAddQuote(false)} />}
      {respond && <RespondSheet quote={respond} onClose={() => setRespond(null)} />}
      {editing && <OpportunitySheet opportunity={o} onClose={() => setEditing(false)} />}
      {won && <WonSheet o={o} accepted={accepted} onClose={() => setWon(false)} />}
      <Confirm
        open={lost}
        onOpenChange={setLost}
        title={`Mark ${account.name} Lost?`}
        body="Open Quotes become Not taken. You can’t undo this."
        confirmLabel="Mark lost"
        danger
        onConfirm={() => mutate((s) => s.markLost(o.id, lostReason, user.id), 'Opportunity marked Lost')}
      >
        <Field label="Reason">
          <select className={inputCls} value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
            {['Price', 'Coverage', 'Stayed with incumbent', 'No decision', 'Not eligible'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </Confirm>
    </div>
  )
}

/** US-PIP-008 / US-PIP-009: carriers as rows, lines as columns, lowest premium labelled; accept per line. */
function QuoteMatrix({ o, quotes, canEdit, onRespond }: { o: Opportunity; quotes: Quote[]; canEdit: boolean; onRespond: (q: Quote) => void }) {
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
