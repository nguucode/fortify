import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, ListChecks, Plus } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, offsetOfDate, useLookups, useMutate } from '@/app/hooks'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import { bulkSummary } from '@/app/bulk'
import { formatUSDate, resolveOffset } from '@/mock/dates'
import { useToast } from '@/components/ui/toast'
import type { Task } from '@/domain/types'
import { BulkPickDialog, Confirm, DataTable, Field, inputCls, PageTitle, ViewTabs, useView, type Column, type FilterDef } from '@/components/patterns'
import { Button, controlCls, cx, Due } from '@/components/ui/primitives'
import { dueTone } from '@/domain/urgency'
import { EmptyState } from '@/components/ui/states'
import { StatusCell } from '@/components/ui/status'
import { fmtTime, TaskSheet, useCompleteTask } from './TaskSheet'

const VIEWS = ['My open', 'Due today', 'Overdue']
const linkedLabel = (t: Task) => (t.linked ? `${t.linked.kind[0].toUpperCase()}${t.linked.kind.slice(1)} ${t.linked.id}` : null)

/** US-WRK-004 (+ WRK-006 complete): saved views, assignee scope by role, status and due filters, drawer at ?task=. */
export function TasksPage() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const complete = useCompleteTask()
  const toast = useToast()
  const [bulk, setBulk] = useState<{ kind: 'complete' | 'due' | 'assign' | 'cancel'; ids: string[] } | null>(null)
  const [params, setParams] = useSearchParams()
  const view = useView(VIEWS)
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }
  const status = (params.get('status') ?? 'Open') as Task['status']
  const dueFilter = params.get('due') ?? ''
  const from = params.get('from')
  const to = params.get('to')
  const accountFilter = params.get('account')
  // Assignee scope: Producer is fixed to self; Account Manager picks within the Office; Principal/Admin anyone.
  const assignable = user.role === 'producer' ? [user] : user.role === 'account-manager' ? data.users.filter((u) => u.officeId === user.officeId && u.role !== 'admin') : data.users.filter((u) => u.role !== 'admin')
  const assignee = user.role === 'producer' ? user.id : (params.get('assignee') ?? user.id)
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const off = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(new Date().toDateString()).getTime() - 12 * 3600_000) / 86_400_000)

  const base = useMemo(
    () =>
      data.tasks.filter(
        (t) =>
          scoped.has(t.accountId) &&
          (!accountFilter || t.accountId === accountFilter) &&
          (assignee === 'everyone' ? true : assignee === 'office' ? data.users.find((u) => u.id === t.assigneeId)?.officeId === user.officeId : t.assigneeId === assignee),
      ),
    [data.tasks, data.users, scoped, accountFilter, assignee, user.officeId],
  )
  const inView: Record<string, (t: Task) => boolean> = {
    'My open': (t) => t.status === 'Open',
    'Due today': (t) => t.status === 'Open' && t.dueOffset === 0,
    Overdue: (t) => t.status === 'Open' && t.dueOffset < 0,
  }
  const counts = Object.fromEntries(VIEWS.map((v) => [v, base.filter(inView[v]).length]))
  const rows = base
    .filter((t) => (status === 'Open' ? inView[view](t) : t.status === status))
    .filter((t) => (dueFilter === '7' ? t.dueOffset >= 0 && t.dueOffset <= 7 : dueFilter === 'range' && from && to ? t.dueOffset >= off(from) && t.dueOffset <= off(to) : true))
    .sort((a, b) => a.dueOffset - b.dueOffset || (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))
  const openId = params.get('task')
  const open = openId ? data.tasks.find((t) => t.id === openId) : undefined

  const cols: Column<Task>[] = [
    {
      key: 'done',
      label: 'Done',
      width: 64,
      render: (t) =>
        t.status === 'Open' ? (
          <input type="checkbox" aria-label={`Complete ${t.title}`} disabled={user.role === 'admin'} onChange={() => complete(t)} className="size-4 accent-primary" />
        ) : t.status === 'Done' ? (
          <CheckCircle2 aria-label="Done" className="size-4 text-success" strokeWidth={1.75} />
        ) : (
          <span className="text-sm text-muted">—</span>
        ),
      csv: (t) => t.status,
    },
    {
      key: 'title',
      label: 'Title',
      render: (t) => (
        <span className="flex min-w-0 items-baseline gap-2">
          <button onClick={() => set('task', t.id)} className={cx('truncate text-left font-medium hover:text-link hover:underline', t.status === 'Open' ? 'text-strong' : 'text-label line-through')}>{t.title}</button>
          <Link to={`/accounts/${t.accountId}?tab=activity`} className="shrink-0 truncate text-sm text-muted hover:text-link hover:underline">{account(t.accountId)?.name}</Link>
        </span>
      ),
      csv: (t) => `${t.title} (${account(t.accountId)?.name ?? ''})`,
    },
    {
      key: 'due',
      label: status === 'Open' ? 'Due' : status === 'Done' ? 'Completed' : 'Canceled',
      width: 140,
      mobile: true,
      sort: (a, b) => a.dueOffset - b.dueOffset,
      render: (t) => {
        if (t.status !== 'Open') return <span className="tabular">{t.doneOffset != null ? dateOf(t.doneOffset) : '—'}</span>
        return (
          <Due tone={dueTone(t.dueOffset, 0)}>
            {t.dueOffset < 0 ? `Overdue ${-t.dueOffset}d` : t.dueOffset === 0 ? `Today${t.dueTime ? ` ${fmtTime(t.dueTime)}` : ''}` : dateOf(t.dueOffset)}
          </Due>
        )
      },
      csv: (t) => dateOf(t.dueOffset),
    },
    { key: 'type', label: 'Type', width: 100, render: (t) => t.type },
    { key: 'linked', label: 'Linked to', width: 160, render: (t) => linkedLabel(t) ?? <span className="text-muted">—</span>, csv: (t) => linkedLabel(t) ?? '' },
    { key: 'assignee', label: 'Assignee', width: 160, render: (t) => userName(t.assigneeId) },
    { key: 'source', label: 'Source', width: 140, render: (t) => t.source },
    { key: 'priority', label: 'Priority', width: 100, render: (t) => <StatusCell status={t.priority} />, csv: (t) => t.priority },
  ]
  const filters: FilterDef[] = [
    ...(user.role !== 'producer'
      ? [{ k: 'assignee', label: 'Assignee', empty: 'Me', opts: [user.role === 'account-manager' ? ['office', 'My office'] : ['everyone', 'Everyone'], ...assignable.filter((u) => u.id !== user.id).map((u) => [u.id, u.name])] as [string, string][] }]
      : []),
    { k: 'status', label: 'Status', empty: false, opts: [['', 'Open'], ['Done', 'Done'], ['Canceled', 'Canceled']] },
    { k: 'due', label: 'Due', empty: 'Any due date', opts: [['7', 'Next 7 days'], ['range', 'Custom range…']] },
    ...(accountFilter ? [{ k: 'account', label: 'Account', opts: [[accountFilter, account(accountFilter)?.name ?? accountFilter]] as [string, string][] }] : []),
  ]

  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Tasks" description="Calls, emails, meetings, and follow-ups. Due dates drive Today and the calendar." />
      {status === 'Open' && <ViewTabs views={VIEWS} counts={counts} />}
      <DataTable
        className="mt-4"
        toolbar={
          dueFilter === 'range' && (
            <>
              <input type="date" aria-label="From" value={from ?? ''} onChange={(e) => set('from', e.target.value || null)} className={controlCls()} />
              <input type="date" aria-label="To" value={to ?? ''} onChange={(e) => set('to', e.target.value || null)} className={controlCls()} />
            </>
          )
        }
        search={{ label: 'Search tasks', placeholder: 'Search title or Account', match: (t, q) => t.title.toLowerCase().includes(q) || (account(t.accountId)?.name ?? '').toLowerCase().includes(q) }}
        filters={filters}
        actions={user.role !== 'admin' && <Button variant="primary" onClick={() => set('task', 'new')}><Plus aria-hidden className="size-4" strokeWidth={1.75} /> New task</Button>}
        meta={<>Showing {rows.length} tasks</>}
        rows={rows}
        columns={cols}
        minWidth={1100}
        pageSize={50}
        listId="tasks"
        exportName="tasks"
        bulkActions={status === 'Open' && user.role !== 'admin' ? (['complete', 'due', 'assign', 'cancel'] as const).map((k) => ({ label: { complete: 'Complete', due: 'Change due date', assign: 'Reassign', cancel: 'Cancel' }[k], run: (ids: string[]) => setBulk({ kind: k, ids }) })) : undefined}
        empty={
          <EmptyState
            icon={ListChecks}
            title={view === 'Due today' ? 'Nothing due today' : view === 'Overdue' ? 'Nothing overdue' : 'No open tasks'}
            body={view === 'Due today' ? 'Tasks due today show up here. Check Overdue or the next 7 days.' : 'New tasks you create or are assigned show up here.'}
          />
        }
      />
      {bulk && <BulkTasks bulk={bulk} onClose={() => setBulk(null)} onDone={(msg) => toast(msg, 'success')} />}
      {(open || openId === 'new') && <TaskSheet task={open} accountId={accountFilter ?? undefined} onClose={() => set('task', null)} />}
    </div>
  )
}

