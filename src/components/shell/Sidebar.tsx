import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Building2, Calendar, CalendarClock, ClipboardCheck, FileBadge, FileText, Inbox, LayoutDashboard, LineChart, ListChecks,
  Menu, Pin, PinOff, RefreshCw, Settings, ShieldAlert, Sun, UserPlus, Users, Workflow, type LucideIcon,
} from 'lucide-react'
import { footerItems, isVisible, sidebarGroups, type NavItem } from '@/app/sitemap'
import { useApp } from '@/app/store'
import { cx, Tip } from '@/components/ui/primitives'

// Icons are presentation only; the items, order, and visibility all come from sitemap.yaml.
const ICON: Record<string, LucideIcon> = {
  today: Sun, inbox: Inbox, accounts: Building2, contacts: Users, leads: UserPlus, pipeline: Workflow, 'x-dates': CalendarClock,
  policies: FileText, renewals: RefreshCw, service: ClipboardCheck, certificates: FileBadge, claims: ShieldAlert, tasks: ListChecks,
  calendar: Calendar, reports: LineChart, product: LayoutDashboard, settings: Settings,
}

function readPinned() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('sidebar') === 'pinned') return true
  try {
    return localStorage.getItem('fortify.sidebarPinned') === '1'
  } catch {
    return false
  }
}

export function Sidebar() {
  const { user } = useApp()
  const { pathname } = useLocation()
  const [pinned, setPinned] = useState(readPinned)
  const [hover, setHover] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Expand after 150ms of hover or focus (US-FND-001) so passing the cursor over the rail doesn't flash it open.
  const expandSoon = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHover(true), 150)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // `[` (US-FND-010) toggles the pin from anywhere.
  useEffect(() => {
    const onToggle = () => togglePin()
    window.addEventListener('fortify:toggle-sidebar', onToggle)
    return () => window.removeEventListener('fortify:toggle-sidebar', onToggle)
  })
  const collapse = () => {
    clearTimeout(timer.current)
    setHover(false)
  }
  const open = pinned || hover

  const togglePin = () => {
    setPinned((p) => {
      try {
        localStorage.setItem('fortify.sidebarPinned', p ? '0' : '1')
      } catch {
        /* storage blocked: pin lasts until reload */
      }
      return !p
    })
  }

  const item = (it: NavItem) => {
    if (!isVisible(it, user.role)) return null
    const Icon = ICON[it.id] ?? FileText
    const active = pathname === it.route || pathname.startsWith(it.route + '/')
    const link = (
      <NavLink
        key={it.id}
        to={it.route}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-base font-medium transition-colors duration-150',
          active ? 'bg-surface text-strong shadow-ring' : 'text-label hover:bg-recessed hover:text-strong',
        )}
      >
        <Icon aria-hidden className={cx('size-4 shrink-0', active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100')} strokeWidth={1.75} />
        <span className={cx('truncate', !open && 'sr-only')}>{it.label}</span>
      </NavLink>
    )
    return open ? link : <Tip key={it.id} label={it.label} side="right">{link}</Tip>
  }

  return (
    // The 56px placeholder keeps content still while the rail expands over it; pinning reflows the page.
    <div className={cx('relative shrink-0 transition-[width] duration-150 max-md:hidden', pinned ? 'w-60' : 'w-14')}>
      <nav
        aria-label="Main"
        onMouseEnter={expandSoon}
        onMouseLeave={collapse}
        onFocus={expandSoon}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && collapse()}
        className={cx(
          'absolute inset-y-0 left-0 z-30 flex flex-col border-r border-line bg-canvas px-2 py-3 transition-[width,box-shadow] duration-150',
          open ? 'w-60' : 'w-14',
          hover && !pinned && 'shadow-pop',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {sidebarGroups.map((g, i) => {
            const items = g.items.map(item).filter(Boolean)
            if (!items.length) return null
            return (
              <div key={g.group ?? i} className={cx('flex flex-col gap-0.5', i > 0 && 'mt-4')}>
                {g.group && open && <p className="px-2.5 pb-1 text-xs text-muted">{g.group}</p>}
                {g.group && !open && <hr aria-hidden className="mx-2 mb-1 border-line" />}
                {items}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-col gap-0.5 border-t border-line pt-3">
          {footerItems.map(item)}
          <button
            onClick={togglePin}
            aria-pressed={pinned}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            className="mt-1 flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted hover:bg-recessed hover:text-strong"
          >
            {pinned ? <PinOff aria-hidden className="size-4 shrink-0" /> : <Pin aria-hidden className="size-4 shrink-0" />}
            <span className={cx(!open && 'sr-only')}>{pinned ? 'Unpin sidebar' : 'Pin sidebar'}</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

/** US-FND-011: below 768px the rail becomes a full-height drawer opened from the top-left menu button. */
export function MobileNav() {
  const { user } = useApp()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  const link = (it: NavItem) => {
    if (!isVisible(it, user.role)) return null
    const Icon = ICON[it.id] ?? FileText
    const active = pathname === it.route || pathname.startsWith(it.route + '/')
    return (
      <NavLink key={it.id} to={it.route} aria-current={active ? 'page' : undefined} className={cx('flex h-10 items-center gap-3 rounded-md px-3 text-base font-medium', active ? 'bg-surface text-strong shadow-ring' : 'text-label hover:bg-recessed')}>
        <Icon aria-hidden className="size-4" strokeWidth={1.75} />
        {it.label}
      </NavLink>
    )
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label="Open navigation" className="grid size-8 place-items-center rounded-md text-label hover:bg-recessed md:hidden">
        <Menu aria-hidden className="size-5" strokeWidth={1.75} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-strong/20" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-canvas px-2 py-3 shadow-pop">
          <Dialog.Title className="px-3 pb-2 text-lg font-semibold text-strong">Fortify</Dialog.Title>
          <nav aria-label="Main" className="flex flex-col gap-0.5">
            {sidebarGroups.map((g, i) => {
              const items = g.items.map(link).filter(Boolean)
              if (!items.length) return null
              return (
                <div key={g.group ?? i} className={cx('flex flex-col gap-0.5', i > 0 && 'mt-3')}>
                  {g.group && <p className="px-3 pb-1 text-xs text-muted">{g.group}</p>}
                  {items}
                </div>
              )
            })}
            <div className="mt-3 flex flex-col gap-0.5 border-t border-line pt-3">{footerItems.map(link)}</div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
