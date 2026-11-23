import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle } from 'lucide-react'
import { officeName, useApp } from '@/app/store'
import { dateOf, inDays, usd, useLookups } from '@/app/hooks'
import { visibleAccounts } from '@/domain/access'
import type { Opportunity, ServiceStatus } from '@/domain/types'
import { Widget, AgencyPipeline, AmsSync, CertificateApprovals, CertificatesWaiting, GoalPacing, MyDay, RetentionWidget, UpcomingXDates, UsersAndLicenses } from './TodayWidgets'
import { Button, CountPill, cx, Due, RateChange, Segmented, SubHeading, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { changePct, isHighRisk } from './RenewalsPages'
import { quoteWindow } from './XDatesPages'
import { AttentionCallout, mini, PageTitle, type AttentionItem } from '@/components/patterns'
import { dueTone } from '@/domain/urgency'

const STAGES = ['New', 'Contacted', 'Gathering info', 'Quoting', 'Proposed'] as const
const SR_STATUSES: ServiceStatus[] = ['New', 'In progress', 'Waiting on carrier', 'Waiting on client']
const BANDS: [string, number, number][] = [['Next 30 days', 0, 30], ['31–60 days', 31, 60], ['61–90 days', 61, 90], ['91–120 days', 91, 120]]

const age = (offset: number) => (offset >= 0 ? 'Today' : `${-offset}d`)
const lines = (ls: string[]) => (ls.length > 4 ? `${ls.slice(0, 4).join(', ')} +${ls.length - 4}` : ls.join(', '))
const short = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : usd(n))

/** One card grammar for every Today widget: title, count pill, figures, "View all" (always visible, it is navigation). */
const Figure = ({ label, value }: { label: string; value: string }) => (
  <span>
    {label} <span className="tabular text-base font-semibold text-strong">{value}</span>
  </span>
)
const Empty = ({ children, to, link }: { children: ReactNode; to: string; link: string }) => (
  <p className="px-4 pb-4 text-base text-muted">
    {children} <Link to={to} className="text-link hover:underline">{link}</Link>
  </p>
)
const th = mini.th
const td = mini.td
const opts = <T extends string>(...vs: T[]) => vs.map((v) => ({ value: v, label: v }))

