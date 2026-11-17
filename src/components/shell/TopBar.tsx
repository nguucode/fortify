import * as Menu from '@radix-ui/react-dropdown-menu'
import { NotificationsButton } from './Notifications'
import { MobileNav } from './Sidebar'
import * as Popover from '@radix-ui/react-popover'
import { Building2, Check, ChevronDown, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import { dataStore, officeName, resetData, useApp, useDemoControls, viewAsUsers } from '@/app/store'
import { cx, Kbd, Tip } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useLocation } from 'react-router'
import type { Role } from '@/domain/types'

export const ROLE_LABEL: Record<Role, string> = { producer: 'Producer', 'account-manager': 'Account Manager', principal: 'Principal', admin: 'Admin' }
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

export const menuContent = 'z-50 min-w-56 rounded-md bg-surface p-1 text-base shadow-pop'
export const menuItem = 'flex h-8 cursor-default items-center gap-2 rounded-sm px-2 outline-none data-[highlighted]:bg-recessed'

function OfficeControl() {
  const { user, data, officeFilter, setOfficeFilter } = useApp()
  if (user.role === 'producer' || user.role === 'account-manager') {
    return (
      <Tip label="Your Office is set by an Admin.">
        <span tabIndex={0} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium whitespace-nowrap text-label max-sm:hidden">
          <Building2 aria-hidden className="size-4" strokeWidth={1.75} />
          {officeName(user.officeId)}
        </span>
      </Tip>
    )
  }
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium whitespace-nowrap text-ink hover:bg-recessed max-sm:hidden">
        <Building2 aria-hidden className="size-4 text-label" strokeWidth={1.75} />
        {officeFilter ? officeName(officeFilter) : 'All offices'}
        <ChevronDown aria-hidden className="size-3.5 text-muted" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={4} className={menuContent}>
          {[null, ...data.offices.map((o) => o.id)].map((id) => (
            <Menu.Item key={id ?? 'all'} className={menuItem} onSelect={() => setOfficeFilter(id)}>
              <Check aria-hidden className={cx('size-4', officeFilter === id ? 'text-primary' : 'invisible')} />
              {id ? officeName(id) : 'All offices'}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

function DemoControlsButton() {
  const { api } = useApp()
  const toast = useToast()
  const c = useDemoControls()
  const { pathname } = useLocation()
  const route = '/' + (pathname.split('/')[1] ?? '')
  const overrides = [!c.latency && 'Latency off', c.forceErrorOn && `Error on ${c.forceErrorOn}`, c.empty && 'Empty data'].filter(Boolean)
  const row = (label: string, desc: string, on: boolean, toggle: () => void) => (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-base font-medium text-strong">{label}</span>
        <span className="block text-sm text-muted">{desc}</span>
      </span>
      <button
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={cx('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-150', on ? 'bg-primary' : 'bg-fill shadow-control')}
      >
        <span className={cx('absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-ring transition-transform duration-150', on && 'translate-x-4')} />
      </button>
    </label>
  )
  return (
    <Popover.Root>
      <Tip label={overrides.length ? `Active: ${overrides.join(', ')}` : 'Demo controls'}>
        <Popover.Trigger aria-label="Demo controls" className="relative inline-flex size-8 items-center justify-center rounded-md text-label hover:bg-recessed hover:text-strong">
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} />
          {overrides.length > 0 && <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning" />}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-80 rounded-md bg-surface px-4 py-3 shadow-pop">
          <p className="pb-1 text-sm text-muted">Presenter tools · not part of the product</p>
          <div className="divide-y divide-fill">
            {row('Latency', 'Adds 200–600ms to every call', c.latency, () => api.setControls({ latency: !c.latency }))}
            {row('Force error on this route', `Reads on ${route} fail`, c.forceErrorOn === route, () => api.setControls({ forceErrorOn: c.forceErrorOn === route ? null : route }))}
            {row('Simulate empty data', 'Lists return no rows', c.empty, () => api.setControls({ empty: !c.empty }))}
          </div>
          <div className="mt-2 flex flex-col gap-2 border-t border-fill pt-3">
            <button className="rounded-md py-1.5 bg-surface px-2.5 text-left text-sm font-medium text-ink shadow-ring hover:bg-recessed" onClick={() => toast(`AMS sync: ${dataStore().syncRenewalOutcomes()} Decided renewals moved to Done; Won Terms matched.`, 'success')}>
              Sync renewal outcome
              <span className="block text-sm font-normal text-muted">Moves Decided Renewals to Done, as the AMS would</span>
            </button>
            <button className="h-8 rounded-md bg-surface px-2.5 text-left text-sm font-medium text-ink shadow-ring hover:bg-recessed" onClick={() => { resetData(); toast('Data reset to the seed.', 'info') }}>
              Reset data
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { user, setUser } = useApp()
  const toast = useToast()
  return (
    <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 max-sm:gap-1.5 max-sm:px-3">
      <MobileNav />
      <span className="flex items-center gap-2 pr-1 text-lg font-semibold tracking-[-0.02em] text-strong max-sm:[&>span:last-child]:hidden">
        <img src="/logo.svg" alt="" aria-hidden className="size-6" />
        Fortify
      </span>
      <OfficeControl />
      <Tip label="All data in this demo is fictional.">
        <span tabIndex={0} className="rounded-full bg-fill px-2 text-xs leading-5 font-medium whitespace-nowrap text-label">Sample data</span>
      </Tip>
      <button
        onClick={onOpenPalette}
        className="ml-2 flex h-9 w-full max-w-[420px] max-sm:ml-0 items-center gap-2 rounded-lg bg-surface px-3 text-left text-base text-muted shadow-ring hover:shadow-control max-lg:w-9 max-lg:px-2.5"
      >
        <Search aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate max-lg:sr-only">Search accounts, policies, people</span>
        <span className="max-lg:hidden">
          <Kbd>⌘K</Kbd>
        </span>
      </button>
      <div className="flex-1" />
      <NotificationsButton />
      <div className="flex items-center gap-1 border-l border-line pl-3 max-sm:pl-1.5">
        <span className="pr-1 text-xs text-muted max-lg:hidden">Demo</span>
        <Menu.Root>
          <Menu.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink hover:bg-recessed">
            <UserRound aria-hidden className="size-4 text-label" strokeWidth={1.75} />
            <span className="max-lg:sr-only">View as {ROLE_LABEL[user.role]}</span>
            <ChevronDown aria-hidden className="size-3.5 text-muted max-lg:hidden" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={4} className={menuContent}>
              {viewAsUsers.map((u) => (
                <Menu.Item key={u.id} className={cx(menuItem, 'h-auto py-1.5')} onSelect={() => setUser(u)}>
                  <Check aria-hidden className={cx('size-4', u.id === user.id ? 'text-primary' : 'invisible')} />
                  <span>
                    <span className="block font-medium text-strong">{ROLE_LABEL[u.role]}</span>
                    <span className="block text-sm text-muted">{u.name} · {officeName(u.officeId)}</span>
                  </span>
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
        <DemoControlsButton />
      </div>
      <Menu.Root>
        <Menu.Trigger className="grid size-7 place-items-center rounded-full bg-fill text-xs font-semibold text-ink hover:shadow-control">
          {initials(user.name)}
          <span className="sr-only">Account menu for {user.name}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" sideOffset={6} className={menuContent}>
            <div className="max-w-[220px] px-2 py-1.5">
              <p className="truncate font-medium text-strong">{user.name}</p>
              <p className="text-sm text-muted">{ROLE_LABEL[user.role]} · {officeName(user.officeId)}</p>
            </div>
            <Menu.Separator className="my-1 h-px bg-fill" />
            <Menu.Item className={menuItem} onSelect={() => toast('Sign-out is disabled in the demo')}>
              Sign out
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </header>
  )
}
