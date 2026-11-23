import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, inDays, usd, useLookups } from '@/app/hooks'
import { canSeeCommission, visibleAccounts } from '@/domain/access'
import { commissionFor } from '@/domain/commission'
import { closeRatio, retention, wonPremium } from '@/domain/metrics'
import { businessHoursBetween } from '@/domain/sla'
import type { Certificate, Task } from '@/domain/types'
import { LineChart } from '@/components/charts'
import { Badge, CountPill, cx, Due, RateChange, Segmented, SubHeading, Tip } from '@/components/ui/primitives'
import { mini } from '@/components/patterns'
import { dueTone } from '@/domain/urgency'
import { StatusCell } from '@/components/ui/status'
import { fmtTime, TaskSheet, useCompleteTask } from './TaskSheet'
import { changePct, useRisk } from './RenewalsPages'

export function Widget({ title, count, to, figures, children, toolbar }: { title: string; count?: number; to?: string; figures?: ReactNode; toolbar?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md bg-surface shadow-ring">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3 pb-2">
        <h2 className="text-lg font-medium text-strong">{title}</h2>
        {count != null && <CountPill n={count} />}
        {figures && <div className="flex flex-wrap items-baseline gap-x-4 text-sm text-label">{figures}</div>}
        {to && <Link to={to} className="ml-auto text-sm text-link hover:underline">View all</Link>}
      </header>
      {toolbar && <div className="px-4 pb-2">{toolbar}</div>}
      {children}
    </section>
  )
}
const opts = <T extends string>(...vs: T[]) => vs.map((v) => ({ value: v, label: v }))
const monthBounds = () => {
  const d = new Date()
  const first = -(d.getDate() - 1)
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return { first, day: d.getDate(), days }
}
const yearBounds = () => {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 1)
  const day = Math.floor((d.getTime() - start.getTime()) / 86_400_000) + 1
  return { first: -(day - 1), day, days: 365 }
}
const provisions = (c: Certificate) => [c.additionalInsured && 'Additional insured', c.waiver && 'Waiver of subrogation', c.primaryNonContrib && 'Primary & noncontributory'].filter(Boolean).join(' · ') || 'Holder only'

