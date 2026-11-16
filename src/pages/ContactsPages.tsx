import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Building2, Copy, Home, Search, User, Users } from 'lucide-react'
import { useApp } from '@/app/store'
import { ago, dateOf, useLookups } from '@/app/hooks'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import type { Contact } from '@/domain/types'
import { DataTable, KeyValue, PageTitle, Panel, RecordHeader, type Column } from '@/components/patterns'
import { ActivityTimeline } from '@/components/ActivityTimeline'
import { Button, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { ContactSheet } from './AccountSheets'
import { AccessDenied, NotFound } from './SystemPages'

const digits = (s: string) => s.replace(/\D/g, '')

/** US-ACC-011: Contacts in scope (linked to an Account the viewer can see). */
export function ContactsPage() {
  const { data, user } = useApp()
  const { office } = useLookups()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const scoped = new Map(visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active').map((a) => [a.id, a]))
  const t = q.trim().toLowerCase()
  const td = digits(t)
  const rows = data.contacts
    .filter((c) => c.accountIds.some((id) => scoped.has(id)))
    .filter((c) => !t || c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t) || (td.length >= 4 && (digits(c.phone).includes(td) || digits(c.workPhone ?? '').includes(td))))
    .sort((a, b) => a.name.localeCompare(b.name))
  const lastActivity = (c: Contact) => {
    const offs = c.accountIds.map((id) => scoped.get(id)?.lastActivityOffset).filter((x): x is number => x != null)
    return offs.length ? Math.max(...offs) : null
  }
  const cols: Column<Contact>[] = [
    { key: 'name', label: 'Name', width: 220, sort: (a, b) => a.name.localeCompare(b.name), render: (c) => <Link to={`/contacts/${c.id}`} className="font-medium text-strong hover:text-link hover:underline">{c.name}</Link>, csv: (c) => c.name },
    {
      key: 'accounts',
      label: 'Accounts',
      render: (c) => (
        <span className="truncate">
          {c.accountIds.filter((id) => scoped.has(id)).map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              <Link to={`/accounts/${id}`} className="text-link hover:underline">{scoped.get(id)!.name}</Link>
              <span className="text-muted"> · {c.relationships?.[id] ?? 'Contact'}</span>
            </span>
          ))}
        </span>
      ),
      csv: (c) => c.accountIds.filter((id) => scoped.has(id)).map((id) => `${scoped.get(id)!.name} (${c.relationships?.[id] ?? 'Contact'})`).join('; '),
    },
    { key: 'phone', label: 'Mobile phone', width: 150, render: (c) => <span className="tabular">{c.phone || '—'}</span>, csv: (c) => c.phone },
    { key: 'email', label: 'Email', width: 220, render: (c) => c.email || '—' },
    { key: 'sms', label: 'SMS consent', width: 120, render: (c) => c.smsConsent?.state ?? 'Unknown' },
    { key: 'office', label: 'Office', width: 110, render: (c) => office(scoped.get(c.accountIds.find((id) => scoped.has(id))!)!.officeId)?.name ?? '' },
    { key: 'last', label: 'Last activity', width: 120, mobile: true, sort: (a, b) => (lastActivity(a) ?? -9999) - (lastActivity(b) ?? -9999), render: (c) => { const o = lastActivity(c); return o == null ? <span className="text-muted">—</span> : ago(o) }, csv: (c) => { const o = lastActivity(c); return o == null ? '' : dateOf(o) } },
  ]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Contacts" description="People on your accounts. A contact can belong to more than one account." />
      <div className="mt-6 flex items-center gap-2">
        <label className="relative w-80 max-sm:w-full">
          <span className="sr-only">Search contacts</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            defaultValue={q}
            onChange={(e) => {
              const next = new URLSearchParams(params)
              if (e.target.value) next.set('q', e.target.value)
              else next.delete('q')
              setParams(next, { replace: true })
            }}
            placeholder="Search name, phone, or email"
            className="h-9 w-full rounded-md bg-surface pr-3 pl-8 text-base shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>
      </div>
      <p className="tabular mt-3 mb-2 text-sm text-muted">Showing {rows.length.toLocaleString('en-US')} contacts</p>
      <DataTable rows={rows.slice(0, 200)} columns={cols} minWidth={1100} listId="contacts" exportName="contacts" onRowClick={(c) => navigate(`/contacts/${c.id}`)} empty={<EmptyState icon={Users} title={q ? 'No contacts match this search' : 'No contacts yet'} body="Contacts are added from an account." />} />
      {rows.length > 200 && <p className="mt-2 text-sm text-muted">Showing the first 200. Search to narrow the list.</p>}
    </div>
  )
}