/** US-WRK-010 */
function BulkTasks({ bulk, onClose, onDone }: { bulk: { kind: 'complete' | 'due' | 'assign' | 'cancel'; ids: string[] }; onClose: () => void; onDone: (msg: string) => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const n = bulk.ids.length
  const tasks = data.tasks.filter((t) => bulk.ids.includes(t.id))
  if (bulk.kind === 'complete')
    return <Confirm open onOpenChange={(o) => !o && onClose()} title={`Complete ${n} task${n === 1 ? '' : 's'}?`} body="Each completes without outcome notes and logs its Activity." confirmLabel="Complete" onConfirm={async () => { const r = await mutate((s) => s.bulk(bulk.ids, (id) => s.completeTask(id, user.id))); onDone(bulkSummary(r, 'completed')); onClose() }} />
  if (bulk.kind === 'due') return <BulkDue ids={bulk.ids} onClose={onClose} onDone={onDone} />
  if (bulk.kind === 'assign') {
    const accounts = [...new Set(tasks.map((t) => t.accountId))].map((id) => data.accounts.find((a) => a.id === id)!).filter(Boolean)
    const who = data.users.filter((u) => u.status !== 'Deactivated' && u.status !== 'Invited' && u.role !== 'admin' && accounts.every((a) => canSeeAccount(u, a)))
    return <BulkPickDialog title={`Reassign ${n} tasks`} label="Assignee" options={who.map((u) => [u.id, u.name])} empty={`No one can see all ${accounts.length} accounts. Narrow your selection.`} confirmLabel="Reassign" onClose={onClose} onConfirm={async (to) => { const r = await mutate((s) => s.bulk(bulk.ids, (id) => { const t = s.getState().tasks.find((x) => x.id === id)!; s.saveTask(id, { accountId: t.accountId, title: t.title, type: t.type, priority: t.priority, assigneeId: to, dueOffset: t.dueOffset, linked: t.linked, dueTime: t.dueTime ?? null, durationMin: t.durationMin ?? null, description: t.description ?? null }, user.id) })); onDone(bulkSummary(r, 'reassigned')) }} />
  }
  return <BulkPickDialog title={`Cancel ${n} tasks`} label="Reason" options={[['No longer needed', 'No longer needed'], ['Duplicate', 'Duplicate'], ['Handled elsewhere', 'Handled elsewhere']]} confirmLabel="Cancel tasks" onClose={onClose} onConfirm={async (reason) => { const r = await mutate((s) => s.bulk(bulk.ids, (id) => s.cancelTask(id, reason, user.id))); onDone(bulkSummary(r, 'canceled')) }} />
}

function BulkDue({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (msg: string) => void }) {
  const { user } = useApp()
  const mutate = useMutate()
  const d = new Date()
  const mon = (8 - d.getDay()) % 7 || 7
  const [choice, setChoice] = useState('1')
  const [date, setDate] = useState('')
  const due = choice === 'custom' ? (date ? offsetOfDate(new Date(`${date}T12:00:00`)) : null) : Number(choice)
  return (
    <Confirm open onOpenChange={(o) => !o && onClose()} title={`Change due date for ${ids.length} tasks`} body="" confirmLabel="Move tasks" onConfirm={async () => {
      if (due == null) return
      const r = await mutate((s) => s.bulk(ids, (id) => { const t = s.getState().tasks.find((x) => x.id === id)!; s.saveTask(id, { accountId: t.accountId, title: t.title, type: t.type, priority: t.priority, assigneeId: t.assigneeId, dueOffset: due, linked: t.linked, dueTime: t.dueTime ?? null, durationMin: t.durationMin ?? null, description: t.description ?? null }, user.id) }))
      onDone(r.skipped.length ? bulkSummary(r, 'moved') : `Moved ${r.updated} tasks to ${formatUSDate(resolveOffset(due))}`)
      onClose()
    }}>
      <div className="flex flex-col gap-3">
        <Field label="New due date"><select className={inputCls} value={choice} onChange={(e) => setChoice(e.target.value)}><option value="1">Tomorrow</option><option value={String(mon)}>Next Monday</option><option value="7">+7 days</option><option value="custom">Pick a date…</option></select></Field>
        {choice === 'custom' && <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
      </div>
    </Confirm>
  )
}
