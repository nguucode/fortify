import * as Menu from '@radix-ui/react-dropdown-menu'
import { NotificationsButton } from './Notifications'
import { MobileNav } from './Sidebar'
import * as Popover from '@radix-ui/react-popover'
import { ArrowRight, Building2, Check, ChevronDown, Palette, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { dataStore, officeName, resetData, useApp, useDemoControls, viewAsUsers } from '@/app/store'
import { Badge, cx, Kbd, Tip } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useLocation } from 'react-router'
import type { Role } from '@/domain/types'

export const ROLE_LABEL: Record<Role, string> = { producer: 'Producer', 'account-manager': 'Account Manager', principal: 'Principal', admin: 'Admin' }
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

export const menuContent = 'z-50 min-w-56 rounded-md bg-surface p-1 text-base shadow-pop'
export const menuItem = 'flex h-8 cursor-default items-center gap-2 rounded-sm px-2 outline-none data-[highlighted]:bg-recessed'

type ChromeBg = 'white' | 'transparent'
type ChromeTheme = { sidebar: ChromeBg; topbar: ChromeBg; content: ChromeBg; app: 'white' | 'gray' | 'custom' | 'gradient'; appColor: string; gradFrom: string; gradTo: string; primary: string; mode: 'light' | 'dark' | 'system' }
const THEME_KEY = 'fortify.chromeTheme'
const DEFAULT_THEME: ChromeTheme = { sidebar: 'transparent', topbar: 'transparent', content: 'transparent', app: 'gray', appColor: '#eef2f7', gradFrom: '#e8eefc', gradTo: '#fbe9f3', primary: 'blue', mode: 'light' }
// Hues mirror html[data-primary] in index.css; blue is the exact @theme token.
const PRIMARIES = [['red', 25], ['orange', 50], ['yellow', 85], ['green', 150], ['blue', 260], ['indigo', 280], ['violet', 310]] as const

function readTheme(): ChromeTheme {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem(THEME_KEY) ?? '{}') }
  } catch {
    return DEFAULT_THEME
  }
}
// WCAG relative luminance of #rrggbb, and contrast ratio between two luminances.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const INK = { light: lum('#f7f7f7'), dark: lum('#0a0a0a') }
/** Which ink reads on these background stops: the one whose worst contrast across them is highest. */
export function canvasInk(stops: string[]) {
  const worst = (ink: number) => Math.min(...stops.map((s) => contrast(lum(s), ink)))
  const light = worst(INK.light), dark = worst(INK.dark)
  return light > dark ? { ink: 'light' as const, worst: light } : { ink: 'dark' as const, worst: dark }
}
const bgStops = (t: ChromeTheme) => (t.app === 'custom' ? [t.appColor] : t.app === 'gradient' ? [t.gradFrom, t.gradTo] : null)

const applyTheme = (t: ChromeTheme) => {
  const d = document.documentElement.dataset
  d.sidebarBg = t.sidebar
  d.topbarBg = t.topbar
  d.contentBg = t.content
  d.appBg = t.app
  const st = document.documentElement.style
  st.setProperty('--app-color', t.appColor)
  st.setProperty('--grad-from', t.gradFrom)
  st.setProperty('--grad-to', t.gradTo)
  d.primary = t.primary
  d.theme = t.mode === 'system' ? (systemDark?.matches ? 'dark' : 'light') : t.mode
  const stops = bgStops(t)
  d.canvasInk = stops ? canvasInk(stops).ink : d.theme === 'dark' ? 'light' : 'dark'
}
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)') // absent in jsdom
systemDark?.addEventListener('change', () => applyTheme(readTheme()))
applyTheme(readTheme()) // at import, before first paint

const keepOpen = (e: Event) => e.preventDefault() // menu stays open so options can be compared
const HEX = /^#[0-9a-f]{6}$/i
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
const swatchCls = 'size-5 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0 shadow-ring [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'

/** Colour well + hex field; the field only commits a full #rrggbb. */
function HexInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  return (
    <span className="flex h-8 items-center gap-1.5 rounded-md bg-surface px-1.5 shadow-control">
      <input type="color" aria-label={`${label} color`} value={value} onChange={(e) => { setDraft(e.target.value); onChange(e.target.value) }} className={swatchCls} />
      <input
        aria-label={`${label} hex`}
        value={draft}
        spellCheck={false}
        maxLength={7}
        onChange={(e) => { const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value; setDraft(v); if (HEX.test(v)) onChange(v.toLowerCase()) }}
        onBlur={() => setDraft(value)}
        className="w-[68px] bg-transparent font-mono text-sm text-ink uppercase outline-none"
      />
    </span>
  )
}

