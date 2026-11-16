import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ClipboardCheck, Plus } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, inDays, useLookups, useMutate } from '@/app/hooks'
import { canEditService, canSeeAccount, visibleAccounts } from '@/domain/access'
import { canServiceTransition } from '@/domain/rules'
import type { ServiceRequest, ServiceStatus, ServiceType } from '@/domain/types'
import { Confirm, Field, Gate, inputCls, KeyValue, PageTitle, Panel, RecordHeader, Sheet } from '@/components/patterns'
import { Button, cx } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { AccessDenied, NotFound } from './SystemPages'

const COLUMNS: ServiceStatus[] = ['New', 'In progress', 'Waiting on carrier', 'Waiting on client', 'Done']
const TYPES: ServiceType[] = ['Policy change', 'Certificate request', 'Claim report', 'ID card / evidence', 'Billing question', 'Cancellation request', 'General']
const POLICY_CHANGE_KINDS = ['Add vehicle', 'Remove vehicle', 'Add driver', 'Remove driver', 'Change address', 'Add mortgagee or lienholder', 'Change limits or deductibles']

/** US-SRV-001: board by status; Done shows the last 30 days. Scoped by role. */
export function ServicePage() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const items = data.serviceRequests.filter((r) => scoped.has(r.accountId) && (r.status !== 'Done' || r.createdOffset > -30))
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle
        title="Service"
        description="Policy changes, certificates, claim reports, and client requests."
        actions={
          <Gate allowed={user.role !== 'admin'} reason="Admins can view Service Requests only.">
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus aria-hidden className="size-4" /> New request
            </Button>
          </Gate>
        }
      />
      <div className="mt-6 grid grid-cols-5 gap-3 overflow-x-auto max-lg:min-w-[1000px]">
        {COLUMNS.map((st) => {
          const col = items.filter((r) => r.status === st).sort((a, b) => a.dueOffset - b.dueOffset)
          return (
            <section key={st} aria-label={st} className="flex min-w-0 flex-col rounded-md bg-recessed p-2">
              <h2 className="flex justify-between px-1.5 pb-2 text-sm font-semibold text-strong">
                {st}
                <span className="tabular font-normal text-muted">{col.length}</span>
              </h2>
              <ol className="flex flex-col gap-2">
                {col.slice(0, 30).map((r) => {
                  const overdue = r.status !== 'Done' && r.dueOffset < 0
                  return (
                    <li key={r.id}>
                      <button onClick={() => navigate(`/service/${r.id}`)} className="w-full rounded-md bg-surface p-2.5 text-left shadow-ring transition-shadow duration-150 hover:shadow-pop">
                        <span className="flex items-center justify-between gap-2 text-sm text-muted">
                          <span className="font-mono">{r.id}</span>
                          {r.priority === 'High' && <span className="font-medium text-danger-text">High</span>}
                        </span>
                        <span className="block truncate text-base font-medium text-strong">{r.subject}</span>
                        <span className="block truncate text-sm text-label">{account(r.accountId)?.name} · {r.type}</span>
                        <span className="mt-1 flex justify-between text-sm text-muted">
                          <span>{userName(r.ownerId)}</span>
                          {r.status !== 'Done' && <span className={cx(overdue && 'font-medium text-danger-text')}>due {inDays(r.dueOffset)}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
      {creating && <NewServiceRequestSheet onClose={() => setCreating(false)} />}
    </div>
  )
}

/** US-SRV-005 / US-SRV-006: one sheet for every entry point; Policy change gets its own fields. */
export function NewServiceRequestSheet({ onClose, accountId: presetAccount, policyId: presetPolicy, type: presetType }: { onClose: () => void; accountId?: string; policyId?: string; type?: ServiceType }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const navigate = useNavigate()
  const accounts = visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active' && data.policies.some((p) => p.accountId === a.id))
  const [accountId, setAccountId] = useState(presetAccount ?? '')
  const [policyId, setPolicyId] = useState(presetPolicy ?? '')
  const [type, setType] = useState<ServiceType>(presetType ?? 'Policy change')
  const [kind, setKind] = useState(POLICY_CHANGE_KINDS[0])
  const [effective, setEffective] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'Normal' | 'High'>('Normal')
  const [busy, setBusy] = useState(false)
  const policies = data.policies.filter((p) => p.accountId === accountId)
  const finalSubject = subject.trim() || (type === 'Policy change' ? kind : type)
  const errors = {
    account: !accountId ? 'Choose an Account.' : '',
    policy: type === 'Policy change' && !policyId ? 'A Policy change needs a Policy.' : '',
    effective: type === 'Policy change' && !effective ? 'Choose the date the change takes effect.' : '',
    description: description.trim().length < 10 ? 'Describe the request (at least 10 characters).' : '',
  }
  const valid = Object.values(errors).every((e) => !e)
  const save = async () => {
    setBusy(true)
    try {
      const id = await mutate(
        (s) => s.createServiceRequest({ accountId, policyId: policyId || null, type, subject: finalSubject, description: description.trim(), priority, details: type === 'Policy change' ? { effectiveDate: effective, changes: [{ kind }] } : {} }, user.id),
        'Service Request created',
      )
      onClose()
      navigate(`/service/${id}`)
    } finally {
      setBusy(false)
    }
  }
  const [touched, setTouched] = useState(false)
  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title="New service request"
      busy={busy}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => (valid ? save() : setTouched(true))}>{busy ? 'Creating…' : 'Create request'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Type">
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as ServiceType)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Account" error={touched ? errors.account : undefined}>
          <select className={inputCls} value={accountId} disabled={!!presetAccount} onChange={(e) => { setAccountId(e.target.value); setPolicyId('') }}>
            <option value="">Choose an Account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label={type === 'Policy change' ? 'Policy' : 'Policy (optional)'} error={touched ? errors.policy : undefined}>
          <select className={inputCls} value={policyId} disabled={!accountId || !!presetPolicy} onChange={(e) => setPolicyId(e.target.value)}>
            <option value="">{accountId ? 'Choose a Policy' : 'Choose an Account first'}</option>
            {policies.map((p) => <option key={p.id} value={p.id}>{p.line} · {p.policyNumber}</option>)}
          </select>
        </Field>
        {type === 'Policy change' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Change">
              <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
                {POLICY_CHANGE_KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Effective date" error={touched ? errors.effective : undefined}>
              <input type="date" className={inputCls} value={effective} onChange={(e) => setEffective(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Subject" hint={`Defaults to “${type === 'Policy change' ? kind : type}”`}>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Add 2024 Ford F-150" />
        </Field>
        <Field label="Description" error={touched ? errors.description : undefined}>
          <textarea className={`${inputCls} h-28 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the client asked for, VINs, names, dates." />
        </Field>
        <Field label="Priority">
          <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as 'Normal' | 'High')}>
            <option>Normal</option>
            <option>High</option>
          </select>
        </Field>
      </div>
    </Sheet>
  )
}

/** US-SRV-003 / US-SRV-004 */
export function ServiceRequestPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, userName, policy } = useLookups()
  const mutate = useMutate()
  const [doneOpen, setDoneOpen] = useState(false)
  const [resolution, setResolution] = useState('')
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
            {r.status !== 'Done' && <span className={cx(r.dueOffset < 0 && 'font-medium text-danger-text')}>Due {dateOf(r.dueOffset)}</span>}
          </>
        }
        actions={
          <Gate allowed={canEdit} reason={reason}>
            <span className="flex flex-wrap gap-2">
              {r.status === 'Done' ? (
                <Button onClick={() => move('In progress', 'Reopened')}>Reopen</Button>
              ) : (
                <>
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
          <Panel title="Request">
            <p className="text-base text-ink">{r.description}</p>
            {r.type === 'Policy change' && 'changes' in r.details && (
              <p className="mt-2 text-base text-label">
                Change: {(r.details.changes as { kind: string }[]).map((c) => c.kind).join(', ')} · effective {String(r.details.effectiveDate ?? '—')}
              </p>
            )}
            {r.resolution && <p className="mt-3 rounded-md bg-success-tint px-3 py-2 text-base text-ink">Resolution: {r.resolution}</p>}
          </Panel>
          <Panel title="Activity" actions={<LogActivityButton accountId={account.id} linked={{ kind: 'service', id: r.id }} />}>
            <ActivityTimeline linked={{ kind: 'service', id: r.id }} accountId={account.id} />
          </Panel>
        </div>
        <Panel title="Details">
          <KeyValue items={[['Priority', r.priority], ['Policy', p ? <Link className="text-link hover:underline" to={`/policies/${p.id}`}>{p.line} · {p.policyNumber}</Link> : null], ['Created', `${dateOf(r.createdOffset)} by ${userName(r.createdById)}`], ['Assigned to', userName(r.ownerId)]]} />
        </Panel>
      </div>
      <Confirm open={doneOpen} onOpenChange={setDoneOpen} title={`Close ${r.id}?`} body="Add the resolution the client will hear." confirmLabel="Mark done" onConfirm={() => mutate((s) => s.setServiceStatus(r.id, 'Done', user.id, { resolution }), 'Request closed')}>
        <Field label="Resolution" hint="e.g. Vehicle added effective 11/15/2026; new ID cards emailed">
          <textarea className={`${inputCls} h-24 py-2`} value={resolution} onChange={(e) => setResolution(e.target.value)} />
        </Field>
      </Confirm>
    </div>
  )
}

export function serviceCount(list: ServiceRequest[], accountId: string) {
  return list.filter((r) => r.accountId === accountId && r.status !== 'Done').length
}
