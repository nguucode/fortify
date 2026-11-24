import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate, useSearchParams } from 'react-router'
import { AlertTriangle, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import { useApp, useDemoControls } from '@/app/store'
import { dateOf, useLookups, useMutate } from '@/app/hooks'
import { MERGE_FIELDS, smsSegments, unknownTokens } from '@/domain/templates'
import { mergeValues } from '@/app/merge'
import { INTEGRATION_DEFAULTS } from '@/app/data'
import { renewalWindowDays } from '@/domain/rules'
import type { AgencySettings, Office, Template, User } from '@/domain/types'
import { Confirm, DataTable, Field, Gate, inputCls, KeyValue, mini, PageTitle, Panel, PrimaryCell, Sheet, SheetCancel, type Column, type FilterDef } from '@/components/patterns'
import { Markdown } from '@/product/Markdown'
import { docs } from '@/product/spec'
import { ProgressLine, Badge, Button, Callout, controlCls, cx, Due, Select, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { formatPhone } from './AccountSheets'
import { AccessDenied } from './SystemPages'

const RO = 'Only Admins can change Settings.'
const ROLE_LABEL: Record<string, string> = { producer: 'Producer', 'account-manager': 'Account Manager', principal: 'Principal', admin: 'Admin' }
function useCanEdit() {
  return useApp().user.role === 'admin'
}
const Edit = ({ children }: { children: ReactNode }) => <Gate allowed={useCanEdit()} reason={RO}>{children}</Gate>
/** The PageTitle badge for viewers who can't edit Settings. */
function ReadOnlyBadge() {
  return useCanEdit() ? null : <Badge>Read only</Badge>
}

/** US-SET-001 */
export function SettingsLayout() {
  const { user } = useApp()
  if (user.role === 'producer' || user.role === 'account-manager') return <AccessDenied what="Settings" area={{ who: 'Admins and Principals' }} />
  const groups: [string, [string, string, boolean?][]][] = [
    ['Organization', [['/settings/users', 'Users'], ['/settings/offices', 'Offices'], ['/settings/roles', 'Roles']]],
    ['Workflow', [['/settings/pipeline', 'Pipeline'], ['/settings/templates', 'Templates']]],
    ['Data', [['/settings/carriers', 'Carriers & appointments', true], ['/settings/licenses', 'Licenses', true], ['/settings/data-sync', 'AMS data sync'], ['/settings/integrations', 'Integrations']]],
  ]
  return (
    <div className="flex min-h-full max-md:flex-col">
      <nav aria-label="Settings" className="w-68 shrink-0 border-r border-line px-2 py-5 max-md:w-full max-md:border-r-0 max-md:border-b">
        {groups.map(([g, items]) => (
          <div key={g} className="mb-4">
            <p className="px-2.5 pb-1 text-xs text-muted">{g}</p>
            {items.map(([to, label, ro]) => (
              <NavLink key={to} to={to} className={({ isActive }) => cx('flex items-center justify-between rounded-md px-2.5 py-1.5 text-base', isActive ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:bg-recessed hover:text-strong')}>
                <span className="whitespace-nowrap">{label}</span>
                {ro && <span className="shrink-0 pl-2 text-xs whitespace-nowrap text-muted">Read only</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1 px-8 pt-6 pb-12 max-sm:px-4">
        <Outlet />
      </div>
    </div>
  )
}
export const SettingsIndex = () => <Navigate to="/settings/users" replace />

/** US-SET-002 + 003 */
export function SettingsUsers() {
  const { data } = useApp()
  const { office } = useLookups()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [drawer, setDrawer] = useState<User | 'new' | null>(null)
  const f = { role: params.get('role'), office: params.get('office'), status: params.get('status') }
  const rows = data.users.filter((u) => (f.status ? (u.status ?? 'Active') === f.status : u.status !== 'Deactivated') && (!f.role || u.role === f.role) && (!f.office || u.officeId === f.office)).sort((a, b) => a.name.localeCompare(b.name))
  const book = (u: User) => data.accounts.filter((a) => a.lifecycle === 'active' && (a.producerId === u.id || a.accountManagerId === u.id)).length
  const licWarn = (u: User) => (u.licenseRecords ?? []).some((l) => l.expirationOffset <= 60)
  const filters: FilterDef[] = [
    { k: 'role', label: 'Role', opts: Object.entries(ROLE_LABEL) },
    { k: 'office', label: 'Office', opts: data.offices.map((o) => [o.id, o.name]) },
    { k: 'status', label: 'Status', opts: [['Active', 'Active'], ['Invited', 'Invited'], ['Deactivated', 'Deactivated']], empty: 'Active and invited' },
  ]
  const cols: Column<User>[] = [
    { key: 'name', label: 'Name', render: (u) => <PrimaryCell name={u.name} token={u.email} />, csv: (u) => u.name },
    { key: 'role', label: 'Role', width: 150, render: (u) => ROLE_LABEL[u.role] },
    { key: 'office', label: 'Office', width: 120, render: (u) => office(u.officeId)?.name ?? '' },
    { key: 'title', label: 'Title', width: 180, render: (u) => u.title ?? '—' },
    { key: 'book', label: 'Book', width: 80, align: 'right', render: (u) => <button onClick={(e) => { e.stopPropagation(); navigate(`/accounts?${u.role === 'producer' ? 'producer' : 'am'}=${u.id}`) }} className="text-link hover:underline">{book(u)}</button>, csv: (u) => book(u) },
    { key: 'lic', label: 'Licenses', width: 110, render: (u) => (licWarn(u) ? <button onClick={(e) => { e.stopPropagation(); navigate(`/settings/licenses?user=${u.id}`) }} className="inline-flex items-center gap-1 font-medium text-warning-text hover:underline"><AlertTriangle aria-hidden className="size-3.5" />{u.licenseRecords?.length}</button> : (u.licenseRecords?.length ?? 0)), csv: (u) => u.licenseRecords?.length ?? 0 },
    { key: 'status', label: 'Status', width: 120, mobile: true, render: (u) => <StatusCell status={u.status ?? 'Active'} />, csv: (u) => u.status ?? 'Active' },
  ]
  return (
    <>
      <PageTitle title="Users" description="Who works in Fortify, their role, and their Office." badge={<ReadOnlyBadge />} />
      <DataTable
        search={{ label: 'Search users', placeholder: 'Search name or email', match: (u, q) => `${u.name} ${u.email}`.toLowerCase().includes(q) }}
        className="mt-4"
        rows={rows}
        columns={cols}
        minWidth={960}
        listId="settings-users"
        exportName="users"
        onRowClick={(u) => setDrawer(u)}
        filters={filters}
        actions={<Edit><Button variant="primary" onClick={() => setDrawer('new')}><Plus aria-hidden className="size-4" strokeWidth={1.75} />Invite user</Button></Edit>}
        meta={<span className="tabular">{data.users.filter((u) => u.status !== 'Deactivated' && u.status !== 'Invited').length} users · {data.offices.length} offices · {data.users.filter((u) => u.status === 'Invited').length} invited</span>}
      />
      {drawer && <UserDrawer user={drawer === 'new' ? undefined : drawer} onClose={() => setDrawer(null)} />}
    </>
  )
}

function UserDrawer({ user: u, onClose }: { user?: User; onClose: () => void }) {
  const { data, user: me } = useApp()
  const mutate = useMutate()
  const canEdit = useCanEdit()
  const [first, setFirst] = useState(u?.name.split(' ')[0] ?? '')
  const [last, setLast] = useState(u?.name.split(' ').slice(1).join(' ') ?? '')
  const [email, setEmail] = useState(u?.email ?? '')
  const [role, setRole] = useState<User['role']>(u?.role ?? 'producer')
  const [officeId, setOfficeId] = useState(u?.officeId ?? data.offices[0].id)
  const [title, setTitle] = useState(u?.title ?? '')
  const [phone, setPhone] = useState(u?.phone ?? '')
  const [err, setErr] = useState<string | null>(null)
  const self = u?.id === me.id
  const openOpps = u ? data.opportunities.filter((o) => o.ownerId === u.id && o.stage !== 'Won' && o.stage !== 'Lost').length : 0
  const save = () => mutate((s) => s.saveUser(u?.id ?? null, { name: `${first} ${last}`.trim(), email, role, officeId, title: title || null, phone: phone || null }, me.id), u ? 'User saved' : `Invite sent to ${email}`).then(onClose).catch((e) => setErr((e as Error).message))
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={u ? u.name : 'Invite user'}
      footer={
        <>
          {u && canEdit && !self && (
            <Button className="mr-auto" onClick={() => mutate((s) => s.setUserStatus(u.id, u.status === 'Deactivated' ? 'Active' : 'Deactivated', me.id), u.status === 'Deactivated' ? 'User reactivated' : 'User deactivated').then(onClose).catch((e) => setErr((e as Error).message))}>
              {u.status === 'Deactivated' ? 'Reactivate' : 'Deactivate'}
            </Button>
          )}
          <SheetCancel />
          {canEdit && <Button variant="primary" onClick={save}>{u ? 'Save' : 'Send invite'}</Button>}
        </>
      }
    >
      <fieldset disabled={!canEdit} className="flex flex-col gap-3">
        {err && <Callout tone="danger">{err}{err.startsWith('Move') && <Link to={`/accounts?${u?.role === 'producer' ? 'producer' : 'am'}=${u?.id}`} className="ml-1 text-link underline">Move Book</Link>}</Callout>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
          <Field label="Last name"><input className={inputCls} value={last} onChange={(e) => setLast(e.target.value)} /></Field>
        </div>
        <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value.trim())} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role" hint={self ? 'You can’t change your own role or status.' : undefined}><select className={inputCls} disabled={self} value={role} onChange={(e) => setRole(e.target.value as User['role'])}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Office"><select className={inputCls} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>{data.offices.map((o) => <option key={o.id} value={o.id}>{o.name} {o.state}</option>)}</select></Field>
          <Field label="Title (optional)"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Phone (optional)"><input className={inputCls} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} /></Field>
        </div>
        {u && u.role === 'producer' && role === 'account-manager' && openOpps > 0 && <Callout tone="warning">{u.name} owns {openOpps} open Opportunities. Account Managers can't edit Opportunities; reassign them first.</Callout>}
        {u && officeId !== u.officeId && <p className="text-sm text-label">Their Accounts stay in {data.offices.find((o) => o.id === u.officeId)?.name}. Move the Book separately if needed.</p>}
      </fieldset>
    </Sheet>
  )
}

/** US-SET-004 */
export function SettingsOffices() {
  const { data } = useApp()
  const [editing, setEditing] = useState<Office | null>(null)
  return (
    <>
      <PageTitle className="mb-5" title="Offices" description="Fortify supports the agency's three offices." badge={<ReadOnlyBadge />} />
      <div className="flex flex-col gap-3">
        {data.offices.map((o) => (
          <Panel key={o.id} title={`${o.name} ${o.state}`} actions={<Edit><Button size="sm" onClick={() => setEditing(o)}>Edit</Button></Edit>}>
            <KeyValue items={[['Address', [o.address1, o.address2, `${o.city}, ${o.state} ${o.zip ?? ''}`].filter(Boolean).join(', ')], ['Phone', o.phone ?? null], ['Email', o.email ?? null], ['Time zone', o.state === 'FL' ? 'Eastern' : 'Central'], ['Business hours', o.hours ?? null], ['Users', <Link key="u" to={`/settings/users?office=${o.id}`} className="text-link hover:underline">{data.users.filter((u) => u.officeId === o.id && u.status !== 'Deactivated').length}</Link>], ['Accounts', <Link key="a" to={`/accounts?office=${o.id}`} className="text-link hover:underline">{data.accounts.filter((a) => a.officeId === o.id && a.lifecycle === 'active').length}</Link>]]} />
          </Panel>
        ))}
      </div>
      {editing && <OfficeDrawer office={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
function OfficeDrawer({ office: o, onClose }: { office: Office; onClose: () => void }) {
  const { user } = useApp()
  const mutate = useMutate()
  const [v, setV] = useState({ address1: o.address1 ?? '', address2: o.address2 ?? '', city: o.city, zip: o.zip ?? '', phone: o.phone ?? '', email: o.email ?? '' })
  const [err, setErr] = useState<string | null>(null)
  return (
    <Sheet open onOpenChange={(x) => !x && onClose()} title={`Edit ${o.name} ${o.state}`} footer={<><SheetCancel /><Button variant="primary" onClick={() => mutate((s) => s.updateOffice(o.id, v, user.id), `${o.name} ${o.state} office updated`).then(onClose).catch((e) => setErr((e as Error).message))}>Save</Button></>}>
      <div className="flex flex-col gap-3">
        {err && <Callout tone="danger">{err}</Callout>}
        <Field label="Address line 1"><input className={inputCls} value={v.address1} onChange={(e) => setV({ ...v, address1: e.target.value })} /></Field>
        <Field label="Address line 2"><input className={inputCls} value={v.address2} onChange={(e) => setV({ ...v, address2: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><input className={inputCls} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></Field>
          <Field label="ZIP"><input className={inputCls} value={v.zip} onChange={(e) => setV({ ...v, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} /></Field>
          <Field label="Phone"><input className={inputCls} value={v.phone} onChange={(e) => setV({ ...v, phone: formatPhone(e.target.value) })} /></Field>
          <Field label="Email"><input className={inputCls} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value.trim() })} /></Field>
        </div>
        <p className="text-sm text-muted">Name, state, time zone, and business hours are fixed; SLAs count business hours.</p>
      </div>
    </Sheet>
  )
}

/** US-SET-005 */
export function SettingsRoles() {
  const { data, setUser } = useApp()
  const navigate = useNavigate()
  const scope: [string, string, string][] = [['producer', 'Own', 'Accounts in their Book'], ['account-manager', 'Office', 'Every Account in their Office'], ['principal', 'Agency', 'Every Account; sees all commission'], ['admin', 'Agency + Settings', 'Every Account read-only; changes Settings']]
  const md = docs['ia/roles.md'].replace(/^# .*\n/, '')
  const matrix = md.slice(md.indexOf('## '))
  return (
    <>
      <PageTitle className="mb-5" title="Roles" description="Roles are fixed in this version. Use View as to preview any role." badge={<ReadOnlyBadge />} />
      <Panel title="Scope">
        <ul className="divide-y divide-fill">
          {scope.map(([r, sc, desc]) => (
            <li key={r} className="flex flex-wrap items-center gap-3 py-2 text-base">
              <span className="w-40 font-medium text-strong">{ROLE_LABEL[r]}</span>
              <span className="w-36 text-label">{sc}</span>
              <span className="flex-1 text-label">{desc}</span>
              <Link to={`/settings/users?role=${r}`} className="text-sm text-link hover:underline">{ROLE_LABEL[r]} · {data.users.filter((u) => u.role === r && u.status !== 'Deactivated').length} users</Link>
              <Button size="sm" onClick={() => { const u = data.users.find((x) => x.role === r && x.status === 'Active'); if (u) { setUser(u); navigate('/today') } }}>View as {ROLE_LABEL[r]}</Button>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="mt-4">
        <Panel title="Permission matrix and rules">
          <p className="mb-2 text-sm text-muted">C = create, E = edit, R = read, — = hidden; applies within the role’s scope.</p>
          <Markdown source={matrix} />
        </Panel>
      </div>
    </>
  )
}

/** US-SET-006 */
export function SettingsPipeline() {
  const { data, user } = useApp()
  const mutate = useMutate()
  const canEdit = useCanEdit()
  const [draft, setDraft] = useState<AgencySettings>(() => data.settings!)
  const [newLost, setNewLost] = useState('')
  const [newDq, setNewDq] = useState('')
  const [warn, setWarn] = useState<string | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings)
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])
  const order = ['New', 'Contacted', 'Gathering info', 'Quoting', 'Proposed', 'Won', 'Lost']
  const save = () => {
    const open = order.slice(0, 5)
    const drop = open.find((st, i) => i > 0 && draft.stages[st].probability < draft.stages[open[i - 1]].probability)
    if (drop && !warn) {
      const prev = open[open.indexOf(drop) - 1]
      return setWarn(`${drop} (${draft.stages[drop].probability}%) is lower than ${prev} (${draft.stages[prev].probability}%). Save anyway?`)
    }
    setWarn(null)
    mutate((s) => s.saveSettings(draft, user.id), 'Pipeline settings saved')
  }
  const list = (key: 'lostReasons' | 'dqReasons', title: string, value: string, setValue: (v: string) => void) => (
    <Panel title={title}>
      <ul className="divide-y divide-fill">
        {draft[key].map((r, i) => (
          <li key={i} className="flex items-center gap-2 py-1.5">
            <input aria-label={`Reason ${i + 1}`} disabled={!canEdit || r.retired} className={cx(controlCls('sm'), 'w-full', r.retired && 'text-muted line-through')} value={r.name} onChange={(e) => setDraft({ ...draft, [key]: draft[key].map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <Edit><Button size="sm" onClick={() => setDraft({ ...draft, [key]: draft[key].map((x, j) => (j === i ? { ...x, retired: !x.retired } : x)) })}>{r.retired ? 'Restore' : 'Retire'}</Button></Edit>
          </li>
        ))}
      </ul>
      {canEdit && <div className="mt-2 flex gap-2"><input aria-label="New reason" className={cx(controlCls('sm'), 'w-full')} value={value} onChange={(e) => setValue(e.target.value)} placeholder="New reason" /><Button size="sm" disabled={!value.trim()} onClick={() => { setDraft({ ...draft, [key]: [...draft[key], { name: value.trim() }] }); setValue('') }}>Add</Button></div>}
      <p className="mt-2 text-sm text-muted">Retired reasons stay on past records and leave the picker.</p>
    </Panel>
  )
  return (
    <>
      <PageTitle className="mb-5" title="Pipeline" description="Stage probabilities, stale thresholds, and the reasons people pick." badge={<ReadOnlyBadge />} actions={<Edit><Button variant="primary" disabled={!dirty} onClick={save}>Save changes</Button></Edit>} />
      {warn && <Callout tone="warning" className="mb-3" action={<button onClick={save} className="text-link underline">Save anyway</button>}>{warn}</Callout>}
      <Panel title="Opportunity stages">
        <table className={cx(mini.table, 'tabular max-w-xl')}>
          <thead><tr className={mini.head}><th className={mini.th}>Stage</th><th className={mini.th}>Win probability (%)</th><th className={mini.th}>Stale after (days)</th></tr></thead>
          <tbody>
            {order.map((st) => (
              <tr key={st} className={mini.tr}>
                <td className={cx(mini.td, 'font-medium')}>{st}</td>
                {st === 'Won' || st === 'Lost' ? <><td className={cx(mini.td, 'text-label')}>{draft.stages[st]?.probability ?? (st === 'Won' ? 100 : 0)}</td><td className={cx(mini.td, 'text-muted')}>—</td></> : <>
                <td className={mini.td}><input aria-label={`${st} probability`} inputMode="numeric" disabled={!canEdit} className={cx(controlCls('sm'), 'w-full max-w-24')} value={draft.stages[st]?.probability ?? 0} onChange={(e) => setDraft({ ...draft, stages: { ...draft.stages, [st]: { ...draft.stages[st], probability: Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0) } } })} /></td>
                <td className={mini.td}><input aria-label={`${st} stale days`} inputMode="numeric" disabled={!canEdit} className={cx(controlCls('sm'), 'w-full max-w-24')} value={draft.stages[st]?.staleDays ?? 0} onChange={(e) => setDraft({ ...draft, stages: { ...draft.stages, [st]: { ...draft.stages[st], staleDays: Math.min(90, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)) } } })} /></td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <div className="mt-4 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {list('lostReasons', 'Lost reasons (Opportunities)', newLost, setNewLost)}
        {list('dqReasons', 'Disqualified reasons (Leads)', newDq, setNewDq)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Panel title="Timing rules">
          <KeyValue items={[['Renewal created, personal lines', `${renewalWindowDays('personal')} days`], ['FL residential property', `${renewalWindowDays('fl-residential-property')} days`], ['Small commercial', `${renewalWindowDays('small-commercial')} days`], ['Large commercial ($25,000 or more)', `${renewalWindowDays('large-commercial')} days`], ['X-date follow-up', '45 days personal, 90 commercial']]} />
          <p className="mt-2 text-sm text-muted">From rules.md; changed with the agency’s processes, not here.</p>
        </Panel>
        <Panel title="Service SLAs">
          <KeyValue items={[['Claim report', '4 business hours'], ['ID card / evidence', '4 business hours'], ['Certificate, holder-only', '4 business hours'], ['Certificate with AI, waiver, or P&NC', '1 business day'], ['Policy change', '1 business day'], ['Cancellation request', '1 business day'], ['Billing question', '2 business days'], ['General', '3 business days']]} />
          <p className="mt-2 text-sm text-muted">Business hours: 8:00 AM to 5:00 PM in the Office's time zone, Monday to Friday, excluding US federal holidays.</p>
        </Panel>
      </div>
    </>
  )
}

/** US-SET-007 + 008 */
export function SettingsTemplates() {
  const { data } = useApp()
  const { userName } = useLookups()
  const mutate = useMutate()
  const [params] = useSearchParams()
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  const f = { channel: params.get('channel'), category: params.get('category'), status: params.get('status') }
  const all = data.templates ?? []
  const rows = all.filter((t) => (!f.channel || t.channel === f.channel) && (!f.category || t.category === f.category) && (!f.status || t.status === f.status)).sort((a, b) => (a.status === b.status ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : a.status === 'Active' ? -1 : 1))
  const filters: FilterDef[] = ([['channel', 'Channel', ['Email', 'SMS', 'Certificate wording']], ['category', 'Category', ['Sales', 'X-date', 'Renewal', 'Service', 'Certificates']], ['status', 'Status', ['Active', 'Retired']]] as [string, string, string[]][]).map(([k, label, o]) => ({ k, label, opts: o.map((x) => [x, x]) }))
  const cols: Column<Template>[] = [
    { key: 'name', label: 'Name', render: (t) => <span className={cx('font-medium', t.status === 'Retired' ? 'text-muted' : 'text-strong')}>{t.name}</span>, csv: (t) => t.name },
    { key: 'channel', label: 'Channel', width: 170, render: (t) => t.channel },
    { key: 'category', label: 'Category', width: 120, render: (t) => t.category },
    { key: 'used', label: 'Used in', width: 180, render: (t) => t.usedIn },
    { key: 'edited', label: 'Last edited', width: 200, render: (t) => `${dateOf(t.editedOffset)}${t.editedById ? ` · ${userName(t.editedById)}` : ''}` },
    { key: 'status', label: 'Status', width: 100, mobile: true, render: (t) => <StatusCell status={t.status === 'Retired' ? 'Retired' : 'Active'} />, csv: (t) => t.status },
    {
      key: 'menu',
      label: '',
      width: 170,
      render: (t) => (
        <Edit>
          <span className="flex gap-1">
            <Button size="sm" onClick={() => setEditing({ ...t, id: '', name: `Copy of ${t.name}` })}>Duplicate</Button>
            <Button size="sm" onClick={() => mutate((s) => s.setTemplateStatus(t.id, t.status === 'Active' ? 'Retired' : 'Active'), t.status === 'Active' ? 'Template retired' : 'Template restored')}>{t.status === 'Active' ? 'Retire' : 'Restore'}</Button>
          </span>
        </Edit>
      ),
      csv: () => '',
    },
  ]
  return (
    <>
      <PageTitle title="Templates" description="Email, SMS, and certificate wording offered across Fortify." badge={<ReadOnlyBadge />} />
      <DataTable
        search={{ label: 'Search templates', placeholder: 'Search templates', match: (t, q) => `${t.name} ${t.usedIn}`.toLowerCase().includes(q) }}
        className="mt-4"
        rows={rows}
        columns={cols}
        minWidth={1000}
        onRowClick={(t) => setEditing(t)}
        filters={filters}
        actions={<Edit><Button variant="primary" onClick={() => setEditing('new')}><Plus aria-hidden className="size-4" strokeWidth={1.75} />New template</Button></Edit>}
        meta={<span className="tabular">{all.filter((t) => t.status === 'Active').length} templates · {all.filter((t) => t.status === 'Retired').length} retired</span>}
      />
      {editing && <TemplateEditor template={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
function TemplateEditor({ template: t, onClose }: { template?: Template; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const canEdit = useCanEdit()
  const [v, setV] = useState({ name: t?.name ?? '', channel: t?.channel ?? ('Email' as Template['channel']), category: t?.category ?? ('Sales' as Template['category']), usedIn: t?.usedIn ?? 'Inbox email', subject: t?.subject ?? '', body: t?.body ?? '' })
  const [sample, setSample] = useState(data.accounts.find((a) => a.name.startsWith('Torres Roofing'))?.id ?? data.accounts[0].id)
  const [err, setErr] = useState<string | null>(null)
  const unknown = unknownTokens(`${v.subject} ${v.body}`)
  const acc = data.accounts.find((a) => a.id === sample)!
  const values = mergeValues(data, acc.id, null, user)
  const preview = (text: string) => text.split(/(\{\{\s*[a-zA-Z.]+\s*\}\})/).map((part, i) => (/^\{\{/.test(part) ? (unknown.includes(part) ? <span key={i} className="underline decoration-danger decoration-2">{part}</span> : values[part.replace(/[{}\s]/g, '')] ? <span key={i}>{values[part.replace(/[{}\s]/g, '')]}</span> : <span key={i} className="text-warning-text">[no value]</span>) : part))
  const insert = (k: string) => setV({ ...v, body: `${v.body}{{${k}}}` })
  return (
    <Sheet open onOpenChange={(x) => !x && onClose()} title={t?.id ? t.name : 'New template'} footer={<><SheetCancel /><Edit><Button variant="primary" onClick={() => mutate((s) => s.saveTemplate(t?.id || null, { ...v, subject: v.channel === 'Email' ? v.subject : null }, user.id), 'Template saved').then(onClose).catch((e) => setErr((e as Error).message))}>Save template</Button></Edit></>}>
      <fieldset disabled={!canEdit} className="flex flex-col gap-3">
        {err && <Callout tone="danger">{err}</Callout>}
        <Field label="Name"><input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel"><select className={inputCls} value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value as Template['channel'] })}><option>Email</option><option>SMS</option><option>Certificate wording</option></select></Field>
          <Field label="Category"><select className={inputCls} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as Template['category'] })}>{['Sales', 'X-date', 'Renewal', 'Service', 'Certificates'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Used in"><input readOnly className={cx(inputCls, 'bg-recessed')} value={v.usedIn} /></Field>
        {v.channel === 'Email' && <Field label="Subject"><input className={inputCls} value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>}
        <Field label="Body" hint={v.channel === 'SMS' ? `${v.body.length} / ${v.body.length <= 160 ? 160 : 306} · ${smsSegments(v.body.length)} segment${smsSegments(v.body.length) === 1 ? '' : 's'}` : undefined}>
          <textarea className={cx(inputCls, 'h-32 py-2 font-mono text-sm')} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
        </Field>
        {unknown.length > 0 && <p className="text-sm font-medium text-danger-text">{unknown.length} unknown field{unknown.length === 1 ? '' : 's'}: {unknown.join(', ')}</p>}
        <Field label="Insert field">
          <select className={inputCls} value="" onChange={(e) => e.target.value && insert(e.target.value)}>
            <option value="">Choose a field…</option>
            {Object.entries(MERGE_FIELDS).map(([g, fs]) => <optgroup key={g} label={g}>{fs.map((x) => <option key={x} value={x}>{`{{${x}}}`}</option>)}</optgroup>)}
          </select>
        </Field>
      </fieldset>
      <section className="mt-5 border-t border-fill pt-4">
        <div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-base font-semibold text-strong">Preview</h3>
          <Select size="sm" aria-label="Sample account" value={sample} onChange={(e) => setSample(e.target.value)} className="max-w-60">{data.accounts.filter((a) => a.lifecycle === 'active').slice(0, 40).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        </div>
        <div className="rounded-md bg-recessed p-3 text-base whitespace-pre-wrap">
          {v.channel === 'Email' && <p className="mb-2 font-medium">{preview(v.subject)}</p>}
          {preview(v.body)}
        </div>
      </section>
    </Sheet>
  )
}

/** US-SET-009 */
export function SettingsCarriers() {
  const { data } = useApp()
  const [params] = useSearchParams()
  const [open, setOpen] = useState<string | null>(null)
  const appt = (cid: string, st: string) => data.appointments?.find((a) => a.carrierId === cid && a.state === st)
  const inForce = (cid: string, st: string) => data.policies.filter((p) => p.carrierId === cid && data.accounts.find((a) => a.id === p.accountId)?.state === st && data.terms.some((t) => t.policyId === p.id && t.status === 'Active')).length
  const f = { state: params.get('state'), status: params.get('status') }
  const rows = data.carriers.filter((c) => !f.state || (appt(c.id, f.state)?.status ?? 'Not appointed') === (f.status ?? 'Active'))
  const cell = (cid: string, st: string) => {
    const a = appt(cid, st)
    const n = inForce(cid, st)
    if (a?.status === 'Terminated' && n) return <Tip label={`Terminated in ${st} on ${dateOf(a.terminatedOffset!)} · ${n} policies still in force`}><span tabIndex={0} className="inline-flex items-center gap-1 font-medium text-warning-text"><AlertTriangle aria-hidden className="size-3.5" />Terminated</span></Tip>
    return <StatusCell status={a?.status === 'Active' ? 'Active' : a?.status === 'Terminated' ? 'Canceled' : 'Inactive'} reason={a?.status === 'Not appointed' ? 'Not appointed' : undefined} />
  }
  const cols: Column<(typeof data.carriers)[number]>[] = [
    { key: 'name', label: 'Name', render: (c) => <span className="font-medium text-strong">{c.name}</span>, csv: (c) => c.name },
    { key: 'naic', label: 'NAIC #', width: 100, render: (c) => <span className="font-mono text-sm">{c.naic}</span> },
    { key: 'lines', label: 'Lines', width: 190, render: (c) => (c.kinds.length === 2 ? 'Personal and commercial' : c.kinds[0] === 'personal' ? 'Personal' : 'Commercial') },
    { key: 'tx', label: 'TX appointment', width: 160, render: (c) => cell(c.id, 'TX'), csv: (c) => appt(c.id, 'TX')?.status ?? '' },
    { key: 'fl', label: 'FL appointment', width: 160, render: (c) => cell(c.id, 'FL'), csv: (c) => appt(c.id, 'FL')?.status ?? '' },
    { key: 'type', label: 'Type', width: 160, render: (c) => (c.note?.includes('E&S') ? 'Excess & surplus' : c.note?.includes('last resort') ? 'Residual market' : 'Admitted') },
  ]
  const filters: FilterDef[] = [
    { k: 'state', label: 'State', opts: [['TX', 'TX'], ['FL', 'FL']] },
    // No ?status means Active; the option list has no "Any".
    ...(f.state ? [{ k: 'status', label: 'Appointment status', opts: [['', 'Active'], ['Terminated', 'Terminated'], ['Not appointed', 'Not appointed']], empty: false } satisfies FilterDef] : []),
  ]
  const c = open ? data.carriers.find((x) => x.id === open) : undefined
  return (
    <>
      <PageTitle title="Carriers & appointments" description="Managed in the AMS and carrier portals. Read only in Fortify." badge={<ReadOnlyBadge />} />
      <DataTable
        search={{ label: 'Search carriers', placeholder: 'Search carrier or NAIC', match: (c, q) => `${c.name} ${c.naic}`.toLowerCase().includes(q) }}
        className="mt-4"
        rows={rows}
        columns={cols}
        minWidth={900}
        onRowClick={(x) => setOpen(x.id)}
        filters={filters}
        meta={<span className="tabular">Showing {rows.length} of {data.carriers.length} carriers{f.state ? ` ${(f.status ?? 'Active').toLowerCase()} in ${f.state}` : ''}</span>}
      />
      {c && (
        <Sheet open onOpenChange={(x) => !x && setOpen(null)} title={c.name} description={`NAIC ${c.naic}`} footer={<SheetCancel>Close</SheetCancel>}>
          {(['TX', 'FL'] as const).map((st) => {
            const a = appt(c.id, st)
            return (
              <Panel key={st} title={`${st} appointment`} className="mb-3">
                <KeyValue items={[['Status', a?.status ?? 'Not appointed'], ['Effective', a?.effectiveOffset != null ? dateOf(a.effectiveOffset) : '—'], ['Terminated', a?.terminatedOffset != null ? dateOf(a.terminatedOffset) : '—'], ['Lines', a?.lines.join(', ') || '—'], ['Policies in force', inForce(c.id, st)], ['Open quotes', data.quotes.filter((q) => q.carrierId === c.id && ['Requested', 'Quoted', 'Presented'].includes(q.status)).length]]} />
              </Panel>
            )
          })}
        </Sheet>
      )}
    </>
  )
}

/** US-SET-010 */
export function SettingsLicenses() {
  const { data } = useApp()
  const { office } = useLookups()
  const [params] = useSearchParams()
  type Row = { id: string; u: User; l: NonNullable<User['licenseRecords']>[number] }
  const all: Row[] = data.users.filter((u) => u.status !== 'Deactivated').flatMap((u) => (u.licenseRecords ?? []).map((l, i) => ({ id: `${u.id}-${i}`, u, l })))
  const f = { user: params.get('user'), state: params.get('state'), status: params.get('status') }
  const status = (r: Row) => (r.l.expirationOffset < 0 ? 'Expired' : r.l.expirationOffset <= 60 ? 'Expiring soon' : 'Active')
  const rows = all.filter((r) => (!f.user || r.u.id === f.user) && (!f.state || r.l.state === f.state) && (!f.status || status(r) === f.status)).sort((a, b) => a.l.expirationOffset - b.l.expirationOffset)
  const soon = all.filter((r) => status(r) === 'Expiring soon')
  const expired = all.filter((r) => status(r) === 'Expired')
  const filters: FilterDef[] = [
    { k: 'user', label: 'User', opts: data.users.filter((u) => u.licenseRecords?.length).map((u) => [u.id, u.name]) },
    { k: 'state', label: 'State', opts: [['TX', 'TX'], ['FL', 'FL']] },
    { k: 'status', label: 'Status', opts: [['Active', 'Active'], ['Expiring soon', 'Expiring soon'], ['Expired', 'Expired']] },
  ]
  const name = (l: Row['l']) => (l.state === 'TX' ? (l.lineOfAuthority.includes('CSR') ? 'General Lines – Property and Casualty (agent, limited)' : 'General Lines – Property and Casualty') : l.lineOfAuthority)
  const cols: Column<Row>[] = [
    { key: 'user', label: 'User', render: (r) => <PrimaryCell name={r.u.name} token={office(r.u.officeId)?.name} />, csv: (r) => r.u.name },
    { key: 'state', label: 'State', width: 70, render: (r) => r.l.state },
    { key: 'type', label: 'License type', width: 280, render: (r) => name(r.l) },
    { key: 'res', label: 'Residency', width: 120, render: (r) => r.l.residency ?? (office(r.u.officeId)?.state === r.l.state ? 'Resident' : 'Nonresident') },
    { key: 'num', label: 'License #', width: 140, render: (r) => <span className="font-mono text-sm">{r.l.number}</span>, csv: (r) => r.l.number },
    { key: 'exp', label: 'Expires', width: 110, render: (r) => dateOf(r.l.expirationOffset) },
    { key: 'status', label: 'Status', width: 190, mobile: true, render: (r) => (status(r) === 'Expired' ? <Due tone="overdue">Expired {-r.l.expirationOffset}d ago</Due> : status(r) === 'Expiring soon' ? <Due tone="soon">Expires in {r.l.expirationOffset} days</Due> : <StatusCell status="Active" />), csv: status },
  ]
  return (
    <>
      <PageTitle title="Licenses" description="Licenses are tracked by the agency's licensing process. Read only in Fortify." badge={<ReadOnlyBadge />} />
      {(soon.length > 0 || expired.length > 0) && <Callout tone="warning" className="mt-4">{soon.length} licenses expire in the next 60 days · {expired.length} expired: {[...expired, ...soon].slice(0, 6).map((r) => r.u.name).join(', ')}</Callout>}
      <DataTable
        search={{ label: 'Search licenses', placeholder: 'Search name or license', match: (r, q) => `${r.u.name} ${JSON.stringify(r.l)}`.toLowerCase().includes(q) }}
        className="mt-4"
        rows={rows}
        columns={cols}
        minWidth={1000}
        filters={filters}
        meta={<span className="tabular">{all.length} licenses · {new Set(all.map((r) => r.u.id)).size} users</span>}
      />
    </>
  )
}

/** US-SET-012 */
export function SettingsDataSync() {
  const { data } = useApp()
  const mutate = useMutate()
  const controls = useDemoControls()
  const [busy, setBusy] = useState(false)
  const runs = data.syncRuns ?? []
  const lastOk = runs.find((r) => r.status !== 'Failed')
  const overall = runs[0]?.status === 'Failed' ? 'Failed' : runs[0]?.status === 'Partial' ? 'Degraded' : 'Healthy'
  const Icon = overall === 'Healthy' ? CheckCircle2 : overall === 'Degraded' ? AlertTriangle : AlertCircle
  const at = (iso: string) => new Date(iso).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const run = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 3000))
    await mutate((s) => s.syncNow(controls.forceErrorOn === '/settings')).catch(() => {})
    setBusy(false)
  }
  return (
    <>
      <PageTitle className="mb-5" title="AMS data sync" description="Fortify reads policies, terms, and commission from the AMS. It never writes them back. Claims are tracked in Fortify." badge={<ReadOnlyBadge />} actions={<Edit><Button variant="primary" disabled={busy} onClick={run}>{busy ? 'Syncing…' : 'Sync now'}</Button></Edit>} />
      {busy && <ProgressLine className="mb-3" />}
      <Panel title="Status">
        <p className="mb-2 flex items-center gap-2 text-base"><Icon aria-hidden className={cx('size-4', overall === 'Healthy' ? 'text-success' : overall === 'Degraded' ? 'text-warning-text' : 'text-danger')} strokeWidth={1.75} /><span className="font-medium">{overall}</span>{runs[0]?.error && <span className="text-danger-text">· {runs[0].error}</span>}</p>
        <KeyValue items={[['Last successful sync', lastOk ? at(lastOk.at) : '—'], ['Next scheduled sync', 'Today 12:00 PM'], ['Schedule', 'Twice daily, 6:00 AM and 12:00 PM']]} />
      </Panel>
      <div className="mt-4"><Panel title="Synced records"><KeyValue items={Object.entries(lastOk?.counts ?? {}).filter(([k]) => k !== 'Records changed').map(([k, v]) => [k, v.toLocaleString('en-US')] as [string, string])} /></Panel></div>
      <div className="mt-4">
        <Panel title="Sync log">
          <table className={cx(mini.table, 'tabular')}>
            <thead><tr className={mini.head}><th className={mini.th}>Started</th><th className={mini.th}>Duration</th><th className={mini.th}>Result</th><th className={cx(mini.th, 'text-right')}>Records changed</th><th className={mini.th}>Errors</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={mini.tr}>
                  <td className={mini.td}>{at(r.at)}</td>
                  <td className={mini.td}>{Math.floor(r.durationSec / 60)}m {r.durationSec % 60}s</td>
                  <td className={mini.td}><StatusCell status={r.status} /></td>
                  <td className={cx(mini.td, 'text-right')}>{r.counts['Records changed'] ?? r.counts['Renewal outcomes'] ?? '—'}</td>
                  <td className={cx(mini.td, 'text-sm text-label')}>{r.error ?? (r.skipped ? `${r.skipped} skipped · ${r.reason}` : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  )
}


const INTEGRATIONS: [string, string, string, string][] = [
  ['ams', 'Agency management system', 'Policies, terms, and commission (read only).', ''],
  ['email', 'Email', 'Inbox email and templates.', 'Email sending will be disabled in Inbox.'],
  ['sms', 'SMS', 'Texting from Inbox, with consent tracking.', 'SMS sending will be disabled in Inbox.'],
  ['phone', 'Phone system', 'Call logging and click-to-dial.', 'Calls must be logged by hand.'],
  ['calendar', 'Calendar', 'Two-way sync of meetings.', 'Meetings stop syncing to personal calendars.'],
  ['esign', 'E-signature', 'Signed proposals and applications.', 'Proposals must be signed outside Fortify.'],
  ['rater', 'Comparative rater', 'Pulls quotes into Opportunities.', 'Quotes must be entered by hand.'],
]
/** US-SET-011 */
export function SettingsIntegrations() {
  const { data, user } = useApp()
  const mutate = useMutate()
  const canEdit = useCanEdit()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ key: string; to: 'Connected' | 'Not connected' } | null>(null)
  const state = { ...INTEGRATION_DEFAULTS, ...(data.settings?.integrations ?? {}) }
  const lastSync = data.syncRuns?.find((r) => r.status !== 'Failed')
  const mins = lastSync ? Math.max(1, Math.round((Date.now() - new Date(lastSync.at).getTime()) / 60000)) : null
  const label = (k: string) => INTEGRATIONS.find((i) => i[0] === k)?.[1] ?? k
  const run = async (key: string, to: 'Connected' | 'Not connected') => {
    setBusy(key)
    if (to === 'Connected') await new Promise((r) => setTimeout(r, 1000))
    await mutate((s) => s.setIntegration(key, to, user.id), `${label(key)} ${to === 'Connected' ? 'connected' : 'disconnected'}`).catch(() => {})
    setBusy(null)
  }
  return (
    <>
      <PageTitle className="mb-5" title="Integrations" description="Connections to the agency’s other systems." badge={<ReadOnlyBadge />} />
      <p className="mb-4 rounded-md bg-recessed px-4 py-2.5 text-base">Integrations are simulated in this demo. No data leaves your browser.</p>
      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        {INTEGRATIONS.map(([k, name, purpose, loses]) => {
          const st = state[k] ?? { status: 'Not connected' }
          const tone = st.status === 'Connected' ? 'Active' : st.status === 'Error' ? 'Failed' : 'Inactive'
          return (
            <Panel key={k} title={name} actions={<StatusCell status={tone} reason={st.status === 'Not connected' ? 'Not connected' : st.status === 'Error' ? 'Error' : undefined} />}>
              <p className="text-base text-label">{purpose}</p>
              {k === 'ams' && <p className="mt-1 text-sm text-muted">Last sync {mins != null ? `${mins} min ago` : '—'} · <Link to="/settings/data-sync" className="text-link underline">View data sync</Link><br />Fortify needs the AMS to show policies.</p>}
              {k !== 'ams' && st.status === 'Connected' && <p className="mt-1 text-sm text-muted">Connected {st.sinceOffset != null ? dateOf(st.sinceOffset) : ''}</p>}
              {st.status === 'Error' && <p className="mt-1 text-sm font-medium text-danger-text">{st.error} {st.sinceOffset != null ? dateOf(st.sinceOffset) : ''}</p>}
              {st.status === 'Not connected' && loses && <p className="mt-1 text-sm text-muted">{loses}</p>}
              {k !== 'ams' && (
                <div className="mt-3">
                  <Edit>
                    {busy === k ? <Button size="sm" disabled>Connecting…</Button> : st.status === 'Connected' ? <Button size="sm" onClick={() => setConfirm({ key: k, to: 'Not connected' })}>Disconnect</Button> : <Button size="sm" variant={st.status === 'Error' ? 'secondary' : 'primary'} onClick={() => setConfirm({ key: k, to: 'Connected' })}>{st.status === 'Error' ? 'Reconnect' : 'Connect'}</Button>}
                  </Edit>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
      {confirm && canEdit && <Confirm open onOpenChange={(o) => !o && setConfirm(null)} title={confirm.to === 'Connected' ? `Connect ${label(confirm.key)}?` : `Disconnect ${label(confirm.key)}?`} body={confirm.to === 'Connected' ? 'This is simulated.' : INTEGRATIONS.find((i) => i[0] === confirm.key)?.[3] ?? ''} confirmLabel={confirm.to === 'Connected' ? 'Connect' : 'Disconnect'} danger={confirm.to !== 'Connected'} onConfirm={() => { const c = confirm; setConfirm(null); void run(c.key, c.to) }} />}
    </>
  )
}
