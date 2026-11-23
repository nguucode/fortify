import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Paperclip } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, offsetOfDate, usd, useMutate } from '@/app/hooks'
import { visibleAccounts } from '@/domain/access'
import type { Line, ServiceRequest, ServiceType } from '@/domain/types'
import { Field, inputCls, Sheet, SheetCancel } from '@/components/patterns'
import { Button, Callout, cx } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'

export const SR_TYPES: ServiceType[] = ['Policy change', 'Certificate request', 'Claim report', 'ID card / evidence', 'Billing question', 'Cancellation request', 'General']
export const POLICY_CHANGE_KINDS = ['Add vehicle', 'Replace vehicle', 'Remove vehicle', 'Add driver', 'Remove driver', 'Change address', 'Add mortgagee or lienholder', 'Change limits or deductibles']
const LOSS: { type: 'Property' | 'Auto' | 'Liability' | "Workers' compensation"; form: string; lines: Line[] }[] = [
  { type: 'Property', form: 'ACORD 1', lines: ['Home', 'Condo', 'Renters', 'Flood', 'BOP'] },
  { type: 'Auto', form: 'ACORD 2', lines: ['Auto', 'Commercial auto'] },
  { type: 'Liability', form: 'ACORD 3', lines: ['GL', 'BOP', 'Umbrella', 'Commercial umbrella', 'Home'] },
  { type: "Workers' compensation", form: 'ACORD 4', lines: ['WC'] },
]
const CAUSES = ['Wind', 'Hail', 'Water', 'Fire', 'Theft', 'Hurricane', 'Sinkhole', 'Other']
const BILLING = ['Payment due', 'Missed payment or late notice', 'Refund', 'Payment plan change', 'Autopay or payment method', 'Premium increase', 'Other']
const CANCEL = ['Sold the vehicle or property', 'Replaced with another carrier', 'Rewrite at this agency', 'Moving out of state', 'Cost', 'No longer needed', 'Other']
const VIA = ['Phone', 'Email', 'Walk-in', 'Client portal', 'Text message']
const fromIso = (v: string) => offsetOfDate(new Date(`${v}T12:00:00`))
const isoOf = (off: number) => {
  const d = new Date()
  d.setDate(d.getDate() + off)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * US-SRV-005 shared fields + type forms: 006 Policy change, 008 Certificate, 009 Claim report, 010 ID card / evidence,
 * 011 Billing question, 012 Cancellation request. With `request` it is the US-SRV-015 edit sheet (type and Account fixed).
 */
export function ServiceRequestSheet({ onClose, accountId: presetAccount, policyId: presetPolicy, type: presetType, presetDescription, request, presetVehicle, presetSubject, presetBody, onSaved }: { presetSubject?: string; presetBody?: string; onSaved?: (id: string) => void; onClose: () => void; accountId?: string; policyId?: string; type?: ServiceType; presetDescription?: string; request?: ServiceRequest; presetVehicle?: string }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const navigate = useNavigate()
  const editing = !!request
  const d0 = (request?.details ?? {}) as Record<string, unknown>
  const accounts = visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active' && data.policies.some((p) => p.accountId === a.id))
  const [accountId, setAccountId] = useState(request?.accountId ?? presetAccount ?? '')
  const [policyId, setPolicyId] = useState(request?.policyId ?? presetPolicy ?? '')
  const [type, setType] = useState<ServiceType>(request?.type ?? presetType ?? 'Policy change')
  const [subject, setSubject] = useState(request?.subject ?? presetSubject ?? '')
  const [description, setDescription] = useState(request?.description ?? presetBody ?? (presetDescription ? `Change requested for: ${presetDescription}. ` : ''))
  const [priority, setPriority] = useState<'Normal' | 'High'>(request?.priority ?? 'Normal')
  const [via, setVia] = useState(request?.requestedVia ?? 'Phone')
  const [files, setFiles] = useState<{ name: string; size: number }[]>(request?.attachments ?? [])
  const [owner, setOwner] = useState(request?.ownerId ?? '')
  const [due, setDue] = useState(request?.dueAt ? request.dueAt.slice(0, 10) : '')
  const [dueReason, setDueReason] = useState('')
  const [d, setD] = useState<Record<string, unknown>>(() => ({ kind: POLICY_CHANGE_KINDS[0], lossType: 'Property', document: 'Auto ID card', topic: 'Payment due', reason: CANCEL[0], retention: true, cancelDate: isoOf(0), signed: 'No', delivery: 'Email', sendTo: 'contact', ...(presetVehicle ? { vehicles: [presetVehicle] } : {}), ...d0 }))
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }))
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const account = data.accounts.find((a) => a.id === accountId)
  const policy = data.policies.find((p) => p.id === policyId)
  const term = policy ? [...data.terms.filter((t) => t.policyId === policy.id)].sort((a, b) => b.effectiveOffset - a.effectiveOffset)[0] : undefined
  const items = (data.insuredItems ?? []).filter((i) => i.policyId === policyId)
  const contacts = data.contacts.filter((c) => c.accountIds.includes(accountId))
  const holders = (data.holders ?? []).filter((h) => h.accountId === accountId)
  const business = account?.kind === 'Business'
  const nonSub = account?.details?.wcStatus === 'Non-subscriber (TX)'
  const loss = LOSS.find((l) => l.type === d.lossType)!
  const activeTerm = (pid: string) => data.terms.some((t) => t.policyId === pid && (t.status === 'Active' || t.status === 'Bound' || t.pendingCancellation))
  const policies = data.policies.filter((p) => p.accountId === accountId).filter((p) => {
    if (type === 'Claim report') return loss.lines.includes(p.line)
    if (type === 'Cancellation request' || type === 'Certificate request') return activeTerm(p.id)
    return true
  })
  const special = !!(d.additionalInsured || d.waiver || d.primaryNonContrib)
  const managers = data.users.filter((u) => u.role === 'account-manager' && (user.role === 'principal' || u.officeId === account?.officeId))

  const defaultSubject =
    type === 'Policy change' ? String(d.kind)
    : type === 'ID card / evidence' ? `ID card / evidence · ${d.document}${presetVehicle ? ` · ${presetVehicle}` : ''}`
    : type === 'Billing question' ? `Billing question · ${d.topic}`
    : type === 'Claim report' ? `Claim report · ${d.lossType}${d.cause ? ` · ${d.cause}` : ''}`
    : type === 'Cancellation request' ? `Cancel ${policy?.line ?? 'policy'} · ${d.reason}`
    : type === 'Certificate request' ? `Certificate · ${(d.holder as { name?: string })?.name ?? holders.find((h) => h.id === d.holderId)?.name ?? 'holder'}`
    : 'General'
  const finalSubject = subject.trim() || defaultSubject
  const lossOff = d.lossDate ? fromIso(String(d.lossDate)) : null
  const errors = {
    account: !accountId ? 'Choose an Account.' : '',
    policy: ['Policy change', 'Cancellation request', 'ID card / evidence'].includes(type) && !policyId ? 'Choose a Policy.' : type === 'Claim report' && !policyId ? 'Choose the policy for this loss.' : '',
    effective: type === 'Policy change' && !d.effective ? 'Choose the date the change takes effect.' : '',
    description: description.trim().length < (type === 'Claim report' ? 20 : 10) ? `Describe the request (at least ${type === 'Claim report' ? 20 : 10} characters).` : '',
    cert: type === 'Certificate request' && (!business ? 'Certificates are for Business Accounts.' : !(d.policyIds as string[] | undefined)?.length ? 'Include at least one policy.' : !d.holderId && !(d.holder as { name?: string })?.name ? 'Choose or add a holder.' : '') || '',
    lossDate: type === 'Claim report' && (!d.lossDate ? 'Enter the date of loss.' : (lossOff ?? 0) > 0 ? 'Date of loss can’t be in the future.' : '') || '',
    cancelOther: type === 'Cancellation request' && d.reason === 'Other' && !String(d.note ?? '').trim() ? 'Add a note for Other.' : '',
    cancelSigned: type === 'Cancellation request' && d.signed === 'Yes' && !files.length ? 'Attach the signed request.' : '',
    notice: type === 'Billing question' && d.noticeReceived === true && !d.cancelEffective ? 'Enter the cancellation effective date.' : '',
    dueReason: editing && due && due !== request!.dueAt?.slice(0, 10) && !dueReason.trim() ? 'Add a reason for the new due date.' : '',
  }
  const valid = Object.values(errors).every((e) => !e)
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '') || undefined

  const details = useMemo(() => {
    const x: Record<string, unknown> = { ...d }
    if (type === 'Policy change') return { effectiveDate: x.effective, changes: [{ kind: x.kind }], effective: x.effective, kind: x.kind }
    if (type === 'Claim report') return { ...x, lossOffset: lossOff ?? 0 }
    if (type === 'Cancellation request') return { ...x, cancelOffset: x.cancelDate ? fromIso(String(x.cancelDate)) : 0, newExpirationOffset: x.newExpiration ? fromIso(String(x.newExpiration)) : null, line: policy?.line, retention: x.reason === 'Rewrite at this agency' ? false : x.retention }
    return x
  }, [d, type, lossOff, policy])

  const save = async () => {
    setTouched(true)
    if (!valid || busy) return
    setBusy(true)
    try {
      if (editing) {
        await mutate((s) => s.updateServiceRequest(request!.id, { subject: finalSubject, description: description.trim(), priority, requestedVia: via, attachments: files, details, ownerId: owner || request!.ownerId, ...(due && due !== request!.dueAt?.slice(0, 10) ? { dueAt: new Date(`${due}T17:00:00`).toISOString(), dueReason } : {}) }, user.id), 'Request updated')
        onClose()
        return
      }
      const id = await mutate((s) => s.createServiceRequest({ accountId, policyId: policyId || null, type, subject: finalSubject, description: description.trim(), priority, details, requestedVia: via, attachments: files }, user.id))
      const st = data
      onSaved?.(id)
      onClose()
      const claim = type === 'Claim report'
      toast(claim ? 'Claim reported' : 'Service Request created', 'success', claim ? { action: { label: 'Open claim', onClick: () => navigate(`/claims/CL-${2042 + (st.claims?.length ?? 0)}`) } } : {})
      navigate(`/service/${id}`)
    } catch {
      setBusy(false)
    }
  }

  const check = (k: string, label: string) => (
    <label className="inline-flex min-h-6 items-center gap-1.5 text-base text-ink">
      <input type="checkbox" checked={!!d[k]} onChange={(e) => set(k, e.target.checked)} className="size-4 accent-primary" /> {label}
    </label>
  )
  const sel = (k: string, label: string, opts: string[], extra?: { error?: string; disabled?: (o: string) => string | null }) => (
    <Field label={label} error={extra?.error}>
      <select className={inputCls} value={String(d[k] ?? '')} onChange={(e) => set(k, e.target.value)}>
        {opts.map((o) => {
          const why = extra?.disabled?.(o)
          return <option key={o} value={o} disabled={!!why}>{o}{why ? ` (${why})` : ''}</option>
        })}
      </select>
    </Field>
  )

  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={editing ? `Edit ${request!.id}` : 'New service request'}
      busy={busy}
      footer={<><SheetCancel disabled={busy} /><Button variant="primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create request'}</Button></>}
    >
      <div className="flex flex-col gap-4">
        {editing ? (
          <p className="rounded-md bg-recessed px-3 py-2 text-sm text-ink">{type} · {account?.name}. Type can’t be changed. Create a new request instead.</p>
        ) : (
          <>
            <Field label="Type">
              <select className={inputCls} value={type} onChange={(e) => { setType(e.target.value as ServiceType); setPolicyId(presetPolicy ?? '') }}>
                {SR_TYPES.map((t) => (
                  <option key={t} disabled={t === 'Certificate request' && !!account && !business}>{t}{t === 'Certificate request' && account && !business ? ' (Business accounts only)' : ''}</option>
                ))}
              </select>
            </Field>
            {type === 'Certificate request' && account && !business && <p className="-mt-2 text-sm text-label">Certificates are for Business Accounts. Use ID card / evidence for a Household.</p>}
            <Field label="Account" error={err('account')}>
              <select className={inputCls} value={accountId} disabled={!!presetAccount} onChange={(e) => { setAccountId(e.target.value); setPolicyId('') }}>
                <option value="">Choose an Account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </>
        )}

        {type === 'Claim report' && (
          <Field label="Loss type">
            <select className={inputCls} value={String(d.lossType)} onChange={(e) => { set('lossType', e.target.value); setPolicyId('') }}>
              {LOSS.map((l) => {
                const blocked = l.type === "Workers' compensation" && nonSub
                return <option key={l.type} value={l.type} disabled={blocked}>{l.type} ({l.form}){blocked ? ` · ${account?.name} is a Texas WC non-subscriber` : ''}</option>
              })}
            </select>
          </Field>
        )}

        {type !== 'Certificate request' && (
          <Field label={['Policy change', 'Cancellation request', 'ID card / evidence', 'Claim report'].includes(type) ? 'Policy' : 'Policy (optional)'} error={err('policy')}>
            <select className={inputCls} value={policyId} disabled={!accountId || !!presetPolicy || editing} onChange={(e) => setPolicyId(e.target.value)}>
              <option value="">{accountId ? 'Choose a Policy' : 'Choose an Account first'}</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.line} · {p.policyNumber}</option>)}
            </select>
          </Field>
        )}

        {type === 'Policy change' && (
          <div className="grid grid-cols-2 gap-3">
            {sel('kind', 'Change', POLICY_CHANGE_KINDS)}
            <Field label="Effective date" error={err('effective')}><input type="date" className={inputCls} value={String(d.effective ?? '')} onChange={(e) => set('effective', e.target.value)} /></Field>
          </div>
        )}

        {type === 'Certificate request' && business && (
          <>
            <Field label="Holder" error={err('cert')}>
              <select className={inputCls} value={String(d.holderId ?? 'new')} onChange={(e) => set('holderId', e.target.value === 'new' ? undefined : e.target.value)}>
                {holders.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
                <option value="new">New holder</option>
              </select>
            </Field>
            {!d.holderId && (
              <div className="grid grid-cols-2 gap-3 rounded-md bg-recessed p-3">
                {(['name', 'address', 'city', 'state', 'zip', 'email'] as const).map((k) => (
                  <Field key={k} label={k === 'zip' ? 'ZIP' : k === 'address' ? 'Address line 1' : k[0].toUpperCase() + k.slice(1)}>
                    <input className={inputCls} value={String((d.holder as Record<string, string>)?.[k] ?? '')} onChange={(e) => set('holder', { ...(d.holder as object), [k]: e.target.value })} />
                  </Field>
                ))}
              </div>
            )}
            <Field label="Policies to include">
              <span className="flex flex-col gap-1">
                {policies.map((p) => (
                  <label key={p.id} className="inline-flex min-h-6 items-center gap-2 text-base">
                    <input type="checkbox" checked={((d.policyIds as string[]) ?? []).includes(p.id)} onChange={(e) => set('policyIds', e.target.checked ? [...((d.policyIds as string[]) ?? []), p.id] : ((d.policyIds as string[]) ?? []).filter((x) => x !== p.id))} className="size-4 accent-primary" />
                    {p.line} · {p.policyNumber}
                  </label>
                ))}
              </span>
            </Field>
            <span className="flex flex-wrap gap-x-4">{check('additionalInsured', 'Additional insured')}{check('waiver', 'Waiver of subrogation')}{check('primaryNonContrib', 'Primary & noncontributory')}</span>
            {special && <Callout tone="warning">Needs review: a Principal approves additional insured, waiver, or primary & noncontributory wording before the certificate is issued.</Callout>}
            <Field label="Description of operations"><textarea maxLength={500} className={cx(inputCls, 'h-20 py-2')} value={String(d.operations ?? '')} onChange={(e) => set('operations', e.target.value)} placeholder="Re: Job #2291, roofing at 1400 Westheimer Rd" /></Field>
          </>
        )}

        {type === 'Claim report' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of loss" error={err('lossDate')}><input type="date" className={inputCls} value={String(d.lossDate ?? '')} onChange={(e) => set('lossDate', e.target.value)} /></Field>
              <Field label="Time of loss (optional)"><input type="time" className={inputCls} value={String(d.lossTime ?? '')} onChange={(e) => set('lossTime', e.target.value)} /></Field>
            </div>
            {term && lossOff != null && (lossOff < term.effectiveOffset || lossOff > term.expirationOffset) && (
              <Callout tone="warning">Date of loss {dateOf(lossOff)} is outside the selected term ({dateOf(term.effectiveOffset)} – {dateOf(term.expirationOffset)}). Check which policy was in force.</Callout>
            )}
            <Field label="Reported by">
              <select className={inputCls} value={String(d.reportedBy ?? '')} onChange={(e) => set('reportedBy', e.target.value)}>
                <option value="">Choose…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="other">Someone else</option>
              </select>
            </Field>
            {d.reportedBy === 'other' && <div className="grid grid-cols-2 gap-3"><Field label="Name"><input className={inputCls} value={String(d.reporterName ?? '')} onChange={(e) => set('reporterName', e.target.value)} /></Field><Field label="Phone"><input className={inputCls} value={String(d.reporterPhone ?? '')} onChange={(e) => set('reporterPhone', e.target.value)} /></Field></div>}
            <Field label="Loss location"><input className={inputCls} value={String(d.location ?? `${account?.details?.street ?? ''}, ${account?.city ?? ''}`)} onChange={(e) => set('location', e.target.value)} /></Field>
            {d.lossType === 'Auto' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vehicle"><select className={inputCls} value={String(d.vehicle ?? '')} onChange={(e) => set('vehicle', e.target.value)}><option value="">Choose…</option>{items.filter((i) => i.kind === 'Vehicle').map((v) => v.kind === 'Vehicle' && <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}</select></Field>
                <Field label="Driver"><select className={inputCls} value={String(d.driver ?? '')} onChange={(e) => set('driver', e.target.value)}><option value="">Choose…</option>{items.filter((i) => i.kind === 'Driver').map((v) => v.kind === 'Driver' && <option key={v.id} value={v.id}>{v.name}</option>)}<option value="unlisted">Driver not listed</option></select></Field>
                <Field label="Other party name"><input className={inputCls} value={String(d.otherName ?? '')} onChange={(e) => set('otherName', e.target.value)} /></Field>
                <Field label="Other party carrier"><input className={inputCls} value={String(d.otherCarrier ?? '')} onChange={(e) => set('otherCarrier', e.target.value)} /></Field>
                {sel('drivable', 'Vehicle drivable', ['Yes', 'No'])}
              </div>
            )}
            {d.lossType === 'Property' && (
              <>
                {sel('cause', 'Cause', CAUSES)}
                {d.cause === 'Hurricane' && policy?.dwelling?.hurricanePct != null && <p className="rounded-md bg-recessed px-3 py-2 text-sm text-ink">Hurricane deductible: {policy.dwelling.hurricanePct}% of dwelling = {usd((policy.dwelling.coverageA * policy.dwelling.hurricanePct) / 100)}</p>}
                {d.cause === 'Sinkhole' && account?.state === 'FL' && lossOff != null && lossOff < -730 && <Callout tone="warning">Florida sinkhole claims must be reported within 2 years of the loss.</Callout>}
              </>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Police or fire report #"><input className={inputCls} value={String(d.reportNumber ?? '')} onChange={(e) => set('reportNumber', e.target.value)} /></Field>
              {sel('injuries', 'Injuries', ['Unknown', 'No', 'Yes'])}
              <Field label="Estimated amount"><input inputMode="numeric" className={inputCls} value={String(d.estimate ?? '')} onChange={(e) => set('estimate', e.target.value.replace(/\D/g, ''))} /></Field>
            </div>
          </>
        )}

        {type === 'ID card / evidence' && (
          <>
            {sel('document', 'Document', policy && ['Auto', 'Commercial auto'].includes(policy.line) ? ['Auto ID card', 'Declarations page copy'] : ['Evidence of property insurance', 'Lender evidence', 'Declarations page copy'])}
            {d.document === 'Auto ID card' && (
              <Field label="Vehicles">
                <span className="flex flex-col gap-1">
                  {items.filter((i) => i.kind === 'Vehicle').map((v) => v.kind === 'Vehicle' && (
                    <label key={v.id} className="inline-flex min-h-6 items-center gap-2 text-base">
                      <input type="checkbox" checked={!d.vehicles || (d.vehicles as string[]).includes(`${v.year} ${v.make} ${v.model}`)} onChange={(e) => { const all = items.filter((i) => i.kind === 'Vehicle').map((x) => x.kind === 'Vehicle' ? `${x.year} ${x.make} ${x.model}` : ''); const cur = (d.vehicles as string[]) ?? all; const name = `${v.year} ${v.make} ${v.model}`; set('vehicles', e.target.checked ? [...cur, name] : cur.filter((n) => n !== name)) }} className="size-4 accent-primary" />
                      {v.year} {v.make} {v.model}
                    </label>
                  ))}
                </span>
              </Field>
            )}
            <Field label="Send to">
              <select className={inputCls} value={String(d.sendTo)} onChange={(e) => set('sendTo', e.target.value)}>
                {contacts.map((c) => <option key={c.id} value={`contact:${c.id}`}>{c.name} · {c.email || 'no email'}</option>)}
                {(policy?.interests ?? []).map((x, i) => <option key={i} value={`interest:${i}`}>{x.name} · {x.type} · Loan #••••{x.loan4}</option>)}
                <option value="other">Other</option>
              </select>
            </Field>
            {d.sendTo === 'other' && <div className="grid grid-cols-2 gap-3"><Field label="Name"><input className={inputCls} value={String(d.otherName ?? '')} onChange={(e) => set('otherName', e.target.value)} /></Field><Field label="Email"><input className={inputCls} value={String(d.otherEmail ?? '')} onChange={(e) => set('otherEmail', e.target.value)} /></Field></div>}
            {sel('delivery', 'Delivery', d.document === 'Auto ID card' ? ['Email', 'Text message link', 'Print'] : ['Email', 'Print'])}
          </>
        )}

        {type === 'Billing question' && (
          <>
            {sel('topic', 'Topic', BILLING)}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Amount (optional)"><input inputMode="decimal" className={inputCls} value={String(d.amount ?? '')} onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))} /></Field>
              <Field label="Statement or notice date"><input type="date" className={inputCls} value={String(d.statementDate ?? '')} onChange={(e) => set('statementDate', e.target.value)} /></Field>
              <Field label="Billing method"><input readOnly className={cx(inputCls, 'bg-recessed')} value={policy ? (policy.line === 'WC' || business ? 'Agency bill' : 'Direct bill') : '—'} /></Field>
            </div>
            {d.topic === 'Missed payment or late notice' && (
              <>
                <label className="inline-flex min-h-6 items-center gap-2 text-base"><input type="checkbox" checked={d.noticeReceived === true} onChange={(e) => set('noticeReceived', e.target.checked)} className="size-4 accent-primary" /> Notice of cancellation received</label>
                {d.noticeReceived === true && (
                  <>
                    <Field label="Cancellation effective date" error={err('notice')}><input type="date" className={inputCls} value={String(d.cancelEffective ?? '')} onChange={(e) => set('cancelEffective', e.target.value)} /></Field>
                    <Callout tone="warning">Nonpayment notices move fast. Confirm the payment date with the carrier today.</Callout>
                  </>
                )}
              </>
            )}
          </>
        )}

        {type === 'Cancellation request' && (
          <>
            <Field label="Requested cancellation date" hint={d.cancelDate && fromIso(String(d.cancelDate)) < -30 ? 'Back-dated cancellations need carrier approval.' : undefined}>
              <input type="date" className={inputCls} value={String(d.cancelDate ?? '')} onChange={(e) => set('cancelDate', e.target.value)} />
            </Field>
            {sel('reason', 'Reason', CANCEL)}
            {d.reason === 'Other' && <Field label="Note" error={err('cancelOther')}><input className={inputCls} value={String(d.note ?? '')} onChange={(e) => set('note', e.target.value)} /></Field>}
            {d.reason === 'Replaced with another carrier' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="New carrier (optional)"><input className={inputCls} value={String(d.newCarrier ?? '')} onChange={(e) => set('newCarrier', e.target.value)} /></Field>
                <Field label="New expiration date (optional)" hint="Both filled saves an X-date."><input type="date" className={inputCls} value={String(d.newExpiration ?? '')} onChange={(e) => set('newExpiration', e.target.value)} /></Field>
              </div>
            )}
            {sel('signed', 'Signed cancellation request received?', ['No', 'Yes'], { error: err('cancelSigned') })}
            {d.reason !== 'Rewrite at this agency' && check('retention', 'Ask the Producer to try to keep this policy')}
            {!!policy?.interests?.length && <Callout tone="warning">This policy has {policy.interests.length} additional interest{policy.interests.length === 1 ? '' : 's'} ({policy.interests.map((x) => x.name).join(', ')}). The carrier notifies them; confirm payoff or replacement coverage.</Callout>}
            <p className="text-sm text-muted">The term’s status changes when the AMS syncs the cancellation.</p>
          </>
        )}

        <Field label="Subject" hint={`Defaults to “${defaultSubject}”`}><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Description" error={err('description')} hint={type === 'Billing question' ? 'Don’t record card or bank account numbers here. Fortify doesn’t take payments.' : undefined}>
          <textarea className={`${inputCls} h-24 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the client asked for, VINs, names, dates." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Requested via"><select className={inputCls} value={via} onChange={(e) => setVia(e.target.value)}>{VIA.map((v) => <option key={v}>{v}</option>)}</select></Field>
          <Field label="Priority"><select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as 'Normal' | 'High')}><option>Normal</option><option>High</option></select></Field>
        </div>
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <select className={inputCls} value={owner || request!.ownerId} onChange={(e) => setOwner(e.target.value)}>
                {managers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Due" error={err('dueReason')}>
              <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            {due && due !== request!.dueAt?.slice(0, 10) && <div className="col-span-2"><Field label="Reason for the new due date" error={err('dueReason')}><input className={inputCls} value={dueReason} onChange={(e) => setDueReason(e.target.value)} placeholder="Account asked for Friday" /></Field></div>}
          </div>
        )}
        <div>
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => { setFiles([...files, ...[...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size }))]); e.target.value = '' }} />
          <Button size="sm" onClick={() => fileInput.current?.click()}><Paperclip aria-hidden className="size-4" strokeWidth={1.75} /> Attach files</Button>
          {files.length > 0 && <ul className="mt-2 text-sm text-label">{files.map((f, i) => <li key={i} className="flex justify-between"><span className="truncate">{f.name}</span><button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-link hover:underline">Remove</button></li>)}</ul>}
        </div>
      </div>
    </Sheet>
  )
}
