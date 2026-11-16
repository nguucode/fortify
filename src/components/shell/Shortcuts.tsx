import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router'
import { allNavItems, isVisible } from '@/app/sitemap'
import { useApp } from '@/app/store'
import { Kbd } from '@/components/ui/primitives'

const KEY = 'fortify.singleKeyShortcuts'
// US-FND-010 `g` sequences, by route.
const GO: Record<string, string> = { t: '/today', i: '/inbox', a: '/accounts', c: '/contacts', l: '/leads', p: '/pipeline', o: '/policies', r: '/renewals', s: '/service', k: '/tasks' }

function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** Moves focus between table rows by focusing each row's first link (Enter then opens it natively). */
function moveRow(dir: 1 | -1) {
  const rows = [...document.querySelectorAll<HTMLTableRowElement>('main tbody tr')].filter((r) => r.querySelector('a'))
  if (!rows.length) return
  const cur = rows.findIndex((r) => r.contains(document.activeElement))
  const next = rows[Math.max(0, Math.min(rows.length - 1, cur === -1 ? 0 : cur + dir))]
  const a = next.querySelector<HTMLAnchorElement>('a')!
  a.focus()
  next.scrollIntoView({ block: 'nearest' })
}

/** US-FND-010: global keyboard shortcuts and the `?` help dialog. Single-key shortcuts can be turned off (WCAG 2.1.4). */
export function Shortcuts() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [help, setHelp] = useState(false)
  const [enabled, setEnabled] = useState(readEnabled)
  const pendingG = useRef<number | null>(null)
  const visibleRoutes = new Set(allNavItems.filter((i) => isVisible(i, user.role)).map((i) => i.route))
  const goKeys = Object.entries(GO).filter(([, to]) => visibleRoutes.has(to))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!enabled || e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector('[role="dialog"]')) return
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current)
        pendingG.current = null
        const to = GO[e.key]
        if (to && visibleRoutes.has(to)) {
          e.preventDefault()
          navigate(to)
        }
        return
      }
      switch (e.key) {
        case 'g':
          pendingG.current = window.setTimeout(() => (pendingG.current = null), 1000)
          break
        case '?':
          e.preventDefault()
          setHelp(true)
          break
        case '[':
          window.dispatchEvent(new Event('fortify:toggle-sidebar'))
          break
        case 'j':
          e.preventDefault()
          moveRow(1)
          break
        case 'k':
          e.preventDefault()
          moveRow(-1)
          break
        case 'x': {
          const box = (document.activeElement?.closest('tr') ?? null)?.querySelector<HTMLInputElement>('input[type="checkbox"]')
          if (box) {
            e.preventDefault()
            box.click()
          }
          break
        }
        case '/': {
          const search = document.querySelector<HTMLInputElement>('main input[placeholder^="Search"]')
          if (search) {
            e.preventDefault()
            search.focus()
          }
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggle = (on: boolean) => {
    setEnabled(on)
    try {
      localStorage.setItem(KEY, on ? '1' : '0')
    } catch {
      /* storage blocked: lasts until reload */
    }
  }
  const label = (to: string) => allNavItems.find((i) => i.route === to)?.label ?? to
  const row = (keys: string[], what: string) => (
    <li key={what} className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-base text-ink">{what}</span>
      <span className="flex gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
    </li>
  )
  return (
    <Dialog.Root open={help} onOpenChange={setHelp}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-strong/20" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[520px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-5 shadow-pop">
          <Dialog.Title className="text-lg font-medium text-strong">Keyboard shortcuts</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-muted">Single-key shortcuts never fire while you type in a field.</Dialog.Description>
          <h3 className="mt-4 text-sm font-semibold text-label">General</h3>
          <ul className="divide-y divide-fill">
            {row(['⌘', 'K'], 'Search')}
            {enabled && row(['?'], 'Show shortcuts')}
            {enabled && row(['['], 'Pin or unpin the sidebar')}
            {row(['Esc'], 'Close a dialog or menu')}
          </ul>
          {enabled && (
            <>
              <h3 className="mt-4 text-sm font-semibold text-label">Navigation</h3>
              <ul className="divide-y divide-fill">{goKeys.map(([k, to]) => row(['g', k], `Go to ${label(to)}`))}</ul>
              <h3 className="mt-4 text-sm font-semibold text-label">Lists</h3>
              <ul className="divide-y divide-fill">
                {row(['j'], 'Next row')}
                {row(['k'], 'Previous row')}
                {row(['Enter'], 'Open the row')}
                {row(['x'], 'Select the row')}
                {row(['/'], 'Focus the list search')}
              </ul>
            </>
          )}
          <label className="mt-5 flex items-center gap-2 border-t border-fill pt-4 text-base text-ink">
            <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="size-4 accent-primary" />
            Single-key shortcuts
          </label>
          <div className="mt-4 flex justify-end">
            <Dialog.Close className="h-9 rounded-md bg-surface px-3 text-base font-medium text-ink shadow-ring hover:bg-recessed">Close</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
