import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useNavigate } from 'react-router'
import { AlarmClock, AtSign, Bell, ClipboardCheck, Clock, FileBadge, type LucideIcon, RefreshCw, UserPlus } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf } from '@/app/hooks'
import { deriveNotifications, type NotificationKind } from '@/domain/notifications'
import { cx, Tip } from '@/components/ui/primitives'

const ICON: Record<NotificationKind, LucideIcon> = { 'service-overdue': AlarmClock, mention: AtSign, 'lead-assigned': UserPlus, 'task-due': Clock, 'task-overdue': AlarmClock, 'renewal-at-risk': RefreshCw, 'service-assigned': ClipboardCheck, 'certificate-review': FileBadge, 'xdate-followup': Clock }
const keyFor = (userId: string) => `fortify.notificationsRead.${userId}`
function readSet(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(keyFor(userId)) ?? '[]'))
  } catch {
    return new Set()
  }
}
const when = (offset: number) => (offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : offset >= -7 ? `${-offset}d ago` : dateOf(offset))

/** US-FND-008: bell with unread count, All/Unread tabs, grouped by day; read state is per View as user. */
export function NotificationsButton() {
  const { data, user } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'All' | 'Unread'>('All')
  const [readVersion, setReadVersion] = useState(0)
  const items = useMemo(() => deriveNotifications(data, user), [data, user])
  // readVersion bumps after every write so the memo re-reads storage.
  const read = useMemo(() => readSet(user.id), [user.id, readVersion])
  const save = (ids: string[]) => {
    try {
      sessionStorage.setItem(keyFor(user.id), JSON.stringify([...new Set([...read, ...ids])]))
    } catch {
      /* storage blocked: read state lasts until reload */
    }
    setReadVersion((v) => v + 1)
  }
  const unread = items.filter((n) => !read.has(n.id))
  const shown = tab === 'All' ? items : unread
  const groups: [string, typeof shown][] = [
    ['Today', shown.filter((n) => n.offset >= 0)],
    ['Yesterday', shown.filter((n) => n.offset === -1)],
    ['Earlier', shown.filter((n) => n.offset < -1)],
  ]
  const count = unread.length > 99 ? '99+' : String(unread.length)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label="Notifications">
        <Popover.Trigger aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'} className="relative inline-flex size-8 items-center justify-center rounded-md text-label hover:bg-recessed hover:text-strong">
          <Bell aria-hidden className="size-4" strokeWidth={1.75} />
          {unread.length > 0 && <span aria-hidden className="tabular absolute -top-0.5 -right-1 min-w-4 rounded-full bg-strong px-1 text-xs leading-4 font-medium text-white">{count}</span>}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 flex max-h-[min(560px,80vh)] w-[380px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-lg bg-surface shadow-pop">
          <header className="flex items-center gap-2 border-b border-fill px-3 py-2">
            <h2 className="text-base font-semibold text-strong">Notifications</h2>
            <div role="tablist" aria-label="Filter" className="ml-2 inline-flex rounded-md bg-recessed p-0.5">
              {(['All', 'Unread'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('h-7 rounded-[5px] px-2.5 text-sm', tab === t ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:text-strong')}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => save(shown.map((n) => n.id))} disabled={!shown.some((n) => !read.has(n.id))} className="ml-auto text-sm text-link hover:underline disabled:text-muted disabled:no-underline">
              Mark all as read
            </button>
          </header>
          <div className="overflow-y-auto">
            {shown.length === 0 && <p className="px-4 py-8 text-center text-base text-muted">{tab === 'Unread' ? 'You’re all caught up.' : 'No notifications yet.'}</p>}
            {groups.filter(([, g]) => g.length).map(([label, g]) => (
              <section key={label}>
                <h3 className="bg-recessed px-3 py-1 text-xs font-semibold text-label">{label}</h3>
                <ul>
                  {g.map((n) => {
                    const Icon = ICON[n.kind]
                    const isRead = read.has(n.id)
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => {
                            save([n.id])
                            setOpen(false)
                            navigate(n.to)
                          }}
                          className="flex w-full gap-3 border-b border-fill px-3 py-2.5 text-left hover:bg-recessed"
                        >
                          <Icon aria-hidden className={cx('mt-0.5 size-4 shrink-0', n.kind === 'task-overdue' || n.kind === 'renewal-at-risk' ? 'text-warning-text' : 'text-muted')} strokeWidth={1.75} />
                          <span className="min-w-0 flex-1">
                            <span className={cx('block truncate text-base', isRead ? 'text-ink' : 'font-semibold text-strong')}>{n.title}</span>
                            <span className="block truncate text-sm text-muted">{n.body}</span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-xs text-muted">{when(n.offset)}</span>
                            {!isRead && <span className="size-2 rounded-full bg-primary"><span className="sr-only">Unread</span></span>}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
