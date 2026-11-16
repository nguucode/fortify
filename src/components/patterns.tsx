import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDown, ArrowUp, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, CountPill, cx, Tip } from './ui/primitives'

/**
 * Side sheet for create/edit forms (US-FND-014). 480px, focus-trapped, Esc closes unless busy.
 * Once any field changes, Esc / outside click / X / SheetCancel ask "Discard changes?" first; a reload warns too.
 * shortcut: in-app link navigation is not guarded (BrowserRouter has no useBlocker); the overlay already blocks the shell.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, busy }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; footer: ReactNode; busy?: boolean }) {
  const [dirty, setDirty] = useState(false)
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    if (!open || !dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [open, dirty])
  const request = (o: boolean) => {
    if (busy) return
    if (!o && dirty) setAsking(true)
    else onOpenChange(o)
  }
  return (
    <Dialog.Root open={open} onOpenChange={request}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-strong/20" />
        <Dialog.Content onChangeCapture={() => setDirty(true)} className="fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col bg-surface shadow-pop">
          <header className="flex items-start justify-between gap-4 border-b border-fill px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-medium text-strong">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close aria-label="Close" className="grid size-8 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong">
              <X className="size-4" />
            </Dialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          <footer className="flex justify-end gap-2 border-t border-fill px-5 py-3">{footer}</footer>
        </Dialog.Content>
      </Dialog.Portal>
      <Dialog.Root open={asking} onOpenChange={setAsking}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-strong/20" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[70] w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-5 shadow-pop">
            <Dialog.Title className="text-lg font-medium text-strong">Discard changes?</Dialog.Title>
            <Dialog.Description className="mt-2 text-base text-ink">What you entered in “{title}” will be lost.</Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button autoFocus>Keep editing</Button>
              </Dialog.Close>
              <Button variant="primary" className="bg-danger hover:bg-danger-text" onClick={() => { setAsking(false); setDirty(false); onOpenChange(false) }}>
                Discard
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  )
}

/** Footer Cancel for a Sheet: closes through the sheet, so the unsaved-changes guard applies. */
export function SheetCancel({ disabled, children = 'Cancel' }: { disabled?: boolean; children?: ReactNode }) {
  return (
    <Dialog.Close asChild>
      <Button disabled={disabled}>{children}</Button>
    </Dialog.Close>
  )
}

/** Confirmation for lifecycle-ending or consequential actions (US-FND-015). Cancel is focused by default. */
export function Confirm({ open, onOpenChange, title, body, confirmLabel, danger, onConfirm, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => Promise<void> | void; children?: ReactNode }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-strong/20" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-5 shadow-pop">
          <Dialog.Title className="text-lg font-medium text-strong">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 text-base text-ink">{body}</div>
          </Dialog.Description>
          {children && <div className="mt-4 flex flex-col gap-3">{children}</div>}
          {error && <p role="alert" className="mt-3 text-sm text-danger-text">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button autoFocus disabled={busy}>Cancel</Button>
            </Dialog.Close>
            <Button variant="primary" className={danger ? 'bg-danger hover:bg-danger-text' : undefined} disabled={busy} onClick={run}>
              {busy ? 'Saving…' : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-label">{label}</span>
      {children}
      {error ? <span className="text-sm text-danger-text">{error}</span> : hint && <span className="text-sm text-muted">{hint}</span>}
    </label>
  )
}
export const inputCls = 'h-9 w-full rounded-md bg-surface px-2.5 text-base shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary'

/** Record page header (US-FND-013): back link, title, meta, status, actions. Sticky under the top bar. */
export function RecordHeader({ back, icon: Icon, title, meta, status, actions }: { back: { to: string; label: string }; icon?: LucideIcon; title: ReactNode; meta?: ReactNode; status?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas px-8 pt-4 pb-4 max-sm:px-4">
      <Link to={back.to} className="text-sm text-label hover:text-link hover:underline">
        ← {back.label}
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-start gap-2 text-title font-semibold text-strong">
            {Icon && <Icon aria-hidden className="mt-[3px] size-6 shrink-0 text-muted" strokeWidth={1.75} />}
            <span className="min-w-0 sm:truncate">{title}</span>
          </h1>
          {(meta || status) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-label">
              {status}
              {meta}
            </div>
          )}
        </div>
        {/* Mobile is read-only (PRODUCT.md): record actions hide below 640px. */}
        {actions && <div className="flex flex-wrap items-center gap-2 max-sm:hidden">{actions}</div>}
      </div>
    </header>
  )
}

/** Underline tabs bound to ?tab= (rules.md: sub-views use query parameters). */
export function TabBar({ tabs, param = 'tab' }: { tabs: { id: string; label: string; count?: number | null }[]; param?: string }) {
  const [params, setParams] = useSearchParams()
  const current = params.get(param) ?? tabs[0].id
  return (
    <nav aria-label="Sections" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = t.id === current
        return (
          <button
            key={t.id}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (t.id === tabs[0].id) next.delete(param)
              else next.set(param, t.id)
              setParams(next, { replace: true })
            }}
            className={cx('-mb-px flex items-center gap-2 border-b-2 px-2.5 py-2 text-base whitespace-nowrap', active ? 'border-strong font-medium text-strong' : 'border-transparent text-label hover:text-strong')}
          >
            {t.label}
            {t.count != null && t.count > 0 && <CountPill n={t.count} />}
          </button>
        )
      })}
    </nav>
  )
}
export const useTab = (fallback: string, param = 'tab') => useSearchParams()[0].get(param) ?? fallback