function ThemeMenu() {
  const [theme, setTheme] = useState(readTheme)
  const set = (patch: Partial<ChromeTheme>) => {
    const t = { ...theme, ...patch }
    setTheme(t)
    applyTheme(t)
    try { localStorage.setItem(THEME_KEY, JSON.stringify(t)) } catch { /* storage blocked */ }
  }
  const label = (text: string) => <Menu.Label className="px-2 pt-1.5 pb-1 text-xs text-muted">{text}</Menu.Label>
  const group = (part: keyof ChromeTheme, text: string, options: Record<string, ReactNode>, wrap?: Record<string, (item: ReactNode) => ReactNode>) => (
    <>
      {label(text)}
      <Menu.RadioGroup value={theme[part]} onValueChange={(v) => set({ [part]: v })}>
        {Object.entries(options).map(([v, name]) => {
          const item = (
            <Menu.RadioItem key={v} value={v} className={menuItem} onSelect={keepOpen}>
              <Check aria-hidden className={cx('size-4', theme[part] === v ? 'text-primary' : 'invisible')} />
              {name}
            </Menu.RadioItem>
          )
          return wrap?.[v] ? <Fragment key={v}>{wrap[v](item)}</Fragment> : item
        })}
      </Menu.RadioGroup>
    </>
  )
  const bg = { white: 'White', transparent: 'Transparent' }
  return (
    <Menu.Root>
      <Tip label="Theme">
        <Menu.Trigger aria-label="Theme" className="inline-flex size-8 items-center justify-center rounded-md text-label hover:bg-recessed hover:text-strong">
          <Palette aria-hidden className="size-4" strokeWidth={1.75} />
        </Menu.Trigger>
      </Tip>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={4}
          className={menuContent}
          // The gradient editor is portalled to <body>; working in it must not close the menu.
          onInteractOutside={(e) => (e.target as Element | null)?.closest?.('[data-gradient-editor]') && e.preventDefault()}
        >
          {group('mode', 'Theme', { light: 'Light', dark: 'Dark', system: 'System' })}
          <Menu.Separator className="my-1 h-px bg-fill" />
          {label('Primary color')}
          <Menu.RadioGroup value={theme.primary} onValueChange={(v) => set({ primary: v })} className="flex gap-1 px-2 pb-1.5">
            {PRIMARIES.map(([v, h]) => (
              <Menu.RadioItem
                key={v}
                value={v}
                onSelect={keepOpen}
                aria-label={v[0].toUpperCase() + v.slice(1)}
                title={v[0].toUpperCase() + v.slice(1)}
                className="grid size-6 cursor-default place-items-center rounded-full outline-none data-[highlighted]:shadow-control"
              >
                <span
                  aria-hidden
                  className="grid size-4.5 place-items-center rounded-full text-white"
                  style={{ background: v === 'blue' ? 'oklch(57.72% 0.2324 260)' : `oklch(57.72% 0.2 ${h})` }}
                >
                  {theme.primary === v && <Check className="size-3" strokeWidth={3} />}
                </span>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          <Menu.Separator className="my-1 h-px bg-fill" />
          {group('app', 'App background', {
            white: 'White',
            gray: 'Gray',
            custom: (
              <>
                Color
                <input
                  type="color"
                  aria-label="Background color"
                  value={theme.appColor}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onChange={(e) => set({ app: 'custom', appColor: e.target.value })}
                  className="ml-auto size-5 cursor-pointer rounded-sm border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-line [&::-webkit-color-swatch-wrapper]:p-0"
                />
              </>
            ),
            gradient: (
              <>
                Gradient
                <Popover.Trigger
                  aria-label="Edit gradient"
                  className="ml-auto size-5 rounded-sm shadow-ring"
                  style={{ background: `linear-gradient(135deg, ${theme.gradFrom}, ${theme.gradTo})` }}
                />
                <Popover.Portal>
                  <Popover.Content
                    data-gradient-editor
                    side="left"
                    align="center"
                    sideOffset={8}
                    collisionPadding={8}
                    // React bubbles portalled events to the RadioItem; keep typing and clicks from reaching it.
                    onKeyDown={stop}
                    onPointerMove={stop}
                    onPointerDown={stop}
                    onPointerUp={stop}
                    onClick={stop}
                    className="z-50 flex max-w-[340px] flex-wrap items-center gap-2 rounded-md bg-surface p-2 shadow-pop"
                  >
                    <HexInput label="Gradient start" value={theme.gradFrom} onChange={(v) => set({ app: 'gradient', gradFrom: v })} />
                    <ArrowRight aria-hidden className="size-4 text-muted" />
                    <HexInput label="Gradient end" value={theme.gradTo} onChange={(v) => set({ app: 'gradient', gradTo: v })} />
                    {canvasInk([theme.gradFrom, theme.gradTo]).worst < 4.5 && (
                      <p role="status" className="basis-full text-sm text-warning-text">Text may be hard to read on part of this gradient. Bring the two colors closer in lightness.</p>
                    )}
                  </Popover.Content>
                </Popover.Portal>
              </>
            ),
          }, {
            // The editor anchors to the whole row, so it opens beside the menu rather than over it.
            gradient: (item) => <Popover.Root><Popover.Anchor asChild>{item}</Popover.Anchor></Popover.Root>,
          })}
          <Menu.Separator className="my-1 h-px bg-fill" />
          {group('sidebar', 'Sidebar background', bg)}
          <Menu.Separator className="my-1 h-px bg-fill" />
          {group('topbar', 'Top bar background', bg)}
          <Menu.Separator className="my-1 h-px bg-fill" />
          {group('content', 'Content area background', bg)}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

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
              <Check aria-hidden className={cx('size-4', officeFilter === id ? 'text-primary' : 'invisible')} strokeWidth={1.75} />
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
        <span className={cx('absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-ring transition-transform duration-150', on && 'translate-x-4')} />
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
    <header data-chrome="topbar" className="flex h-[58px] shrink-0 items-center gap-3 border-b border-(--chrome-edge) bg-(--chrome-topbar) px-4 max-sm:gap-1.5 max-sm:px-3">
      <MobileNav />
      <span className="flex items-center gap-2 pr-1 text-lg font-semibold text-strong max-sm:[&>span:last-child]:hidden">
        <img src="/logo.svg" alt="" aria-hidden className="size-6" />
        <span>Fortify</span>
      </span>
      <OfficeControl />
      <Tip label="All data in this demo is fictional.">
        <span tabIndex={0} className="inline-flex"><Badge>Sample data</Badge></span>
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
                  <Check aria-hidden className={cx('size-4', u.id === user.id ? 'text-primary' : 'invisible')} strokeWidth={1.75} />
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
      <ThemeMenu />
      <Menu.Root>
        <Menu.Trigger className="grid size-7 place-items-center rounded-full bg-fill text-xs font-medium text-label hover:shadow-control">
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
