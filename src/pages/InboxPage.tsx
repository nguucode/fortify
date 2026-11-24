import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import * as Popover from '@radix-ui/react-popover'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { AlertTriangle, AtSign, Check, ChevronDown, CircleCheck, CircleSlash, FileText, Image, Inbox, Mail, MessageSquare, Paperclip, Phone, Plus, X } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, useMutate } from '@/app/hooks'
import { mergeValues } from '@/app/merge'
import { canSeeAccount } from '@/domain/access'
import { smsSegments } from '@/domain/templates'
import { outsideTextingWindow } from '@/domain/sms'
import type { CallOutcome, Channel, Conversation, Dataset, Message, User } from '@/domain/types'
import { Confirm, Field, inputCls, Sheet, SheetCancel } from '@/components/patterns'
import { Avatar, Button, Callout, CountPill, cx, SearchField, Select, Tip } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { LeadSheet } from './LeadSheets'
import { ServiceRequestSheet } from './ServiceRequestSheet'
import { TaskSheet } from './TaskSheet'

type Tab = 'all' | Channel | 'mentions'
type Scope = 'me' | 'book' | 'office' | 'unmatched' | 'all'
const TABS: [Tab, string][] = [['all', 'All'], ['email', 'Email'], ['sms', 'SMS'], ['call', 'Calls'], ['mentions', 'Mentions']]
const SCOPE_LABEL: Record<Scope, string> = { me: 'Assigned to me', book: 'My Book', office: 'My Office', unmatched: 'Unmatched', all: 'All' }
const ICON: Record<Channel, typeof Mail> = { email: Mail, sms: MessageSquare, call: Phone }
const PAGE = 50
const drafts = new Map<string, Draft>()
type Draft = { to: string[]; cc: string[]; subject: string; body: string; attachments: string[] }

function scopesFor(u: User): Scope[] {
  if (u.role === 'producer') return ['me', 'book']
  if (u.role === 'account-manager') return ['me', 'office', 'unmatched']
  return ['me', 'office', 'unmatched', 'all']
}
/** US-INB-001: who may open a conversation. Unmatched ones belong to their Office (Producers: only their own). */
function canSee(u: User, c: Conversation, data: Dataset) {
  if (c.accountId) {
    const a = data.accounts.find((x) => x.id === c.accountId)
    return !!a && canSeeAccount(u, a)
  }
  if (u.role === 'producer') return c.assigneeId === u.id
  return u.role === 'principal' || u.role === 'admin' || c.officeId === u.officeId
}
export function timeLabel(iso: string, now = new Date()) {
  const d = new Date(iso)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86_400_000)
  if (diff === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}