export type Column<T> = { key: string; label: string; width?: number; align?: 'right'; sort?: (a: T, b: T) => number; render: (row: T) => ReactNode }

/** Plain sortable table on the shared grammar (40px rows, ring container). Sorting state lives in ?sort=. */
export function DataTable<T extends { id: string }>({ rows, columns, onRowClick, empty, minWidth }: { rows: T[]; columns: Column<T>[]; onRowClick?: (r: T) => void; empty?: ReactNode; minWidth?: number }) {
  const [params, setParams] = useSearchParams()
  const sortParam = params.get('sort')
  const key = sortParam?.replace(/^-/, '')
  const dir = sortParam?.startsWith('-') ? -1 : 1
  const col = columns.find((c) => c.key === key && c.sort)
  const sorted = col ? [...rows].sort((a, b) => dir * col.sort!(a, b)) : rows
  const onSort = (k: string) => {
    const next = new URLSearchParams(params)
    const v = key !== k ? k : dir === 1 ? `-${k}` : null
    if (v) next.set('sort', v)
    else next.delete('sort')
    setParams(next, { replace: true })
  }
  return (
    <div className="overflow-x-auto rounded-md bg-surface shadow-ring">
      <table className="w-full table-fixed border-collapse text-left" style={{ minWidth }}>
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr className="h-10 border-b border-fill">
            {columns.map((c, i) => (
              <th key={c.key} scope="col" aria-sort={key === c.key ? (dir === 1 ? 'ascending' : 'descending') : undefined} className={cx('px-3 text-base font-semibold whitespace-nowrap text-strong', c.align === 'right' && 'text-right', i === 0 && 'sticky left-0 z-10 bg-surface')}>
                {c.sort ? (
                  <button onClick={() => onSort(c.key)} className={cx('inline-flex items-center gap-1 rounded-sm hover:text-link', c.align === 'right' && 'flex-row-reverse')}>
                    {c.label}
                    {key === c.key && (dir === 1 ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />)}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} onClick={(e) => onRowClick && !(e.target as HTMLElement).closest('a,button') && onRowClick(r)} className={cx('h-10 border-b border-fill bg-surface text-base transition-colors duration-100', onRowClick && 'cursor-pointer hover:bg-recessed')}>
              {columns.map((c, i) => (
                <td key={c.key} className={cx('truncate px-3', c.align === 'right' && 'tabular text-right', i === 0 && 'sticky left-0 z-10 bg-inherit')}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && empty}
    </div>
  )
}

/** Saved view tabs with counts, bound to ?view= (US-FND-007). */
export function ViewTabs({ views, counts }: { views: string[]; counts: Record<string, number> | null }) {
  const [params, setParams] = useSearchParams()
  const slug = (v: string) => v.toLowerCase().replace(/\s+/g, '-')
  const current = views.find((v) => slug(v) === params.get('view')) ?? views[0]
  return (
    <nav aria-label="Saved views" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
      {views.map((v) => (
        <button
          key={v}
          aria-current={v === current ? 'page' : undefined}
          onClick={() => {
            const next = new URLSearchParams(params)
            if (v === views[0]) next.delete('view')
            else next.set('view', slug(v))
            next.delete('page')
            setParams(next, { replace: true })
          }}
          className={cx('-mb-px flex items-center gap-2 border-b-2 px-2.5 py-2 text-base whitespace-nowrap', v === current ? 'border-strong font-medium text-strong' : 'border-transparent text-label hover:text-strong')}
        >
          {v}
          <CountPill n={counts ? (counts[v] ?? 0) : null} />
        </button>
      ))}
    </nav>
  )
}
export function useView(views: string[]) {
  const [params] = useSearchParams()
  return views.find((v) => v.toLowerCase().replace(/\s+/g, '-') === params.get('view')) ?? views[0]
}

/** List page title block used by every module list. */
export function PageTitle({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-title font-semibold text-strong">{title}</h1>
        <p className="mt-1 text-base text-muted">{description}</p>
      </div>
      {actions && <div className="flex gap-2 max-sm:hidden">{actions}</div>}
    </header>
  )
}

/** A disabled control with the reason in a tooltip (US-FND-018: disabled actions explain why). */
/**
 * Permission gate (US-FND-018 / FND-012): the control stays focusable with aria-disabled so its reason tooltip is
 * reachable by keyboard, and activation (click or Enter/Space) is swallowed before it reaches the control.
 */
export function Gate({ allowed, reason, children }: { allowed: boolean; reason: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (allowed) return
    ref.current?.querySelectorAll('button, a, input, select, textarea').forEach((el) => el.setAttribute('aria-disabled', 'true'))
  }, [allowed, children])
  if (allowed) return <>{children}</>
  const block = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <Tip label={reason}>
      <span ref={ref} onClickCapture={block} onPointerDownCapture={block} className="inline-flex cursor-not-allowed [&_*]:cursor-not-allowed [&>*]:opacity-50">
        {children}
      </span>
    </Tip>
  )
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(120px,max-content)_1fr] gap-x-6 gap-y-2 text-base">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-label">{k}</dt>
          <dd className="min-w-0 text-ink [overflow-wrap:anywhere]">{v ?? <span className="text-muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Panel({ title, children, actions, className }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-md bg-surface p-4 shadow-ring', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-lg font-medium text-strong">{title}</h2>}
          {actions && <div className="max-sm:hidden">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