/** US-ACC-012 */
export function ContactPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { userName } = useLookups()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const c = data.contacts.find((x) => x.id === id)
  if (!c) return <NotFound what="contact" />
  const accounts = c.accountIds.map((aid) => data.accounts.find((a) => a.id === aid)!).filter(Boolean)
  const visible = accounts.filter((a) => canSeeAccount(user, a))
  if (!visible.length) return <AccessDenied what="contact" owner={userName(accounts[0]?.producerId)} />
  const household = visible.some((a) => a.kind === 'Household')
  const copy = (v: string, what: string) => navigator.clipboard?.writeText(v).then(() => toast(`${what} copied`, 'success'))
  const consent = c.smsConsent ? `Mobile · ${c.smsConsent.state}${c.smsConsent.offset != null ? ` · ${dateOf(c.smsConsent.offset)}` : ''}` : 'Mobile · Unknown'
  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/contacts', label: 'Contacts' }}
        icon={User}
        title={c.name}
        meta={
          <>
            {c.phone && (
              <Tip label="Copy phone">
                <button onClick={() => copy(c.phone, 'Phone')} className="tabular inline-flex items-center gap-1 hover:text-link">{c.phone} <Copy aria-hidden className="size-3" /></button>
              </Tip>
            )}
            {c.email && (
              <Tip label="Copy email">
                <button onClick={() => copy(c.email, 'Email')} className="inline-flex items-center gap-1 hover:text-link">{c.email} <Copy aria-hidden className="size-3" /></button>
              </Tip>
            )}
            <span>Prefers {c.preferredContact ?? 'Phone'}</span>
            <span>SMS {consent}</span>
          </>
        }
        actions={user.role !== 'admin' && <Button onClick={() => setEditing(true)}>Edit</Button>}
      />
      <div className="grid grid-cols-[1fr_380px] gap-4 px-8 pt-5 max-lg:grid-cols-1 max-sm:px-4">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Accounts">
            <ul className="divide-y divide-fill">
              {visible.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  {a.kind === 'Household' ? <Home aria-label="Household" className="size-4 text-muted" strokeWidth={1.75} /> : <Building2 aria-label="Business" className="size-4 text-muted" strokeWidth={1.75} />}
                  <span className="min-w-0 flex-1">
                    <Link to={`/accounts/${a.id}`} className="font-medium text-strong hover:text-link hover:underline">{a.name}</Link>
                    <span className="block text-sm text-label">{c.relationships?.[a.id] ?? 'Contact'}{a.primaryContactId === c.id ? ' · Primary' : ''} · Producer {userName(a.producerId)} · Account Manager {userName(a.accountManagerId)}</span>
                  </span>
                  <StatusCell status={a.status} />
                </li>
              ))}
            </ul>
            {accounts.length > visible.length && <p className="mt-2 text-sm text-muted">Also on {accounts.length - visible.length} account{accounts.length - visible.length === 1 ? '' : 's'} outside your access.</p>}
          </Panel>
          <Panel title="Activity">
            {visible.map((a) => (
              <section key={a.id} className="mb-4 last:mb-0">
                <h3 className="mb-1 text-sm font-semibold text-label">{a.name}</h3>
                <ActivityTimeline accountId={a.id} limit={5} />
              </section>
            ))}
          </Panel>
        </div>
        <Panel title="Details">
          <KeyValue
            items={[
              ['First name', c.firstName ?? c.name.split(' ')[0]],
              ['Last name', c.lastName ?? c.name.split(' ').slice(1).join(' ')],
              ['Suffix', c.suffix ?? null],
              ...(household ? ([['Date of birth', c.dobOffset != null ? dateOf(c.dobOffset) : null]] as [string, string | null][]) : []),
              ['Mobile phone', c.phone || null],
              ['Work phone', c.workPhone ?? null],
              ['Email', c.email || null],
              ['Mailing address', c.street ?? null],
              ['Preferred contact', c.preferredContact ?? null],
            ]}
          />
        </Panel>
      </div>
      {editing && <ContactSheet contact={c} onClose={() => setEditing(false)} />}
    </div>
  )
}