const kb = (n: number | null) => (n == null ? null : n >= 1024 ? `${(n / 1024).toFixed(1)} MB` : `${n} KB`)
const snippetOf = (m?: Message) => (!m ? '' : m.attachments?.length && /^\[image\]$/.test(m.body) ? 'Image · 1 attachment' : m.body)
const dur = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`

/** US-INB-001 */
export function InboxPage() {
  const { data, user, officeFilter } = useApp()
  const [params, setParams] = useSearchParams()
  const mutate = useMutate()
  const toast = useToast()
  const tab = (params.get('tab') as Tab) ?? 'all'
  const scope = (params.get('scope') as Scope) ?? 'me'
  const status = (params.get('status') as Conversation['status']) ?? 'Open'
  const q = params.get('q') ?? ''
  const selectedId = params.get('c')
  const [limit, setLimit] = useState(PAGE)
  const [checked, setChecked] = useState<string[]>([])
  const [logCall, setLogCall] = useState(false)
  const [newEmail, setNewEmail] = useState(false)
  const setP = (patch: Record<string, string | null>, replace = true) => {
    const n = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) if (v) n.set(k, v); else n.delete(k)
    setParams(n, { replace })
  }
  useEffect(() => setLimit(PAGE), [tab, scope, status, q])
  useEffect(() => setChecked([]), [tab, scope, status, user.id])

  const all = data.conversations ?? []
  const msgs = data.messages ?? []
  const visible = useMemo(() => all.filter((c) => canSee(user, c, data) && (!officeFilter || c.officeId === officeFilter)), [all, user, data, officeFilter])
  const acc = useMemo(() => new Map(data.accounts.map((a) => [a.id, a])), [data.accounts])
  const contacts = useMemo(() => new Map(data.contacts.map((c) => [c.id, c])), [data.contacts])
  const inScope = useMemo(() => visible.filter((c) => (scope === 'me' ? c.assigneeId === user.id : scope === 'book' ? acc.get(c.accountId ?? '')?.producerId === user.id : scope === 'office' ? c.officeId === user.officeId : scope === 'unmatched' ? !c.accountId : true)), [visible, scope, user, acc])
  const byStatus = inScope.filter((c) => c.status === status)
  const hay = useMemo(() => {
    const m = new Map<string, string>()
    for (const x of msgs) m.set(x.conversationId, `${m.get(x.conversationId) ?? ''} ${x.body}`)
    return m
  }, [msgs])
  const ql = q.trim().toLowerCase()
  const name = (c: Conversation) => (c.contactId ? contacts.get(c.contactId)?.name : undefined) ?? c.address
  const matches = (c: Conversation) => !ql || [name(c), c.address, contacts.get(c.contactId ?? '')?.email, c.subject, hay.get(c.id)].some((s) => s?.toLowerCase().includes(ql))
  const rows = byStatus.filter((c) => (tab === 'all' || c.channel === tab) && matches(c)).sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  const unread = (ch: Tab) => byStatus.filter((c) => (ch === 'all' || c.channel === ch) && c.unreadBy.includes(user.id)).length
  const mentions = data.activities.filter((a) => a.mentions?.includes(user.id))
  const mentionUnread = mentions.filter((a) => !a.mentionReadBy?.includes(user.id)).length
  const shown = rows.slice(0, limit)
  const selected = selectedId ? all.find((c) => c.id === selectedId) : undefined

  // J / K move through the list; inactive while typing.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey || tab === 'mentions') return
      if (e.key !== 'j' && e.key !== 'k') return
      const i = shown.findIndex((c) => c.id === selectedId)
      const next = shown[e.key === 'j' ? Math.min(shown.length - 1, i + 1) : Math.max(0, i - 1)]
      if (next) setP({ c: next.id }, false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const markDone = async (ids: string[]) => {
    await mutate((s) => s.setConversationStatus(ids, 'Done'))
    setChecked([])
    toast(ids.length === 1 ? 'Marked done' : `${ids.length} marked done`, 'success', { action: { label: 'Undo', onClick: () => mutate((s) => s.setConversationStatus(ids, 'Open')) }, duration: 5000 })
  }

  return (
    <div className="flex h-full min-h-0 max-md:flex-col">
      <h1 className="sr-only">Inbox</h1>
      <section aria-label="Conversations" className={cx('flex w-[400px] shrink-0 flex-col border-r border-line max-md:w-full', selectedId && 'max-md:hidden')}>
        <div role="tablist" aria-label="Channel" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line px-3 pt-3">
          {TABS.map(([k, l]) => {
            const n = k === 'mentions' ? mentionUnread : unread(k)
            return (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setP({ tab: k === 'all' ? null : k, c: null })} className={cx('-mb-px flex items-center gap-2 border-b-2 px-2.5 py-2 text-base whitespace-nowrap', tab === k ? 'border-primary font-medium text-link' : 'border-transparent text-label hover:text-strong')}>
                {l}
                {n > 0 && <CountPill n={n} max={99} alert />}
              </button>
            )
          })}
        </div>
        {tab === 'mentions' ? (
          <MentionsList />
        ) : (
          <>
            {checked.length > 0 ? (
              <BulkBar ids={checked} onClear={() => setChecked([])} onDone={() => markDone(checked)} />
            ) : (
              <div className="flex flex-col gap-2 border-b border-line px-3 py-2.5">
                <SearchField label="Search messages" placeholder="Search messages" value={q} onChange={(v) => setP({ q: v || null })} className="w-full!" />
                <div className="flex items-center gap-2">
                  <PickMenu label={SCOPE_LABEL[scope]} items={scopesFor(user).map((s) => [s, SCOPE_LABEL[s]])} value={scope} onPick={(v) => setP({ scope: v === 'me' ? null : v, c: null })} />
                  <PickMenu label={status} items={[['Open', 'Open'], ['Done', 'Done']]} value={status} onPick={(v) => setP({ status: v === 'Open' ? null : v, c: null })} />
                  <Button className="ml-auto" onClick={() => setLogCall(true)}><Phone aria-hidden className="size-4" strokeWidth={1.75} />Log a call</Button>
                </div>
              </div>
            )}
            <p className="tabular px-3 pt-2 pb-1 text-sm text-muted">Showing {shown.length} of {rows.length} conversation{rows.length === 1 ? '' : 's'}</p>
            <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversation list">
              {shown.map((c) => (
                <ConversationRow key={c.id} c={c} name={name(c)} account={acc.get(c.accountId ?? '')?.name} snippet={c.subject && c.channel === 'email' ? c.subject : snippetOf(msgs.filter((m) => m.conversationId === c.id && m.kind !== 'system').at(-1)) || c.subject || ''} selected={c.id === selectedId} unread={c.unreadBy.includes(user.id)} arrivedAt={(() => { const m = msgs.filter((x) => x.conversationId === c.id && x.kind === 'in').at(-1); return m?.arrived ? m.at : null })()} checked={checked.includes(c.id)} onCheck={(v) => setChecked((x) => (v ? [...x, c.id] : x.filter((i) => i !== c.id)))} onOpen={() => setP({ c: c.id }, false)} />
              ))}
              {rows.length === 0 && (
                <li className="px-4 py-10 text-base text-label">
                  {ql ? (
                    <>No conversations match “{q}”. <button className="text-link underline" onClick={() => setP({ q: null })}>Clear search</button></>
                  ) : scope === 'unmatched' ? (
                    'Every conversation is linked to an Account.'
                  ) : tab === 'call' ? (
                    <span className="flex flex-col items-start gap-2">No calls logged yet.<Button size="sm" onClick={() => setLogCall(true)}>Log a call</Button></span>
                  ) : (
                    <>No {status === 'Open' ? 'open ' : 'done '}conversations {scope === 'me' ? 'assigned to you' : 'here'}.{status === 'Open' && <> <button className="text-link underline" onClick={() => setP({ status: 'Done' })}>Show Done</button></>}</>
                  )}
                </li>
              )}
              {rows.length > limit && (
                <li className="p-3"><Button size="sm" className="w-full justify-center" onClick={() => setLimit((l) => l + PAGE)}>Load 50 more</Button></li>
              )}
            </ul>
          </>
        )}
      </section>
      <section aria-label="Reading pane" className={cx('flex min-w-0 flex-1 flex-col', !selectedId && 'max-md:hidden')}>
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
          {selectedId ? <button className="text-sm text-link md:hidden" onClick={() => setP({ c: null }, false)}>← Conversations</button> : <span />}
          <Button variant="primary" size="sm" className="ml-auto" onClick={() => setNewEmail(true)}><Plus aria-hidden className="size-4" strokeWidth={1.75} />New email</Button>
        </div>
        {!selectedId ? (
          <EmptyState icon={Inbox} title="Select a conversation." body="J and K move through the list." />
        ) : !selected ? (
          <EmptyState icon={Inbox} title="This conversation doesn’t exist." body="It may have been removed from the demo data." />
        ) : !canSee(user, selected, data) ? (
          <NoAccess c={selected} />
        ) : (
          <ReadingPane key={selected.id} c={selected} onDone={() => markDone([selected.id])} onLogCall={() => setLogCall(true)} />
        )}
      </section>
      {logCall && <LogCallSheet onClose={() => setLogCall(false)} preset={selected && selected.accountId ? { accountId: selected.accountId, contactId: selected.contactId } : undefined} />}
      {newEmail && <NewEmailSheet onClose={() => setNewEmail(false)} onSent={(id) => setP({ c: id, tab: null }, false)} />}
    </div>
  )
}

function PickMenu<T extends string>({ label, items, value, onPick }: { label: string; items: [T, string][]; value: T; onPick: (v: T) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button>{label}<ChevronDown aria-hidden className="size-4 text-muted" strokeWidth={1.75} /></Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={4} className={menuContent}>
          {items.map(([k, l]) => (
            <Menu.Item key={k} onSelect={() => onPick(k)} className={menuItem}>
              <Check aria-hidden className={cx('size-3.5', k === value ? 'opacity-100' : 'opacity-0')} />{l}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

function ConversationRow({ c, name, account, snippet, selected, unread, checked, onCheck, onOpen, arrivedAt }: { c: Conversation; name: string; account?: string; snippet: string; selected: boolean; unread: boolean; checked: boolean; onCheck: (v: boolean) => void; onOpen: () => void; arrivedAt?: string | null }) {
  const Icon = ICON[c.channel]
  // US-INB-011: a new arrival flashes recessed for 2 seconds.
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!arrivedAt || Date.now() - new Date(arrivedAt).getTime() > 2000) return
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 2000)
    return () => clearTimeout(t)
  }, [arrivedAt])
  return (
    <li className={cx('group relative flex h-16 items-center gap-2 border-b border-fill pr-3 pl-2 transition-colors duration-500 motion-reduce:transition-none', flash && !selected && 'bg-recessed [&_.text-muted]:text-label', selected ? 'bg-recessed shadow-[inset_2px_0_0_var(--color-primary)] [&_.text-muted]:text-label' : 'hover:bg-recessed hover:[&_.text-muted]:text-label')}>
      <input type="checkbox" aria-label={`Select conversation with ${name}`} checked={checked} onChange={(e) => onCheck(e.target.checked)} className="size-4 shrink-0 accent-[var(--color-strong)]" />
      <button onClick={onOpen} aria-current={selected ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span aria-hidden className={cx('size-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')} />
        <Icon aria-label={c.channel === 'call' ? 'Call' : c.channel === 'sms' ? 'SMS' : 'Email'} className="size-4 shrink-0 text-label" strokeWidth={1.75} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="flex items-baseline gap-2">
            <span title={name} className={cx('truncate text-base', unread ? 'font-semibold text-strong' : 'text-ink')}>{name}</span>
            {account && <span className="truncate text-sm text-muted">{account}</span>}
            <span className="tabular ml-auto shrink-0 text-sm text-muted">{timeLabel(c.lastAt)}</span>
          </span>
          <span title={snippet} className="truncate text-sm text-label">{snippet}</span>
        </span>
        {unread && <span className="sr-only">Unread</span>}
      </button>
    </li>
  )
}

function NoAccess({ c }: { c: Conversation }) {
  const { data } = useApp()
  const toast = useToast()
  const a = data.accounts.find((x) => x.id === c.accountId)
  const am = data.users.find((u) => u.id === a?.accountManagerId)
  return (
    <div className="px-6 pt-10">
      <h2 className="text-lg font-medium text-strong">You don’t have access to this conversation</h2>
      <p className="mt-1 text-base text-label">It belongs to an Account outside your scope.{am && ` Ask ${am.name}, its Account Manager, to share it.`}</p>
      <Button className="mt-3" onClick={() => toast('Access requested (demo)', 'success')}>Request access</Button>
    </div>
  )
}

/** US-INB-010 */
function BulkBar({ ids, onClear, onDone }: { ids: string[]; onClear: () => void; onDone: () => void }) {
  const { user } = useApp()
  const mutate = useMutate()
  const tooMany = ids.length > 50
  return (
    <div className="flex h-[88px] flex-col justify-center gap-1 border-b border-line bg-recessed px-3">
      <div className="flex items-center gap-2">
        <span className="tabular text-base font-medium text-strong">{ids.length} selected</span>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>Clear</Button>
      </div>
      <div className="flex items-center gap-2">
        <AssignMenu ids={ids} disabled={tooMany} />
        <Button size="sm" disabled={tooMany} onClick={onDone}>Mark done</Button>
        <Button size="sm" disabled={tooMany} onClick={() => mutate((s) => s.markConversationsUnread(ids, user.id), 'Marked unread').then(onClear)}>Mark unread</Button>
        {tooMany && <span className="text-sm text-warning-text">Select up to 50 at a time</span>}
      </div>
    </div>
  )
}

/** US-INB-010: the Account's team first, then the Office; Producers may only hand to the Account Manager or themselves. */
function AssignMenu({ ids, disabled }: { ids: string[]; disabled?: boolean }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const convs = (data.conversations ?? []).filter((c) => ids.includes(c.id))
  const first = convs[0]
  const a = data.accounts.find((x) => x.id === first?.accountId)
  const office = a?.officeId ?? first?.officeId ?? user.officeId
  const active = data.users.filter((u) => u.status !== 'Deactivated' && u.status !== 'Invited')
  const team = a ? [a.producerId, a.accountManagerId] : []
  const list = [...active.filter((u) => team.includes(u.id)), ...active.filter((u) => !team.includes(u.id) && u.officeId === office && u.role !== 'admin')]
  const allowed = (u: User) => user.role === 'principal' || user.role === 'admin' || user.role === 'account-manager' || (convs.every((c) => data.accounts.find((x) => x.id === c.accountId)?.producerId === user.id) && (u.id === user.id || team.includes(u.id) && u.role === 'account-manager'))
  const ROLE: Record<string, string> = { producer: 'Producer', 'account-manager': 'Account Manager', principal: 'Principal', admin: 'Admin' }
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size="sm" disabled={disabled}>Assign<ChevronDown aria-hidden className="size-3.5" /></Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={4} className={cx(menuContent, 'max-h-80 overflow-y-auto')}>
          {list.map((u) => {
            const ok = allowed(u)
            return (
              <Menu.Item key={u.id} disabled={!ok} title={ok ? undefined : 'Only Principals and Admins can assign outside the Account’s team.'} onSelect={() => mutate((s) => s.assignConversations(ids, u.id, user.id), `Assigned to ${u.name}`)} className={cx(menuItem, 'data-[disabled]:text-muted')}>
                <Avatar name={u.name} />
                <span className="truncate">{u.name}</span>
                <span className="ml-auto pl-3 text-sm text-muted">{ROLE[u.role]}</span>
              </Menu.Item>
            )
          })}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** US-INB-002/003/004 */
function ReadingPane({ c, onDone, onLogCall }: { c: Conversation; onDone: () => void; onLogCall: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [replying, setReplying] = useState(() => drafts.has(c.id))
  const [sheet, setSheet] = useState<'sr' | 'task' | 'lead' | null>(null)
  const msgs = (data.messages ?? []).filter((m) => m.conversationId === c.id).sort((a, b) => a.at.localeCompare(b.at))
  const account = data.accounts.find((a) => a.id === c.accountId)
  const contact = data.contacts.find((x) => x.id === c.contactId)
  const lead = data.leads.find((l) => l.id === c.leadId)
  const title = c.channel === 'email' ? (c.subject ?? '(no subject)') : (contact?.name ?? c.address)
  const firstIn = msgs.find((m) => m.kind === 'in')
  const quote = (firstIn ?? msgs[0])?.body ?? ''

  // US-INB-002: mark read after 500 ms so J/K skimming doesn't read everything.
  useEffect(() => {
    if (!c.unreadBy.includes(user.id)) return
    const t = setTimeout(() => mutate((s) => s.markConversationRead(c.id, user.id)).catch(() => {}), 500)
    return () => clearTimeout(t)
  }, [c.id, user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const participants = [...new Set(msgs.flatMap((m) => [m.fromName, ...(m.cc ?? [])]).filter((x) => x && x !== 'Fortify'))]
  const linked = !!c.accountId
  const adminSr = user.role === 'admin'
  const related = c.related.map((r) => {
    const href = r.kind === 'policy' ? `/policies/${r.id}` : r.kind === 'service' ? `/service/${r.id}` : r.kind === 'renewal' ? `/renewals/${r.id}` : r.kind === 'opportunity' ? `/pipeline/${r.id}` : `/tasks?task=${r.id}`
    const label = r.kind === 'policy' ? (data.policies.find((p) => p.id === r.id)?.policyNumber ?? r.id) : r.kind === 'task' ? `Task · ${data.tasks.find((t) => t.id === r.id)?.title ?? r.id}` : r.id
    return { href, label, key: r.id }
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-line px-6 pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-medium text-strong" title={title}>{title}</h2>
            <p className="mt-0.5 truncate text-sm text-muted">
              {participants.slice(0, 3).join(', ')}{participants.length > 3 && ` +${participants.length - 3}`}
              {account && <> · <Link to={`/accounts/${account.id}`} className="text-link underline">{account.name}</Link></>}
              {lead && <> · Lead <Link to={`/leads/${lead.id}`} className="text-link underline">{lead.name}</Link></>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {c.channel === 'email' && <Button size="sm" variant="primary" onClick={() => setReplying(true)}>Reply</Button>}
            {c.status === 'Open' ? <Button size="sm" onClick={onDone}>Mark done</Button> : <Button size="sm" onClick={() => mutate((s) => s.setConversationStatus([c.id], 'Open'), 'Reopened')}>Reopen</Button>}
            <AssignMenu ids={[c.id]} />
            <Menu.Root>
              <Menu.Trigger asChild><Button size="sm">More<ChevronDown aria-hidden className="size-3.5" /></Button></Menu.Trigger>
              <Menu.Portal>
                <Menu.Content align="end" sideOffset={4} className={menuContent}>
                  <Menu.Item className={menuItem} onSelect={() => mutate((s) => s.markConversationsUnread([c.id], user.id), 'Marked unread')}>Mark unread</Menu.Item>
                  <Menu.Item className={menuItem} disabled={!linked} title={linked ? undefined : 'Link this conversation to an Account first.'} onSelect={() => setSheet('task')}>Create Task</Menu.Item>
                  <Menu.Item className={menuItem} disabled={!linked || adminSr} title={!linked ? 'Link this conversation to an Account first.' : adminSr ? 'Admins can view Service Requests but not create them.' : undefined} onSelect={() => setSheet('sr')}>Create Service Request</Menu.Item>
                  <Menu.Item className={menuItem} onSelect={onLogCall}>Log a call</Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu.Root>
          </div>
        </div>
        {related.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Related records">
            {related.map((r) => <li key={r.key}><Link to={r.href} className="inline-flex h-6 items-center gap-1 rounded-md bg-fill px-2 font-mono text-xs text-ink hover:bg-recessed"><FileText aria-hidden className="size-3" />{r.label}</Link></li>)}
          </ul>
        )}
        {!linked && <UnmatchedBanner c={c} onLead={() => setSheet('lead')} />}
        {linked && <RelatedPicker c={c} />}
        {c.channel === 'sms' && contact && <ConsentBar contactId={contact.id} />}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {c.channel === 'email' && <EmailThread msgs={msgs} linked={c.accountId} />}
        {c.channel === 'sms' && <SmsThread msgs={msgs} />}
        {c.channel === 'call' && <CallEntry msgs={msgs} c={c} />}
        {c.channel === 'email' && replying && (
          <div className="px-6 pb-6">
            <EmailComposer c={c} initial={{ to: [firstIn?.from ?? c.address], cc: [], subject: /^re:/i.test(c.subject ?? '') ? (c.subject ?? '') : `Re: ${c.subject ?? ''}`, body: `\n\n${user.name}\nFortify Insurance`, attachments: [] }} onClose={() => setReplying(false)} />
          </div>
        )}
      </div>
      {c.channel === 'sms' && <SmsComposer c={c} />}
      {sheet === 'sr' && account && (
        <ServiceRequestSheet onClose={() => setSheet(null)} accountId={account.id} presetSubject={(c.subject ?? quote).slice(0, 60)} presetBody={`> ${(quote.length > 4000 ? `${quote.slice(0, 4000)} [trimmed]` : quote).replace(/\n/g, '\n> ')}\n\nThe carrier makes the change. Fortify tracks the request.`} onSaved={(id) => mutate((s) => s.addConversationRelated(c.id, { kind: 'service', id }, `Service Request ${id} created by ${user.name}`))} />
      )}
      {sheet === 'task' && account && <TaskSheet onClose={() => setSheet(null)} accountId={account.id} presetTitle={(c.subject ?? quote).slice(0, 60)} defaultAssignee={user.id} onSaved={(id) => mutate((s) => s.addConversationRelated(c.id, { kind: 'task', id }, `Task created by ${user.name}`))} />}
      {sheet === 'lead' && (
        <LeadSheet onClose={() => setSheet(null)} prefill={{ name: c.address.includes('@') ? '' : '', email: c.channel === 'email' ? c.address : null, phone: c.channel === 'email' ? '' : c.address, officeId: c.officeId, source: c.channel === 'email' ? 'Web form' : 'Phone', notes: quote, assigneeId: user.role === 'producer' ? user.id : null } as never} onSaved={(id) => mutate((s) => s.linkConversationLead(c.id, id), 'Conversation linked to the new Lead')} />
      )}
    </div>
  )
}

/** US-INB-007 */
function UnmatchedBanner({ c, onLead }: { c: Conversation; onLead: () => void }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const contact = data.contacts.find((x) => x.id === c.contactId)
  const lead = data.leads.find((l) => l.id === c.leadId)
  if (contact && contact.accountIds.length > 1)
    return (
      <Callout tone="warning" className="mt-3">
        <p>Which Account is this about?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {contact.accountIds.map((id) => {
            const a = data.accounts.find((x) => x.id === id)
            return a && <Button key={id} size="sm" onClick={() => mutate((s) => s.linkConversation(c.id, { accountId: id, contactId: contact.id, saveAddress: false }, user.id), `Linked to ${a.name}`)}>{a.name}</Button>
          })}
        </div>
      </Callout>
    )
  return (
    <Callout tone="warning" className="mt-3">
      <p>Unmatched: {lead ? <>matches Lead {lead.name}, not an Account</> : <>no Contact has {c.address}</>}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <LinkPicker c={c} primary />
        {!lead && <Button size="sm" onClick={onLead}>Create Lead</Button>}
        <Button size="sm" onClick={() => mutate((s) => s.setConversationStatus([c.id], 'Done', 'Not about an Account'), 'Marked done: not about an Account')}>Not about an Account</Button>
      </div>
    </Callout>
  )
}

function LinkPicker({ c, primary, label = 'Link to Account' }: { c: Conversation; primary?: boolean; label?: string }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [contactId, setContactId] = useState<string>('new')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [save, setSave] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const ql = q.trim().toLowerCase()
  const digits = ql.replace(/\D/g, '')
  const hits = ql
    ? data.accounts.filter((a) => a.lifecycle === 'active' && canSeeAccount(user, a) && (a.name.toLowerCase().includes(ql) || data.policies.some((p) => p.accountId === a.id && p.policyNumber.toLowerCase().includes(ql)) || data.contacts.some((x) => x.accountIds.includes(a.id) && (x.email.toLowerCase() === ql || (digits.length >= 7 && x.phone.replace(/\D/g, '').includes(digits)))))).slice(0, 20)
    : []
  const a = data.accounts.find((x) => x.id === accountId)
  const people = data.contacts.filter((x) => a && x.accountIds.includes(a.id))
  const office = (id: string) => data.offices.find((o) => o.id === id)?.name
  const reset = () => { setAccountId(null); setQ(''); setErr(null) }
  const confirm = () =>
    mutate((s) => s.linkConversation(c.id, { accountId: accountId!, contactId: contactId === 'new' ? null : contactId, newContact: contactId === 'new' ? { firstName: first, lastName: last } : null, saveAddress: save }, user.id), `Linked to ${a?.name}`)
      .then(() => { setOpen(false); reset() })
      .catch((e) => setErr(`Couldn't link the conversation. ${(e as Error).message}`))
  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <Popover.Trigger asChild><Button size="sm" variant={primary ? 'primary' : 'secondary'}>{label}</Button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-50 w-[480px] max-w-[calc(100vw-32px)] rounded-md bg-surface p-3 shadow-pop">
          {!a ? (
            <>
              <input autoFocus aria-label="Search Accounts" placeholder="Account name, policy number, phone, or email" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} />
              <ul className="mt-2 max-h-72 overflow-y-auto">
                {hits.map((x) => (
                  <li key={x.id}>
                    <button onClick={() => { setAccountId(x.id); const p = data.contacts.find((k) => k.accountIds.includes(x.id)); setContactId(p?.id ?? 'new') }} className="flex h-12 w-full flex-col justify-center rounded-md px-2 text-left hover:bg-recessed">
                      <span className="truncate text-base font-medium" title={x.name}>{x.name}</span>
                      <span className="truncate text-sm text-muted">{x.status} · {office(x.officeId)} · {data.users.find((u) => u.id === x.producerId)?.name}</span>
                    </button>
                  </li>
                ))}
                {ql && hits.length === 0 && <li className="px-2 py-3 text-base text-label">No Account matches “{q}”. Create a Lead instead?</li>}
              </ul>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-base">Link to <span className="font-medium">{a.name}</span> <button className="ml-1 text-sm text-link underline" onClick={() => setAccountId(null)}>Change</button></p>
              <Field label="Contact">
                <select className={inputCls} value={contactId} onChange={(e) => setContactId(e.target.value)}>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="new">Add as new Contact</option>
                </select>
              </Field>
              {contactId === 'new' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First name"><input className={inputCls} value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
                  <Field label="Last name"><input className={inputCls} value={last} onChange={(e) => setLast(e.target.value)} /></Field>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />Save {c.address} to this Contact</label>
              )}
              {err && <p role="alert" className="text-sm text-danger-text">{err}</p>}
              <div className="flex justify-end gap-2"><Button size="sm" onClick={() => setOpen(false)}>Cancel</Button><Button size="sm" variant="primary" onClick={confirm}>Confirm</Button></div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** US-INB-007: once linked, pick a related record or move to another Account. */
