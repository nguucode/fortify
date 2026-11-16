import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle } from 'lucide-react'
import { useApp } from '@/app/store'
import { offsetOfDate, useLookups, useMutate } from '@/app/hooks'
import { findMatches } from '@/domain/rules'
import { autoMap, IMPORT_FIELDS, parseCsv, reviewRows, type ImportField } from '@/domain/leadImport'
import type { Lead, LeadSource, Line, UsState } from '@/domain/types'
import { Confirm, Field, inputCls, Sheet, SheetCancel } from '@/components/patterns'
import { Button, cx } from '@/components/ui/primitives'
import { formatPhone } from './AccountSheets'
import { useToast } from '@/components/ui/toast'

const PL: Line[] = ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat']
const CL: Line[] = ['BOP', 'GL', 'WC', 'Commercial auto', 'Commercial umbrella']
const SOURCES: LeadSource[] = ['Referral', 'Trusted Choice', 'Purchased list', 'Web form', 'Phone']
const DETAIL: Record<LeadSource, { label: string; options?: string[]; placeholder?: string }> = {
  Referral: { label: 'Referred by', placeholder: 'Kim Alvarez, Lone Star Mortgage' },
  'Trusted Choice': { label: 'Referral type', options: ['Consumer Choice', 'Claim-it', 'Claim-it Warm Transfer'] },
  'Purchased list': { label: 'List name and vendor', placeholder: 'Q4 homeowners · Everquote' },
  'Web form': { label: 'Form name', placeholder: 'Home quote request' },
  Phone: { label: 'Called number or campaign', placeholder: 'Main line' },
}
const code = (id: string) => `L-${1000 + Number(id.replace(/\D/g, ''))}`
const fromIso = (v: string) => offsetOfDate(new Date(`${v}T12:00:00`))
const isoOf = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** US-LEA-002: add or edit a Lead; open-lead duplicates warn but don't block. */
export function LeadSheet({ lead, prefill, onClose, onSaved }: { lead?: Lead; prefill?: Partial<Lead>; onClose: () => void; onSaved?: (id: string) => void }) {
  const init = lead ?? prefill
  const { data, user } = useApp()
  const { userName } = useLookups()
  const mutate = useMutate()
  const toast = useToast()
  const [kind, setKind] = useState<Lead['kind']>(init?.kind ?? 'Household')
  const nm = init?.name ?? ''
  const [first, setFirst] = useState(init?.kind !== 'Business' ? nm.split(' ').slice(0, -1).join(' ') : (nm.split(' ')[0] ?? ''))
  const [last, setLast] = useState(init?.kind !== 'Business' ? (nm.split(' ').pop() ?? '') : nm.split(' ').slice(1).join(' '))
  const [business, setBusiness] = useState(init?.businessName ?? '')
  const [phone, setPhone] = useState(init?.phone ?? '')
  const [email, setEmail] = useState(init?.email ?? '')
  const [street, setStreet] = useState(init?.street ?? '')
  const [city, setCity] = useState(init?.city ?? '')
  const office0 = data.offices.find((o) => o.id === (init?.officeId ?? user.officeId))!
  const [officeId, setOfficeId] = useState(office0.id)
  const office = data.offices.find((o) => o.id === officeId)!
  const [zip, setZip] = useState(init?.zip ?? '')
  const [lines, setLines] = useState<Line[]>(init?.linesOfInterest ?? [])
  const [carrier, setCarrier] = useState(init?.currentCarrier ?? '')
  const [premium, setPremium] = useState(init?.currentPremium ? String(init.currentPremium) : '')
  const [xdate, setXdate] = useState(init?.xDateOffset != null ? isoOf(init.xDateOffset) : '')
  const [source, setSource] = useState<LeadSource>(init?.source ?? 'Referral')
  const [detail, setDetail] = useState(init?.sourceDetail ?? '')
  const [notes, setNotes] = useState(init?.notes ?? '')
  const producers = data.users.filter((u) => u.role === 'producer' && (user.role === 'account-manager' ? u.officeId === user.officeId : true))
  const [assignee, setAssignee] = useState<string>(lead?.assigneeId ?? (user.role === 'producer' ? user.id : ''))
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const options = kind === 'Household' ? PL : CL
  const dup = data.leads.find((l) => l.id !== lead?.id && (l.status === 'New' || l.status === 'Contacted') && ((phone.replace(/\D/g, '').length === 10 && l.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')) || (email && l.email.toLowerCase() === email.toLowerCase())))
  const errors = {
    name: kind === 'Household' ? (!last.trim() ? 'Add a last name.' : '') : !business.trim() ? 'Add the business name.' : '',
    reach: !phone.trim() && !email.trim() ? 'Add a phone number or an email' : '',
    lines: !lines.length ? 'Choose at least one line of interest.' : '',
    zip: zip && !/^\d{5}$/.test(zip) ? 'Enter a 5-digit ZIP code' : '',
  }
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '') || undefined
  const save = async () => {
    setTouched(true)
    if (Object.values(errors).some(Boolean) || busy) return
    setBusy(true)
    setFailed(null)
    try {
      const id = await mutate((s) =>
        s.saveLead(
          lead?.id ?? null,
          { kind, firstName: first, lastName: last, businessName: kind === 'Business' ? business.trim() : null, phone, email, street, city, state: office.state as UsState, zip, linesOfInterest: lines, currentCarrier: carrier || null, currentPremium: Number(premium) || null, xDateOffset: xdate ? fromIso(xdate) : null, source, sourceDetail: detail || null, notes: notes || null, officeId, assigneeId: assignee || null },
          user.id,
        ),
      )
      toast(lead ? 'Lead updated' : `Lead ${code(id)} added`, 'success')
      onSaved?.(id)
      onClose()
    } catch (e) {
      setFailed((e as Error).message)
      setBusy(false)
    }
  }
  const d = DETAIL[source]
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()} title={lead ? `Edit ${lead.name}` : 'Add lead'} busy={busy} footer={<><SheetCancel disabled={busy} /><Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}</Button></>}>
      <div className="flex flex-col gap-4">
        {failed && <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-base text-ink shadow-ring">{failed}</p>}
        <div role="radiogroup" aria-label="Type" className="inline-flex w-fit rounded-md bg-recessed p-0.5">
          {(['Household', 'Business'] as const).map((k) => (
            <button key={k} role="radio" aria-checked={kind === k} disabled={!!lead} onClick={() => { setKind(k); setLines([]) }} className={cx('h-8 rounded-[5px] px-3 text-sm', kind === k ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label')}>
              {k === 'Household' ? 'Personal' : 'Commercial'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} /></Field>
          <Field label={kind === 'Household' ? 'Last name' : 'Last name (optional)'} error={kind === 'Household' ? err('name') : undefined}><input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} /></Field>
          {kind === 'Business' && <div className="col-span-2"><Field label="Business name" error={err('name')}><input value={business} onChange={(e) => setBusiness(e.target.value)} className={inputCls} /></Field></div>}
          <Field label="Phone" error={err('reach')}><input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" className={inputCls} /></Field>
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value.trim())} inputMode="email" className={inputCls} /></Field>
        </div>
        {dup && (
          <p className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2 text-sm text-ink shadow-ring">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-text" />
            <span>An open lead already uses this {dup.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') ? 'phone' : 'email'}: <Link to={`/leads/${dup.id}`} onClick={onClose} className="text-link underline">{code(dup.id)} {dup.name}</Link> (assigned to {userName(dup.assigneeId)})</span>
          </p>
        )}
        <Field label="Street"><input value={street} onChange={(e) => setStreet(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-[1fr_72px_100px] gap-3">
          <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
          <Field label="State"><input value={office.state} readOnly className={cx(inputCls, 'bg-recessed')} /></Field>
          <Field label="ZIP" error={err('zip')}><input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" className={inputCls} /></Field>
        </div>
        <Field label="Lines of interest" error={err('lines')}>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {options.map((l) => (
              <label key={l} className="inline-flex min-h-6 items-center gap-1.5 text-base text-ink">
                <input type="checkbox" checked={lines.includes(l)} onChange={(e) => setLines(e.target.checked ? [...lines, l] : lines.filter((x) => x !== l))} className="size-4 accent-primary" /> {l}
              </label>
            ))}
          </span>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Current carrier"><input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls} /></Field>
          <Field label="Current premium"><input value={premium} onChange={(e) => setPremium(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={cx(inputCls, 'tabular')} /></Field>
          <Field label="X-date"><input type="date" value={xdate} onChange={(e) => setXdate(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <select value={source} onChange={(e) => { setSource(e.target.value as LeadSource); setDetail('') }} className={inputCls}>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select>
          </Field>
          <Field label={d.label}>
            {d.options ? (
              <select value={detail} onChange={(e) => setDetail(e.target.value)} className={inputCls}><option value="">Choose…</option>{d.options.map((o) => <option key={o}>{o}</option>)}</select>
            ) : (
              <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={d.placeholder} className={inputCls} />
            )}
          </Field>
          <Field label="Office">
            <select value={officeId} disabled={user.role === 'producer' || user.role === 'account-manager' || !!lead} onChange={(e) => setOfficeId(e.target.value)} className={inputCls}>
              {data.offices.map((o) => <option key={o.id} value={o.id}>{o.name} {o.state}</option>)}
            </select>
          </Field>
          <Field label="Assigned to" hint={user.role === 'producer' ? 'Leads you add are yours.' : undefined}>
            <select value={assignee} disabled={user.role === 'producer' || !!lead} onChange={(e) => setAssignee(e.target.value)} className={inputCls}>
              <option value="">Unassigned</option>
              {producers.filter((u) => user.role !== 'producer' || u.id === user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} className={cx(inputCls, 'h-20 py-2')} /></Field>
      </div>
    </Sheet>
  )
}

/** US-LEA-004: assign (Principal/Admin/AM) or hand off (Producer); a missing license needs "Assign anyway". */
export function AssignLeadsDialog({ leadIds, handOff, onClose }: { leadIds: string[]; handOff?: boolean; onClose: () => void }) {
  const { data, user } = useApp()
  const { office } = useLookups()
  const mutate = useMutate()
  const toast = useToast()
  const leads = data.leads.filter((l) => leadIds.includes(l.id))
  const producers = data.users.filter((u) => u.role === 'producer' && u.id !== (handOff ? user.id : '') && (user.role === 'account-manager' ? u.officeId === user.officeId : true))
  const [pid, setPid] = useState(producers[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [anyway, setAnyway] = useState(false)
  const target = data.users.find((u) => u.id === pid)
  const states = [...new Set(leads.map((l) => l.state))]
  const missing = states.filter((st) => !target?.licenses?.includes(st))
  const openCount = (id: string) => data.leads.filter((l) => l.assigneeId === id && (l.status === 'New' || l.status === 'Contacted')).length
  const tooMany = leadIds.length > 50
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={handOff ? 'Hand off lead' : leads.length === 1 ? `Assign ${leads[0].name}` : `Assign ${leads.length} leads`}
      body={tooMany ? 'Select up to 50 leads at a time.' : handOff ? 'The lead leaves your list and you lose access to it.' : 'Closed leads keep their Producer.'}
      confirmLabel={missing.length ? 'Assign anyway' : handOff ? 'Hand off' : 'Assign'}
      onConfirm={async () => {
        if (tooMany) throw new Error('Select up to 50 leads at a time.')
        if (missing.length && !anyway) throw new Error('Confirm the license warning to continue.')
        const n = await mutate((s) => s.assignLeads(leadIds, pid, user.id))
        if (note.trim()) leads.forEach((l) => mutate((s) => s.saveLead(l.id, { kind: l.kind, firstName: l.name.split(' ').slice(0, -1).join(' '), lastName: l.name.split(' ').pop() ?? '', businessName: l.businessName, phone: l.phone, email: l.email, street: l.street ?? '', city: l.city, state: l.state, zip: l.zip ?? '', linesOfInterest: l.linesOfInterest, currentCarrier: l.currentCarrier, currentPremium: l.currentPremium ?? null, xDateOffset: l.xDateOffset, source: l.source, sourceDetail: l.sourceDetail ?? null, notes: [l.notes, `Hand-off note: ${note.trim()}`].filter(Boolean).join('\n'), officeId: l.officeId, assigneeId: pid }, user.id)))
        toast(`${n} lead${n === 1 ? '' : 's'} assigned to ${target?.name}`, 'success')
        onClose()
      }}
    >
      <Field label="Producer">
        <select value={pid} onChange={(e) => { setPid(e.target.value); setAnyway(false) }} className={inputCls}>
          {producers.map((u) => <option key={u.id} value={u.id}>{u.name} · {office(u.officeId)?.name} · {openCount(u.id)} open leads · {(u.licenses ?? []).join(', ') || 'no'} licensed</option>)}
        </select>
      </Field>
      {missing.length > 0 && (
        <label className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2 text-sm text-ink shadow-ring">
          <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
          <span>{target?.name} has no active {missing.join(' or ')} license. They can work the lead but not quote it.</span>
        </label>
      )}
      {handOff && <Field label="Note (optional)"><textarea value={note} onChange={(e) => setNote(e.target.value)} className={cx(inputCls, 'h-20 py-2')} /></Field>}
    </Confirm>
  )
}

/** US-LEA-005 */
export function LogAttemptDialog({ lead, onClose, onWrongNumber }: { lead: Lead; onClose: () => void; onWrongNumber: () => void }) {
  const { user } = useApp()
  const mutate = useMutate()
  const [channel, setChannel] = useState<'Call' | 'Email' | 'SMS'>('Call')
  const [outcome, setOutcome] = useState('Reached')
  const [note, setNote] = useState('')
  const [follow, setFollow] = useState('')
  const outcomes = channel === 'Call' ? ['Reached', 'Left voicemail', 'No answer', 'Wrong number'] : ['Sent', 'Reached', 'Wrong number']
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title="Log attempt"
      body={lead.status === 'New' ? 'The first attempt moves the lead to Contacted.' : `${lead.attempts.length} attempts so far.`}
      confirmLabel="Log attempt"
      onConfirm={async () => {
        await mutate((s) => s.logAttempt(lead.id, { channel, outcome, note: note.trim() || null, followUpOffset: follow ? fromIso(follow) : null }, user.id), 'Attempt logged')
        onClose()
        if (outcome === 'Wrong number') onWrongNumber()
      }}
    >
      <div role="radiogroup" aria-label="Channel" className="inline-flex w-fit rounded-md bg-recessed p-0.5">
        {(['Call', 'Email', 'SMS'] as const).map((c) => {
          const blocked = c === 'SMS' && !lead.smsConsent
          return (
            <button key={c} role="radio" aria-checked={channel === c} disabled={blocked} title={blocked ? 'No SMS consent recorded for this lead' : undefined} onClick={() => { setChannel(c); setOutcome(c === 'Call' ? 'Reached' : 'Sent') }} className={cx('h-8 rounded-[5px] px-3 text-sm disabled:text-label disabled:line-through', channel === c ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label')}>
              {c}
            </button>
          )
        })}
      </div>
      {!lead.smsConsent && <p className="-mt-1 text-sm text-label">No SMS consent recorded for this lead.</p>}
      <Field label="Outcome"><select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputCls}>{outcomes.map((o) => <option key={o}>{o}</option>)}</select></Field>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></Field>
      <Field label="Next follow-up (optional)"><input type="date" value={follow} onChange={(e) => setFollow(e.target.value)} className={inputCls} /></Field>
    </Confirm>
  )
}


/** US-LEA-008 (single or bulk; Duplicate lead is single only). */
export function DisqualifyDialog({ leadIds, onClose, presetReason }: { leadIds: string[]; onClose: () => void; presetReason?: string }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const leads = data.leads.filter((l) => leadIds.includes(l.id))
  const one = leads.length === 1 ? leads[0] : null
  const REASONS = (data.settings?.dqReasons ?? []).filter((r) => !r.retired).map((r) => r.name)
  const [reason, setReason] = useState(presetReason ?? REASONS[0] ?? 'Other')
  const [note, setNote] = useState('')
  const survivors = one ? data.leads.filter((l) => l.id !== one.id && (l.status === 'New' || l.status === 'Contacted') && ((one.phone && l.phone === one.phone) || (one.email && l.email.toLowerCase() === one.email.toLowerCase()))) : []
  const [survivor, setSurvivor] = useState(survivors[0]?.id ?? '')
  const [saveX, setSaveX] = useState(true)
  const [xdate, setXdate] = useState(one?.xDateOffset != null ? isoOf(one.xDateOffset) : '')
  const [xline, setXline] = useState<Line>(one?.linesOfInterest[0] ?? 'Auto')
  const [xcarrier, setXcarrier] = useState(one?.currentCarrier ?? '')
  const match = one ? findMatches({ ...one, zip: one.zip }, { accounts: data.accounts.filter((a) => a.lifecycle === 'active'), contacts: data.contacts }).find((m) => m.strength === 'Strong') : undefined
  const matchName = match && data.accounts.find((a) => a.id === match.accountId)?.name
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={one ? `Disqualify ${one.name}` : `Disqualify ${leads.length} leads`}
      body="The lead leaves the Open list. Nothing is deleted."
      confirmLabel="Disqualify"
      danger
      onConfirm={async () => {
        if (reason === 'Duplicate lead' && !survivor) throw new Error('Choose the lead to keep.')
        for (const l of leads)
          await mutate((s) =>
            s.disqualifyLead(l.id, { reason, note: note.trim() || null, survivorId: reason === 'Duplicate lead' ? survivor : undefined, saveXDate: reason === 'Bought elsewhere' && saveX && xdate ? { line: xline, carrier: xcarrier || 'Unknown carrier', offset: fromIso(xdate), accountId: match?.accountId ?? null } : undefined }, user.id),
          )
        toast(leads.length === 1 ? 'Lead disqualified' : `${leads.length} leads disqualified`, 'success')
        onClose()
      }}
    >
      <Field label="Reason">
        <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
          {REASONS.filter((r) => one || r !== 'Duplicate lead').map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      {reason === 'Duplicate lead' && (
        <Field label="Keep this lead">
          {survivors.length ? (
            <select value={survivor} onChange={(e) => setSurvivor(e.target.value)} className={inputCls}>{survivors.map((l) => <option key={l.id} value={l.id}>{code(l.id)} {l.name}</option>)}</select>
          ) : (
            <p className="text-sm text-danger-text">No open lead shares this phone or email.</p>
          )}
        </Field>
      )}
      {reason === 'Bought elsewhere' && one && (
        <div className="rounded-md bg-recessed p-3">
          <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={saveX} onChange={(e) => setSaveX(e.target.checked)} className="size-4 accent-primary" /> Save as X-date</label>
          {saveX && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Field label="Line"><select value={xline} onChange={(e) => setXline(e.target.value as Line)} className={inputCls}>{one.linesOfInterest.map((l) => <option key={l}>{l}</option>)}</select></Field>
              <Field label="Carrier"><input value={xcarrier} onChange={(e) => setXcarrier(e.target.value)} className={inputCls} /></Field>
              <Field label="X-date"><input type="date" value={xdate} onChange={(e) => setXdate(e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          {saveX && <p className="mt-2 text-sm text-label">{matchName ? `Saved on ${matchName}.` : 'Creates a Prospect account to hold the X-date. No Opportunity is created.'}</p>}
        </div>
      )}
      <Field label={reason === 'Other' ? 'Note (at least 10 characters)' : 'Note (optional)'}><textarea value={note} onChange={(e) => setNote(e.target.value)} className={cx(inputCls, 'h-20 py-2')} /></Field>
    </Confirm>
  )
}

/** A demo file so the flow works without a CSV at hand: valid rows, a few invalid ones, and 6 known matches. */
function sampleCsv(existing: { name: string; phone: string; email: string }[]) {
  const first = ['Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Rowan', 'Skyler', 'Taylor', 'Emerson', 'Hayden', 'Parker']
  const last = ['Alvarez', 'Bennett', 'Castillo', 'Dawson', 'Ellison', 'Fuentes', 'Garza', 'Holt', 'Ibarra', 'Jensen']
  const lines = ['Home', 'Auto', 'Home', 'Auto', 'Umbrella', 'Flood']
  const rows = ['first_name,last_name,phone,email,zip,line,current_carrier']
  for (let i = 0; i < 60; i++) {
    const f = first[i % first.length]
    const l = last[(i * 7) % last.length]
    rows.push(`${f},${l},(713) 555-${String(2000 + i).padStart(4, '0')},${f.toLowerCase()}.${l.toLowerCase()}${i}@example.com,770${String(10 + (i % 80)).padStart(2, '0')},${lines[i % lines.length]},Gulf Harbor Insurance`)
  }
  rows.push('Pat,Owens,713555010,,77019,Home,', 'Lee,Song,,lee.song@example.com,7701,Auto,', 'Kim,Rhee,(713) 555-0199,,77019,Jet ski,')
  // Business rows: the business_name column is appended at the end of the header below.
  rows.push('Marco,Vega,(713) 555-3101,marco@vegaplumbing.example,77008,GL,,Vega Plumbing LLC', ',,(713) 555-3102,office@brightsmiles.example,77024,BOP,,Bright Smiles Dental', 'Dee,Okafor,(713) 555-3103,,77036,WC,,Okafor Landscaping Co.')
  rows[0] += ',business_name'
  for (const c of existing.slice(0, 6)) { const [f, ...r] = c.name.split(' '); rows.push(`${f},${r.join(' ') || 'Doe'},${c.phone},${c.email},77019,Auto,`) }
  return rows.join('\n')
}

/** US-LEA-010: Principal and Admin import a purchased list in four steps. */
export function ImportLeadsDialog({ onClose, onDone }: { onClose: () => void; onDone: (listName: string) => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const [step, setStep] = useState<'file' | 'map' | 'review'>('file')
  const [listName, setListName] = useState('')
  const [vendor, setVendor] = useState('')
  const [officeId, setOfficeId] = useState(user.officeId)
  const [grid, setGrid] = useState<string[][] | null>(null)
  const [map, setMap] = useState<(ImportField | null)[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [includeDup, setIncludeDup] = useState(false)
  const [assignees, setAssignees] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const load = (text: string) => {
    const g = parseCsv(text)
    if (g.length < 2) return setErr('This file has no rows.')
    if (g.length - 1 > 2000) return setErr('Use a .csv file with up to 2,000 rows.')
    setErr(null)
    setGrid(g)
    setMap(autoMap(g[0]))
  }
  const existing = { phones: new Set([...data.contacts.map((c) => c.phone), ...data.leads.filter((l) => l.status === 'New' || l.status === 'Contacted').map((l) => l.phone)].map((p) => p.replace(/\D/g, '')).filter(Boolean)), emails: new Set([...data.contacts.map((c) => c.email), ...data.leads.map((l) => l.email)].filter(Boolean).map((e) => e.toLowerCase())) }
  const reviewed = grid ? reviewRows(grid.slice(1), map, existing) : []
  const ready = reviewed.filter((r) => r.status === 'Ready')
  const invalid = reviewed.filter((r) => r.status === 'Invalid')
  const dups = reviewed.filter((r) => r.status === 'Possible duplicate')
  const toImport = [...ready, ...(includeDup ? dups : [])]
  const producers = data.users.filter((u) => u.role === 'producer' && u.officeId === officeId && u.status !== 'Deactivated')
  const missing = (['first_name', 'last_name', 'zip', 'line'] as ImportField[]).filter((f) => !map.includes(f)).concat(map.includes('phone') || map.includes('email') ? [] : ['phone' as ImportField])
  const run = async () => {
    setBusy(true)
    try {
      const n = await mutate((s) => s.importLeads(toImport.map((r) => ({ first: r.values.first_name ?? '', last: r.values.last_name ?? '', business: r.values.business_name || null, phone: r.values.phone ?? '', email: r.values.email ?? '', zip: r.values.zip!, city: r.values.city ?? '', street: r.values.street ?? '', line: r.line!, carrier: r.values.current_carrier || null })), { listName, vendor, officeId, assignees }, user.id))
      toast(`${n.toLocaleString('en-US')} leads imported from ${listName}`, 'success')
      onDone(listName)
    } catch (e) {
      setErr(`Import failed; nothing was saved. ${(e as Error).message}`)
      setBusy(false)
    }
  }
  const footer =
    step === 'file' ? <><SheetCancel /><Button variant="primary" disabled={!grid || !listName.trim()} onClick={() => setStep('map')}>Map columns</Button></>
    : step === 'map' ? <><Button onClick={() => setStep('file')}>Back</Button><Button variant="primary" disabled={missing.length > 0} onClick={() => setStep('review')}>Review</Button></>
    : <><Button onClick={() => setStep('map')}>Back</Button><Button variant="primary" disabled={busy || !toImport.length} onClick={run}>{busy ? 'Importing…' : `Import ${toImport.length.toLocaleString('en-US')} leads`}</Button></>
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title="Import a lead list" description={step === 'file' ? 'Step 1 of 3 · File' : step === 'map' ? 'Step 2 of 3 · Map columns' : 'Step 3 of 3 · Review'} busy={busy} footer={footer}>
      {err && <p role="alert" className="mb-3 rounded-md bg-danger-tint px-3 py-2 text-base text-ink shadow-ring">{err}</p>}
      {step === 'file' && (
        <div className="flex flex-col gap-3">
          <Field label="List name"><input className={inputCls} placeholder="Q4 Homeowners TX" value={listName} onChange={(e) => setListName(e.target.value)} /></Field>
          <Field label="Vendor"><input className={inputCls} placeholder="Acme Data Co." value={vendor} onChange={(e) => setVendor(e.target.value)} /></Field>
          <Field label="Office the Leads belong to"><select className={inputCls} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>{data.offices.map((o) => <option key={o.id} value={o.id}>{o.name} {o.state}</option>)}</select></Field>
          <Field label="CSV file (up to 2,000 rows)" hint="Required columns: first_name, last_name, phone or email, zip, line.">
            <input type="file" accept=".csv,text/csv" className="text-base" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (!/\.csv$/i.test(f.name)) return setErr('Use a .csv file with up to 2,000 rows.'); load(await f.text()) }} />
          </Field>
          <button type="button" className="self-start text-sm text-link underline" onClick={() => { load(sampleCsv(data.contacts.filter((c) => c.phone && c.email))); if (!listName) setListName('Q4 Homeowners TX'); if (!vendor) setVendor('Acme Data Co.') }}>Use the sample file</button>
          {grid && <p className="text-sm text-label">{(grid.length - 1).toLocaleString('en-US')} rows read.</p>}
        </div>
      )}
      {step === 'map' && grid && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {grid[0].map((h, i) => (
              <li key={i} className="grid grid-cols-2 items-center gap-3">
                <span className="truncate text-base font-medium" title={h}>{h}</span>
                <select aria-label={`Map ${h}`} className={cx(inputCls, 'h-8')} value={map[i] ?? ''} onChange={(e) => setMap(map.map((m, j) => (j === i ? ((e.target.value || null) as ImportField | null) : m)))}>
                  <option value="">Ignore</option>
                  {IMPORT_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </li>
            ))}
          </ul>
          {missing.length > 0 && <p className="text-sm font-medium text-danger-text">Map {missing.join(', ')} to continue.</p>}
          <div className="overflow-x-auto rounded-md shadow-ring">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead><tr className="h-8 border-b border-fill">{grid[0].map((_, i) => <th key={i} className="px-2 font-semibold">{map[i] ?? <span className="text-muted">ignored</span>}</th>)}</tr></thead>
              <tbody>{grid.slice(1, 21).map((r, i) => <tr key={i} className="h-8 border-b border-fill last:border-0">{r.map((c, j) => <td key={j} className="max-w-40 truncate px-2">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="text-sm text-muted">Preview of the first 20 rows.</p>
        </div>
      )}
      {step === 'review' && (
        <div className="flex flex-col gap-3">
          <p className="tabular text-base font-medium">{ready.length.toLocaleString('en-US')} ready · {invalid.length} invalid · {dups.length} possible duplicates</p>
          {invalid.length > 0 && <details className="rounded-md bg-surface p-2 shadow-ring"><summary className="cursor-pointer text-base">Invalid rows are skipped ({invalid.length})</summary><ul className="mt-1 max-h-40 overflow-y-auto text-sm text-label">{invalid.map((r) => <li key={r.n}>{r.reason}</li>)}</ul></details>}
          {dups.length > 0 && (
            <details className="rounded-md bg-surface p-2 shadow-ring"><summary className="cursor-pointer text-base">Possible duplicates ({dups.length})</summary><ul className="mt-1 max-h-40 overflow-y-auto text-sm text-label">{dups.map((r) => <li key={r.n}>Row {r.n}: {r.values.first_name} {r.values.last_name}</li>)}</ul></details>
          )}
          {dups.length > 0 && <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} />Import possible duplicates too</label>}
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-label">Assign to</legend>
            <p className="mb-1 text-sm text-muted">{assignees.length ? `Split evenly across ${assignees.length} Producer${assignees.length === 1 ? '' : 's'}.` : 'Leave unassigned to triage from the Unassigned view.'}</p>
            <ul className="max-h-48 overflow-y-auto">
              {producers.map((u) => <li key={u.id}><label className="flex h-8 items-center gap-2 text-base"><input type="checkbox" checked={assignees.includes(u.id)} onChange={(e) => setAssignees(e.target.checked ? [...assignees, u.id] : assignees.filter((x) => x !== u.id))} />{u.name}</label></li>)}
            </ul>
          </fieldset>
        </div>
      )}
    </Sheet>
  )
}
