import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { Archive, Building2, Home, MoreHorizontal } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, inDays, usd, useLookups, useMutate } from '@/app/hooks'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { useToast } from '@/components/ui/toast'
import { AccountFormSheet, ArchiveDialog, ContactSheet, LinkedAccounts, ManageContactsSheet, MergeDialog, ReassignDialog } from './AccountSheets'
import { ActivityTab, DetailsPanel, DocumentsTab, RenewalsTab, SalesTab } from './AccountPanels'
import { AccountCertificates } from './CertificatesPages'
import { canSeeAccount } from '@/domain/access'
import { KeyValue, Panel, RecordHeader, TabBar, useTab } from '@/components/patterns'
import { Button } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AmsBadge, currentTerm } from './PoliciesPages'
import { NewServiceRequestSheet } from './ServicePages'
import { OpportunitySheet } from './OpportunitySheet'
import { TaskSheet } from './TaskSheet'
import type { Task } from '@/domain/types'
import { AccessDenied, NotFound } from './SystemPages'

/** US-ACC-003 header + 7 tabs (?tab=), US-ACC-004 Overview, US-POL-012 Policies, US-SRV-013 Service. */
export function AccountPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { userName, office, carrierName } = useLookups()
  const tab = useTab('overview')
  const [sp] = useSearchParams()
  const sub = (sp.get('sub') ?? 'requests') as 'requests' | 'certificates' | 'holders'
  const [newRequest, setNewRequest] = useState(false)
  const [newOpp, setNewOpp] = useState(false)
  const [taskSheet, setTaskSheet] = useState<Task | 'new' | null>(null)
  const [dialog, setDialog] = useState<'edit' | 'contacts' | 'contact' | 'reassign' | 'archive' | 'merge' | null>(null)
  const navigate = useNavigate()
  const mutate = useMutate()
  const toast = useToast()
  const a = data.accounts.find((x) => x.id === id)
  // US-ACC-018: a merged duplicate's URL redirects to the survivor.
  const mergedInto = a?.lifecycle === 'merged' ? a.mergedIntoId : undefined
  useEffect(() => {
    if (mergedInto) {
      toast(`${a!.name} was merged into this account`, 'success')
      navigate(`/accounts/${mergedInto}`, { replace: true })
    }
  }, [mergedInto]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <NotFound what="Account" />
  if (mergedInto) return null
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
  const xdates = data.xDates.filter((x) => x.accountId === a.id)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'policies', label: 'Policies', count: active.length },
    { id: 'renewals', label: 'Renewals', count: renewals.filter((r) => r.status !== 'Done').length },
    { id: 'sales', label: 'Sales', count: openOpps.length },
    { id: 'service', label: 'Service', count: openServices.length },
    { id: 'activity', label: 'Activity', count: tasks.length },
    { id: 'documents', label: 'Documents', count: (data.documents ?? []).filter((d) => d.accountId === a.id).length },
  ]
  const archived = a.lifecycle === 'archived'
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
            <LinkedAccounts account={a} />
          </>
        }
        actions={
          archived ? undefined : (
            <>
              <LogActivityButton accountId={a.id} />
              {user.role !== 'admin' && <Button onClick={() => setTaskSheet('new')}>New task</Button>}
              {user.role !== 'admin' && active.length > 0 && <Button variant="primary" onClick={() => setNewRequest(true)}>New request</Button>}
              <Menu.Root>
                <Menu.Trigger aria-label="More actions" className="grid size-9 place-items-center rounded-md bg-surface text-label shadow-ring hover:bg-recessed">
                  <MoreHorizontal className="size-4" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Content align="end" sideOffset={4} className={menuContent}>
                    {user.role !== 'admin' && <Menu.Item className={menuItem} onSelect={() => setDialog('edit')}>Edit details</Menu.Item>}
                    {user.role !== 'admin' && <Menu.Item className={menuItem} onSelect={() => setDialog('contacts')}>Manage contacts</Menu.Item>}
                    {(user.role === 'principal' || user.role === 'admin') && <Menu.Item className={menuItem} onSelect={() => setDialog('reassign')}>Reassign</Menu.Item>}
                    {(user.role === 'principal' || user.role === 'admin') && <Menu.Item className={menuItem} onSelect={() => setDialog('merge')}>Merge</Menu.Item>}
                    {user.role === 'admin' && <Menu.Item className={menuItem} onSelect={() => setDialog('archive')}>Archive</Menu.Item>}
                  </Menu.Content>
                </Menu.Portal>
              </Menu.Root>
            </>
          )
        }
      />
      {archived && (
        <div role="status" className="flex flex-wrap items-center gap-3 border-b border-line bg-warning-tint px-8 py-2.5 text-base text-ink max-sm:px-4">
          <Archive aria-hidden className="size-4 text-warning-text" />
          <span className="flex-1">Archived {dateOf(a.archived!.offset)} by {userName(a.archived!.byId)} · {a.archived!.reason}. This account is read-only.</span>
          {user.role === 'admin' && <Button size="sm" onClick={() => mutate((s) => s.restoreAccount(a.id, user.id), `${a.name} restored`)}>Restore</Button>}
        </div>
      )}
      <div className="px-8 pt-3 max-sm:px-4">
        <TabBar tabs={tabs} />
        <div className="pt-5">
          {tab === 'overview' && (
            <div className="grid grid-cols-[1fr_360px] gap-4 max-lg:grid-cols-1">
              <div className="flex flex-col gap-4">
                {(() => {
                  const w = a.kind === 'Business' ? 90 : 45
                  const x = xdates.filter((v) => v.xDateOffset >= 0 && v.xDateOffset <= w && v.interestLevel !== 'Closed' && !v.opportunityId).sort((m, n) => m.xDateOffset - n.xDateOffset)[0]
                  return x ? (
                    <p className="flex items-center gap-2 rounded-md bg-surface px-4 py-2.5 text-base shadow-ring">
                      <span className="flex-1">{x.line} elsewhere expires in {x.xDateOffset} days</span>
                      <Link to={`/accounts/${a.id}?tab=sales`} className="font-medium text-link hover:underline">Start quote</Link>
                    </p>
                  ) : null
                })()}
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
                <DetailsPanel account={a} onEdit={user.role !== 'admin' && !archived ? () => setDialog('edit') : undefined} />
                <Panel title="Recent activity">
                  <ActivityTimeline accountId={a.id} limit={8} />
                </Panel>
              </div>
              <div className="flex flex-col gap-4">
                <Panel title="Contacts" actions={user.role !== 'admin' && !archived && <Button size="sm" onClick={() => setDialog('contacts')}>Manage contacts</Button>}>
                  {contacts.length ? (
                    <ul className="flex flex-col gap-2 text-base">
                      {contacts.map((c) => (
                        <li key={c.id}>
                          <Link to={`/contacts/${c.id}`} className="font-medium text-strong hover:text-link hover:underline">{c.name}</Link>
                          <span className="ml-1.5 text-sm text-muted">{c.id === a.primaryContactId ? 'Primary' : (c.relationships?.[a.id] ?? '')}</span>
                          <span className="block text-sm text-label">{c.phone} · {c.email}</span>
                          {c.accountIds.filter((x) => x !== a.id).map((x) => {
                            const o = data.accounts.find((y) => y.id === x)
                            return o && canSeeAccount(user, o) ? <Link key={x} to={`/accounts/${x}`} className="block text-sm text-muted underline hover:text-link">Also on {o.name}</Link> : null
                          })}
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
          {tab === 'renewals' && <RenewalsTab account={a} />}
          {tab === 'sales' && <SalesTab account={a} onNewOpp={() => setNewOpp(true)} />}
          {tab === 'service' && (
            <div className="flex flex-col gap-4">
              {a.kind === 'Business' && <TabBar param="sub" tabs={[{ id: 'requests', label: 'Requests', count: openServices.length }, { id: 'certificates', label: 'Certificates', count: (data.certificates ?? []).filter((c) => c.accountId === a.id && (c.status === 'Requested' || c.status === 'Needs review')).length || null }, { id: 'holders', label: 'Holders', count: (data.holders ?? []).filter((h) => h.accountId === a.id && h.status !== 'Inactive').length || null }]} />}
              {(a.kind !== 'Business' || sub === 'requests') && (
                <Panel title="Service requests" actions={user.role !== 'admin' && active.length > 0 && <Button size="sm" onClick={() => setNewRequest(true)}>New request</Button>}>
                  {services.length ? (
                    <Table head={['Request', 'Type', 'Status', 'Created', 'Owner']} rows={[...services].sort((x, y) => y.createdOffset - x.createdOffset).map((r) => [<Link key="r" to={`/service/${r.id}`} className="text-link hover:underline"><span className="font-mono text-sm">{r.id}</span> {r.subject}</Link>, r.type, <StatusCell key="s" status={r.status} />, dateOf(r.createdOffset), userName(r.ownerId)])} />
                  ) : (
                    <p className="text-base text-muted">No service requests yet.</p>
                  )}
                </Panel>
              )}
              {a.kind === 'Business' && (sub === 'certificates' || sub === 'holders') && <AccountCertificates account={a} sub={sub} />}
            </div>
          )}
          {tab === 'activity' && <ActivityTab account={a} onTask={setTaskSheet} />}
          {tab === 'documents' && <DocumentsTab account={a} />}
        </div>
      </div>
      {newOpp && <OpportunitySheet accountId={a.id} onClose={() => setNewOpp(false)} />}
      {dialog === 'edit' && <AccountFormSheet account={a} onClose={() => setDialog(null)} />}
      {dialog === 'contacts' && <ManageContactsSheet account={a} onClose={() => setDialog(null)} />}
      {dialog === 'contact' && <ContactSheet accountId={a.id} onClose={() => setDialog(null)} />}
      {dialog === 'reassign' && <ReassignDialog accountIds={[a.id]} onClose={() => setDialog(null)} />}
      {dialog === 'archive' && <ArchiveDialog account={a} onClose={() => setDialog(null)} />}
      {dialog === 'merge' && <MergeDialog account={a} onClose={() => setDialog(null)} />}
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
