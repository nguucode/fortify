import { useMemo, useState } from 'react'
import { useApp } from '@/app/store'
import { dateOf, offsetOfDate, useLookups, useMutate } from '@/app/hooks'
import { resolveOffset } from '@/mock/dates'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import type { Task, TaskType } from '@/domain/types'
import { Field, inputCls, Sheet, SheetCancel } from '@/components/patterns'
import { Button, cx, Tip } from '@/components/ui/primitives'

const TYPES: TaskType[] = ['General', 'Call', 'Email', 'Meeting']
const iso = (offset: number) => {
  const d = resolveOffset(offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromIso = (v: string) => offsetOfDate(new Date(`${v}T12:00:00`))

/** US-WRK-005: create or edit a Task. Done/Canceled Tasks open read-only; system Tasks keep title and source. */
export function TaskSheet({ onClose, accountId: lockedAccount, task }: { onClose: () => void; accountId?: string; task?: Task }) {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const mutate = useMutate()
  const readOnly = !!task && task.status !== 'Open'
  const system = !!task && task.source !== 'Manual'
  const [accountId, setAccountId] = useState(task?.accountId ?? lockedAccount ?? '')
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState(task?.title ?? '')
  const [type, setType] = useState<TaskType>(task?.type ?? 'General')
  const [due, setDue] = useState(iso(task?.dueOffset ?? 1))
  const [time, setTime] = useState(task?.dueTime ?? '')
  const [duration, setDuration] = useState(String(task?.durationMin ?? 30))
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? user.id)
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
  const errors = {
    title: !title.trim() ? 'Add a title.' : '',
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
      await mutate(
        (s) => s.saveTask(task?.id ?? null, { accountId, title, type, priority, assigneeId, dueOffset, dueTime: time || null, durationMin: type === 'Meeting' ? Number(duration) || 30 : null, description: description.trim() || null, linked: task?.linked ?? null }, user.id),
        task ? 'Task saved' : assigneeId === user.id ? 'Task created' : `Task assigned to ${userName(assigneeId)}`,
      )
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
            <SheetCancel disabled={busy} />
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}</Button>
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        {failed && <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-base text-ink shadow-ring">We couldn't save this task. Try again.</p>}
        {readOnly && task?.closeNote && <p className="rounded-md bg-recessed px-3 py-2 text-base text-ink">{task.status === 'Done' ? 'Completion note' : 'Cancel reason'}: {task.closeNote}</p>}
        <Field label="Title" error={err('title')} hint={system ? `Created by ${task!.source}; the title stays as the system wrote it.` : undefined}>
          <input autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} readOnly={system} maxLength={140} className={cx(inputCls, system && 'bg-recessed')} />
        </Field>
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
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} className={cx(inputCls, 'h-24 py-2')} />
        </Field>
        {task && <p className="text-sm text-muted">Source: {task.source} · Due {dateOf(task.dueOffset)}</p>}
      </fieldset>
    </Sheet>
  )
}