function RelatedPicker({ c }: { c: Conversation }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const opts: [Conversation['related'][number]['kind'], string, string][] = [
    ...data.policies.filter((p) => p.accountId === c.accountId).map((p) => ['policy', p.id, `Policy ${p.policyNumber} · ${p.line}`] as [Conversation['related'][number]['kind'], string, string]),
    ...data.opportunities.filter((o) => o.accountId === c.accountId && o.stage !== 'Won' && o.stage !== 'Lost').map((o) => ['opportunity', o.id, `Opportunity ${o.lines.join(', ')} · ${o.stage}`] as [Conversation['related'][number]['kind'], string, string]),
    ...data.renewals.filter((r) => r.accountId === c.accountId && r.status !== 'Done').map((r) => ['renewal', r.id, `Renewal ${r.id} · ${r.status}`] as [Conversation['related'][number]['kind'], string, string]),
    ...data.serviceRequests.filter((s) => s.accountId === c.accountId && s.status !== 'Done').map((s) => ['service', s.id, `${s.id} · ${s.type}`] as [Conversation['related'][number]['kind'], string, string]),
  ].filter(([, id]) => !c.related.some((r) => r.id === id))
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Select size="sm" aria-label="Add a related record" value="" onChange={(e) => { const o = opts.find(([, id]) => id === e.target.value); if (o) mutate((s) => s.addConversationRelated(c.id, { kind: o[0], id: o[1] }, `${o[2]} linked by ${user.name}`)) }} className="max-w-72">
        <option value="">Related record…</option>
        {opts.map(([, id, l]) => <option key={id} value={id}>{l}</option>)}
      </Select>
      <LinkPicker c={c} label="Change Account" />
    </div>
  )
}

