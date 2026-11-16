import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { AlertCircle, AlertTriangle, ChevronDown, ClipboardCheck, Clock, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useApp } from '@/app/store'
import { ServiceRequestSheet } from './ServiceRequestSheet'
import { dueLabel } from '@/domain/sla'
import { useToast } from '@/components/ui/toast'
import { useIsMobile } from '@/app/media'
import { dateOf, offsetOfDate, usd, useLookups, useMutate } from '@/app/hooks'
import { canEditService, canSeeAccount, visibleAccounts } from '@/domain/access'
import { canServiceTransition } from '@/domain/rules'
import type { ServiceRequest, ServiceStatus } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, KeyValue, PageTitle, Panel, RecordHeader, type Column } from '@/components/patterns'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { Button, CountPill, cx, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AccessDenied, NotFound } from './SystemPages'

const COLUMNS: ServiceStatus[] = ['New', 'In progress', 'Waiting on carrier', 'Waiting on client', 'Done']

/** US-SRV-001: board by status; Done shows the last 30 days. Scoped by role. */
export function ServicePage() {
  const { data, user } = useApp()
  const { account, userName, policy } = useLookups()
  const navigate = useNavigate()
  const mutate = useMutate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [mineOnly, setMineOnly] = useState(user.role === 'account-manager')
  const mobile = useIsMobile()
  const list = params.get('view') === 'list' || mobile
  const setView = (v: 'board' | 'list') => {
    const next = new URLSearchParams(params)
    if (v === 'list') next.set('view', 'list')
    else next.delete('view')
    setParams(next, { replace: true })
  }
  const readOnly = user.role === 'admin'
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const t = q.trim().toLowerCase()
  const items = data.serviceRequests.filter(
    (r) =>
      scoped.has(r.accountId) &&
      (!mineOnly || r.ownerId === user.id) &&
      // shortcut: there is no doneAt field yet, so "done in the last 14 days" uses the created date; switch when US-SRV-014 adds it.
      (list || r.status !== 'Done' || r.createdOffset >= -14) &&
      (!t || r.id.toLowerCase().includes(t) || r.subject.toLowerCase().includes(t) || (account(r.accountId)?.name.toLowerCase().includes(t) ?? false) || (policy(r.policyId)?.policyNumber.toLowerCase().includes(t) ?? false)),
  )
  const open = items.filter((r) => r.status !== 'Done')
  // US-SRV-002 saved views and filters (list only); state lives in the URL.
  const now = new Date()
  const LVIEWS = ['My open', 'Overdue', 'Waiting on carrier', 'Waiting on client', 'Done last 30 days']
  const lview = LVIEWS.find((v) => v.toLowerCase().replace(/\s+/g, '-') === params.get('saved')) ?? LVIEWS[0]
  const inLView: Record<string, (r: ServiceRequest) => boolean> = {
    'My open': (r) => r.status !== 'Done' && (user.role === 'producer' ? r.createdById === user.id : user.role === 'account-manager' ? r.ownerId === user.id : true),
    Overdue: (r) => r.status !== 'Done' && r.status !== 'Waiting on client' && dueDate(r) < now,
    'Waiting on carrier': (r) => r.status === 'Waiting on carrier',
    'Waiting on client': (r) => r.status === 'Waiting on client',
    'Done last 30 days': (r) => r.status === 'Done' && r.createdOffset >= -30,
  }
  const fl = { type: params.get('type'), status: params.get('status'), assignee: params.get('assignee'), office: params.get('office') }
  const setP = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true }) }
  const listRows = items
    .filter(inLView[lview])
    .filter((r) => (!fl.type || r.type === fl.type) && (!fl.status || r.status === fl.status) && (!fl.assignee || r.ownerId === fl.assignee) && (!fl.office || account(r.accountId)?.officeId === fl.office))
    .sort((a, b) => dueDate(a).getTime() - dueDate(b).getTime())
  const page = Math.max(1, Number(params.get('page')) || 1)
  const attention = open.filter((r) => (r.status !== 'Waiting on client' && dueDate(r) < now) || waitingDays(r) > 5)
  const [showAttention, setShowAttention] = useState(true)
  const moveTo = (r: ServiceRequest, to: ServiceStatus) => {
    // Done needs a resolution, which the record asks for.
    if (to === 'Done') return navigate(`/service/${r.id}?close=1`)
    mutate((s) => s.setServiceStatus(r.id, to, user.id), `${r.id} moved to ${to}`)
  }
  const columns: Column<ServiceRequest>[] = [
    { key: 'id', label: 'ID', width: 110, render: (r) => <span className="font-mono text-sm text-label">{r.id}</span> },
    { key: 'subject', label: 'Subject', render: (r) => <span className="flex min-w-0 flex-col leading-tight"><span className="truncate font-medium text-strong">{r.subject}</span><span className="truncate text-sm text-muted">{account(r.accountId)?.name}</span></span>, csv: (r) => r.subject },
    { key: 'type', label: 'Type', width: 150, sort: (a, b) => a.type.localeCompare(b.type), render: (r) => r.type },
    { key: 'status', label: 'Status', width: 160, sort: (a, b) => COLUMNS.indexOf(a.status) - COLUMNS.indexOf(b.status), render: (r) => <StatusCell status={r.status} />, csv: (r) => r.status },
    { key: 'policy', label: 'Policy', width: 160, render: (r) => <span className="font-mono text-sm">{policy(r.policyId)?.policyNumber ?? '—'}</span>, csv: (r) => policy(r.policyId)?.policyNumber ?? '' },
    { key: 'owner', label: 'Assignee', width: 140, render: (r) => userName(r.ownerId) },
    { key: 'office', label: 'Office', width: 100, render: (r) => data.offices.find((o) => o.id === account(r.accountId)?.officeId)?.name ?? '' },
    { key: 'created', label: 'Created', width: 110, sort: (a, b) => a.createdOffset - b.createdOffset, render: (r) => dateOf(r.createdOffset) },
    { key: 'due', label: 'Due', width: 150, mobile: true, sort: (a, b) => dueDate(a).getTime() - dueDate(b).getTime(), render: (r) => <DueIndicator r={r} />, csv: (r) => dateOf(r.dueOffset) },
    { key: 'age', label: 'Age', width: 70, align: 'right', sort: (a, b) => b.createdOffset - a.createdOffset, render: (r) => `${-r.createdOffset}d` },
  ]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle
        title="Service"
        description="Post-sale work for your Accounts: changes, certificates, claims, billing."
        actions={
          <Gate allowed={!readOnly} reason="Admins have read-only access to Service Requests.">
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus aria-hidden className="size-4" /> New request
            </Button>
          </Gate>
        }
      />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label className="relative w-80 max-sm:w-full">
          <span className="sr-only">Search requests</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requests, Accounts, policy numbers" className={cx(inputCls, 'pl-8')} />
        </label>
        <button aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)} className={cx('h-9 rounded-md px-3 text-sm shadow-ring', mineOnly ? 'bg-recessed font-semibold text-strong' : 'bg-surface text-label hover:bg-recessed')}>
          Assigned to me
        </button>
        <div role="group" aria-label="Layout" className="ml-auto inline-flex rounded-md bg-recessed p-0.5 max-md:hidden">
          {(['board', 'list'] as const).map((v) => (
            <button key={v} aria-pressed={list === (v === 'list')} onClick={() => setView(v)} className={cx('h-8 rounded-[5px] px-3 text-sm capitalize', list === (v === 'list') ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:text-strong')}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {attention.length > 0 && (
        <section className="mt-4 rounded-md bg-warning-tint px-4 py-2.5 shadow-ring">
          <button aria-expanded={showAttention} onClick={() => setShowAttention(!showAttention)} className="flex w-full items-center gap-2 text-left text-base font-medium text-ink">
            <AlertTriangle aria-hidden className="size-4 text-warning-text" /> {attention.length} request{attention.length === 1 ? '' : 's'} need attention
            <ChevronDown aria-hidden className={cx('ml-auto size-4 transition-transform', showAttention && 'rotate-180')} />
          </button>
          {showAttention && (
            <ul className="mt-1.5 flex flex-col gap-0.5 text-sm">
              {attention.slice(0, 6).map((r) => (
                <li key={r.id}><Link to={`/service/${r.id}`} className="text-link underline">{r.id}</Link> · {r.type} · {waitingDays(r) > 5 ? `Waiting ${waitingDays(r)}d` : dueLabel(dueDate(r), now, false).text}</li>
              ))}
              {attention.length > 6 && <li className="text-label">and {attention.length - 6} more</li>}
            </ul>
          )}
        </section>
      )}
      <p className="tabular mt-3 text-sm text-muted">
        {list ? `Showing ${Math.min(50, listRows.length)} of ${listRows.length} ${lview === 'Done last 30 days' ? 'done' : 'open'} requests` : `${open.length} open · ${open.filter((r) => r.status !== 'Waiting on client' && dueDate(r) < now).length} overdue · ${open.filter((r) => r.status === 'Waiting on carrier' && waitingDays(r) > 5).length} waiting on carrier more than 5 days`}
      </p>
      {list ? (
        <div className="mt-2">
          <nav aria-label="Saved views" className="mb-3 flex gap-1 overflow-x-auto border-b border-line">
            {LVIEWS.map((v) => (
              <button key={v} aria-current={v === lview ? 'page' : undefined} onClick={() => setP('saved', v === LVIEWS[0] ? null : v.toLowerCase().replace(/\s+/g, '-'))} className={cx('-mb-px flex items-center gap-2 border-b-2 px-2.5 py-2 text-base whitespace-nowrap', v === lview ? 'border-strong font-medium text-strong' : 'border-transparent text-label hover:text-strong')}>
                {v} <CountPill n={items.filter(inLView[v]).length} />
              </button>
            ))}
          </nav>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([['type', 'Type', ['Policy change', 'Certificate request', 'Claim report', 'ID card / evidence', 'Billing question', 'Cancellation request', 'General'].map((x) => [x, x])], ['status', 'Status', COLUMNS.map((x) => [x, x])], ['assignee', 'Assignee', data.users.filter((u) => u.role === 'account-manager' && (user.role !== 'account-manager' || u.officeId === user.officeId)).map((u) => [u.id, u.name])], ...(user.role === 'principal' || user.role === 'admin' ? [['office', 'Office', data.offices.map((o) => [o.id, o.name])]] : [])] as [string, string, string[][]][]).map(([k, label, opts]) => (
              <select key={k} aria-label={label} value={params.get(k) ?? ''} onChange={(e) => setP(k, e.target.value || null)} className="h-8 rounded-md bg-surface px-2 text-sm shadow-control">
                <option value="">{label}</option>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {Object.values(fl).some(Boolean) && <button onClick={() => { const n = new URLSearchParams(); n.set('view', 'list'); setParams(n, { replace: true }) }} className="text-sm text-link hover:underline">Clear filters</button>}
          </div>
          <DataTable rows={listRows.slice((page - 1) * 50, page * 50)} columns={columns} listId="service" exportName="service-requests" onRowClick={(r) => navigate(`/service/${r.id}`)} minWidth={1300} empty={<p className="p-6 text-center text-base text-muted">No requests match these filters.</p>} />
          {listRows.length > 50 && (
            <div className="tabular mt-3 flex items-center justify-between text-sm text-label">
              <span>{(page - 1) * 50 + 1}–{Math.min(page * 50, listRows.length)} of {listRows.length}</span>
              <span className="flex gap-2">
                <Button size="sm" disabled={page <= 1} onClick={() => setP('page', String(page - 1))}>Previous</Button>
                <Button size="sm" disabled={page * 50 >= listRows.length} onClick={() => setP('page', String(page + 1))}>Next</Button>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto pb-2">
          <div className="grid min-w-[1440px] grid-cols-5 gap-3 xl:min-w-0">
            {COLUMNS.map((st) => {
              const col = items.filter((r) => r.status === st).sort((a, b) => a.dueOffset - b.dueOffset)
              return (
                <section key={st} aria-label={st} className="flex min-w-0 flex-col rounded-md bg-recessed p-2">
                  <h2 className="flex items-center justify-between px-1.5 pb-2 text-base font-semibold text-strong">
                    {st}
                    <CountPill n={col.length} />
                  </h2>
                  <ol className="flex flex-col gap-2">
                    {col.slice(0, 50).map((r) => {
                      const waiting = waitingDays(r)
                      return (
                        <li key={r.id} className="relative rounded-md bg-surface shadow-ring transition-shadow duration-150 hover:shadow-pop">
                          <Link to={`/service/${r.id}`} className="block p-3 pr-10 outline-offset-2">
                            <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
                              <span className="font-mono whitespace-nowrap">{r.id}</span>
                              <span className="truncate">{r.type}</span>
                              {r.priority === 'High' && <span className="shrink-0 font-medium text-danger-text">High</span>}
                            </span>
                            <span title={r.subject} className="mt-0.5 line-clamp-2 text-base font-medium text-strong">{r.subject}</span>
                            <span className="block truncate text-sm text-label">{account(r.accountId)?.name}</span>
                            {waiting > 5 && <span className="mt-0.5 flex items-center gap-1 text-sm text-label"><Clock aria-hidden className="size-3.5" /> Waiting {waiting}d</span>}
                            <span className="mt-1.5 flex justify-between gap-2 text-sm text-muted">
                              <span title={userName(r.ownerId)} className="grid size-5 shrink-0 place-items-center rounded-full bg-fill text-xs font-medium text-label">
                                {userName(r.ownerId).split(' ').map((w) => w[0]).join('').slice(0, 2)}
                              </span>
                              {r.status !== 'Done' && <span className="shrink-0 text-sm"><DueIndicator r={r} now={now} /></span>}
                            </span>
                          </Link>
                          <Menu.Root>
                            <Menu.Trigger aria-label={`Actions for ${r.id}`} className="absolute top-2 right-2 grid size-7 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong">
                              <MoreHorizontal className="size-4" />
                            </Menu.Trigger>
                            <Menu.Portal>
                              <Menu.Content align="end" sideOffset={4} className={menuContent}>
                                <Menu.Label className="px-2 py-1 text-xs text-muted">Move to…</Menu.Label>
                                {COLUMNS.map((to) => {
                                  const check = canServiceTransition(r.status, to, -r.createdOffset)
                                  const blocked = readOnly || !check.ok || !canEditService(user, account(r.accountId)!, r.createdById)
                                  return (
                                    <Menu.Item key={to} disabled={blocked} className={cx(menuItem, 'data-[disabled]:text-muted')} onSelect={() => moveTo(r, to)}>
                                      <StatusCell status={to} />
                                      {to === 'Done' && <span className="ml-auto text-xs text-muted">Add resolution</span>}
                                    </Menu.Item>
                                  )
                                })}
                                {readOnly && <p className="px-2 py-1 text-xs text-muted">Admins have read-only access to Service Requests.</p>}
                              </Menu.Content>
                            </Menu.Portal>
                          </Menu.Root>
                        </li>
                      )
                    })}
                    {col.length > 50 && <li className="px-1.5 text-sm text-muted">Showing 50 of {col.length}. Switch to List to see all.</li>}
                  </ol>
                  {st === 'Done' && (
                    <p className="mt-2 px-1.5 text-sm text-label">
                      Showing done in the last 14 days ·{' '}
                      <Link to="/service?view=list" className="text-link underline">View all in list</Link>
                    </p>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
      {creating && <NewServiceRequestSheet onClose={() => setCreating(false)} />}
    </div>
  )
}

/** Kept for existing imports; the full form lives in ServiceRequestSheet (US-SRV-005..012, 015). */
export const NewServiceRequestSheet = ServiceRequestSheet

/** US-SRV-014: SLA due as a Date (older seeded rows have only a day offset: 5:00 PM that day). */
export function dueDate(r: ServiceRequest) {
  if (r.dueAt) return new Date(r.dueAt)
  const d = new Date()
  d.setDate(d.getDate() + r.dueOffset)
  d.setHours(17, 0, 0, 0)
  return d
}
export function DueIndicator({ r, now = new Date() }: { r: ServiceRequest; now?: Date }) {
  if (r.status === 'Done') return <span className="text-muted">—</span>
  const l = dueLabel(dueDate(r), now, r.status === 'Waiting on client')
  return (
    <span className={cx('tabular inline-flex items-center gap-1 whitespace-nowrap', l.tone === 'danger' ? 'font-medium text-danger-text' : l.tone === 'warning' ? 'font-medium text-warning-text' : l.tone === 'muted' ? 'text-label' : '')}>
      {l.tone === 'danger' && <AlertCircle aria-hidden className="size-3.5" />}
      {l.tone === 'warning' && <AlertTriangle aria-hidden className="size-3.5" />}
      {l.tone === 'muted' && <Clock aria-hidden className="size-3.5" />}
      {l.text}
    </span>
  )
}
const waitingDays = (r: ServiceRequest) => (r.status === 'Waiting on carrier' || r.status === 'Waiting on client' ? -r.createdOffset : 0)

/** US-SRV-003 / US-SRV-004 */
export function ServiceRequestPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, userName, policy } = useLookups()
  const mutate = useMutate()
  const [params] = useSearchParams()
  const [doneOpen, setDoneOpen] = useState(params.get('close') === '1')
  const [resolution, setResolution] = useState('')
  const [editing, setEditing] = useState(false)
  const [outcome, setOutcome] = useState<'Endorsement issued' | 'Carrier declined' | 'Withdrawn by Account'>('Endorsement issued')
  const [effective, setEffective] = useState('')
  const [premKind, setPremKind] = useState<'Additional premium' | 'Return premium' | 'No change'>('No change')
  const [premAmt, setPremAmt] = useState('')
  const [idFollow, setIdFollow] = useState<string | null>(null)
  const toast = useToast()
  const r = data.serviceRequests.find((x) => x.id === id)
  if (!r) return <NotFound what="Service Request" />
  const account = getAccount(r.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="Service Request" owner={userName(r.ownerId)} />
  const canEdit = canEditService(user, account, r.createdById)
  const p = policy(r.policyId)
  const move = (to: ServiceStatus, note?: string) => mutate((s) => s.setServiceStatus(r.id, to, user.id, { note }), `Moved to ${to}`)
  const options = (['In progress', 'Waiting on carrier', 'Waiting on client'] as ServiceStatus[]).filter((to) => canServiceTransition(r.status, to, 0).ok)
  const reason = user.role === 'admin' ? 'Admins can view Service Requests only.' : 'Producers can edit only requests they created.'
  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/service', label: 'Service' }}
        icon={ClipboardCheck}
        title={r.subject}
        status={<StatusCell status={r.status} />}
        meta={
          <>
            <span className="font-mono text-sm">{r.id}</span>
            <span>{r.type}</span>
            <Link className="text-link hover:underline" to={`/accounts/${account.id}?tab=service`}>{account.name}</Link>
            <span>Owner {userName(r.ownerId)}</span>
            <DueIndicator r={r} />
          </>
        }
        actions={
          <Gate allowed={canEdit} reason={reason}>
            <span className="flex flex-wrap gap-2">
              {r.status === 'Done' ? (
                <>
                  <Tip label="Reopen the request to edit it."><span tabIndex={0}><Button disabled>Edit</Button></span></Tip>
                  <Button onClick={() => move('In progress', 'Reopened')}>Reopen</Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditing(true)}>Edit</Button>
                  {options.map((to) => (
                    <Button key={to} onClick={() => move(to, to.startsWith('Waiting') ? (to === 'Waiting on carrier' ? 'Endorsement requested from carrier' : 'Waiting for client documents') : undefined)}>
                      {r.status === 'New' && to === 'In progress' ? 'Start work' : `Move to ${to}`}
                    </Button>
                  ))}
                  <Button variant="primary" onClick={() => setDoneOpen(true)}>Mark done</Button>
                </>
              )}
            </span>
          </Gate>
        }
      />
      <div className="grid grid-cols-[1fr_360px] gap-4 px-8 pt-5 max-lg:grid-cols-1 max-sm:px-4">
        <div className="flex flex-col gap-4">
          {r.outcome && (
            <div className="rounded-md bg-surface px-4 py-3 shadow-ring">
              <p className="text-base font-medium text-strong">
                {r.outcome.kind}
                {r.outcome.effectiveOffset != null && ` · effective ${dateOf(r.outcome.effectiveOffset)}`}
                {r.outcome.premium && r.outcome.premium.kind !== 'No change' && ` · ${r.outcome.premium.kind} ${usd(r.outcome.premium.amount)}`}
                {r.outcome.reason && ` · ${r.outcome.reason}`}
              </p>
              {r.outcome.kind === 'Endorsement issued' && <p className="text-sm text-muted">The policy updates in Fortify when the AMS syncs the endorsement.</p>}
            </div>
          )}
          <Panel title="Request">
            <p className="text-base text-ink">{r.description}</p>
            {r.type === 'Policy change' && 'changes' in r.details && (
              <p className="mt-2 text-base text-label">
                Change: {(r.details.changes as { kind: string }[]).map((c) => c.kind).join(', ')} · effective {String(r.details.effectiveDate ?? '—')}
              </p>
            )}
            <RequestDetails r={r} />
            {r.resolution && <p className="mt-3 rounded-md bg-success-tint px-3 py-2 text-base text-ink">Resolution: {r.resolution}</p>}
          </Panel>
          <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'service', id: r.id }} />}>
            <ActivityTimeline linked={{ kind: 'service', id: r.id }} accountId={account.id} />
          </Panel>
        </div>
        <Panel title="Details">
          <KeyValue
            items={[
              ['Priority', r.priority],
              ['Policy', p ? <Link className="text-link hover:underline" to={`/policies/${p.id}`}>{p.line} · {p.policyNumber}</Link> : null],
              ['Created', `${dateOf(r.createdOffset)} by ${userName(r.createdById)}`],
              ['Requested via', r.requestedVia ?? null],
              ['Assigned to', userName(r.ownerId)],
              ['Due', <DueIndicator key="d" r={r} />],
              ['Due reason', r.dueReason ?? null],
              ['Attachments', r.attachments?.length ? r.attachments.map((a) => a.name).join(', ') : null],
              [
                'Linked records',
                r.details.claimId ? <Link key="c" to={`/claims/${r.details.claimId}`} className="text-link hover:underline">Claim {String(r.details.claimId)} · {data.claims?.find((c) => c.id === r.details.claimId)?.status}</Link>
                : r.details.certificateId ? <Link key="c" to={`/certificates/${r.details.certificateId}`} className="text-link hover:underline">Certificate {String(r.details.certificateId)} · {data.certificates?.find((c) => c.id === r.details.certificateId)?.status}</Link>
                : null,
              ],
            ]}
          />
        </Panel>
      </div>
      <Confirm
        open={doneOpen}
        onOpenChange={setDoneOpen}
        title={`Close ${r.id}?`}
        body={r.type === 'ID card / evidence' ? 'Attach the ID card or evidence you sent.' : 'Add the resolution the client will hear.'}
        confirmLabel="Mark done"
        onConfirm={async () => {
          if (r.type === 'ID card / evidence' && !r.attachments?.length) throw new Error('Attach the ID card or evidence before marking done.')
          if (r.type === 'Policy change') {
            const o = outcome === 'Endorsement issued'
              ? { kind: outcome, effectiveOffset: effective ? offsetOfDate(new Date(`${effective}T12:00:00`)) : (r.details.effectiveDate ? offsetOfDate(new Date(`${r.details.effectiveDate}T12:00:00`)) : 0), premium: { kind: premKind, amount: premKind === 'No change' ? undefined : Number(premAmt) } }
              : { kind: outcome, reason: resolution.trim() }
            if (outcome === 'Endorsement issued' && premKind !== 'No change' && !(Number(premAmt) > 0)) throw new Error('Enter the premium change amount.')
            if (outcome !== 'Endorsement issued' && !resolution.trim()) throw new Error('Add a reason.')
            await mutate((s) => s.setServiceStatus(r.id, 'Done', user.id, { resolution: resolution.trim() || outcome, outcome: o }), 'Request closed')
            const kind = (r.details.changes as { kind: string }[] | undefined)?.[0]?.kind ?? String(r.details.kind ?? '')
            if (outcome === 'Endorsement issued' && (kind === 'Add vehicle' || kind === 'Replace vehicle')) toast('Policy change done', 'success', { duration: 8000, action: { label: 'Create ID card request', onClick: () => setIdFollow(kind) } })
            return
          }
          await mutate((s) => s.setServiceStatus(r.id, 'Done', user.id, { resolution }), 'Request closed')
        }}
      >
        {r.type === 'Policy change' && (
          <>
            <Field label="Outcome">
              <select className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
                <option>Endorsement issued</option>
                <option>Carrier declined</option>
                <option>Withdrawn by Account</option>
              </select>
            </Field>
            {outcome === 'Endorsement issued' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Endorsement effective date"><input type="date" className={inputCls} value={effective || String(r.details.effectiveDate ?? '')} onChange={(e) => setEffective(e.target.value)} /></Field>
                <Field label="Premium change">
                  <select className={inputCls} value={premKind} onChange={(e) => setPremKind(e.target.value as typeof premKind)}><option>No change</option><option>Additional premium</option><option>Return premium</option></select>
                </Field>
                {premKind !== 'No change' && <Field label="Amount"><input inputMode="decimal" className={inputCls} value={premAmt} onChange={(e) => setPremAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="214.00" /></Field>}
              </div>
            )}
          </>
        )}
        <Field label={r.type === 'Policy change' && outcome !== 'Endorsement issued' ? 'Reason' : 'Resolution'} hint="e.g. Vehicle added effective 11/15/2026; new ID cards emailed">
          <textarea className={`${inputCls} h-24 py-2`} value={resolution} onChange={(e) => setResolution(e.target.value)} />
        </Field>
      </Confirm>
      {editing && <ServiceRequestSheet request={r} onClose={() => setEditing(false)} />}
      {idFollow && <ServiceRequestSheet accountId={r.accountId} policyId={r.policyId ?? undefined} type="ID card / evidence" presetVehicle={(data.insuredItems ?? []).filter((i) => i.policyId === r.policyId && i.kind === 'Vehicle').map((v) => (v.kind === 'Vehicle' ? `${v.year} ${v.make} ${v.model}` : '')).at(-1)} onClose={() => setIdFollow(null)} />}
    </div>
  )
}

/** Type-specific details captured on the request (US-SRV-008..012). */
function RequestDetails({ r }: { r: ServiceRequest }) {
  const d = r.details as Record<string, unknown>
  const rows: [string, string][] = []
  const add = (k: string, v: unknown) => v != null && v !== '' && rows.push([k, String(v)])
  if (r.type === 'Policy change') { add('Change', (d.changes as { kind: string }[] | undefined)?.map((c) => c.kind).join(', ') ?? d.kind); add('Effective', d.effectiveDate) }
  if (r.type === 'Claim report') { add('Loss type', d.lossType); add('Date of loss', d.lossDate); add('Cause', d.cause); add('Location', d.location); add('Injuries', d.injuries); add('Report #', d.reportNumber) }
  if (r.type === 'ID card / evidence') { add('Document', d.document); add('Vehicles', (d.vehicles as string[] | undefined)?.join(', ')); add('Delivery', d.delivery) }
  if (r.type === 'Billing question') { add('Topic', d.topic); add('Amount', d.amount ? `$${d.amount}` : null); add('Notice of cancellation', d.noticeReceived ? `Yes · effective ${d.cancelEffective}` : null) }
  if (r.type === 'Cancellation request') { add('Requested date', d.cancelDate); add('Reason', d.reason); add('Signed request', d.signed === 'Yes' ? 'Received' : 'Signed request outstanding'); add('New carrier', d.newCarrier) }
  if (r.type === 'Certificate request') { add('Additional insured', d.additionalInsured ? 'Yes' : null); add('Waiver of subrogation', d.waiver ? 'Yes' : null); add('Primary & noncontributory', d.primaryNonContrib ? 'Yes' : null); add('Operations', d.operations) }
  if (!rows.length) return null
  return (
    <dl className="mt-3 grid grid-cols-[160px_1fr] gap-x-4 gap-y-1 text-base">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-label">{k}</dt><dd className={cx(v === 'Signed request outstanding' && 'font-medium text-warning-text')}>{v}</dd></div>)}
    </dl>
  )
}

export function serviceCount(list: ServiceRequest[], accountId: string) {
  return list.filter((r) => r.accountId === accountId && r.status !== 'Done').length
}
