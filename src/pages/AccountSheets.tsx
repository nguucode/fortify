import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import * as Popover from '@radix-ui/react-popover'
import { Link2, Star, X } from 'lucide-react'
import { useApp } from '@/app/store'
import { useLookups, useMutate } from '@/app/hooks'
import { useToast } from '@/components/ui/toast'
import { archiveBlock } from '@/app/data'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import { findMatches } from '@/domain/rules'
import type { Account, AccountDetails, Contact, EntityType, SmsConsent, UsState, WcStatus } from '@/domain/types'
import { Confirm, Field, inputCls, mini, Sheet, SheetCancel } from '@/components/patterns'
import { Badge, Button, Callout, cx, SubHeading, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'

export const HH_REL = ['Primary', 'Spouse or partner', 'Child', 'Other relative', 'Other']
export const BIZ_REL = ['Owner', 'Officer', 'Employee', 'Billing contact', 'Other']
const ENTITY: EntityType[] = ['LLC', 'Corporation', 'Partnership', 'Sole proprietor', 'Nonprofit']
const ZIP = /^\d{5}$/
const PHONE = /^\(\d{3}\) \d{3}-\d{4}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
/** Formats a phone as typed: "5550101234" -> "(555) 010-1234". */
export const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function useSaving() {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setFailed(null)
    try {
      await fn()
      return true
    } catch (e) {
      setFailed((e as Error).message)
      setBusy(false)
      return false
    }
  }
  return { busy, failed, run }
}
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <SubHeading>{title}</SubHeading>
    {children}
  </section>
)