/** US-HOM-002 */
function NewLeads() {
  const { data, user } = useApp()
  const mine = data.leads.filter((l) => (l.status === 'New' || l.status === 'Contacted') && l.assigneeId === user.id)
  const list = [...mine].sort((a, b) => (a.status === b.status ? a.createdOffset - b.createdOffset : a.status === 'New' ? -1 : 1))
  return (
    <Widget title="New leads" count={mine.length} to="/leads">
      {list.length ? (
        <ul className="divide-y divide-fill border-t border-fill">
          {list.slice(0, 6).map((l) => (
            <li key={l.id} className="grid grid-cols-[1fr_auto_120px_48px] items-center gap-3 px-4 py-2 max-sm:grid-cols-[1fr_auto]">
              <Link to={`/leads/${l.id}`} className="min-w-0 hover:underline">
                <span className="block truncate font-medium text-strong">{l.name}</span>
                <span className="block truncate text-sm text-muted">{lines(l.linesOfInterest)}</span>
              </Link>
              <span className="text-sm text-label max-sm:hidden">{l.source}</span>
              <span className="max-sm:hidden"><StatusCell status={l.status} /></span>
              {l.status === 'New' && l.createdOffset < 0 ? (
                <Tip label="No contact attempt for 2h+">
                  <Due tone="overdue" className="justify-end text-right text-sm">{age(l.createdOffset)}</Due>
                </Tip>
              ) : (
                <span className="tabular text-right text-sm text-label">{age(l.createdOffset)}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty to="/leads" link="View all Leads">No open Leads. New Leads assigned to you show up here.</Empty>
      )}
    </Widget>
  )
}

/** US-HOM-003 (Producer: own) and the agency strip for Principal until US-HOM-010 lands. */
function Pipeline({ agency }: { agency?: boolean }) {
  const { data, user, officeFilter } = useApp()
  const { account } = useLookups()
  const scoped = new Set(visibleAccounts(user, data.accounts).filter((a) => !officeFilter || a.officeId === officeFilter).map((a) => a.id))
  const mine = (o: Opportunity) => scoped.has(o.accountId) && (agency || o.ownerId === user.id)
  const open = data.opportunities.filter((o) => mine(o) && o.stage !== 'Won' && o.stage !== 'Lost')
  const today = new Date()
  const firstOfMonth = -(today.getDate() - 1)
  const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()
  const wonThisMonth = data.opportunities.filter((o) => mine(o) && o.stage === 'Won' && (o.closedOffset ?? -999) >= firstOfMonth)
  const accepted = new Set(wonThisMonth.map((o) => o.id))
  const wonPremium = data.quotes.filter((q) => accepted.has(q.opportunityId)).flatMap((q) => q.lines).filter((l) => l.accepted).reduce((s, l) => s + (l.premium ?? 0), 0)
  const closing = open.filter((o) => o.targetCloseOffset >= firstOfMonth && o.targetCloseOffset <= daysLeft).sort((a, b) => a.targetCloseOffset - b.targetCloseOffset)
  const sum = (l: Opportunity[]) => l.reduce((s, o) => s + o.estimatedPremium, 0)
  return (
    <Widget
      title={agency ? 'Agency pipeline' : 'My pipeline'}
      to="/pipeline"
      figures={
        <>
          <Figure label="Open" value={String(open.length)} />
          <Figure label="Est. premium" value={short(sum(open))} />
          <Figure label="Won this month" value={short(wonPremium)} />
        </>
      }
    >
      {open.length === 0 ? (
        <Empty to="/leads" link="Go to Leads">No open Opportunities. Qualify a Lead to start one.</Empty>
      ) : (
        <>
          <ul className="grid grid-cols-5 divide-x divide-fill border-y border-fill max-sm:grid-cols-1 max-sm:divide-x-0 max-sm:divide-y">
            {STAGES.map((st) => {
              const list = open.filter((o) => o.stage === st)
              return (
                <li key={st}>
                  <Link to={`/pipeline?stage=${encodeURIComponent(st)}`} className="block px-3 py-2.5 hover:bg-recessed max-sm:flex max-sm:items-baseline max-sm:gap-2">
                    <span className="block text-sm text-label">{st}</span>
                    <span className="tabular block text-metric font-semibold text-strong max-sm:text-base">{list.length}</span>
                    <span className="tabular block text-sm text-muted">{short(sum(list))}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <SubHeading className="px-4 pt-3 pb-1">Closing this month</SubHeading>
          {closing.length ? (
            <div className="overflow-x-auto">
              <table className={cx(mini.table, 'tabular min-w-[560px]')}>
                <thead>
                  <tr className={mini.head}>
                    <th className={th}>Account</th>
                    <th className={cx(th, 'w-28')}>Lines</th>
                    <th className={cx(th, 'w-36')}>Stage</th>
                    <th className={cx(th, 'w-32 text-right')}>Est. premium</th>
                    <th className={cx(th, 'w-28')}>Close date</th>
                  </tr>
                </thead>
                <tbody>
                  {closing.slice(0, 8).map((o) => (
                    <tr key={o.id} className={cx(mini.tr, 'hover:bg-recessed')}>
                      <td className={cx(td, 'max-w-0 py-1.5')}>
                        <Link to={`/pipeline/${o.id}`} className="block truncate font-medium text-strong hover:underline">{account(o.accountId)?.name}</Link>
                        <span className="block text-sm text-muted">{o.type}</span>
                      </td>
                      <td className={cx(td, 'max-w-0 truncate text-label')}>{lines(o.lines)}</td>
                      <td className={td}><StatusCell status={o.stage} /></td>
                      <td className={cx(td, 'text-right')}>{usd(o.estimatedPremium)}</td>
                      <td className={td}>
                        <Due tone={o.targetCloseOffset < 0 ? 'overdue' : null}>{dateOf(o.targetCloseOffset)}</Due>
                        {o.targetCloseOffset < 0 && <span className="block text-sm font-medium text-danger-text">Past due</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 pb-4 text-base text-muted">Nothing closing this month.</p>
          )}
        </>
      )}
    </Widget>
  )
}

/** US-HOM-007 (Account Manager) and agency at-risk Renewals for Principal until US-HOM-011 lands. */
function RenewalsDue({ agency }: { agency?: boolean }) {
  const { data, user, officeFilter } = useApp()
  const { account, policy, carrierName } = useLookups()
  const [scope, setScope] = useState<'Mine' | 'Office'>('Mine')
  const [band, setBand] = useState<number | null>(null)
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  const exp = (termId: string) => terms.get(termId)?.expirationOffset ?? 999
  const scoped = new Set(visibleAccounts(user, data.accounts).filter((a) => !officeFilter || a.officeId === officeFilter).map((a) => a.id))
  const open = data.renewals
    .filter((r) => scoped.has(r.accountId) && ['Upcoming', 'In review', 'Remarketing', 'Presented'].includes(r.status))
    .filter((r) => agency || scope === 'Office' || r.ownerId === user.id)
    .filter((r) => !agency || isHighRisk(r, terms.get(r.termId)))
  const inBand = (r: (typeof open)[number], i: number) => exp(r.termId) >= BANDS[i][1] && exp(r.termId) <= BANDS[i][2]
  const list = open.filter((r) => band === null || inBand(r, band)).sort((a, b) => exp(a.termId) - exp(b.termId))
  return (
    <Widget
      title={agency ? 'At-risk Renewals' : 'Renewals due'}
      count={open.length}
      to="/renewals"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          {!agency && <Segmented size="sm" label="Renewal scope" value={scope} options={opts('Mine', 'Office')} onChange={setScope} />}
          {BANDS.map(([label], i) => (
            <Button key={label} size="sm" aria-pressed={band === i} onClick={() => setBand(band === i ? null : i)}>
              {label} <CountPill n={open.filter((r) => inBand(r, i)).length} />
            </Button>
          ))}
        </div>
      }
    >
      {list.length ? (
        <div className="overflow-x-auto">
          <table className={cx(mini.table, 'tabular min-w-[640px]')}>
            <thead>
              <tr className={cx(mini.head, 'border-t')}>
                <th className={th}>Account</th>
                <th className={cx(th, 'w-36')}>Expiration</th>
                <th className={cx(th, 'w-28 text-right')}>Premium change</th>
                <th className={cx(th, 'w-20')}>Risk</th>
                <th className={cx(th, 'w-32')}>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 8).map((r) => {
                const t = terms.get(r.termId)
                const p = policy(r.policyId)
                const pct = changePct(r, t)
                const late = r.status === 'Upcoming' && exp(r.termId) <= 30
                return (
                  <tr key={r.id} className={cx(mini.tr, 'hover:bg-recessed')}>
                    <td className={cx(td, 'max-w-0 py-1.5')}>
                      <Link to={`/renewals/${r.id}`} className="block truncate font-medium text-strong hover:underline">{account(r.accountId)?.name}</Link>
                      <span className="block truncate text-sm text-muted">{p?.line} · {p ? carrierName(p.carrierId) : ''}</span>
                    </td>
                    <td className={cx(td, 'py-1.5')}>
                      {t ? dateOf(t.expirationOffset) : '—'}
                      <span className="block text-sm text-muted">{t ? inDays(t.expirationOffset) : ''}</span>
                    </td>
                    <td className={cx(td, 'text-right')}><RateChange pct={pct} /></td>
                    <td className={td}><StatusCell status={isHighRisk(r, t) ? 'High' : 'Low'} /></td>
                    <td className={td}>
                      {late ? (
                        <Tip label={`Not started, expires ${inDays(exp(r.termId))}`}>
                          <span className="inline-flex items-center gap-1.5">
                            <AlertTriangle aria-hidden className="size-3.5 text-warning-text" />
                            <StatusCell status={r.status} />
                          </span>
                        </Tip>
                      ) : (
                        <StatusCell status={r.status} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty to="/renewals" link="View all Renewals">{agency ? 'No high-risk Renewals in the window.' : 'No open Renewals in your window.'}</Empty>
      )}
    </Widget>
  )
}

/** US-HOM-008 */
function ServiceQueue() {
  const { data, user } = useApp()
  const { account } = useLookups()
  const [scope, setScope] = useState<'Mine' | 'Office'>('Mine')
  const [status, setStatus] = useState<ServiceStatus | null>(null)
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const open = data.serviceRequests.filter((r) => scoped.has(r.accountId) && r.status !== 'Done' && (scope === 'Office' || r.ownerId === user.id))
  const list = open.filter((r) => !status || r.status === status).sort((a, b) => a.dueOffset - b.dueOffset || a.createdOffset - b.createdOffset)
  return (
    <Widget
      title="Service queue"
      count={open.length}
      to="/service"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" label="Service scope" value={scope} options={opts('Mine', 'Office')} onChange={setScope} />
          {SR_STATUSES.map((s) => (
            <Button key={s} size="sm" aria-pressed={status === s} onClick={() => setStatus(status === s ? null : s)}>
              {s} <CountPill n={Math.min(99, open.filter((r) => r.status === s).length)} />
            </Button>
          ))}
        </div>
      }
    >
      {list.length ? (
        <div className="overflow-x-auto">
          <table className={cx(mini.table, 'tabular min-w-[640px]')}>
            <thead>
              <tr className={cx(mini.head, 'border-t')}>
                <th className={th}>Subject</th>
                <th className={cx(th, 'w-48')}>Account</th>
                <th className={cx(th, 'w-40')}>Status</th>
                <th className={cx(th, 'w-14 text-right')}>Age</th>
                <th className={cx(th, 'w-28')}>Due</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 8).map((r) => {
                const stale = r.status === 'Waiting on carrier' && r.createdOffset < -5
                return (
                  <tr key={r.id} className={cx(mini.tr, 'hover:bg-recessed')}>
                    <td className={cx(td, 'max-w-0 py-1.5')}>
                      <Link to={`/service/${r.id}`} className="block truncate font-medium text-strong hover:underline">{r.subject}</Link>
                      <span className="block text-sm text-muted">{r.type}</span>
                    </td>
                    <td className={cx(td, 'max-w-0 truncate text-label')}>{account(r.accountId)?.name}</td>
                    <td className={td}>
                      {stale ? (
                        <Tip label={`Waiting on carrier ${-r.createdOffset} days. Follow up.`}>
                          <span className="inline-flex items-center gap-1.5">
                            <AlertTriangle aria-hidden className="size-3.5 text-warning-text" />
                            <StatusCell status={r.status} />
                          </span>
                        </Tip>
                      ) : (
                        <StatusCell status={r.status} />
                      )}
                    </td>
                    <td className={cx(td, 'text-right text-label')}>{age(r.createdOffset)}</td>
                    <td className={td}><Due tone={dueTone(r.dueOffset, 0)}>{r.dueOffset === 0 ? 'Due today' : r.dueOffset < 0 ? `Overdue ${-r.dueOffset}d` : dateOf(r.dueOffset)}</Due></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty to="/service" link="View all Service Requests">Your service queue is clear.</Empty>
      )}
    </Widget>
  )
}

/** US-HOM-001: one frame, role-based widgets; widgets of other roles are never rendered. */
export function TodayPage() {
  const { user, officeFilter } = useApp()
  const office = user.role === 'principal' || user.role === 'admin' ? (officeFilter ? officeName(officeFilter) : 'All offices') : officeName(user.officeId)
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const main =
    user.role === 'producer'
      ? [<NewLeads key="l" />, <Pipeline key="p" />, <UpcomingXDates key="x" />]
      : user.role === 'account-manager'
        ? [<RenewalsDue key="r" />, <ServiceQueue key="s" />, <CertificatesWaiting key="c" />]
        : user.role === 'principal'
          ? [<AgencyPipeline key="p" />, <RetentionWidget key="r" />, <CertificateApprovals key="c" />]
          : [<UsersAndLicenses key="u" />, <AmsSync key="a" />]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Today" description={<span className="block truncate" title={office}>{date} · {office}</span>} />
      <div className="mt-5"><TodayAttention /></div>
      <div className="mt-6 grid grid-cols-12 items-start gap-4 max-lg:grid-cols-1">
        <div className="col-span-8 flex min-w-0 flex-col gap-4 max-lg:col-span-1">{main}</div>
        <div className="col-span-4 flex min-w-0 flex-col gap-4 max-lg:col-span-1">
          {user.role === 'producer' && <GoalPacing />}
          <MyDay />
        </div>
      </div>
    </div>
  )
}

/** US-HOM-015: role rules; each item names up to 2 records and links to the filtered list. */
function TodayAttention() {
  const { data, user, officeFilter } = useApp()
  const accs = new Map(visibleAccounts(user, data.accounts).filter((a) => !officeFilter || a.officeId === officeFilter).map((a) => [a.id, a]))
  const mine = (accountId: string) => { const a = accs.get(accountId); return !!a && (user.role !== 'producer' || a.producerId === user.id) && (user.role !== 'account-manager' || a.accountManagerId === user.id || a.officeId === user.officeId) }
  const names = (ids: string[]) => { const u = [...new Set(ids)].map((id) => accs.get(id)?.name ?? data.accounts.find((a) => a.id === id)?.name).filter(Boolean) as string[]; return u.slice(0, 2).join(', ') + (u.length > 2 ? ` +${u.length - 2}` : '') }
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  const items: AttentionItem[] = []
  const add = (key: string, n: number, title: string, ids: string[], to: string) => n > 0 && items.push({ key, title: title.replace('{n}', String(n)), detail: names(ids), to })
  if (user.role === 'producer') {
    const stale = data.opportunities.filter((o) => o.ownerId === user.id && o.stage === 'Proposed' && data.quotes.some((q) => q.opportunityId === o.id && q.presentedOffset != null && q.presentedOffset <= -14) && !data.activities.some((a) => a.linked?.id === o.id && a.occurredOffset > Math.max(...data.quotes.filter((q) => q.opportunityId === o.id).map((q) => q.presentedOffset ?? -999))))
    add('quotes', stale.length, '{n} Quotes presented over 14 days ago with no Activity since', stale.map((o) => o.accountId), '/pipeline?view=list&stage=Proposed')
    const xd = data.xDates.filter((x) => mine(x.accountId) && !x.opportunityId && (() => { const w = quoteWindow(accs.get(x.accountId)!); return x.xDateOffset - w >= 0 && x.xDateOffset - w <= 7 })())
    add('xdates', xd.length, '{n} X-dates enter their quote window this week', xd.map((x) => x.accountId), '/x-dates')
  }
  if (user.role === 'account-manager') {
    const soon = data.renewals.filter((r) => r.ownerId === user.id && r.status === 'Upcoming' && (terms.get(r.termId)?.expirationOffset ?? 99) <= 30)
    add('renewals', soon.length, '{n} Renewals expire within 30 days and are still Upcoming', soon.map((r) => r.accountId), '/renewals?view=upcoming')
    const bound = data.terms.filter((t) => t.status === 'Bound' && t.binderExpiresOffset != null && t.binderExpiresOffset <= 7 && mine(data.policies.find((p) => p.id === t.policyId)?.accountId ?? ''))
    add('binders', bound.length, '{n} Terms are still Bound with the binder expiring within 7 days', bound.map((t) => data.policies.find((p) => p.id === t.policyId)!.accountId), '/policies')
  }
  if (user.role === 'principal') {
    const risky = data.renewals.filter((r) => accs.has(r.accountId) && ['Upcoming', 'In review'].includes(r.status) && isHighRisk(r, terms.get(r.termId)))
    add('risk', risky.length, '{n} High-risk Renewals are not yet Remarketing', risky.map((r) => r.accountId), '/renewals?view=at-risk')
    const certs = (data.certificates ?? []).filter((c) => c.status === 'Needs review' && accs.has(c.accountId) && c.submittedAt && Date.now() - new Date(c.submittedAt).getTime() > 86_400_000)
    add('certs', certs.length, '{n} Certificates have waited over 1 business day for approval', certs.map((c) => c.accountId), '/certificates?view=needs-review')
  }
  if (user.role === 'admin') {
    if (data.syncRuns?.[0]?.status === 'Partial') items.push({ key: 'sync', title: 'Last AMS sync was Partial', detail: data.syncRuns[0].reason, to: '/settings/data-sync' })
    const lic = data.users.filter((u) => u.status !== 'Deactivated' && (u.licenseRecords ?? []).some((l) => l.expirationOffset >= 0 && l.expirationOffset <= 30))
    if (lic.length) items.push({ key: 'lic', title: `${lic.length} Licenses expire within 30 days`, detail: lic.slice(0, 2).map((u) => u.name).join(', ') + (lic.length > 2 ? ` +${lic.length - 2}` : ''), to: '/settings/licenses?status=Expiring+soon' })
  }
  return <AttentionCallout items={items} storageKey="fortify.today.attention.collapsed" />
}
