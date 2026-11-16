import { Link } from 'react-router'
import { useApp } from '@/app/store'
import { ago, dateOf, inDays, usd, useLookups } from '@/app/hooks'
import { visibleAccounts } from '@/domain/access'
import { Panel } from '@/components/patterns'
import { StatusCell } from '@/components/ui/status'
import { ROLE_LABEL } from '@/components/shell/TopBar'

/** US-HOM-001 frame + US-HOM-002/003 (Producer) and US-HOM-007/008 (Account Manager). */
export function TodayPage() {
  const { data, user } = useApp()
  const { account, policy } = useLookups()
  const first = user.name.split(' ')[0]
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  const myLeads = data.leads.filter((l) => l.status === 'New' && (user.role === 'producer' ? l.assigneeId === user.id : user.role === 'account-manager' ? l.officeId === user.officeId : true)).sort((a, b) => b.createdOffset - a.createdOffset)
  const pipeline = data.opportunities.filter((o) => scoped.has(o.accountId) && (user.role !== 'producer' || o.ownerId === user.id) && o.stage !== 'Won' && o.stage !== 'Lost')
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  const renewals = data.renewals.filter((r) => scoped.has(r.accountId) && r.status !== 'Done' && r.status !== 'Decided' && (user.role !== 'account-manager' || r.ownerId === user.id)).sort((a, b) => (terms.get(a.termId)?.expirationOffset ?? 0) - (terms.get(b.termId)?.expirationOffset ?? 0))
  const service = data.serviceRequests.filter((r) => scoped.has(r.accountId) && r.status !== 'Done' && (user.role !== 'account-manager' || r.ownerId === user.id)).sort((a, b) => a.dueOffset - b.dueOffset)
  const stages = ['New', 'Contacted', 'Gathering info', 'Quoting', 'Proposed'] as const

  const leadsPanel = (
    <Panel title="New leads" actions={<Link to="/leads" className="text-sm text-link hover:underline">All leads</Link>}>
      {myLeads.length ? (
        <ul className="flex flex-col divide-y divide-fill">
          {myLeads.slice(0, 6).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-base">
              <Link to={`/leads/${l.id}`} className="truncate font-medium text-strong hover:text-link hover:underline">{l.name}</Link>
              <span className="shrink-0 text-sm text-muted">{l.source} · {ago(l.createdOffset)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted">No new leads waiting.</p>
      )}
    </Panel>
  )
  const pipelinePanel = (
    <Panel title="Pipeline by stage" actions={<Link to="/pipeline" className="text-sm text-link hover:underline">Open pipeline</Link>}>
      <ul className="flex flex-col gap-2">
        {stages.map((st) => {
          const list = pipeline.filter((o) => o.stage === st)
          const sum = list.reduce((s, o) => s + o.estimatedPremium, 0)
          const max = Math.max(1, ...stages.map((s2) => pipeline.filter((o) => o.stage === s2).reduce((s, o) => s + o.estimatedPremium, 0)))
          return (
            <li key={st} className="grid grid-cols-[120px_1fr_96px] items-center gap-3 text-base">
              <span className="text-label">{st}</span>
              <span className="h-2 rounded-full bg-fill">
                <span className="block h-2 rounded-full bg-primary" style={{ width: `${(sum / max) * 100}%` }} />
              </span>
              <span className="tabular text-right text-ink">{list.length} · {usd(sum)}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
  const renewalsPanel = (
    <Panel title="Renewals due" actions={<Link to="/renewals" className="text-sm text-link hover:underline">Worklist</Link>}>
      {renewals.length ? (
        <ul className="flex flex-col divide-y divide-fill">
          {renewals.slice(0, 7).map((r) => {
            const t = terms.get(r.termId)
            return (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-base">
                <Link to={`/renewals/${r.id}`} className="truncate text-strong hover:text-link hover:underline">
                  {account(r.accountId)?.name} <span className="text-label">· {policy(r.policyId)?.line}</span>
                </Link>
                <span className="flex shrink-0 items-center gap-3 text-sm">
                  <StatusCell status={r.status} />
                  <span className="tabular text-muted">{t ? inDays(t.expirationOffset) : ''}</span>
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-base text-muted">Nothing in the window.</p>
      )}
    </Panel>
  )
  const servicePanel = (
    <Panel title="Service queue" actions={<Link to="/service" className="text-sm text-link hover:underline">Board</Link>}>
      {service.length ? (
        <ul className="flex flex-col divide-y divide-fill">
          {service.slice(0, 7).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-base">
              <Link to={`/service/${r.id}`} className="truncate text-strong hover:text-link hover:underline">
                <span className="font-mono text-sm text-label">{r.id}</span> {r.subject}
              </Link>
              <span className={`shrink-0 text-sm ${r.dueOffset < 0 ? 'font-medium text-danger-text' : 'text-muted'}`}>due {dateOf(r.dueOffset)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-muted">The queue is clear.</p>
      )}
    </Panel>
  )

  const layout =
    user.role === 'producer' ? [leadsPanel, pipelinePanel] : user.role === 'account-manager' ? [renewalsPanel, servicePanel] : [pipelinePanel, renewalsPanel, leadsPanel, servicePanel]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <h1 className="text-title font-semibold text-strong">{greeting}, {first}</h1>
      <p className="mt-1 text-base text-muted">
        {ROLE_LABEL[user.role]} · {user.role === 'principal' || user.role === 'admin' ? 'Agency-wide' : 'Your work for today'} · {dateOf(0)}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 max-lg:grid-cols-1">{layout.map((p, i) => <div key={i}>{p}</div>)}</div>
    </div>
  )
}