/** US-HOM-004 */
export function UpcomingXDates() {
  const { data, user } = useApp()
  const { account } = useLookups()
  const navigate = useNavigate()
  const mine = new Set(data.accounts.filter((a) => a.producerId === user.id && a.lifecycle === 'active').map((a) => a.id))
  const list = data.xDates.filter((x) => mine.has(x.accountId) && x.xDateOffset >= 0 && x.xDateOffset <= 90 && x.interestLevel !== 'Closed').sort((a, b) => a.xDateOffset - b.xDateOffset)
  return (
    <Widget title="Upcoming X-dates" count={list.length} to="/x-dates">
      {list.length ? (
        <ul className="divide-y divide-fill border-t border-fill">
          {list.slice(0, 6).map((x) => {
            const a = account(x.accountId)!
            const w = a.kind === 'Business' ? 90 : 45
            const task = x.followUpTaskId ? data.tasks.find((t) => t.id === x.followUpTaskId) : undefined
            return (
              <li key={x.id}>
                <button onClick={() => navigate(`/accounts/${a.id}?tab=sales`)} className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 text-left hover:bg-recessed">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-strong">{a.name} <span className="text-sm font-normal text-muted">· {a.status}</span></span>
                    <span className="block truncate text-sm text-label">{x.line} · {x.currentCarrier}{x.premium ? ` · ${usd(x.premium)}` : ''}</span>
                  </span>
                  <span className="tabular text-right text-sm">{dateOf(x.xDateOffset)}<span className="block text-muted">{inDays(x.xDateOffset)}</span></span>
                  <span className="flex items-center gap-2">
                    {x.xDateOffset <= w && <Tip label={`Quote window open.${task ? ` A Task was created on ${dateOf(task.dueOffset)}.` : ''}`}><Info aria-label="Quote window open" className="size-4 text-link" strokeWidth={1.75} /></Tip>}
                    <StatusCell status={x.interestLevel === 'High' ? 'High' : x.interestLevel === 'Low' ? 'Low' : 'Medium'} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-base text-muted">No X-dates in the next 90 days.</p>
      )}
    </Widget>
  )
}

/** US-HOM-005: goals are set by a Principal and read-only here. */
export function GoalPacing() {
  const { data, user } = useApp()
  const [period, setPeriod] = useState<'Month' | 'Year to date'>('Month')
  const g = data.users.find((u) => u.id === user.id)?.goals
  if (!g) return null
  const b = period === 'Month' ? monthBounds() : yearBounds()
  const mine = data.opportunities.filter((o) => o.ownerId === user.id)
  const won = wonPremium(mine, data.quotes, b.first, 0)
  const goal = period === 'Month' ? g.monthlyPremium : g.annualPremium
  const should = Math.round((goal * b.day) / b.days)
  const pct = won.premium / goal
  const wonOpps = mine.filter((o) => o.stage === 'Won' && o.type !== 'Remarket' && (o.closedOffset ?? -9999) >= b.first)
  const commission = wonOpps.reduce((n, o) => n + commissionFor(o, data.quotes, data.carriers).producer, 0)
  return (
    <Widget title="Goal pacing" toolbar={<Segmented size="sm" label="Period" value={period} options={opts('Month', 'Year to date')} onChange={setPeriod} />}>
      <div className="px-4 pb-4">
        <p className="text-sm text-muted">Set by your Principal</p>
        <dl className="tabular mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-base">
          <dt className="text-label">Goal</dt><dd className="text-right">{usd(goal)}</dd>
          <dt className="text-label">Currently at</dt><dd className="text-right">{usd(won.premium)} · {Math.round(pct * 100)}%</dd>
          <dt className="text-label">Should be at</dt><dd className="text-right">{usd(should)} <span className="text-sm text-muted">day {b.day} of {b.days}</span></dd>
          <dt className="text-label">Still needed</dt><dd className="text-right">{usd(Math.max(0, goal - won.premium))}</dd>
        </dl>
        <div className="mt-3 h-2 rounded-full bg-fill"><div className="h-2 rounded-full bg-strong" style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
        <p className={cx('mt-2 text-sm font-medium', won.premium < should ? 'text-warning-text' : 'text-success-text')}>{won.premium < should ? `Behind pace by ${usd(should - won.premium)}` : `Ahead of pace by ${usd(won.premium - should)}`}</p>
        <p className="tabular mt-1 text-sm text-label">Policies: {won.count} of {period === 'Month' ? g.monthlyPolicies : g.annualPolicies}</p>
        {canSeeCommission(user, user.id) && <p className="tabular mt-1 text-sm text-label">Est. new commission {usd(commission)}</p>}
      </div>
    </Widget>
  )
}

/** US-HOM-006: tasks due today or earlier (with Undo) and today's meetings. */
export function MyDay() {
  const { data, user } = useApp()
  const { account } = useLookups()
  const navigate = useNavigate()
  const complete = useCompleteTask()
  const [open, setOpen] = useState<Task | null>(null)
  const now = new Date()
  const nowT = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const mine = data.tasks.filter((t) => t.assigneeId === user.id && t.status === 'Open')
  const tasks = mine.filter((t) => t.type !== 'Meeting' && t.dueOffset <= 0).sort((a, b) => a.dueOffset - b.dueOffset || (a.dueTime ?? '99').localeCompare(b.dueTime ?? '99'))
  const meetings = data.tasks.filter((t) => t.assigneeId === user.id && t.type === 'Meeting' && t.dueOffset === 0 && t.status !== 'Canceled').sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))
  const nextMeeting = meetings.find((m) => m.status === 'Open' && (m.dueTime ?? '') >= nowT)
  const go = (t: Task) => navigate(t.linked?.kind === 'renewal' ? `/renewals/${t.linked.id}` : t.linked?.kind === 'opportunity' ? `/pipeline/${t.linked.id}` : t.linked?.kind === 'service' ? `/service/${t.linked.id}` : `/accounts/${t.accountId}`)
  return (
    <Widget title="My day" count={tasks.length} to="/tasks">
      {open && <TaskSheet task={open} onClose={() => setOpen(null)} />}
      {tasks.length ? (
        <ul className="divide-y divide-fill border-t border-fill">
          {tasks.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-4 py-2">
              <input type="checkbox" aria-label={`Complete ${t.title}`} disabled={user.role === 'admin'} onChange={() => complete(t)} className="mt-1 size-4 accent-primary" />
              <span className="min-w-0 flex-1">
                <button onClick={() => go(t)} className="block max-w-full truncate text-left text-base text-strong hover:underline">{t.title}</button>
                <span className="block truncate text-sm text-muted">{account(t.accountId)?.name} · {t.source === 'Manual' ? t.type : t.source}</span>
              </span>
              <Due tone={t.dueOffset < 0 ? 'overdue' : null} className={cx('shrink-0 text-sm', t.dueOffset >= 0 && 'text-label')}>{t.dueOffset < 0 ? `Overdue ${-t.dueOffset}d` : t.dueTime ? `Due ${fmtTime(t.dueTime)}` : 'Due today'}</Due>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-3 text-base text-muted">Nothing due today.</p>
      )}
      <div className="flex items-center justify-between border-t border-fill px-4 pt-3 pb-1">
        <SubHeading>Meetings</SubHeading>
        <Link to={`/calendar?view=day`} className="text-sm text-link hover:underline">View all</Link>
      </div>
      {meetings.length ? (
        <ul className="pb-2">
          {meetings.map((m) => {
            const past = (m.dueTime ?? '') < nowT || m.status === 'Done'
            return (
              <li key={m.id}>
                <button onClick={() => setOpen(m)} className={cx('flex w-full items-center gap-2 px-4 py-1.5 text-left text-base hover:bg-recessed', past && 'text-muted')}>
                  <span className="tabular w-20 shrink-0 text-sm">{m.dueTime ? fmtTime(m.dueTime) : ''}</span>
                  <span className="min-w-0 flex-1 truncate">{m.title} · {account(m.accountId)?.name}</span>
                  {m === nextMeeting && <Badge>Next</Badge>}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-base text-muted">No meetings today.</p>
      )}
    </Widget>
  )
}

const ageOf = (iso?: string | null) => (iso ? businessHoursBetween(new Date(iso), new Date()) : 0)
const ageText = (h: number) => (h >= 9 ? `${Math.floor(h / 9)}d` : `${Math.max(1, Math.round(h))}h`)

/** US-HOM-009 */
export function CertificatesWaiting() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'To issue' | 'In review'>('To issue')
  const office = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const certs = (data.certificates ?? []).filter((c) => office.has(c.accountId))
  const list = certs.filter((c) => (tab === 'To issue' ? c.status === 'Requested' : c.status === 'Needs review')).sort((a, b) => a.createdOffset - b.createdOffset)
  const principals = data.users.filter((u) => u.role === 'principal')
  return (
    <Widget title="Certificates waiting" count={certs.filter((c) => c.status === 'Requested' || c.status === 'Needs review').length} to={tab === 'In review' ? '/certificates?view=needs-review' : '/certificates'} toolbar={<Segmented size="sm" label="Certificates" value={tab} options={opts('To issue', 'In review')} onChange={setTab} />}>
      {list.length ? (
        <ul className="divide-y divide-fill border-t border-fill">
          {list.slice(0, 6).map((c) => {
            const h = ageOf(c.history?.[0]?.at)
            return (
              <li key={c.id}>
                <button onClick={() => navigate(`/certificates/${c.id}`)} className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-2 text-left hover:bg-recessed">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-strong">{data.holders?.find((x) => x.id === c.holderId)?.name}</span>
                    <span className="block truncate text-sm text-muted">{account(c.accountId)?.name} · {provisions(c)}</span>
                    {tab === 'In review' && <span className="block text-sm text-label">Waiting on {principals.filter((p) => p.id !== c.submittedById).map((p) => userName(p.id)).join(' or ')}</span>}
                  </span>
                  <Due tone={tab === 'To issue' && h > 4 ? 'soon' : null} className={cx('text-sm', !(tab === 'To issue' && h > 4) && 'text-label')}>{ageText(h)}</Due>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-base text-muted">{tab === 'To issue' ? 'No certificates to issue.' : 'Nothing waiting for review.'}</p>
      )}
    </Widget>
  )
}

/** US-HOM-010 */
export function AgencyPipeline() {
  const { data, user, officeFilter } = useApp()
  const { userName, office } = useLookups()
  const navigate = useNavigate()
  const accts = new Map(visibleAccounts(user, data.accounts).filter((a) => !officeFilter || a.officeId === officeFilter).map((a) => [a.id, a]))
  const opps = data.opportunities.filter((o) => accts.has(o.accountId))
  const open = opps.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')
  const m = monthBounds()
  const thisMonth = wonPremium(opps, data.quotes, m.first, 0)
  const lastMonthSame = wonPremium(opps, data.quotes, m.first - 30, m.first - 30 + m.day - 1)
  const delta = lastMonthSame.premium ? (thisMonth.premium - lastMonthSame.premium) / lastMonthSame.premium : 0
  const ratio = closeRatio(opps, -90)
  const cumulative = (from: number) => { let n = 0; return Array.from({ length: m.days }, (_, i) => { n += wonPremium(opps, data.quotes, from + i, from + i).premium; return n }) }
  const cur = cumulative(m.first)
  const prev = cumulative(m.first - 30)
  const series = cur.map((v, i) => ({ day: String(i + 1), current: i < m.day ? v : (undefined as unknown as number), last: prev[i] }))
  const producers = data.users.filter((u) => u.role === 'producer' && (!officeFilter || u.officeId === officeFilter))
  const board = producers
    .map((p) => {
      const mine = opps.filter((o) => o.ownerId === p.id)
      const won = wonPremium(mine, data.quotes, m.first, 0)
      return { p, won: won.premium, goal: p.goals ? won.premium / p.goals.monthlyPremium : 0, pipe: mine.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost').reduce((n, o) => n + o.estimatedPremium, 0), ratio: closeRatio(mine, -90), comm: mine.filter((o) => o.stage === 'Won' && (o.closedOffset ?? -999) >= m.first).reduce((n, o) => n + commissionFor(o, data.quotes, data.carriers).producer, 0) }
    })
    .sort((a, b) => b.won - a.won)
  const card = (label: string, value: string, sub?: ReactNode) => (
    <div className="rounded-md bg-recessed p-3">
      <p className="text-sm text-label">{label}</p>
      <p className="tabular text-metric font-semibold text-strong">{value}</p>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  )
  return (
    <Widget title="Agency pipeline" to="/reports">
      <div className="grid grid-cols-3 gap-3 px-4 pb-3 max-sm:grid-cols-1">
        {card('Open pipeline', `${usd(open.reduce((n, o) => n + o.estimatedPremium, 0))}`, <span className="text-label">{open.length} open</span>)}
        {card('Won this month', usd(thisMonth.premium), lastMonthSame.premium < 1000 ? <span className="text-label">vs {usd(lastMonthSame.premium)} same day last month</span> : <span className={delta >= 0 ? 'text-success-text' : 'text-danger-text'}>{delta >= 0 ? '+' : '−'}{Math.abs(delta * 100).toFixed(1)}% vs same day last month</span>)}
        {card('Close ratio, last 90 days', `${(ratio * 100).toFixed(1)}%`)}
      </div>
      <div className="px-4 pb-3">
        <LineChart data={series} x="day" series={[{ key: 'current', label: 'This month' }, { key: 'last', label: 'Last month' }]} summary={`Won premium this month ${usd(thisMonth.premium)}, ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta * 100).toFixed(1)}% from the same day last month.`} height={160} />
      </div>
      <div className="overflow-x-auto border-t border-fill">
        <table className={cx(mini.table, 'tabular min-w-[720px]')}>
          <thead><tr className={mini.head}><th className={mini.th}>Producer</th><th className={mini.th}>Office</th><th className={cx(mini.th, 'text-right')}>Won this month</th><th className={cx(mini.th, 'text-right')}>Goal</th><th className={cx(mini.th, 'text-right')}>Open pipeline</th><th className={cx(mini.th, 'text-right')}>Close ratio</th><th className={cx(mini.th, 'text-right')}>Est. commission</th></tr></thead>
          <tbody>
            {board.map((r) => (
              <tr key={r.p.id} onClick={() => navigate(`/pipeline?view=list&producer=${r.p.id}`)} className={cx(mini.tr, 'cursor-pointer hover:bg-recessed')}>
                <td className={cx(mini.td, 'font-medium text-strong')}>{userName(r.p.id)}</td>
                <td className={cx(mini.td, 'text-label')}>{office(r.p.officeId)?.name}</td>
                <td className={cx(mini.td, 'text-right')}>{usd(r.won)}</td>
                <td className={cx(mini.td, 'text-right')}>{Math.round(r.goal * 100)}%</td>
                <td className={cx(mini.td, 'text-right')}>{usd(r.pipe)}</td>
                <td className={cx(mini.td, 'text-right')}>{(r.ratio * 100).toFixed(0)}%</td>
                <td className={cx(mini.td, 'text-right')}>{usd(r.comm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  )
}

/** US-HOM-011 */
export function RetentionWidget() {
  const { data, user, officeFilter } = useApp()
  const { account, userName } = useLookups()
  const navigate = useNavigate()
  const risk = useRisk()
  const accts = new Map(visibleAccounts(user, data.accounts).filter((a) => !officeFilter || a.officeId === officeFilter).map((a) => [a.id, a]))
  const pols = new Set(data.policies.filter((p) => accts.has(p.accountId)).map((p) => p.id))
  const terms = data.terms.filter((t) => pols.has(t.policyId))
  const now = retention(terms, -365, 0)
  const prev = retention(terms, -730, -366)
  const termOf = new Map(data.terms.map((t) => [t.id, t]))
  const atRisk = data.renewals
    .filter((r) => accts.has(r.accountId) && r.status !== 'Done' && r.status !== 'Decided')
    .map((r) => ({ r, t: termOf.get(r.termId)! }))
    .filter(({ r, t }) => t.expirationOffset <= 60 && risk(r, t).length > 0)
    .sort((a, b) => b.t.premium - a.t.premium)
  const stake = atRisk.reduce((n, { t }) => n + t.premium, 0)
  const noRemarket = atRisk.filter(({ r }) => r.status === 'Upcoming' || r.status === 'In review').length
  const diff = (now.rate - prev.rate) * 100
  return (
    <Widget title="Retention" to="/renewals?view=at-risk">
      <div className="flex flex-wrap items-baseline gap-x-4 px-4 pb-2">
        <span className="tabular text-metric font-semibold text-strong">{(now.rate * 100).toFixed(1)}%</span>
        <span className={cx('text-sm', diff >= 0 ? 'text-success-text' : 'text-danger-text')}>{diff >= 0 ? '+' : '−'}{Math.abs(diff).toFixed(1)} pts</span>
        <span className="tabular text-sm text-label">{now.retained.toLocaleString('en-US')} of {now.total.toLocaleString('en-US')} Terms retained · trailing 12 months</span>
      </div>
      <p className="tabular px-4 pb-2 text-sm text-label">{usd(stake)} premium at stake across {atRisk.length} Renewals · {noRemarket} with no remarket started</p>
      {atRisk.length > 0 && (
        <div className="overflow-x-auto border-t border-fill">
          <table className={cx(mini.table, 'tabular min-w-[760px]')}>
            <thead><tr className={mini.head}><th className={mini.th}>Account</th><th className={mini.th}>Account Manager</th><th className={mini.th}>Producer</th><th className={cx(mini.th, 'text-right')}>Premium</th><th className={cx(mini.th, 'text-right')}>Change</th><th className={mini.th}>Expiration</th><th className={mini.th}>Status</th></tr></thead>
            <tbody>
              {atRisk.slice(0, 8).map(({ r, t }) => {
                const pct = changePct(r, t)
                return (
                  <tr key={r.id} onClick={() => navigate(`/renewals/${r.id}`)} className={cx(mini.tr, 'cursor-pointer hover:bg-recessed')}>
                    <td className={cx(mini.td, 'max-w-0 truncate font-medium text-strong')}>{account(r.accountId)?.name}</td>
                    <td className={cx(mini.td, 'text-label')}>{userName(r.ownerId)}</td>
                    <td className={cx(mini.td, 'text-label')}>{userName(account(r.accountId)?.producerId)}</td>
                    <td className={cx(mini.td, 'text-right')}>{usd(t.premium)}</td>
                    <td className={cx(mini.td, 'text-right')}><RateChange pct={pct} /></td>
                    <td className={mini.td}>{dateOf(t.expirationOffset)}</td>
                    <td className={mini.td}><StatusCell status={r.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Widget>
  )
}

/** US-HOM-012 */
export function CertificateApprovals() {
  const { data, user, officeFilter } = useApp()
  const { account, userName } = useLookups()
  const navigate = useNavigate()
  const accts = new Set(visibleAccounts(user, data.accounts).filter((a) => !officeFilter || a.officeId === officeFilter).map((a) => a.id))
  const list = (data.certificates ?? []).filter((c) => c.status === 'Needs review' && accts.has(c.accountId)).sort((a, b) => ageOf(b.submittedAt) - ageOf(a.submittedAt))
  return (
    <Widget title="Certificate approvals" count={list.length} to="/certificates?view=needs-review">
      {list.length ? (
        <ul className="divide-y divide-fill border-t border-fill">
          {list.slice(0, 6).map((c) => {
            const h = ageOf(c.submittedAt)
            const own = [c.submittedById, c.preparedById, c.createdById].includes(user.id)
            return (
              <li key={c.id}>
                <button onClick={() => navigate(`/certificates/${c.id}?mode=review`)} className="grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-2 text-left hover:bg-recessed">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-strong">{data.holders?.find((x) => x.id === c.holderId)?.name}</span>
                    <span className="block truncate text-sm text-muted">{account(c.accountId)?.name} · Prepared by {userName(c.preparedById ?? c.submittedById)}</span>
                    <span className="block truncate text-sm text-label">{own ? 'Needs another Principal' : provisions(c)}</span>
                  </span>
                  <Due tone={h > 9 ? 'overdue' : h > 4 ? 'soon' : null} className={cx('text-sm', h <= 4 && 'text-label')}>{ageText(h)}</Due>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-base text-muted">No certificates waiting for review.</p>
      )}
    </Widget>
  )
}

/** US-HOM-013 */
export function UsersAndLicenses() {
  const { data, officeFilter } = useApp()
  const { office, userName } = useLookups()
  const navigate = useNavigate()
  const users = data.users.filter((u) => !officeFilter || u.officeId === officeFilter)
  const active = users.filter((u) => u.active !== false)
  const byRole = ['producer', 'account-manager', 'principal', 'admin'].map((r) => [r, active.filter((u) => u.role === r).length] as const)
  const lic = users.flatMap((u) => (u.licenseRecords ?? []).map((l) => ({ u, l }))).filter(({ l }) => l.expirationOffset <= 60).sort((a, b) => a.l.expirationOffset - b.l.expirationOffset)
  return (
    <Widget title="Users and Licenses" to="/settings/users">
      <div className="px-4 pb-3 text-base">
        <p><span className="tabular text-metric font-semibold text-strong">{active.length}</span> <span className="text-label">active users</span></p>
        <p className="mt-1 flex flex-wrap gap-x-3 text-sm">{data.offices.filter((o) => !officeFilter || o.id === officeFilter).map((o) => <Link key={o.id} to="/settings/offices" className="text-link hover:underline">{o.name} {o.state} {active.filter((u) => u.officeId === o.id).length}</Link>)}</p>
        <p className="mt-1 text-sm text-label">{byRole.map(([r, n]) => `${r === 'account-manager' ? 'Account Managers' : `${r[0].toUpperCase()}${r.slice(1)}s`} ${n}`).join(' · ')}{users.length > active.length ? ` · ${users.length - active.length} inactive` : ''}</p>
      </div>
      <div className="flex items-center justify-between border-t border-fill px-4 pt-3 pb-1"><SubHeading>Licenses expiring</SubHeading><Link to="/settings/licenses" className="text-sm text-link hover:underline">View all</Link></div>
      {lic.length ? (
        <ul className="pb-2">
          {lic.map(({ u, l }, i) => (
            <li key={i}>
              <button onClick={() => navigate('/settings/licenses')} className="tabular grid w-full grid-cols-[1fr_48px_1fr_110px_120px] items-center gap-2 px-4 py-1.5 text-left text-sm hover:bg-recessed max-md:grid-cols-[1fr_auto]">
                <span className="truncate text-base text-strong">{userName(u.id)} <span className="text-sm text-muted">· {office(u.officeId)?.name}</span></span>
                <span className="max-md:hidden">{l.state}</span>
                <span className="truncate text-label max-md:hidden">{l.lineOfAuthority}</span>
                <span className="max-md:hidden">{dateOf(l.expirationOffset)}</span>
                <Due tone={dueTone(l.expirationOffset, 30)} className={cx('justify-end text-right', dueTone(l.expirationOffset, 30) === null && 'text-label')}>{l.expirationOffset < 0 ? `Expired ${-l.expirationOffset}d ago` : `${l.expirationOffset} days`}</Due>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pb-4 text-base text-muted">No licenses expire in the next 60 days.</p>
      )}
    </Widget>
  )
}

/** US-HOM-014 */
export function AmsSync() {
  const { data } = useApp()
  const runs = data.syncRuns ?? []
  const last = runs[0]
  if (!last) return null
  const t = (iso: string) => { const d = new Date(iso); const today = d.toDateString() === new Date().toDateString(); return `${today ? 'Today' : d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` }
  const Icon = last.status === 'Succeeded' ? CheckCircle2 : last.status === 'Partial' ? AlertTriangle : AlertCircle
  const next = new Date()
  next.setHours(next.getHours() < 12 ? 12 : 30, 0, 0, 0)
  return (
    <Widget title="AMS sync" to="/settings/data-sync">
      <div className="px-4 pb-3">
        <p className="flex items-center gap-2 text-base">
          <Icon aria-hidden strokeWidth={1.75} className={cx('size-4', last.status === 'Succeeded' ? 'text-success' : last.status === 'Partial' ? 'text-warning-text' : 'text-danger')} />
          <span className="font-medium text-strong">{last.status}</span>
          <span className="text-label">· {t(last.at)} · {Math.floor(last.durationSec / 60)}m {last.durationSec % 60}s · next {next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </p>
        {last.status === 'Partial' && <p className="mt-1 text-sm font-medium text-warning-text">{last.skipped} records skipped · {last.reason}</p>}
        {last.status === 'Failed' && <p className="mt-1 text-sm font-medium text-danger-text">{last.error}</p>}
        <p className="tabular mt-2 text-sm text-label">{Object.entries(last.counts).map(([k, v]) => `${k} ${v.toLocaleString('en-US')}`).join(' · ')}</p>
        <p className="mt-1 text-sm text-muted">Claims are Fortify’s tracking records and are not synced.</p>
      </div>
      <ul className="border-t border-fill px-4 py-2 text-sm">
        {runs.slice(1, 6).map((r) => <li key={r.id} className="flex justify-between py-0.5"><span className="text-label">{t(r.at)}</span><StatusCell status={r.status} /></li>)}
      </ul>
    </Widget>
  )
}