/** US-ACC-002 create and US-ACC-007 edit. Kind and owners are fixed once created. */
export function AccountFormSheet({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const editing = !!account
  const d = account?.details
  const [kind, setKind] = useState<Account['kind'] | null>(account?.kind ?? null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [name, setName] = useState(account?.name ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState(d?.street ?? '')
  const [city, setCity] = useState(account?.city ?? '')
  const [zip, setZip] = useState(account?.zip ?? '')
  const [officeId, setOfficeId] = useState(account?.officeId ?? user.officeId)
  const office = data.offices.find((o) => o.id === officeId)!
  const [preferred, setPreferred] = useState(d?.preferredContact ?? 'Phone')
  const [entity, setEntity] = useState<EntityType>(d?.entityType ?? 'LLC')
  const [dba, setDba] = useState(d?.dba ?? '')
  const [fein, setFein] = useState(d?.fein4 ?? '')
  const [naics, setNaics] = useState(d?.naics ?? '')
  const [revenue, setRevenue] = useState(d?.revenue ? String(d.revenue) : '')
  const [payroll, setPayroll] = useState(d?.payroll ? String(d.payroll) : '')
  const [employees, setEmployees] = useState(d?.employees ? String(d.employees) : '')
  const [wc, setWc] = useState<WcStatus>(d?.wcStatus ?? 'Covered')
  const [dwc, setDwc] = useState(d?.dwc005Offset != null ? isoOf(d.dwc005Offset) : '')
  const producers = data.users.filter((u) => u.role === 'producer' && u.officeId === officeId)
  const managers = data.users.filter((u) => u.role === 'account-manager' && u.officeId === officeId)
  const [producerId, setProducerId] = useState(user.role === 'producer' ? user.id : '')
  const [managerId, setManagerId] = useState(user.role === 'account-manager' ? user.id : '')
  const [touched, setTouched] = useState(false)
  const [createAnyway, setCreateAnyway] = useState(false)
  const { busy, failed, run } = useSaving()
  const autoName = kind === 'Household' ? (last.trim() ? `${last.trim()} Household` : '') : ''
  const finalName = name.trim() || autoName
  const matches = useMemo(() => {
    if (editing || (!finalName && !email && !phone)) return []
    return findMatches({ name: `${first} ${last}`, kind: kind ?? 'Household', businessName: kind === 'Business' ? finalName : null, email, phone, zip }, { accounts: data.accounts.filter((a) => a.lifecycle === 'active'), contacts: data.contacts }).slice(0, 3)
  }, [editing, finalName, email, phone, zip, first, last, kind, data.accounts, data.contacts])
  const errors = {
    name: !finalName ? (kind === 'Business' ? 'Enter the legal name.' : 'Enter the account name.') : '',
    first: !editing && !first.trim() ? 'Enter a first name.' : '',
    last: !editing && !last.trim() ? 'Enter a last name.' : '',
    phone: !editing && !PHONE.test(phone) ? 'Enter a phone number like (555) 010-1234' : '',
    email: !editing && kind === 'Household' && !EMAIL.test(email) ? 'Enter an email like name@example.com' : '',
    street: !street.trim() ? 'Enter the mailing address.' : '',
    city: !city.trim() ? 'Enter the city.' : '',
    zip: !ZIP.test(zip) ? 'Enter a 5-digit ZIP code' : '',
    producer: !editing && !producerId ? 'Choose a Producer.' : '',
    manager: !editing && !managerId ? 'Choose an Account Manager.' : '',
    fein: kind === 'Business' && fein && !/^\d{4}$/.test(fein) ? 'Enter the last 4 digits.' : '',
    dwc: dwc && fromIso(dwc) > 0 ? 'The filing date can’t be in the future.' : '',
  }
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '') || undefined
  const valid = Object.values(errors).every((e) => !e)
  const business: Partial<AccountDetails> =
    kind === 'Business'
      ? { legalName: finalName, dba: dba || null, entityType: entity, fein4: fein || undefined, naics: naics || undefined, revenue: Number(revenue) || undefined, payroll: Number(payroll) || undefined, employees: Number(employees) || undefined, wcStatus: wc, dwc005Offset: wc === 'Non-subscriber (TX)' && dwc ? fromIso(dwc) : null }
      : {}

  const save = async () => {
    setTouched(true)
    if (!valid || busy || (matches.length && !createAnyway && !editing)) return
    const ok = await run(async () => {
      if (editing) {
        await mutate((s) => s.updateAccount(account!.id, { name: finalName, street, city, zip, preferredContact: preferred, ...business }, user.id), 'Account updated')
      } else {
        const id = await mutate(
          (s) => s.createAccount({ kind: kind!, name: finalName, officeId, producerId, accountManagerId: managerId, street, city, state: office.state as UsState, zip, contact: { firstName: first.trim(), lastName: last.trim(), phone, email }, business: { ...business, preferredContact: preferred } }, user.id),
          `${finalName} created`,
        )
        navigate(`/accounts/${id}`)
      }
    })
    if (ok) onClose()
  }

  if (!kind)
    return (
      <Sheet open onOpenChange={(v) => !v && onClose()} title="New account" footer={<SheetCancel />}>
        <p className="mb-3 text-base text-label">What kind of account?</p>
        <div className="grid grid-cols-2 gap-3">
          {(['Household', 'Business'] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className="rounded-md bg-surface p-4 text-left shadow-ring hover:bg-recessed focus-visible:outline-2 focus-visible:outline-primary">
              <span className="block text-base font-semibold text-strong">{k}</span>
              <span className="mt-0.5 block text-sm text-muted">{k === 'Household' ? 'A family and its personal lines.' : 'A company and its commercial lines.'}</span>
            </button>
          ))}
        </div>
      </Sheet>
    )

  const tx = office.state === 'TX'
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={editing ? 'Edit details' : `New ${kind.toLowerCase()} account`}
      busy={busy}
      footer={
        <>
          <SheetCancel disabled={busy} />
          <Button variant="primary" onClick={save} disabled={busy || (!!matches.length && !createAnyway && !editing)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {failed && <Callout tone="danger">{failed}</Callout>}
        {editing && (
          <p className="rounded-md bg-recessed px-3 py-2 text-sm text-ink">
            Policy details are synced from the AMS. Request a policy change to update them. Kind ({account!.kind}) can’t be changed.
          </p>
        )}
        {!editing && (
          <Section title="Primary contact">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" error={err('first')}><input value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} autoComplete="off" /></Field>
              <Field label="Last name" error={err('last')}><input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} autoComplete="off" /></Field>
              <Field label="Mobile phone" error={err('phone')}><input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" placeholder="(555) 010-1234" className={inputCls} /></Field>
              <Field label={kind === 'Household' ? 'Email' : 'Email (optional)'} error={err('email')}><input value={email} onChange={(e) => setEmail(e.target.value.trim())} inputMode="email" className={inputCls} /></Field>
            </div>
          </Section>
        )}
        <Section title={kind === 'Business' ? 'Business' : 'Account'}>
          <Field label={kind === 'Business' ? 'Legal name' : 'Account name'} error={err('name')} hint={kind === 'Household' && !name ? `Leave blank for “${autoName || '<Last name> Household'}”.` : undefined}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          {kind === 'Business' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entity type"><select value={entity} onChange={(e) => setEntity(e.target.value as EntityType)} className={inputCls}>{ENTITY.map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="DBA (optional)"><input value={dba} onChange={(e) => setDba(e.target.value)} className={inputCls} /></Field>
              <Field label="FEIN, last 4" error={err('fein')}><input value={fein} onChange={(e) => setFein(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" className={inputCls} /></Field>
              <Field label="NAICS"><input value={naics} onChange={(e) => setNaics(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className={inputCls} /></Field>
              <Field label="Annual revenue"><input value={revenue} onChange={(e) => setRevenue(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={cx(inputCls, 'tabular')} /></Field>
              <Field label="Annual payroll"><input value={payroll} onChange={(e) => setPayroll(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={cx(inputCls, 'tabular')} /></Field>
              <Field label="Employees"><input value={employees} onChange={(e) => setEmployees(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={cx(inputCls, 'tabular')} /></Field>
              <Field label="Workers’ comp">
                <select value={wc} onChange={(e) => setWc(e.target.value as WcStatus)} className={inputCls}>
                  {(['Covered', 'Exempt', ...(tx ? ['Non-subscriber (TX)'] : [])] as WcStatus[]).map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              {wc === 'Non-subscriber (TX)' && (
                <Field label="DWC Form-005 filed on (optional)" error={err('dwc')}><input type="date" value={dwc} onChange={(e) => setDwc(e.target.value)} className={inputCls} /></Field>
              )}
            </div>
          )}
          <Field label="Preferred contact method">
            <select value={preferred} onChange={(e) => setPreferred(e.target.value as AccountDetails['preferredContact'])} className={inputCls}>
              <option>Phone</option>
              <option>Email</option>
              <option>SMS</option>
            </select>
          </Field>
        </Section>
        <Section title="Mailing address">
          <Field label="Street" error={err('street')}><input value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-[1fr_88px_120px] gap-3">
            <Field label="City" error={err('city')}><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
            <Field label="State"><input value={account?.state ?? office.state} readOnly className={cx(inputCls, 'bg-recessed')} /></Field>
            <Field label="ZIP" error={err('zip')}><input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" className={inputCls} /></Field>
          </div>
        </Section>
        {!editing && (
          <Section title="Ownership">
            <Field label="Office">
              <select value={officeId} disabled={user.role !== 'principal' && user.role !== 'admin'} onChange={(e) => { setOfficeId(e.target.value); setProducerId(user.role === 'producer' ? user.id : ''); setManagerId('') }} className={inputCls}>
                {data.offices.map((o) => <option key={o.id} value={o.id}>{o.name} {o.state}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Producer" error={err('producer')} hint={user.role === 'producer' ? 'You own accounts you create.' : undefined}>
                <select value={producerId} disabled={user.role === 'producer'} onChange={(e) => setProducerId(e.target.value)} className={inputCls}>
                  <option value="">Choose…</option>
                  {(user.role === 'producer' ? [user] : producers).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Account Manager" error={err('manager')}>
                <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputCls}>
                  <option value="">Choose…</option>
                  {managers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
            </div>
          </Section>
        )}
        {matches.length > 0 && (
          <Callout tone="warning">
            <p className="font-medium">This may already exist</p>
            <ul className="mt-1">
              {matches.map((m) => {
                const a = data.accounts.find((x) => x.id === m.accountId)!
                return (
                  <li key={m.accountId} className="flex justify-between gap-2 py-0.5 text-sm">
                    <span>{a.name} · {a.status} · {data.offices.find((o) => o.id === a.officeId)?.name} <span className="text-muted">({m.reasons.join(', ')})</span></span>
                    {canSeeAccount(user, a) ? <Link to={`/accounts/${a.id}`} onClick={onClose} className="text-link underline">Open</Link> : <span className="text-muted">{userName(a.producerId)}’s book</span>}
                  </li>
                )
              })}
            </ul>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createAnyway} onChange={(e) => setCreateAnyway(e.target.checked)} className="size-4 accent-primary" /> Create anyway
            </label>
          </Callout>
        )}
      </div>
    </Sheet>
  )
}
const isoOf = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromIso = (v: string) => Math.round((new Date(`${v}T12:00:00`).getTime() - new Date(new Date().toDateString()).getTime() - 12 * 3600_000) / 86_400_000)

/** US-ACC-013: create (linked to an Account) or edit a Contact; duplicates offer to link instead. */
export function ContactSheet({ contact, accountId, onClose }: { contact?: Contact; accountId?: string; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const acc = accountId ? data.accounts.find((a) => a.id === accountId) : undefined
  const rels = acc?.kind === 'Business' ? BIZ_REL : HH_REL
  const [firstName, setFirst] = useState(contact?.firstName ?? contact?.name.split(' ')[0] ?? '')
  const [lastName, setLast] = useState(contact?.lastName ?? contact?.name.split(' ').slice(1).join(' ') ?? '')
  const [suffix, setSuffix] = useState(contact?.suffix ?? '')
  const [relationship, setRel] = useState(rels[rels.length - 1])
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [workPhone, setWork] = useState(contact?.workPhone ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [dob, setDob] = useState(contact?.dobOffset != null ? isoOf(contact.dobOffset) : '')
  const [preferred, setPreferred] = useState(contact?.preferredContact ?? 'Phone')
  const [sms, setSms] = useState<SmsConsent>(contact?.smsConsent?.state ?? 'Unknown')
  const [touched, setTouched] = useState(false)
  const { busy, failed, run } = useSaving()
  const household = acc ? acc.kind === 'Household' : contact ? data.accounts.find((a) => contact.accountIds.includes(a.id))?.kind === 'Household' : true
  const dup = data.contacts.find((c) => c.id !== contact?.id && ((email && c.email.toLowerCase() === email.toLowerCase()) || (phone.replace(/\D/g, '').length === 10 && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))))
  const dupAccount = dup ? data.accounts.find((a) => dup.accountIds.includes(a.id)) : undefined
  const errors = {
    first: !firstName.trim() ? 'Enter a first name.' : '',
    last: !lastName.trim() ? 'Enter a last name.' : '',
    reach: !phone.trim() && !email.trim() ? 'Add a phone or email.' : '',
    phone: phone && !PHONE.test(phone) ? 'Enter a phone number like (555) 010-1234' : '',
    email: email && !EMAIL.test(email) ? 'Enter an email like name@example.com' : '',
  }
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '') || undefined
  const save = async () => {
    setTouched(true)
    if (Object.values(errors).some(Boolean) || busy) return
    const ok = await run(() =>
      mutate(
        (s) => s.saveContact(contact?.id ?? null, { firstName, lastName, suffix: suffix || null, phone, workPhone: workPhone || null, email, dobOffset: household && dob ? fromIso(dob) : null, preferredContact: preferred, smsConsent: sms }, contact ? null : { accountId: accountId!, relationship }, user.id),
        contact ? 'Contact updated' : 'Contact added',
      ),
    )
    if (ok) onClose()
  }
  const linkInstead = async () => {
    const ok = await run(() => mutate((s) => s.linkContact(dup!.id, accountId!, relationship, user.id), `${dup!.name} linked`))
    if (ok) onClose()
  }
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title={contact ? `Edit ${contact.name}` : 'New contact'} description={acc ? `On ${acc.name}` : undefined} busy={busy} footer={<><SheetCancel disabled={busy} /><Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}</Button></>}>
      <div className="flex flex-col gap-4">
        {failed && <Callout tone="danger">{failed}</Callout>}
        <div className="grid grid-cols-[1fr_1fr_88px] gap-3">
          <Field label="First name" error={err('first')}><input value={firstName} onChange={(e) => setFirst(e.target.value)} className={inputCls} /></Field>
          <Field label="Last name" error={err('last')}><input value={lastName} onChange={(e) => setLast(e.target.value)} className={inputCls} /></Field>
          <Field label="Suffix"><input value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="Jr." className={inputCls} /></Field>
        </div>
        {!contact && (
          <Field label="Relationship"><select value={relationship} onChange={(e) => setRel(e.target.value)} className={inputCls}>{rels.map((r) => <option key={r}>{r}</option>)}</select></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile phone" error={err('phone') ?? err('reach')}><input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" className={inputCls} /></Field>
          <Field label="SMS consent (mobile)">
            <select value={sms} onChange={(e) => setSms(e.target.value as SmsConsent)} className={inputCls}><option>Unknown</option><option>Opted in</option><option>Opted out</option></select>
          </Field>
          <Field label="Work phone"><input value={workPhone} onChange={(e) => setWork(formatPhone(e.target.value))} inputMode="tel" className={inputCls} /></Field>
          <Field label="Email" error={err('email')}><input value={email} onChange={(e) => setEmail(e.target.value.trim())} inputMode="email" className={inputCls} /></Field>
          {household && <Field label="Date of birth"><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} /></Field>}
          <Field label="Preferred contact">
            <select value={preferred} onChange={(e) => setPreferred(e.target.value as Contact['preferredContact'] & string)} className={inputCls}><option>Phone</option><option>Email</option><option>SMS</option></select>
          </Field>
        </div>
        {dup && (
          <Callout tone="warning" action={!contact && accountId && !dup.accountIds.includes(accountId) && <button onClick={linkInstead} className="h-8 text-link underline">Link existing contact instead</button>}>
            {dup.name} already uses this {email && dup.email.toLowerCase() === email.toLowerCase() ? 'email' : 'phone'}
            {dupAccount ? ` (${dupAccount.name} · ${dup.relationships?.[dupAccount.id] ?? 'Contact'})` : ''}.
          </Callout>
        )}
      </div>
    </Sheet>
  )
}

/** US-ACC-010: link, make primary, and unlink Contacts on an Account. */
export function ManageContactsSheet({ account, onClose }: { account: Account; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [linkRel, setLinkRel] = useState('Other')
  const [removing, setRemoving] = useState<Contact | null>(null)
  const rels = account.kind === 'Business' ? BIZ_REL : HH_REL
  const linked = data.contacts.filter((c) => c.accountIds.includes(account.id))
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const t = q.trim().toLowerCase()
  const td = t.replace(/\D/g, '')
  const results = t.length >= 2 ? data.contacts.filter((c) => !c.accountIds.includes(account.id) && c.accountIds.some((id) => scoped.has(id)) && (c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t) || (td.length >= 4 && c.phone.replace(/\D/g, '').includes(td)))).slice(0, 6) : []
  const accName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? ''
  if (creating) return <ContactSheet accountId={account.id} onClose={() => setCreating(false)} />
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title="Manage contacts" description={account.name} footer={<SheetCancel>Done</SheetCancel>}>
      <ul className="flex flex-col divide-y divide-fill">
        {linked.map((c) => {
          const others = c.accountIds.filter((id) => id !== account.id)
          const primary = account.primaryContactId === c.id
          const solo = others.length === 0
          return (
            <li key={c.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-base font-medium text-strong">
                  {c.name}
                  {primary && <Badge icon={Star}>Primary</Badge>}
                </p>
                <p className="text-sm text-label">{c.relationships?.[account.id] ?? 'Contact'} · {c.phone || '—'} · {c.email || '—'}</p>
                <p className="text-sm text-muted">SMS {c.smsConsent?.state ?? 'Unknown'}</p>
                {others.length > 0 && (
                  <p className="text-sm text-muted">
                    Also on {others.map((id, i) => <span key={id}>{i > 0 && ', '}<Link to={`/accounts/${id}`} onClick={onClose} className="text-link underline">{accName(id)}</Link></span>)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {!primary && <Button size="sm" onClick={() => mutate((s) => s.makePrimary(account.id, c.id, user.id), `${c.name} is now primary`)}>Make primary</Button>}
                {solo ? (
                  <Tip label={`${c.name} is on no other account. Every contact must belong to at least one account.`}>
                    <span tabIndex={0}><Button size="sm" disabled>Remove</Button></span>
                  </Tip>
                ) : (
                  <Button size="sm" onClick={() => setRemoving(c)}>Remove</Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <section className="mt-5 border-t border-fill pt-4">
        <SubHeading className="mb-2">Add contact</SubHeading>
        <div className="grid grid-cols-[1fr_160px] gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, or phone" className={inputCls} aria-label="Search contacts" />
          <select value={linkRel} onChange={(e) => setLinkRel(e.target.value)} aria-label="Relationship" className={inputCls}>{rels.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-md shadow-ring">
            {results.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-2.5 py-2 text-base">
                <span className="min-w-0 truncate">{c.name} <span className="text-sm text-muted">· {accName(c.accountIds[0])}</span></span>
                <Button size="sm" onClick={() => mutate((s) => s.linkContact(c.id, account.id, linkRel, user.id), `${c.name} linked`).then(() => setQ(''))}>Link</Button>
              </li>
            ))}
          </ul>
        )}
        {t.length >= 2 && results.length === 0 && <p className="mt-2 text-sm text-muted">No contacts in your access match.</p>}
        <button onClick={() => setCreating(true)} className="mt-3 text-sm font-medium text-link hover:underline">Create new contact</button>
      </section>
      <Confirm
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove contact?"
        body={removing && `Remove ${removing.name} from ${account.name}? The contact stays on its other accounts.`}
        confirmLabel="Remove"
        danger
        onConfirm={() => mutate((s) => s.unlinkContact(removing!.id, account.id, user.id), 'Contact removed').then(() => setRemoving(null))}
      />
    </Sheet>
  )
}

/** US-ACC-015 (one) and US-ACC-016 (many): owners change; open work follows unless kept. */
export function ReassignDialog({ accountIds, onClose, onDone }: { accountIds: string[]; onClose: () => void; onDone?: (producerId: string | null) => void }) {
  const { data, user } = useApp()
  const { userName, office } = useLookups()
  const mutate = useMutate()
  const toast = useToast()
  const accounts = data.accounts.filter((a) => accountIds.includes(a.id))
  const one = accounts.length === 1 ? accounts[0] : null
  const [producerId, setProducerId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [keep, setKeep] = useState(false)
  const ids = new Set(accountIds)
  const open = (stage: string) => stage !== 'Won' && stage !== 'Lost'
  const pMove = producerId ? accounts.filter((a) => a.producerId !== producerId) : []
  const mMove = managerId ? accounts.filter((a) => a.accountManagerId !== managerId) : []
  const pIds = new Set(pMove.map((a) => a.id))
  const mIds = new Set(mMove.map((a) => a.id))
  const opps = data.opportunities.filter((o) => pIds.has(o.accountId) && open(o.stage) && o.ownerId === data.accounts.find((a) => a.id === o.accountId)!.producerId).length
  const pTasks = data.tasks.filter((t) => pIds.has(t.accountId) && t.status === 'Open' && t.assigneeId === data.accounts.find((a) => a.id === t.accountId)!.producerId).length
  const rens = data.renewals.filter((r) => mIds.has(r.accountId) && r.status !== 'Done').length
  const srs = data.serviceRequests.filter((r) => mIds.has(r.accountId) && r.status !== 'Done').length
  const mTasks = data.tasks.filter((t) => mIds.has(t.accountId) && t.status === 'Open' && t.assigneeId === data.accounts.find((a) => a.id === t.accountId)!.accountManagerId).length
  const skipP = producerId ? accounts.length - pMove.length : 0
  const skipM = managerId ? accounts.length - mMove.length : 0
  const newProducer = data.users.find((u) => u.id === producerId)
  const otherOffice = (uid: string) => uid && accounts.some((a) => data.users.find((u) => u.id === uid)?.officeId !== a.officeId)
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={one ? `Reassign ${one.name}` : `Reassign ${accounts.length.toLocaleString('en-US')} accounts`}
      body={one ? <>Producer {userName(one.producerId)} · Account Manager {userName(one.accountManagerId)}</> : <>Choose a new Producer, Account Manager, or both.</>}
      confirmLabel="Reassign"
      onConfirm={async () => {
        if (!producerId && !managerId) throw new Error('Choose a new Producer or Account Manager.')
        const r = await mutate((s) => s.reassignAccounts([...ids], { producerId: producerId || undefined, accountManagerId: managerId || undefined, moveOpenWork: !keep }, user.id))
        onDone?.(producerId || null)
        toast(one ? 'Account reassigned' : `Moved ${r.changed.toLocaleString('en-US')} accounts${newProducer ? ` to ${newProducer.name}` : ''}`, 'success')
        onClose()
      }}
    >
      <Field label="New Producer">
        <select value={producerId} onChange={(e) => setProducerId(e.target.value)} className={inputCls}>
          <option value="">No change</option>
          {data.users.filter((u) => u.role === 'producer').map((u) => <option key={u.id} value={u.id}>{u.name} · {office(u.officeId)?.name}</option>)}
        </select>
      </Field>
      <Field label="New Account Manager">
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputCls}>
          <option value="">No change</option>
          {data.users.filter((u) => u.role === 'account-manager').map((u) => <option key={u.id} value={u.id}>{u.name} · {office(u.officeId)?.name}</option>)}
        </select>
      </Field>
      {(producerId || managerId) && (
        <div className="rounded-md bg-recessed px-3 py-2 text-sm text-ink">
          {producerId && <p>{plural(opps, 'open opportunity').replace('opportunitys', 'opportunities')} and {plural(pTasks, 'open task')} move to {userName(producerId)}.</p>}
          {managerId && <p>{plural(rens, 'open renewal')}, {plural(srs, 'open service request')}, and {plural(mTasks, 'open task')} move to {userName(managerId)}.</p>}
          {skipP > 0 && <p className="text-label">{skipP} already have {userName(producerId)} as producer and will be skipped for that change.</p>}
          {skipM > 0 && <p className="text-label">{skipM} already have {userName(managerId)} as account manager and will be skipped for that change.</p>}
          {(otherOffice(producerId) || otherOffice(managerId)) && <p className="text-label">Accounts stay in their Office. Change the office in Edit details.</p>}
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="size-4 accent-primary" /> Keep open work with the current owners
          </label>
        </div>
      )}
    </Confirm>
  )
}

/** US-ACC-017 */
export function ArchiveDialog({ account, onClose }: { account: Account; onClose: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [reason, setReason] = useState('Created in error')
  const [other, setOther] = useState('')
  const block = archiveBlock(data, account)
  const openTasks = data.tasks.filter((t) => t.accountId === account.id && t.status === 'Open').length
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Archive ${account.name}?`}
      body={block ?? 'Archived accounts are hidden from lists and become read-only. Nothing is deleted.'}
      confirmLabel="Archive"
      danger
      onConfirm={async () => {
        if (block) throw new Error(block)
        if (reason === 'Other' && !other.trim()) throw new Error('Add a reason.')
        await mutate((s) => s.archiveAccount(account.id, reason === 'Other' ? other.trim() : reason, user.id), `${account.name} archived`)
        onClose()
      }}
    >
      {!block && (
        <>
          <Field label="Reason">
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
              {['Created in error', 'Duplicate', 'No longer pursuing', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          {reason === 'Other' && <Field label="Describe the reason"><input value={other} onChange={(e) => setOther(e.target.value)} className={inputCls} /></Field>}
          {openTasks > 0 && <p className="text-sm text-label">{openTasks} open task{openTasks === 1 ? '' : 's'} will be canceled (reason: Account archived).</p>}
        </>
      )}
    </Confirm>
  )
}

/** US-ACC-018: compare field by field, pick survivors per field, and move everything Fortify owns. */
export function MergeDialog({ account, onClose }: { account: Account; onClose: () => void }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [otherId, setOtherId] = useState<string | null>(null)
  const live = (id: string) => data.policies.some((p) => p.accountId === id && data.terms.some((t) => t.policyId === p.id && (t.status === 'Active' || t.status === 'Bound')))
  const other = otherId ? data.accounts.find((a) => a.id === otherId)! : null
  // The Account with Active Terms survives.
  const [survivorId, setSurvivorId] = useState<string | null>(null)
  const survivor = other ? (survivorId ? data.accounts.find((a) => a.id === survivorId)! : live(other.id) && !live(account.id) ? other : account) : account
  const dup = other ? (survivor.id === account.id ? other : account) : null
  const [pick, setPick] = useState<Record<string, 'survivor' | 'dup'>>({})
  const t = q.trim().toLowerCase()
  const results = t.length >= 2 ? visibleAccounts(user, data.accounts).filter((a) => a.id !== account.id && a.kind === account.kind && a.lifecycle === 'active' && a.name.toLowerCase().includes(t)).slice(0, 6) : []
  const FIELDS: [string, (a: Account) => string][] = [
    ['name', (a) => a.name],
    ['street', (a) => a.details?.street ?? ''],
    ['preferredContact', (a) => a.details?.preferredContact ?? ''],
    ...(account.kind === 'Business' ? ([['entityType', (a: Account) => a.details?.entityType ?? ''], ['fein4', (a: Account) => a.details?.fein4 ?? ''], ['naics', (a: Account) => a.details?.naics ?? ''], ['employees', (a: Account) => String(a.details?.employees ?? '')]] as [string, (a: Account) => string][]) : []),
  ]
  const bothLive = other && live(account.id) && live(other.id)
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Merge into ${survivor.name}`}
      body={other ? (bothLive ? 'Both accounts have active policies. Merge the records in the AMS first; Fortify will follow the next sync.' : `${dup!.name} becomes Merged and points here. Contacts, opportunities, quotes, X-dates, service requests, activities, tasks, and uploaded documents move.`) : 'Find the duplicate account. Only accounts of the same kind can be merged.'}
      confirmLabel="Merge"
      danger
      onConfirm={async () => {
        if (!other || !dup) throw new Error('Choose the duplicate account first.')
        const fields: Record<string, string | number> = {}
        for (const [k, get] of FIELDS) if (pick[k] === 'dup') fields[k] = k === 'employees' ? Number(get(dup)) : get(dup)
        await mutate((s) => s.mergeAccounts(survivor.id, dup.id, fields, user.id), `Merged ${dup.name}`)
        onClose()
        navigate(`/accounts/${survivor.id}`)
      }}
    >
      {!other ? (
        <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className={inputCls} aria-label="Search accounts" />
          {results.map((a) => (
            <button key={a.id} onClick={() => setOtherId(a.id)} className="flex justify-between rounded-md px-2.5 py-2 text-left text-base hover:bg-recessed">
              <span>{a.name}</span>
              <span className="text-sm text-muted">{a.status} · {userName(a.producerId)}</span>
            </button>
          ))}
        </>
      ) : (
        !bothLive && (
          <>
            <div className="flex gap-2 text-sm">
              Survivor:
              {[account, other].map((a) => (
                <label key={a.id} className="inline-flex items-center gap-1"><input type="radio" name="survivor" checked={survivor.id === a.id} onChange={() => setSurvivorId(a.id)} className="accent-primary" /> {a.name}</label>
              ))}
            </div>
            <table className={mini.table}>
              <thead><tr className={mini.head}><th className={mini.th}>Field</th><th className={mini.th}>{survivor.name}</th><th className={mini.th}>{dup!.name}</th></tr></thead>
              <tbody>
                {FIELDS.map(([k, get]) => (
                  <tr key={k} className={mini.tr}>
                    <td className={cx(mini.td, 'text-label')}>{k}</td>
                    {(['survivor', 'dup'] as const).map((side) => (
                      <td key={side} className={mini.td}>
                        <label className="inline-flex items-center gap-1.5"><input type="radio" name={k} checked={(pick[k] ?? 'survivor') === side} onChange={() => setPick({ ...pick, [k]: side })} className="accent-primary" /> {get(side === 'survivor' ? survivor : dup!) || '—'}</label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(dup!.producerId !== survivor.producerId || dup!.accountManagerId !== survivor.accountManagerId) && <p className="text-sm text-label">Open work from {userName(dup!.producerId)} moves to {userName(survivor.producerId)}.</p>}
          </>
        )
      )}
    </Confirm>
  )
}

/** US-ACC-014: Accounts linked through a shared Contact, derived, never stored. */
export function LinkedAccounts({ account }: { account: Account }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  const links = new Map<string, Contact>()
  for (const c of data.contacts) if (c.accountIds.includes(account.id)) for (const id of c.accountIds) if (id !== account.id && !links.has(id)) links.set(id, c)
  return (
    <>
      {[...links.entries()].map(([id, via]) => {
        const a = data.accounts.find((x) => x.id === id)
        if (!a || a.lifecycle !== 'active') return null
        if (!canSeeAccount(user, a)) return <span key={id} className="inline-flex items-center gap-1 text-muted"><Link2 aria-hidden className="size-3.5" /> Linked account outside your access</span>
        const lines = data.policies.filter((p) => p.accountId === a.id && data.terms.some((t) => t.policyId === p.id && t.status === 'Active')).length
        return (
          <Popover.Root key={id}>
            <Popover.Trigger className="inline-flex items-center gap-1 text-link hover:underline">
              <Link2 aria-hidden className="size-3.5" /> Linked: {a.name}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content sideOffset={6} className="z-50 w-72 rounded-md bg-surface p-3 text-sm shadow-pop">
                <Link to={`/accounts/${a.id}`} className="text-base font-medium text-link hover:underline">{a.name}</Link>
                <p className="mt-1 flex items-center gap-2 text-label">{a.kind} · <StatusCell status={a.status} /></p>
                <p className="text-label">Producer {userName(a.producerId)} · {lines} active line{lines === 1 ? '' : 's'}</p>
                <p className="text-muted">via {via.name}</p>
                {a.producerId !== account.producerId && <p className="mt-1 font-medium text-warning-text">Different producer: {userName(a.producerId)}</p>}
                <Popover.Close aria-label="Close" className="absolute top-2 right-2 grid size-6 place-items-center rounded-md text-muted hover:bg-recessed"><X className="size-3.5" /></Popover.Close>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )
      })}
    </>
  )
}

