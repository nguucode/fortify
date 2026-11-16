import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { dataStore } from '@/app/store'
import { useApp } from '@/app/store'
import { dateOf, offsetOfDate, useLookups, useMutate } from '@/app/hooks'
import { resolveOffset } from '@/mock/dates'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import type { Task, TaskType } from '@/domain/types'
import { Confirm, Field, inputCls, Sheet, SheetCancel } from '@/components/patterns'
import { Button, cx, Tip } from '@/components/ui/primitives'

const TYPES: TaskType[] = ['General', 'Call', 'Email', 'Meeting']
const iso = (offset: number) => {
  const d = resolveOffset(offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromIso = (v: string) => offsetOfDate(new Date(`${v}T12:00:00`))

export const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * US-WRK-006: complete now, log the Activity only when the 5-second Undo window closes,
 * so undoing never has to remove an Activity.
 */
export function useCompleteTask() {
  const { user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  return async (t: Task, opts: { note?: string; outcome?: string } = {}) => {
    await mutate((s) => s.completeTask(t.id, user.id, { ...opts, log: false }))
    toast('Task completed', 'success', {
      duration: 5000,
      action: { label: 'Undo', onClick: () => dataStore().reopenTask(t.id) },
      onExpire: () => dataStore().logTaskCompletion(t.id, user.id),
    })
  }
}

const SOURCE_LINK: Partial<Record<Task['source'], (t: Task) => [string, string] | null>> = {
  'X-date': (t) => [`/accounts/${t.accountId}`, 'Open X-date'],
  Renewal: (t) => (t.linked?.kind === 'renewal' ? [`/renewals/${t.linked.id}`, 'Open renewal'] : [`/accounts/${t.accountId}?tab=renewals`, 'Open renewal']),
  Claim: (t) => [`/accounts/${t.accountId}?tab=service`, 'Open claim'],
  'Service Request': (t) => (t.linked?.kind === 'service' ? [`/service/${t.linked.id}`, 'Open service request'] : null),
}

/** US-WRK-005: create or edit a Task. Done/Canceled Tasks open read-only; system Tasks keep title and source. */
export function TaskSheet({ onClose, accountId: lockedAccount, task, prefill, linked, defaultAssignee, presets, presetTitle, onSaved }: { presetTitle?: string; onSaved?: (id: string) => void; onClose: () => void; accountId?: string; task?: Task; prefill?: { dueOffset: number; dueTime: string; durationMin: number }; linked?: Task['linked']; defaultAssignee?: string; presets?: [string, number][] }) {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const mutate = useMutate()
  const readOnly = !!task && task.status !== 'Open'
  const system = !!task && task.source !== 'Manual'
  const [accountId, setAccountId] = useState(task?.accountId ?? lockedAccount ?? '')
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState(task?.title ?? presetTitle ?? '')
  const [type, setType] = useState<TaskType>(task?.type ?? (prefill ? 'Meeting' : 'General'))
  const [due, setDue] = useState(iso(task?.dueOffset ?? prefill?.dueOffset ?? 1))
  const [time, setTime] = useState(task?.dueTime ?? prefill?.dueTime ?? '')
  const [duration, setDuration] = useState(String(task?.durationMin ?? prefill?.durationMin ?? 30))
  const [contactIds, setContactIds] = useState<string[]>(task?.contactIds ?? [])
  const [location, setLocation] = useState(task?.location ?? '')
  const [completing, setCompleting] = useState(false)
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState('Connected')
  const [canceling, setCanceling] = useState(false)
  const [cancelReason, setCancelReason] = useState('No longer needed')
  const [cancelOther, setCancelOther] = useState('')
  const complete = useCompleteTask()
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? defaultAssignee ?? user.id)
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'Normal')
  const [description, setDescription] = useState(task?.description ?? '')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const acc = accountId ? account(accountId) : undefined
  const matches = useMemo(() => {
    const t = query.trim().toLowerCase()
    return t.length < 2 ? [] : visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active' && a.name.toLowerCase().includes(t)).slice(0, 8)
  }, [query, user, data.accounts])
  // roles.md scope: only people who can see the Account are offered.
  const assignees = acc ? data.users.filter((u) => u.role !== 'admin' && canSeeAccount(u, acc)) : []
  const dueOffset = due ? fromIso(due) : 0
  const accountContacts = acc ? data.contacts.filter((c) => c.accountIds.includes(acc.id)) : []
  const primary = accountContacts.find((c) => c.id === acc?.primaryContactId)
  // US-WRK-008: timed Tasks of the assignee on the same day that overlap this slot.
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const overlap =
    time &&
    data.tasks.find((t) => t.id !== task?.id && t.assigneeId === assigneeId && t.status === 'Open' && t.dueOffset === dueOffset && t.dueTime && mins(t.dueTime) < mins(time) + (type === 'Meeting' ? Number(duration) : 30) && mins(time) < mins(t.dueTime) + (t.durationMin ?? 30))
  const sourceLink = task ? SOURCE_LINK[task.source]?.(task) : null
  const errors = {
    title: !title.trim() && !(type === 'Meeting' && primary) ? 'Add a title.' : '',
    account: !accountId ? 'Choose an Account.' : '',
    due: !due ? 'Choose a due date.' : '',
    time: type === 'Meeting' && !time ? 'Meetings need a time.' : '',
  }
  const valid = Object.values(errors).every((e) => !e)
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '') || undefined

  const save = async () => {
    setTouched(true)
    if (!valid || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const tid = await mutate(
        (s) => s.saveTask(task?.id ?? null, { accountId, title: title.trim() || (type === 'Meeting' && primary ? `Meeting with ${primary.name}` : title), type, priority, assigneeId, dueOffset, dueTime: time || null, durationMin: type === 'Meeting' ? Number(duration) || 30 : null, description: description.trim() || null, linked: task?.linked ?? linked ?? null, contactIds: type === 'Meeting' ? contactIds : [], location: type === 'Meeting' ? location.trim() || null : null }, user.id),
        task ? 'Task saved' : assigneeId === user.id ? 'Task created' : `Task assigned to ${userName(assigneeId)}`,
      )
      if (tid) onSaved?.(tid)
      onClose()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={readOnly ? `Task · ${task!.status}` : task ? 'Edit task' : 'New task'}
      busy={busy}
      footer={
        readOnly ? (
          <SheetCancel>Close</SheetCancel>
        ) : (
          <>
            {task && (
              <span className="mr-auto flex gap-2">
                <Button onClick={() => setCompleting(true)}>Complete</Button>
                <Button onClick={() => setCanceling(true)}>Cancel task</Button>
              </span>
            )}
            <SheetCancel disabled={busy}>{task ? 'Close' : 'Cancel'}</SheetCancel>
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}</Button>
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        {failed && <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-base text-ink shadow-ring">We couldn't save this task. Try again.</p>}
        {readOnly && task?.closeNote && <p className="rounded-md bg-recessed px-3 py-2 text-base text-ink">{task.status === 'Done' ? 'Completion note' : 'Cancel reason'}: {task.closeNote}</p>}
        <Field label="Title" error={err('title')} hint={system ? `Created by ${task!.source}; the title stays as the system wrote it.` : undefined}>
          <input autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} readOnly={system} maxLength={140} placeholder={type === 'Meeting' && primary ? `Meeting with ${primary.name}` : undefined} className={cx(inputCls, system && 'bg-recessed')} />
        </Field>
        {sourceLink && <Link to={sourceLink[0]} onClick={onClose} className="-mt-2 text-sm text-link underline">{sourceLink[1]}</Link>}
        {lockedAccount || task ? (
          <Field label="Account">
            <Tip label={acc?.name}>
              <p className="truncate rounded-md bg-recessed px-2.5 py-2 text-base text-ink">{acc?.name}</p>
            </Tip>
          </Field>
        ) : acc ? (
          <Field label="Account">
            <span className="flex items-center justify-between gap-2 rounded-md bg-recessed px-2.5 py-2">
              <span className="truncate text-base text-ink">{acc.name}</span>
              <button type="button" onClick={() => setAccountId('')} className="text-sm text-link hover:underline">Change</button>
            </span>
          </Field>
        ) : (
          <Field label="Account" error={err('account')}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Accounts" className={inputCls} />
            {query.trim().length >= 2 && (
              <ul className="mt-1 overflow-hidden rounded-md shadow-ring">
                {matches.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => { setAccountId(a.id); setQuery(''); if (!canSeeAccount(data.users.find((u) => u.id === assigneeId)!, a)) setAssigneeId(user.id) }} className="w-full truncate px-2.5 py-2 text-left text-base hover:bg-recessed">
                      {a.name}
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="px-2.5 py-2 text-base text-muted">No accounts in your access match.</li>}
              </ul>
            )}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className={inputCls}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])} className={inputCls}>
              <option>Normal</option>
              <option>High</option>
            </select>
          </Field>
          <Field label="Due date" error={err('due')} hint={due && dueOffset < 0 ? 'This due date is in the past. The task will show as overdue.' : undefined}>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
            {presets && (
              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {presets.map(([label, off]) => <button key={label} type="button" onClick={() => setDue(iso(off))} className="min-h-6 text-sm text-link hover:underline">{label} ({dateOf(off)})</button>)}
              </span>
            )}
          </Field>
          <Field label={type === 'Meeting' ? 'Time' : 'Time (optional)'} error={err('time')}>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </Field>
          {type === 'Meeting' && (
            <Field label="Duration">
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls}>
                {['15', '30', '45', '60', '90'].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </Field>
          )}
          <div className={type === 'Meeting' ? '' : 'col-span-2'}>
            <Field label="Assignee">
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!acc} className={inputCls}>
                {!assignees.some((u) => u.id === assigneeId) && <option value={assigneeId}>{userName(assigneeId)}</option>}
                {assignees.map((u) => <option key={u.id} value={u.id}>{u.name}{u.id === user.id ? ' (me)' : ''}</option>)}
              </select>
            </Field>
          </div>
        </div>
        {type === 'Meeting' && (
          <>
            <Field label="Contacts">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {accountContacts.length === 0 && <span className="text-sm text-muted">{acc ? 'No contacts on this account.' : 'Choose an Account first.'}</span>}
                {accountContacts.map((c) => (
                  <label key={c.id} className="inline-flex min-h-6 items-center gap-1.5 text-base text-ink">
                    <input type="checkbox" checked={contactIds.includes(c.id)} onChange={(e) => setContactIds(e.target.checked ? [...contactIds, c.id] : contactIds.filter((x) => x !== c.id))} className="size-4 accent-primary" />
                    {c.name}
                  </label>
                ))}
              </span>
            </Field>
            <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Agency office, Houston" className={inputCls} /></Field>
          </>
        )}
        {overlap && (
          <p className="flex items-center gap-2 rounded-md bg-warning-tint px-3 py-2 text-sm text-ink shadow-ring">
            <AlertTriangle aria-hidden className="size-4 text-warning-text" /> This overlaps {overlap.title} at {fmtTime(overlap.dueTime!)}.
          </p>
        )}
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} className={cx(inputCls, 'h-24 py-2')} />
        </Field>
        {task && <p className="text-sm text-muted">Source: {task.source} · Due {dateOf(task.dueOffset)}</p>}
      </fieldset>
      {task && (
        <>
          <Confirm
            open={completing}
            onOpenChange={setCompleting}
            title={`Complete “${task.title}”`}
            body={task.type === 'General' ? 'A system note is added to the account.' : `A ${task.type.toLowerCase()} is logged on the account.`}
            confirmLabel="Complete"
            onConfirm={async () => {
              await complete(task, { note: note.trim() || undefined, outcome: task.type === 'Call' ? outcome : undefined })
              onClose()
            }}
          >
            {task.type === 'Call' && (
              <Field label="Outcome">
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputCls}>
                  <option>Connected</option>
                  <option>Left voicemail</option>
                  <option>No answer</option>
                </select>
              </Field>
            )}
            {task.type !== 'General' && <Field label="Outcome note (optional)"><textarea value={note} onChange={(e) => setNote(e.target.value)} className={cx(inputCls, 'h-20 py-2')} /></Field>}
          </Confirm>
          <Confirm
            open={canceling}
            onOpenChange={setCanceling}
            title="Cancel this task?"
            body="Canceled tasks stay on the account’s history; nothing is deleted."
            confirmLabel="Cancel task"
            onConfirm={async () => {
              if (cancelReason === 'Other' && !cancelOther.trim()) throw new Error('Add a reason.')
              await mutate((s) => s.cancelTask(task.id, cancelReason === 'Other' ? cancelOther.trim() : cancelReason, user.id), 'Task canceled')
              onClose()
            }}
          >
            <Field label="Reason">
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={inputCls}>
                {['No longer needed', 'Duplicate', 'Handled elsewhere', 'Other'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            {cancelReason === 'Other' && <Field label="Describe the reason"><input value={cancelOther} onChange={(e) => setCancelOther(e.target.value)} className={inputCls} /></Field>}
          </Confirm>
        </>
      )}
    </Sheet>
  )
}