/** US-INB-003 */
function ConsentBar({ contactId }: { contactId: string }) {
  const { data } = useApp()
  const c = data.contacts.find((x) => x.id === contactId)!
  const consent = c.smsConsent ?? { state: 'Unknown' as const, offset: null }
  const by = data.users.find((u) => u.id === consent.byId)?.name
  const shared = data.contacts.filter((x) => x.id !== c.id && x.phone && x.phone === c.phone)
  const [Icon, tone, text] = consent.state === 'Opted in' ? [CircleCheck, 'text-success-text', `Opted in · ${consent.source ?? 'Recorded'}${consent.offset != null ? `, ${dateOf(consent.offset)}` : ''}${by ? ` by ${by}` : ''}`] : consent.state === 'Opted out' ? [CircleSlash, 'text-danger-text', `Opted out · ${consent.source ?? 'Recorded'}${consent.offset != null ? ` on ${dateOf(consent.offset)}` : ''}`] : [AlertTriangle, 'text-warning-text', 'No SMS consent recorded']
  return (
    <p className="mt-3 flex h-9 items-center gap-2 rounded-md bg-surface px-3 text-sm shadow-ring">
      <Icon aria-hidden className={cx('size-4', tone)} strokeWidth={1.75} /><span className={tone}>{text}</span>
      {shared.length > 0 && <span className="ml-auto text-muted">Shared number · {[c.name, ...shared.map((s) => s.name)].join(', ')}</span>}
    </p>
  )
}

