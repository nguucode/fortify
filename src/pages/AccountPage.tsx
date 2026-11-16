import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Building2, Home, Plus } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, inDays, usd, useLookups } from '@/app/hooks'
import { canSeeAccount } from '@/domain/access'
import { KeyValue, Panel, RecordHeader, TabBar, useTab } from '@/components/patterns'
import { Button } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AmsBadge, currentTerm } from './PoliciesPages'
import { NewServiceRequestSheet } from './ServicePages'
import { changePct } from './RenewalsPages'
import { oppCode } from './PipelinePages'
import { OpportunitySheet } from './OpportunitySheet'
import { TaskSheet } from './TaskSheet'
import type { Task } from '@/domain/types'
import { AccessDenied, NotFound } from './SystemPages'

/** US-ACC-003 header + 7 tabs (?tab=), US-ACC-004 Overview, US-POL-012 Policies, US-SRV-013 Service. */
export function AccountPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { userName, office, carrierName, policy } = useLookups()
  const tab = useTab('overview')
  const [newRequest, setNewRequest] = useState(false)
  const [newOpp, setNewOpp] = useState(false)
  const [taskSheet, setTaskSheet] = useState<Task | 'new' | null>(null)
  const a = data.accounts.find((x) => x.id === id)
  if (!a) return <NotFound what="Account" />
  if (!canSeeAccount(user, a)) return <AccessDenied what="Account" owner={userName(a.producerId)} />

  const policies = data.policies.filter((p) => p.accountId === a.id).map((p) => ({ p, t: currentTerm(data.terms, p.id)! })).filter((x) => x.t)
  const active = policies.filter((x) => x.t.status === 'Active' || x.t.status === 'Bound')
  const renewals = data.renewals.filter((r) => r.accountId === a.id)
  const opps = data.opportunities.filter((o) => o.accountId === a.id)
  const openOpps = opps.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')
  const services = data.serviceRequests.filter((r) => r.accountId === a.id)
  const openServices = services.filter((r) => r.status !== 'Done')
  const tasks = data.tasks.filter((t) => t.accountId === a.id && t.status === 'Open')
  const contacts = data.contacts.filter((c) => c.accountIds.includes(a.id))
  const linked = a.linkedAccountIds.map((lid) => data.accounts.find((x) => x.id === lid)).filter(Boolean)
  const xdates = data.xDates.filter((x) => x.accountId === a.id)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'policies', label: 'Policies', count: active.length },
    { id: 'renewals', label: 'Renewals', count: renewals.filter((r) => r.status !== 'Done').length },
    { id: 'sales', label: 'Sales', count: openOpps.length },
    { id: 'service', label: 'Service', count: openServices.length },
    { id: 'activity', label: 'Activity', count: tasks.length },
    { id: 'documents', label: 'Documents' },
  ]
  const premium = active.reduce((s, x) => s + x.t.premium, 0)
  const nextExp = active.map((x) => x.t.expirationOffset).sort((x, y) => x - y)[0]

  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/accounts', label: 'Accounts' }}
        icon={a.kind === 'Household' ? Home : Building2}
        title={a.name}
        status={<StatusCell status={a.status} />}
        meta={
          <>
            <span>{a.kind}</span>
            <span>Producer {userName(a.producerId)}</span>
            <span>Account Manager {userName(a.accountManagerId)}</span>
            <span>{office(a.officeId)?.name} · {a.city}, {a.state}</span>
            {linked.map((l) => (
              <Link key={l!.id} className="text-link hover:underline" to={`/accounts/${l!.id}`}>Linked: {l!.name}</Link>
            ))}
          </>
        }
        actions={
          <>
            <LogActivityButton accountId={a.id} />
            {user.role !== 'admin' && <Button onClick={() => setTaskSheet('new')}>New task</Button>}
            {user.role !== 'admin' && active.length > 0 && <Button variant="primary" onClick={() => setNewRequest(true)}>New request</Button>}
          </>
        }
      />
      <div className="px-8 pt-3 max-sm:px-4">
        <TabBar tabs={tabs} />
        <div className="pt-5">
          {tab === 'overview' && (
            <div className="grid grid-cols-[1fr_360px] gap-4 max-lg:grid-cols-1">
              <div className="flex flex-col gap-4">
                <Panel title="At a glance">
                  <KeyValue items={[['Active policies', active.length || null], ['Annual premium', premium ? usd(premium) : null], ['Next expiration', nextExp != null ? `${dateOf(nextExp)} (${inDays(nextExp)})` : null], ['Open opportunities', openOpps.length || null], ['Open requests', openServices.length || null], ['Open tasks', tasks.length || null]]} />
                </Panel>
                <Panel title="Open tasks" actions={user.role !== 'admin' && <Button size="sm" onClick={() => setTaskSheet('new')}>New task</Button>}>
                  {tasks.length ? (
                    <ul className="flex flex-col divide-y divide-fill">
                      {[...tasks].sort((x, y) => x.dueOffset - y.dueOffset).slice(0, 6).map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                          <button onClick={() => setTaskSheet(t)} className="min-w-0 truncate text-left text-base text-strong hover:text-link hover:underline">{t.title}</button>
                          <span className={`tabular shrink-0 text-sm ${t.dueOffset < 0 ? 'font-medium text-danger-text' : 'text-muted'}`}>{userName(t.assigneeId)} · {dateOf(t.dueOffset)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base text-muted">No open tasks.</p>
                  )}
                </Panel>
                <Panel title="Recent activity">
                  <ActivityTimeline accountId={a.id} limit={8} />
                </Panel>
              </div>
              <div className="flex flex-col gap-4">
                <Panel title="Contacts">
                  {contacts.length ? (
                    <ul className="flex flex-col gap-2 text-base">
                      {contacts.map((c) => (
                        <li key={c.id}>
                          <span className="font-medium text-strong">{c.name}</span>
                          {c.id === a.primaryContactId && <span className="ml-1.5 text-sm text-muted">Primary</span>}
                          <span className="block text-sm text-label">{c.phone} · {c.email}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base text-muted">No contacts on this Account.</p>
                  )}
                </Panel>
                {xdates.length > 0 && (
                  <Panel title="Coverage elsewhere (X-dates)">
                    <ul className="flex flex-col gap-1.5 text-base">
                      {xdates.map((x) => (
                        <li key={x.id} className="flex justify-between gap-2">
                          <span>{x.line} · {x.currentCarrier}</span>
                          <span className="text-sm text-muted">{dateOf(x.xDateOffset)}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>
            </div>
          )}
          {tab === 'policies' && (
            <Panel title="Policies" actions={<AmsBadge />}>
              {policies.length ? (
                <Table head={['Policy', 'Line', 'Carrier', 'Status', 'Expiration', 'Premium']} rows={policies.map(({ p, t }) => [
                  <Link key="n" to={`/policies/${p.id}`} className="font-mono text-sm text-link hover:underline">{p.policyNumber}</Link>,
                  p.line,
                  carrierName(p.carrierId),
                  <span key="s" className="inline-flex items-center gap-2"><StatusCell status={t.status} />{t.source === 'fortify-won' && <AmsBadge term={t} />}</span>,
                  dateOf(t.expirationOffset),
                  usd(t.premium),
                ])} />
              ) : (
                <p className="text-base text-muted">No policies yet. Won Opportunities create Bound Terms here.</p>
              )}
            </Panel>
          )}
          {tab === 'renewals' && (
            <Panel title="Renewals">
              {renewals.length ? (
                <Table head={['Line', 'Status', 'Expires', 'Change', 'Owner']} rows={renewals.map((r) => {
                  const t = data.terms.find((x) => x.id === r.termId)
                  const pct = changePct(r, t)
                  return [<Link key="l" to={`/renewals/${r.id}`} className="text-link hover:underline">{policy(r.policyId)?.line}</Link>, <StatusCell key="s" status={r.status} />, t ? dateOf(t.expirationOffset) : '—', pct == null ? 'Pending' : `${pct > 0 ? '+' : '−'}${Math.abs(Math.round(pct * 100))}%`, userName(r.ownerId)]
                })} />
              ) : (
                <p className="text-base text-muted">No renewals open. They appear when a Term enters its window.</p>
              )}
            </Panel>
          )}
          {tab === 'sales' && (
            <Panel
              title="Opportunities"
              actions={
                user.role !== 'admin' && (
                  <Button size="sm" onClick={() => setNewOpp(true)}>
                    <Plus aria-hidden className="size-4" /> {user.role === 'account-manager' ? 'Cross-sell opportunity' : 'Add opportunity'}
                  </Button>
                )
              }
            >
              {newOpp && <OpportunitySheet accountId={a.id} onClose={() => setNewOpp(false)} />}
              {opps.length ? (
                <Table head={['Opportunity', 'Type', 'Stage', 'Lines', 'Estimated premium']} rows={opps.map((o) => [<Link key="o" to={`/pipeline/${o.id}`} className="font-mono text-sm text-link hover:underline">{oppCode(o.id)}</Link>, o.type, <StatusCell key="s" status={o.stage} reason={o.lostReason ?? undefined} />, o.lines.join(', '), usd(o.estimatedPremium)])} />
              ) : (
                <p className="text-base text-muted">No opportunities yet.</p>
              )}
            </Panel>
          )}
          {tab === 'service' && (
            <Panel title="Service requests">
              {services.length ? (
                <Table head={['Request', 'Type', 'Status', 'Created', 'Owner']} rows={[...services].sort((x, y) => y.createdOffset - x.createdOffset).map((r) => [<Link key="r" to={`/service/${r.id}`} className="text-link hover:underline"><span className="font-mono text-sm">{r.id}</span> {r.subject}</Link>, r.type, <StatusCell key="s" status={r.status} />, dateOf(r.createdOffset), userName(r.ownerId)])} />
              ) : (
                <p className="text-base text-muted">No service requests yet.</p>
              )}
            </Panel>
          )}
          {tab === 'activity' && (
            <Panel title="Activity" actions={<LogActivityButton accountId={a.id} />}>
              <ActivityTimeline accountId={a.id} limit={50} />
            </Panel>
          )}
          {tab === 'documents' && <Panel title="Documents"><p className="text-base text-muted">Documents arrive with US-ACC-008 (P1).</p></Panel>}
        </div>
      </div>
      {taskSheet && <TaskSheet accountId={a.id} task={taskSheet === 'new' ? undefined : taskSheet} onClose={() => setTaskSheet(null)} />}
      {newRequest && <NewServiceRequestSheet onClose={() => setNewRequest(false)} accountId={a.id} />}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="h-10 border-b border-fill">
            {head.map((h) => <th key={h} className="px-2 text-base font-semibold text-strong">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="tabular h-10 border-b border-fill last:border-0">
              {r.map((c, j) => <td key={j} className="truncate px-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