function Attachment({ name, sizeKb }: { name: string; sizeKb: number | null }) {
  const toast = useToast()
  return (
    <button onClick={() => toast('File preview isn’t available in the demo.', 'info')} className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-recessed">
      <Paperclip aria-hidden className="size-3.5 text-label" />
      {sizeKb === null ? <span className="text-muted">{name} · Attachment unavailable</span> : <span><span className="text-ink">{name}</span><span className="text-muted"> · {kb(sizeKb)}</span></span>}
    </button>
  )
}

function SystemLine({ m }: { m: Message }) {
  return <p className="px-6 py-2 text-center text-sm text-muted">{m.body} · {timeLabel(m.at)}</p>
}

/** US-INB-002 */
function EmailThread({ msgs, linked }: { msgs: Message[]; linked: string | null }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const collapse = msgs.length > 3 ? new Set(msgs.slice(0, -3).map((m) => m.id)) : new Set<string>()
  return (
    <ol className="divide-y divide-fill">
      {msgs.map((m) => {
        if (m.kind === 'system') return <li key={m.id}><SystemLine m={m} /></li>
        if (collapse.has(m.id) && !expanded.has(m.id))
          return (
            <li key={m.id}>
              <button onClick={() => setExpanded((x) => new Set(x).add(m.id))} className="flex w-full items-baseline gap-2 truncate px-6 py-2.5 text-left text-sm hover:bg-recessed">
                <span className="font-medium text-strong">{m.fromName}</span><span className="text-muted">· {timeLabel(m.at)} ·</span><span className="truncate text-label">{m.body.split('\n').find((l) => l.trim()) ?? ''}</span>
              </button>
            </li>
          )
        return <li key={m.id}><EmailMessage m={m} linked={linked} /></li>
      })}
    </ol>
  )
}
function EmailMessage({ m, linked }: { m: Message; linked: string | null }) {
  const [quoted, setQuoted] = useState(false)
  const lines = m.body.split('\n')
  const qi = lines.findIndex((l) => l.startsWith('>') || /^On .* wrote:$/.test(l.replace(/^> ?/, '')))
  const main = qi === -1 ? m.body : lines.slice(0, Math.max(0, qi - (lines[qi - 1]?.trim() === '' ? 1 : 0))).join('\n')
  const rest = qi === -1 ? '' : lines.slice(qi).join('\n')
  const cc = m.cc ?? []
  return (
    <article className="px-6 py-4">
      <header className="flex items-baseline justify-between gap-3">
        <p className="text-base font-semibold text-strong">{m.fromName} <span className="text-sm font-normal text-muted">{m.kind === 'in' ? 'Inbound' : 'Outbound'}{m.simulated && ' · Sent (simulated)'}</span></p>
        <time dateTime={m.at} className="tabular shrink-0 text-sm text-muted">{new Date(m.at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
      </header>
      <p className="text-sm text-muted">To {m.to.join(', ')}{cc.length > 0 && <> · Cc {cc.slice(0, 3).join(', ')}{cc.length > 3 && ` +${cc.length - 3}`}</>}</p>
      <div className="mt-2 max-w-[72ch] text-base break-words whitespace-pre-wrap">{main}</div>
      {rest && (quoted ? <div className="mt-2 max-w-[72ch] border-l-2 border-fill pl-3 text-sm whitespace-pre-wrap text-label">{rest}</div> : <button className="mt-1 text-sm text-link underline" onClick={() => setQuoted(true)}>Show quoted text</button>)}
      {m.attachments && <div className="mt-2 flex flex-col items-start">{m.attachments.map((a) => <Attachment key={a.name} {...a} />)}</div>}
      {linked && <p className="mt-2 text-sm text-muted"><Link to={`/accounts/${linked}?tab=activity`} className="underline hover:text-strong">Logged to Activity</Link></p>}
    </article>
  )
}

/** US-INB-003 */
function SmsThread({ msgs }: { msgs: Message[] }) {
  const toast = useToast()
  const groups: [string, Message[]][] = []
  for (const m of msgs) {
    const l = timeLabel(m.at).includes(':') ? 'Today' : timeLabel(m.at)
    const last = groups.at(-1)
    if (last && last[0] === l) last[1].push(m)
    else groups.push([l, [m]])
  }
  return (
    <div className="flex flex-col gap-2 px-6 py-4">
      {groups.map(([day, ms]) => (
        <section key={day} aria-label={day} className="flex flex-col gap-2">
          <h3 className="py-1 text-center text-xs font-medium text-muted">{day}</h3>
          {ms.map((m) =>
            m.kind === 'system' ? (
              <p key={m.id} className="text-center text-sm text-muted">{m.body}</p>
            ) : (
              <div key={m.id} className={cx('flex max-w-[70%] flex-col gap-0.5', m.kind === 'out' ? 'items-end self-end' : 'items-start self-start')}>
                {m.attachments?.length ? (
                  <button onClick={() => toast('File preview isn’t available in the demo.', 'info')} className="flex h-20 w-40 flex-col items-center justify-center gap-1 rounded-lg bg-recessed text-sm text-label shadow-ring"><Image aria-hidden className="size-5" strokeWidth={1.75} />Image · {m.attachments.length} attachment</button>
                ) : (
                  <p className={cx('rounded-lg px-3 py-2 text-base break-words whitespace-pre-wrap', m.kind === 'out' ? 'bg-surface shadow-ring' : 'bg-recessed')}>{m.body}</p>
                )}
                <span className="tabular text-xs text-muted">{new Date(m.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}{m.kind === 'out' && ' · Sent (simulated)'}</span>
              </div>
            ),
          )}
        </section>
      ))}
    </div>
  )
}

/** US-INB-004 */
function CallEntry({ msgs, c }: { msgs: Message[]; c: Conversation }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const m = msgs.find((x) => x.call)!
  const [edit, setEdit] = useState(false)
  const [notes, setNotes] = useState(m.body)
  if (!m?.call) return null
  const canEdit = m.call.loggedById === user.id && Date.now() - new Date(m.at).getTime() < 24 * 3_600_000
  const related = c.related[0]
  return (
    <div className="px-6 py-4">
      <dl className="grid max-w-xl grid-cols-[140px_1fr] gap-y-2 text-base">
        {([['Direction', m.call.direction], ['Outcome', m.call.outcome], ['Duration', dur(m.call.durationSec)], ['When', new Date(m.at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })], ['Logged by', data.users.find((u) => u.id === m.call!.loggedById)?.name ?? '—'], ['Related record', related ? related.id : '—']] as [string, ReactNode][]).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-sm text-muted">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className="mt-4 max-w-[72ch]">
        <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-strong">Notes</h3>
          {!edit && (canEdit ? <Button size="sm" variant="ghost" onClick={() => setEdit(true)}>Edit</Button> : <Tip label="Only the author can edit notes, for 24 hours."><span tabIndex={0} className="text-xs text-muted">Read only</span></Tip>)}
        </div>
        {edit ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea aria-label="Notes" className={cx(inputCls, 'h-28 py-2')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            <div className="flex gap-2"><Button size="sm" variant="primary" onClick={() => mutate((s) => s.editCallNotes(m.id, notes, user.id), 'Notes saved').then(() => setEdit(false))}>Save</Button><Button size="sm" onClick={() => { setNotes(m.body); setEdit(false) }}>Cancel</Button></div>
          </div>
        ) : (
          <p className="mt-1 text-base whitespace-pre-wrap">{m.body || <span className="text-muted">No notes</span>}</p>
        )}
      </div>
      {c.accountId && <p className="mt-3 text-sm text-muted"><Link to={`/accounts/${c.accountId}?tab=activity`} className="underline hover:text-strong">Logged to Activity</Link></p>}
    </div>
  )
}

/** Fills resolved merge fields and leaves unresolved ones as {{tokens}} so Send can block on them. */
function fillTemplate(text: string, values: Record<string, string | undefined>) {
  return text.replace(/\{\{\s*([a-zA-Z.]+)\s*\}\}/g, (all, k: string) => values[k] ?? all)
}
const tokensIn = (text: string) => [...new Set(text.match(/\{\{\s*[a-zA-Z.]+\s*\}\}/g) ?? [])]

/** US-INB-005 */
function EmailComposer({ c, initial, onClose, onSent, accountId: acctOverride, contactId: contactOverride }: { c?: Conversation; initial: Draft; onClose: () => void; onSent?: (id: string) => void; accountId?: string | null; contactId?: string | null }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const key = c?.id ?? 'new'
  const [d, setD] = useState<Draft>(() => drafts.get(key) ?? initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [discard, setDiscard] = useState(false)
  const accountId = c?.accountId ?? acctOverride ?? null
  const contactId = c?.contactId ?? contactOverride ?? null
  const account = data.accounts.find((a) => a.id === accountId)
  const templates = (data.templates ?? []).filter((t) => t.channel === 'Email' && t.status === 'Active')
  const docs = (data.documents ?? []).filter((x) => x.accountId === accountId)
  const dirty = d.body.trim() !== initial.body.trim() || d.subject !== initial.subject
  const set = (patch: Partial<Draft>) => setD((x) => { const n = { ...x, ...patch }; if (c) drafts.set(key, n); return n })
  const missing = tokensIn(`${d.subject} ${d.body}`)
  const send = async () => {
    if (missing.length) return setErr(`Fill in ${missing[0]} or remove it.`)
    setBusy(true)
    setErr(null)
    try {
      const id = await mutate((s) => s.sendEmail({ conversationId: c?.id ?? null, accountId, contactId, to: d.to, cc: d.cc, subject: d.subject, body: d.body, attachments: d.attachments }, user.id))
      drafts.delete(key)
      toast(account ? `Email saved to ${account.name}. Nothing was delivered: this is a demo.` : 'Email saved. Nothing was delivered: this is a demo.', 'success')
      onSent?.(id)
      onClose()
    } catch (e) {
      setErr(`Couldn't save the email. ${(e as Error).message}`)
      setBusy(false)
    }
  }
  return (
    <div className="rounded-md bg-surface shadow-ring">
      <fieldset disabled={busy} className="flex flex-col divide-y divide-fill">
        <Row label="From"><span className="text-base text-label">{user.email}</span></Row>
        <Row label="To"><RecipientInput value={d.to} onChange={(to) => set({ to })} accountId={accountId} /></Row>
        <Row label="Cc"><RecipientInput value={d.cc} onChange={(cc) => set({ cc })} accountId={accountId} /></Row>
        <Row label="Subject"><input aria-label="Subject" className="h-9 w-full bg-transparent text-base outline-none" value={d.subject} onChange={(e) => set({ subject: e.target.value })} /></Row>
        <div className="px-3 py-2">
          <textarea aria-label="Body" className="h-40 w-full resize-y bg-transparent text-base outline-none" value={d.body} maxLength={20000} onChange={(e) => set({ body: e.target.value })} />
          {d.body.length > 18000 && <p className="tabular text-right text-xs text-muted">{d.body.length.toLocaleString('en-US')} / 20,000</p>}
          {missing.length > 0 && <p className="text-sm text-danger-text">Unresolved: {missing.map((t) => <mark key={t} className="mr-1 rounded-sm bg-danger-tint px-1 text-ink">{t}</mark>)}</p>}
          {d.attachments.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1.5">{d.attachments.map((id) => <li key={id} className="inline-flex h-6 items-center gap-1 rounded-md bg-fill px-2 text-xs"><Paperclip aria-hidden className="size-3" />{docs.find((x) => x.id === id)?.name}<button aria-label="Remove attachment" onClick={() => set({ attachments: d.attachments.filter((x) => x !== id) })}><X aria-hidden className="size-3" /></button></li>)}</ul>
          )}
        </div>
      </fieldset>
      <p className="px-3 pt-2 text-sm text-muted">Demo: emails are saved to Activity, not sent.</p>
      {err && <p role="alert" className="px-3 pt-1 text-sm text-danger-text">{err}</p>}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <Select size="sm" aria-label="Template" value="" disabled={busy} onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (!t) return; const v = mergeValues(data, accountId, contactId, user); set({ subject: fillTemplate(t.subject ?? d.subject, v), body: `${fillTemplate(t.body, v)}${d.body.trim() && d.body.trim() !== initial.body.trim() ? `\n\n${d.body.trim()}` : ''}` }) }} className="max-w-52">
          <option value="">{templates.length ? 'Template…' : 'No templates yet. Admins add them in Settings.'}</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select size="sm" aria-label="Attach from Documents" value="" disabled={busy || !docs.length} onChange={(e) => e.target.value && set({ attachments: [...new Set([...d.attachments, e.target.value])] })} className="max-w-52">
          <option value="">{docs.length ? 'Attach from Documents…' : 'No Documents on this Account'}</option>
          {docs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
        <Button size="sm" className="ml-auto" disabled={busy} onClick={() => (dirty ? setDiscard(true) : (drafts.delete(key), onClose()))}>Discard</Button>
        <Button size="sm" variant="primary" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send'}</Button>
      </div>
      <Confirm open={discard} onOpenChange={setDiscard} title="Discard this draft?" body="The text you wrote will be lost." confirmLabel="Discard" danger onConfirm={() => { drafts.delete(key); onClose() }} />
    </div>
  )
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-9 items-center gap-3 px-3"><span className="w-14 shrink-0 text-sm text-muted">{label}</span><div className="min-w-0 flex-1">{children}</div></div>
}
function RecipientInput({ value, onChange, accountId }: { value: string[]; onChange: (v: string[]) => void; accountId: string | null }) {
  const { data, user } = useApp()
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const ql = q.trim().toLowerCase()
  const suggestions = ql.length >= 2 ? data.contacts.filter((c) => (c.accountIds.includes(accountId ?? '') || c.accountIds.some((id) => { const a = data.accounts.find((x) => x.id === id); return a && canSeeAccount(user, a) })) && (c.name.toLowerCase().includes(ql) || c.email.toLowerCase().includes(ql))).slice(0, 8) : []
  const add = (v: string) => { const t = v.trim().replace(/,$/, ''); if (t && !value.includes(t)) onChange([...value, t]); setQ('') }
  const nameOf = (addr: string) => data.contacts.find((c) => c.email === addr)?.name ?? addr
  const chips = value.length >= 10 ? [value.slice(0, 2).map(nameOf).join(', ') + ` +${value.length - 2}`] : value
  return (
    <div className="relative flex flex-wrap items-center gap-1 py-1">
      {chips.map((v, i) => <span key={v} className="inline-flex h-6 items-center gap-1 rounded-md bg-fill px-2 text-sm">{value.length >= 10 ? v : nameOf(v)}{value.length < 10 && <button aria-label={`Remove ${nameOf(v)}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X aria-hidden className="size-3" /></button>}</span>)}
      <input ref={ref} aria-label="Add recipient" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && q.trim()) { e.preventDefault(); add(q) } else if (e.key === 'Backspace' && !q && value.length) onChange(value.slice(0, -1)) }} onBlur={() => q.includes('@') && add(q)} className="h-7 min-w-32 flex-1 bg-transparent text-base outline-none" />
      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 w-72 rounded-md bg-surface p-1 shadow-pop">
          {suggestions.map((c) => (
            <li key={c.id}>
              <button disabled={!c.email} onMouseDown={(e) => { e.preventDefault(); if (c.email) add(c.email) }} className="flex h-10 w-full flex-col justify-center rounded-sm px-2 text-left hover:bg-recessed disabled:text-muted">
                <span className="text-base">{c.name}</span><span className="text-xs text-muted">{c.email || 'No email on file'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewEmailSheet({ onClose, onSent }: { onClose: () => void; onSent: (id: string) => void }) {
  const { data, user } = useApp()
  const [contactId, setContactId] = useState<string>('')
  const contact = data.contacts.find((c) => c.id === contactId)
  const accountId = contact?.accountIds[0] ?? null
  const mine = data.contacts.filter((c) => c.email && c.accountIds.some((id) => { const a = data.accounts.find((x) => x.id === id); return a && a.lifecycle === 'active' && canSeeAccount(user, a) })).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 400)
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title="New email" footer={<SheetCancel />}>
      <Field label="About Contact (optional)" hint="Fills merge fields and logs the email to their Account.">
        <select className={inputCls} value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">No Contact</option>
          {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="mt-3">
        <EmailComposer key={contactId} accountId={accountId} contactId={contactId || null} initial={{ to: contact?.email ? [contact.email] : [], cc: [], subject: '', body: `\n\n${user.name}\nFortify Insurance`, attachments: [] }} onClose={onClose} onSent={onSent} />
      </div>
    </Sheet>
  )
}

/** US-INB-006 */
function SmsComposer({ c }: { c: Conversation }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [askConsent, setAskConsent] = useState(false)
  const [source, setSource] = useState('Verbal')
  const [late, setLate] = useState<string | null>(null)
  const contact = data.contacts.find((x) => x.id === c.contactId)
  const account = data.accounts.find((a) => a.id === c.accountId)
  const templates = (data.templates ?? []).filter((t) => t.channel === 'SMS' && t.status === 'Active')
  const who = contact?.name ?? c.address
  const consent = contact?.smsConsent?.state ?? 'Unknown'
  const segs = smsSegments(text.length)
  const cap = segs === 1 ? 160 : segs * 153
  if (consent === 'Opted out')
    return <p className="border-t border-line px-6 py-4 text-base text-label">{who} replied STOP{contact?.smsConsent?.offset != null && ` on ${dateOf(contact.smsConsent.offset)}`}. Texting is off.</p>
  const send = async (skipConsent = false, skipTime = false) => {
    if (!skipConsent && contact && consent === 'Unknown') return setAskConsent(true)
    const lateAt = account ? outsideTextingWindow(account.state, account.zip) : null
    if (!skipTime && lateAt) return setLate(lateAt)
    setBusy(true)
    setFailed(false)
    try {
      await mutate((s) => s.sendSms(c.id, text, user.id))
      setText('')
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }
  return (
    <div className="border-t border-line bg-surface px-6 py-3">
      <textarea aria-label={`Text ${who}`} placeholder={`Text ${who}`} rows={Math.min(6, Math.max(2, text.split('\n').length))} maxLength={918} value={text} onChange={(e) => setText(e.target.value)} disabled={busy} className={cx(inputCls, 'h-auto resize-none py-2')} />
      {failed && <p role="alert" className="mt-1 text-sm text-danger-text">Not sent. <button className="underline" onClick={() => send(true, true)}>Retry</button></p>}
      <div className="mt-2 flex items-center gap-2">
        <Select size="sm" aria-label="SMS template" value="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) setText(fillTemplate(t.body, mergeValues(data, c.accountId, c.contactId, user)).slice(0, 918)) }} className="max-w-52">
          <option value="">{templates.length ? 'Template…' : 'No templates yet'}</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <span className={cx('tabular text-sm', text.length >= 800 ? 'font-medium text-warning-text' : 'text-muted')}>{text.length} / {cap} · {segs} segment{segs === 1 ? '' : 's'}</span>
        <span className="text-sm text-muted max-lg:hidden">Demo: texts are saved to Activity, not sent.</span>
        <Button variant="primary" size="sm" className="ml-auto" disabled={busy || !text.trim()} onClick={() => send()}>{busy ? 'Sending…' : 'Send'}</Button>
      </div>
      <Confirm open={askConsent} onOpenChange={setAskConsent} title="Record SMS consent" body={`${who} agreed to receive texts.`} confirmLabel="Record and send" onConfirm={async () => { await mutate((s) => s.recordSmsConsent(contact!.id, 'Opted in', source, user.id)); setAskConsent(false); await send(true) }}>
        <Field label="Source"><select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}><option>Verbal</option><option>Written</option><option>Web form</option></select></Field>
      </Confirm>
      <Confirm open={!!late} onOpenChange={(o) => !o && setLate(null)} title="Outside texting hours" body={`It's ${late} for ${who}. Send anyway?`} confirmLabel="Send anyway" onConfirm={async () => { setLate(null); await send(true, true) }} />
    </div>
  )
}

/** US-INB-004 */
function LogCallSheet({ onClose, preset }: { onClose: () => void; preset?: { accountId: string; contactId: string | null } }) {
  const { data, user } = useApp()
  const mutate = useMutate()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [contactId, setContactId] = useState(preset?.contactId ?? '')
  const contact = data.contacts.find((c) => c.id === contactId)
  const accounts = contact ? data.accounts.filter((a) => contact.accountIds.includes(a.id) && canSeeAccount(user, a)) : []
  const [accountId, setAccountId] = useState(preset?.accountId ?? '')
  const localNow = () => { const d = new Date(); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
  const [direction, setDirection] = useState<'Inbound' | 'Outbound'>('Outbound')
  const [when, setWhen] = useState(localNow)
  const [duration, setDuration] = useState('')
  const [outcome, setOutcome] = useState<CallOutcome>('Connected')
  const [notes, setNotes] = useState('')
  const [related, setRelated] = useState('')
  const [follow, setFollow] = useState(false)
  const twoBiz = () => { const d = new Date(); let n = 0; while (n < 2) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++ } return d.toISOString().slice(0, 10) }
  const [followDate, setFollowDate] = useState(twoBiz)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ql = q.trim().toLowerCase()
  const hits = !contact && ql.length >= 2 ? data.contacts.filter((c) => c.accountIds.some((id) => { const a = data.accounts.find((x) => x.id === id); return a && canSeeAccount(user, a) }) && (c.name.toLowerCase().includes(ql) || c.phone.replace(/\D/g, '').includes(ql.replace(/\D/g, '') || '#'))) : []
  useEffect(() => { if (contact && !contact.accountIds.includes(accountId)) setAccountId(accounts.length === 1 ? accounts[0].id : '') }, [contactId]) // eslint-disable-line react-hooks/exhaustive-deps
  const opts: [string, string][] = accountId ? [
    ...data.policies.filter((p) => p.accountId === accountId).map((p) => [`policy:${p.id}`, `Policy ${p.policyNumber} · ${p.line}`] as [string, string]),
    ...data.opportunities.filter((o) => o.accountId === accountId && o.stage !== 'Won' && o.stage !== 'Lost').map((o) => [`opportunity:${o.id}`, `Opportunity · ${o.lines.join(', ')}`] as [string, string]),
    ...data.renewals.filter((r) => r.accountId === accountId).map((r) => [`renewal:${r.id}`, `Renewal ${r.id} · ${r.status}`] as [string, string]),
    ...data.serviceRequests.filter((s) => s.accountId === accountId && s.status !== 'Done').map((s) => [`service:${s.id}`, `${s.id} · ${s.type}`] as [string, string]),
  ] : []
  const parseDur = () => {
    const p = duration.trim().split(':').map(Number)
    if (!duration.trim()) return 0
    if (p.some((x) => Number.isNaN(x))) return -1
    return p.reduce((acc, x) => acc * 60 + x, 0)
  }
  const save = async () => {
    setErr(null)
    if (!contact) return setErr('Choose a Contact.')
    if (!accountId) return setErr(`Choose which Account the call with ${contact.name} was about.`)
    const sec = parseDur()
    if (sec < 0) return setErr('Enter the duration as mm:ss.')
    const [kind, id] = related.split(':')
    const follow0 = follow ? Math.round((new Date(`${followDate}T00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000) : null
    setBusy(true)
    try {
      await mutate((s) => s.logCall({ contactId: contact.id, accountId, direction, at: new Date(when).toISOString(), durationSec: sec, outcome, notes, related: related ? { kind: kind as never, id } : null, followUpOffset: follow0 }, user.id))
      toast(`Call logged to ${data.accounts.find((a) => a.id === accountId)?.name}.`, 'success')
      onClose()
    } catch (e) {
      setErr(`Couldn't log the call. ${(e as Error).message}`)
      setBusy(false)
    }
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title="Log a call" description="Calls are logged by hand in this demo." busy={busy} footer={<><SheetCancel /><Button variant="primary" disabled={busy} onClick={save}>{busy ? 'Logging…' : 'Log call'}</Button></>}>
      <fieldset disabled={busy} className="flex flex-col gap-3">
        <Field label="Contact">
          {contact ? (
            <div className="flex h-9 items-center justify-between rounded-md bg-recessed px-2.5 text-base">{contact.name}<button type="button" className="text-sm text-link underline" onClick={() => { setContactId(''); setAccountId('') }}>Change</button></div>
          ) : (
            <div>
              <input className={inputCls} placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
              {hits.length > 0 && (
                <ul className="mt-1 max-h-60 overflow-y-auto rounded-md shadow-ring">
                  {hits.slice(0, 20).map((c) => <li key={c.id}><button type="button" onClick={() => setContactId(c.id)} className="flex h-10 w-full items-center justify-between px-2.5 text-left text-base hover:bg-recessed">{c.name}<span className="text-sm text-muted">{c.phone}</span></button></li>)}
                  {hits.length > 20 && <li className="px-2.5 py-2 text-sm text-muted">Refine your search</li>}
                </ul>
              )}
            </div>
          )}
        </Field>
        {accounts.length > 1 && (
          <fieldset><legend className="mb-1 text-sm font-medium text-label">Account</legend>
            {accounts.map((a) => <label key={a.id} className="flex items-center gap-2 py-1 text-base"><input type="radio" name="call-account" checked={accountId === a.id} onChange={() => setAccountId(a.id)} />{a.name}</label>)}
          </fieldset>
        )}
        {accounts.length === 1 && <Field label="Account"><input readOnly className={cx(inputCls, 'bg-recessed')} value={accounts[0].name} /></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Direction"><select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as 'Inbound')}><option>Outbound</option><option>Inbound</option></select></Field>
          <Field label="Outcome"><select className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>{['Connected', 'Left voicemail', 'No answer', 'Wrong number'].map((o) => <option key={o}>{o}</option>)}</select></Field>
          <Field label="Date and time"><input type="datetime-local" className={inputCls} value={when} max={localNow()} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Duration (mm:ss)"><input className={inputCls} inputMode="numeric" placeholder="4:12" value={duration} onChange={(e) => setDuration(e.target.value.replace(/[^\d:]/g, ''))} /></Field>
        </div>
        <Field label={outcome === 'Connected' ? 'Notes' : 'Notes (optional)'} hint={`${notes.length} / 2,000`}><textarea className={cx(inputCls, 'h-28 py-2')} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="Related record (optional)">
          <select className={inputCls} value={related} disabled={!accountId} onChange={(e) => setRelated(e.target.value)}><option value="">None</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />Create follow-up Task</label>
        {follow && <Field label="Follow-up due (5:00 PM)"><input type="date" className={inputCls} value={followDate} onChange={(e) => setFollowDate(e.target.value)} /></Field>}
        {err && <Callout tone="danger">{err}</Callout>}
      </fieldset>
    </Sheet>
  )
}

/** US-INB-009 */
function MentionsList() {
  const { data, user } = useApp()
  const mutate = useMutate()
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const all = data.activities.filter((a) => a.mentions?.includes(user.id)).sort((a, b) => b.occurredOffset - a.occurredOffset || b.id.localeCompare(a.id))
  const unread = all.filter((a) => !a.mentionReadBy?.includes(user.id))
  const rows = unreadOnly ? unread : all
  const markAll = () => mutate((s) => s.markMentionsRead(unread.map((a) => a.id), user.id), 'All mentions marked read')
  const when = (o: number) => (o === 0 ? 'Today' : o === -1 ? 'Yesterday' : dateOf(o))
  const highlight = (text: string) => text.split(new RegExp(`(@${user.name})`)).map((p, i) => (p === `@${user.name}` ? <mark key={i} className="rounded-sm bg-fill px-0.5 font-medium text-strong">{p}</mark> : p))
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />Unread only</label>
        <Button size="sm" className="ml-auto" disabled={!unread.length} onClick={() => (unread.length > 10 ? setConfirmAll(true) : markAll())}>Mark all as read</Button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((a) => {
          const acc = data.accounts.find((x) => x.id === a.accountId)
          const author = data.users.find((u) => u.id === a.createdById)
          const ok = !!acc && canSeeAccount(user, acc)
          const isUnread = !a.mentionReadBy?.includes(user.id)
          const body = (
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
              <span className="flex items-baseline gap-2"><span title={author?.name} className={cx('max-w-[30ch] truncate', isUnread ? 'font-semibold text-strong' : 'text-ink')}>{author?.name}</span><span className="truncate text-sm text-muted">mentioned you on {acc?.name}</span><span className="ml-auto shrink-0 text-sm text-muted">{when(a.occurredOffset)}</span></span>
              <span className={cx('line-clamp-2 text-sm', ok ? 'text-label' : 'text-muted')}>{ok ? highlight(a.body ?? a.subject) : 'You no longer have access to this record'}</span>
            </span>
          )
          return (
            <li key={a.id} className="border-b border-fill">
              {ok ? (
                <button onClick={() => { mutate((s) => s.markMentionsRead([a.id], user.id)); navigate(`/accounts/${a.accountId}?tab=activity#${a.id}`) }} className="flex min-h-16 w-full items-center gap-2 px-3 py-2 text-left hover:bg-recessed">
                  <span aria-hidden className={cx('size-2 shrink-0 rounded-full', isUnread ? 'bg-primary' : 'bg-transparent')} /><AtSign aria-hidden className="size-4 shrink-0 text-label" strokeWidth={1.75} />{body}
                </button>
              ) : (
                <div className="flex min-h-16 items-center gap-2 px-3 py-2"><span className="size-2" /><AtSign aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />{body}</div>
              )}
            </li>
          )
        })}
        {rows.length === 0 && <li className="px-4 py-10 text-base text-label">{unreadOnly && all.length ? 'You’re all caught up.' : 'No mentions yet. When someone @mentions you in a note, it shows up here.'}</li>}
      </ul>
      <Confirm open={confirmAll} onOpenChange={setConfirmAll} title={`Mark ${unread.length} mentions as read?`} body="They stay in the list." confirmLabel="Mark all as read" onConfirm={async () => { await markAll(); setConfirmAll(false) }} />
    </>
  )
}
