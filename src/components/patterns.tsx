import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import { downloadCsv } from '@/app/csv'
import { useIsMobile } from '@/app/media'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Download, Filter, SlidersHorizontal, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, controlCls, CountPill, cx, FilterChip, SearchField, Segmented, Select, Tip } from './ui/primitives'

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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content onChangeCapture={() => setDirty(true)} className="fixed inset-y-0 right-0 z-50 flex w-[480px] max-w-full flex-col bg-surface shadow-pop max-lg:w-full">
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
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/20" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[70] w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-5 shadow-pop">
            <Dialog.Title className="text-lg font-medium text-strong">Discard changes?</Dialog.Title>
            <Dialog.Description className="mt-2 text-base text-ink">What you entered in “{title}” will be lost.</Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button autoFocus>Keep editing</Button>
              </Dialog.Close>
              <Button variant="danger" onClick={() => { setAsking(false); setDirty(false); onOpenChange(false) }}>
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
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
            <Button variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={run}>
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
export const inputCls = cx(controlCls(), 'w-full')

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
        {actions && <div className="flex flex-wrap items-center gap-2 max-md:hidden">{actions}</div>}
      </div>
    </header>
  )
}

/** Underline tabs bound to ?tab= (rules.md: sub-views use query parameters). */
export function TabBar({ tabs, param = 'tab' }: { tabs: { id: string; label: string; count?: number | null }[]; param?: string }) {
  const [params, setParams] = useSearchParams()
  // An unknown value (a param carried over from another report) falls back to the first tab.
  const current = tabs.find((t) => t.id === params.get(param))?.id ?? tabs[0].id
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

export type Column<T> = {
  key: string
  label: string
  width?: number
  align?: 'right'
  sort?: (a: T, b: T) => number
  render: (row: T) => ReactNode
  /** Value for CSV export; defaults to the rendered value when it is plain text. */
  csv?: (row: T) => string | number | null
  /** Columns the viewer may not see (commission) are left out of the table and the export. */
  hidden?: boolean
  /** The one key value shown in stacked mobile rows. */
  mobile?: boolean
}
export interface BulkAction {
  label: string
  run: (ids: string[]) => void | Promise<void>
}

type TablePrefs = { hidden: string[]; compact: boolean }
function readPrefs(listId?: string): TablePrefs {
  if (!listId) return { hidden: [], compact: false }
  try {
    return { hidden: [], compact: false, ...JSON.parse(localStorage.getItem(`fortify.table.${listId}`) ?? '{}') }
  } catch {
    return { hidden: [], compact: false }
  }
}

/** Per-list Display options (US-FND-019): hidden columns and Compact rows, saved per browser. */
export function useTablePrefs(listId?: string) {
  const [prefs, setPrefs] = useState(() => readPrefs(listId))
  const save = (p: TablePrefs) => {
    setPrefs(p)
    try {
      if (listId) localStorage.setItem(`fortify.table.${listId}`, JSON.stringify(p))
    } catch {
      /* storage blocked: lasts until reload */
    }
  }
  return [prefs, save] as const
}

/** The Display button: row density and column visibility. The first column cannot be hidden. */
export function DisplayMenu({ columns, prefs, onChange }: { columns: { key: string; label: string }[]; prefs: TablePrefs; onChange: (p: TablePrefs) => void }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button>
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} /> Display
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-60 rounded-md bg-surface p-3 shadow-pop">
          <p className="mb-1 text-xs font-medium text-label">Rows</p>
          <Segmented size="sm" label="Row density" className="mb-3" value={prefs.compact ? 'compact' : 'comfortable'} onChange={(v) => onChange({ ...prefs, compact: v === 'compact' })} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
          <p className="mb-1 text-xs font-medium text-label">Columns</p>
          <ul>
            {columns.map((c, i) => (
              <li key={c.key}>
                <label className="flex min-h-8 items-center gap-2 text-base text-ink">
                  <input type="checkbox" disabled={i === 0} checked={i === 0 || !prefs.hidden.includes(c.key)} onChange={(e) => onChange({ ...prefs, hidden: e.target.checked ? prefs.hidden.filter((h) => h !== c.key) : [...prefs.hidden, c.key] })} className="size-4 accent-primary" />
                  {c.label}
                </label>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * Sortable table on the shared grammar (40px rows, ring container, sticky first column). Sorting lives in ?sort=.
 * US-FND-019: with `listId` it gets Display options (column visibility, Compact rows; saved per list) and Export;
 * with `bulkActions` rows get checkboxes, a selection bar, and "Select all N".
 */
export function DataTable<T extends { id: string }>({ rows, columns: allColumns, onRowClick, empty, minWidth, listId, exportName, bulkActions, bulkMax, toolbar, filters, extraChips, onClearFilters, actions, meta, className, search, pageSize }: { rows: T[]; columns: Column<T>[]; onRowClick?: (r: T) => void; empty?: ReactNode; minWidth?: number; listId?: string; exportName?: string; bulkActions?: BulkAction[]; bulkMax?: { n: number; message: string }; /** Left side of the list toolbar: search and view controls. */ toolbar?: ReactNode; /** URL-bound filters: a Filters menu in the toolbar and applied chips under it. */ filters?: FilterDef[]; /** Applied filters that are not in the Filters menu (a nudge from a callout), shown as chips; removing one clears its URL param. */ extraChips?: { k: string; label: string }[]; /** Also reset these params on Clear all (mutate `next`). */ onClearFilters?: (next: URLSearchParams) => void; /** Right side of the toolbar: secondary actions, then the one primary action. */ actions?: ReactNode; /** The meta line under the toolbar ("Showing 23 of 23 …"). */ meta?: ReactNode; className?: string; /** A search box in the toolbar bound to ?q, for lists whose page does no searching of its own. */ search?: { label: string; placeholder: string; match: (row: T, q: string) => boolean }; /** Paginate with the shared footer (?page, ?size). */ pageSize?: number }) {
  const [params, setParams] = useSearchParams()
  const [prefs, savePrefs] = useTablePrefs(listId)
  const q = search ? (params.get('q') ?? '').trim().toLowerCase() : ''
  const setQ = (v: string) => { const next = new URLSearchParams(params); if (v) next.set('q', v); else next.delete('q'); next.delete('page'); setParams(next, { replace: true }) }
  const searchBox = search && <SearchField label={search.label} placeholder={search.placeholder} value={params.get('q') ?? ''} onChange={setQ} />
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const mobile = useIsMobile()
  const available = allColumns.filter((c) => !c.hidden)
  const columns = available.filter((c, i) => i === 0 || !prefs.hidden.includes(c.key))
  const sortParam = params.get('sort')
  const key = sortParam?.replace(/^-/, '')
  const dir = sortParam?.startsWith('-') ? -1 : 1
  const col = columns.find((c) => c.key === key && c.sort)
  const found = q ? rows.filter((r) => search!.match(r, q)) : rows
  const sorted = col ? [...found].sort((a, b) => dir * col.sort!(a, b)) : found
  const size = pageSize ? (PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : pageSize) : Infinity
  const pageCount = Math.max(1, Math.ceil(sorted.length / size))
  const page = Math.min(pageCount, Math.max(1, Math.trunc(Number(params.get('page'))) || 1))
  const shown = pageSize ? sorted.slice((page - 1) * size, page * size) : sorted
  const footer = pageSize && sorted.length > Math.min(...PAGE_SIZES) && (
    <TablePagination page={page} pageSize={size} total={sorted.length} defaultSize={pageSize} />
  )
  const onSort = (k: string) => {
    const next = new URLSearchParams(params)
    const v = key !== k ? k : dir === 1 ? `-${k}` : null
    if (v) next.set('sort', v)
    else next.delete('sort')
    setParams(next, { replace: true })
  }
  // Selection only keeps rows still in the current result.
  const ids = new Set(found.map((r) => r.id))
  const sel = [...selected].filter((id) => ids.has(id))
  const pageIds = shown.map((r) => r.id)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const exportCsv = () => {
    const value = (c: Column<T>, r: T) => {
      if (c.csv) return c.csv(r)
      const v = c.render(r)
      return typeof v === 'string' || typeof v === 'number' ? v : ''
    }
    downloadCsv(exportName ?? listId ?? 'export', columns.map((c) => c.label), sorted.map((r) => columns.map((c) => value(c, r))))
  }
  const rowH = prefs.compact ? 'h-8' : 'h-10'
  if (mobile) {
    // US-FND-011: below 768px rows stack: primary column, status, and one key value; 56px, still open on tap.
    const [primary, ...rest] = columns
    const status = rest.find((c) => c.key === 'status' || c.label === 'Status' || c.label === 'Stage')
    const value = rest.find((c) => c.mobile) ?? rest.find((c) => c.align === 'right') ?? rest.find((c) => c !== status)
    return (
      <div className={className}>
        {(toolbar || search || !!filters?.length) && <ListToolbar>{searchBox}{toolbar}{!!filters?.length && <FilterMenu filters={filters} />}</ListToolbar>}
        {(filters || extraChips) && <FilterChips filters={filters ?? []} extra={extraChips} onClearAll={onClearFilters} className="mt-3" />}
        {meta != null && <p className="tabular mt-3 text-sm text-muted" aria-live="polite">{meta}</p>}
        <ul className={cx('divide-y divide-fill overflow-hidden rounded-md bg-surface shadow-ring', (!!toolbar || !!search || !!filters?.length || meta != null) && 'mt-2')}>
          {shown.map((r) => (
            <li key={r.id}>
              <div
                role={onRowClick ? 'link' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={(e) => onRowClick && !(e.target as HTMLElement).closest('a,button') && onRowClick(r)}
                onKeyDown={(e) => onRowClick && e.key === 'Enter' && onRowClick(r)}
                className={cx('flex min-h-14 items-center gap-3 px-3 py-2 text-base', onRowClick && 'cursor-pointer active:bg-recessed')}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate [&_a]:inline-block [&_a]:min-h-6 [&_a]:max-w-full [&_a]:py-0.5">{primary.render(r)}</div>
                  {status && <div className="mt-0.5 text-sm">{status.render(r)}</div>}
                </div>
                {value && <div className="tabular max-w-[45%] shrink-0 truncate text-right text-sm text-label">{value.render(r)}</div>}
              </div>
            </li>
          ))}
        </ul>
        {sorted.length === 0 && empty}
        {footer}
      </div>
    )
  }
  const hasToolbar = !!(toolbar || search || filters?.length || listId || actions)
  // The primary column keeps at least 280px (DESIGN.md › Data Table); narrower windows scroll with it sticky.
  const tableMin = Math.max(minWidth ?? 0, columns[0]?.width ? 0 : 280 + columns.slice(1).reduce((sum, c) => sum + (c.width ?? 120), 0) + (bulkActions ? 40 : 0))
  const display = listId && <DisplayMenu columns={available} prefs={prefs} onChange={savePrefs} />
  return (
    <div className={className}>
      {hasToolbar && (
        <ListToolbar end={actions}>
          {searchBox}
          {toolbar}
          {filters && filters.length > 0 && <FilterMenu filters={filters} />}
          {display}
          {listId && (
            <Button onClick={exportCsv} disabled={sorted.length === 0}>
              <Download aria-hidden className="size-4" strokeWidth={1.75} /> Export
            </Button>
          )}
        </ListToolbar>
      )}
      {(filters || extraChips) && <FilterChips filters={filters ?? []} extra={extraChips} onClearAll={onClearFilters} className="mt-3" />}
      {sel.length > 0 && bulkActions && (
        <SelectionBar count={sel.length} total={found.length} matching={shown.length < found.length} onSelectAll={found.every((r) => selected.has(r.id)) ? undefined : () => setSelected(new Set(found.map((r) => r.id)))} onClear={() => setSelected(new Set())}>
          {bulkActions.map((a) => (
            <Button key={a.label} size="sm" disabled={!!bulkMax && sel.length > bulkMax.n} onClick={async () => { await a.run(sel); setSelected(new Set()) }}>{a.label}</Button>
          ))}
          {bulkMax && sel.length > bulkMax.n && <span className="text-sm text-warning-text">{bulkMax.message}</span>}
        </SelectionBar>
      )}
      {meta != null && <p className="tabular mt-3 text-sm text-muted" aria-live="polite">{meta}</p>}
      <div className={cx('overflow-x-auto bg-surface shadow-ring', footer ? 'rounded-t-md' : 'rounded-md', meta != null ? 'mt-2' : hasToolbar && 'mt-3')}>
        <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: tableMin }}>
          <colgroup>
            {bulkActions && <col style={{ width: 40 }} />}
            {columns.map((c) => (
              <col key={c.key} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr className="h-10 border-b border-fill">
              {bulkActions && (
                <th className="sticky left-0 z-20 w-10 bg-surface pl-3">
                  <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSelected(allOnPage ? new Set() : new Set(pageIds))} className="size-4 accent-primary" />
                </th>
              )}
              {columns.map((c, i) => (
                <th key={c.key} scope="col" aria-sort={key === c.key ? (dir === 1 ? 'ascending' : 'descending') : undefined} className={cx('px-3 text-base font-semibold whitespace-nowrap text-strong', c.align === 'right' && 'text-right', i === 0 && cx('sticky z-10 bg-surface', bulkActions ? 'left-10' : 'left-0'))}>
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
            {shown.map((r) => (
              <tr key={r.id} onClick={(e) => onRowClick && !(e.target as HTMLElement).closest('a,button,input,label') && onRowClick(r)} className={cx(rowH, 'border-b border-fill text-base transition-colors duration-100', selected.has(r.id) ? 'bg-recessed' : 'bg-surface', onRowClick && 'cursor-pointer hover:bg-recessed')}>
                {bulkActions && (
                  <td className="sticky left-0 z-10 bg-inherit pl-3">
                    <input type="checkbox" aria-label={`Select row ${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-primary" />
                  </td>
                )}
                {columns.map((c, i) => (
                  <td key={c.key} className={cx('truncate px-3', c.align === 'right' && 'tabular text-right', i === 0 && cx('sticky z-10 bg-inherit', bulkActions ? 'left-10' : 'left-0'))}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && empty}
      </div>
      {footer}
    </div>
  )
}

/** Saved view tabs with counts, bound to ?view= (US-FND-007). */
export function ViewTabs({ views, counts, param = 'view' }: { views: string[]; counts: Record<string, number> | null; /** URL param for the saved view; lists that use ?view for Board/List pass 'saved'. */ param?: string }) {
  const [params, setParams] = useSearchParams()
  const slug = (v: string) => v.toLowerCase().replace(/\s+/g, '-')
  const current = views.find((v) => slug(v) === params.get(param)) ?? views[0]
  return (
    <nav aria-label="Saved views" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
      {views.map((v) => (
        <button
          key={v}
          aria-current={v === current ? 'page' : undefined}
          onClick={() => {
            const next = new URLSearchParams(params)
            if (v === views[0]) next.delete(param)
            else next.set(param, slug(v))
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
export function useView(views: string[], param = 'view') {
  const [params] = useSearchParams()
  return views.find((v) => v.toLowerCase().replace(/\s+/g, '-') === params.get(param)) ?? views[0]
}

/** List page title block used by every module list. */
export function PageTitle({ title, description, actions, badge, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; badge?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex items-start justify-between gap-6', className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-title font-semibold text-strong">{title}{badge}</h1>
        {description && <p className="mt-1 text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 max-md:hidden">{actions}</div>}
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
          {actions && <div className="max-md:hidden">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export type AttentionItem = { key: string; title: string; detail?: string; to?: string; onClick?: () => void }
/** HOM-015 / PIP-016 / REN-003 / CLM-006: collapsible "Needs attention" callout; collapse state persists per browser. */
export function AttentionCallout({ items, storageKey, storage = 'local', title = 'Needs attention', max = 5, badge = true, children }: { items: AttentionItem[]; storageKey: string; storage?: 'local' | 'session'; title?: string; max?: number; badge?: boolean; children?: ReactNode }) {
  const store = () => (storage === 'local' ? localStorage : sessionStorage)
  const [collapsed, setCollapsed] = useState(() => { try { return store().getItem(storageKey) === '1' } catch { return false } })
  if (!items.length) return null
  const toggle = () => { const n = !collapsed; setCollapsed(n); try { store().setItem(storageKey, n ? '1' : '0') } catch { /* storage blocked */ } }
  return (
    <section aria-label={title} className="rounded-md bg-warning-tint px-3 py-2 shadow-ring">
      <button aria-expanded={!collapsed} onClick={toggle} className="flex w-full items-center gap-2 text-left text-base font-medium text-ink">
        <AlertTriangle aria-hidden className="size-4 text-warning-text" strokeWidth={1.75} />{title}
        {badge && <CountPill n={items.length} onTint />}
        <ChevronDown aria-hidden className={cx('ml-auto size-4 transition-transform', !collapsed && 'rotate-180')} strokeWidth={1.75} />
      </button>
      {!collapsed && (
        <ul className="mt-1.5 flex flex-col gap-1">
          {items.slice(0, max).map((i) => {
            const body = <><span className="block font-medium text-ink">{i.title}</span>{i.detail && <span className="block text-sm text-label">{i.detail}</span>}</>
            return <li key={i.key}>{i.to ? <Link to={i.to} onClick={i.onClick} className="block rounded-sm py-0.5 hover:underline">{body}</Link> : i.onClick ? <button onClick={i.onClick} className="block w-full py-0.5 text-left hover:underline">{body}</button> : <div className="py-0.5">{body}</div>}</li>
          })}
          {children}
        </ul>
      )}
    </section>
  )
}

/** P2 bulk stories: pick one value (and an optional note) to apply to the selected rows. */
export function BulkPickDialog({ title, label, options, note, onConfirm, onClose, confirmLabel = 'Apply', empty }: { title: string; label: string; options: [string, string, boolean?][]; note?: { label: string; required: (v: string) => boolean }; onConfirm: (value: string, note: string) => Promise<void> | void; onClose: () => void; confirmLabel?: string; empty?: string }) {
  const [value, setValue] = useState(options.find((o) => !o[2])?.[0] ?? '')
  const [text, setText] = useState('')
  const needNote = !!note && note.required(value)
  return (
    <Confirm open onOpenChange={(o) => !o && onClose()} title={title} body="" confirmLabel={confirmLabel} onConfirm={async () => { if (!value || (needNote && !text.trim())) return; await onConfirm(value, text.trim()); onClose() }}>
      {options.length === 0 ? (
        <p className="text-base text-label">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Field label={label}><select className={inputCls} value={value} onChange={(e) => setValue(e.target.value)}>{options.map(([v, l, disabled]) => <option key={v} value={v} disabled={disabled}>{l}</option>)}</select></Field>
          {note && <Field label={needNote ? note.label : `${note.label} (optional)`}><textarea className={cx(inputCls, 'h-20 py-2')} value={text} onChange={(e) => setText(e.target.value)} /></Field>}
        </div>
      )}
    </Confirm>
  )
}

/** A URL-bound filter: `opts` are [value, label]; an empty value means "no filter". `empty` labels that option ("Any" by default), or false when an option already covers it. */
export type FilterDef = { k: string; label: string; opts: [string, string][]; empty?: string | false }
const filterValue = (p: URLSearchParams, f: FilterDef) => p.get(f.k) ?? ''

/** Filters button with a popover of selects, bound to ?<k>= (DESIGN.md › Layout). Changing a filter resets ?page. */
export function FilterMenu({ filters, children, count }: { filters: FilterDef[]; children?: ReactNode; /** Active-filter count when `children` hold filters of their own (multi-value pickers). */ count?: number }) {
  const [params, setParams] = useSearchParams()
  const active = count ?? filters.filter((f) => filterValue(params, f)).length
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    next.delete('page')
    setParams(next, { replace: true })
  }
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button>
          <Filter aria-hidden className="size-4" strokeWidth={1.75} /> Filters
          {active > 0 && <CountPill n={active} />}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-50 flex w-72 flex-col gap-3 rounded-md bg-surface p-4 shadow-pop">
          {filters.map((f) => (
            <label key={f.k} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-label">{f.label}</span>
              <Select value={filterValue(params, f)} onChange={(e) => set(f.k, e.target.value)}>
                {f.empty !== false && <option value="">{f.empty ?? 'Any'}</option>}
                {f.opts.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </label>
          ))}
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Applied filter chips ("Status is Open") with Clear all; renders nothing when no filter is set. */
export function FilterChips({ filters, extra = [], onClearAll, className }: { filters: FilterDef[]; extra?: { k: string; label: string }[]; /** Extra params to reset with Clear all (a saved view); mutate `next`. */ onClearAll?: (next: URLSearchParams) => void; className?: string }) {
  const [params, setParams] = useSearchParams()
  const chips = [...filters.filter((f) => filterValue(params, f)).map((f) => ({ k: f.k, label: `${f.label} is ${f.opts.find(([v]) => v === params.get(f.k))?.[1] ?? params.get(f.k)}` })), ...extra]
  if (!chips.length) return null
  const clear = (keys: string[], also?: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    keys.forEach((k) => next.delete(k))
    next.delete('page')
    also?.(next)
    setParams(next, { replace: true })
  }
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      {chips.map((c) => (
        <FilterChip key={c.k} label={c.label} onRemove={() => clear([c.k])} />
      ))}
      <button type="button" onClick={() => clear(chips.map((c) => c.k), onClearAll)} className="text-sm font-medium text-link hover:underline">
        Clear all
      </button>
    </div>
  )
}

/** The list toolbar row: search, Filters, view controls, Display, Export on the left; secondary then primary actions at the far right. */
export function ListToolbar({ children, end, className }: { children?: ReactNode; end?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      {children}
      <div className="flex-1" />
      {end && <div className="flex flex-wrap items-center gap-2 max-md:hidden">{end}</div>}
    </div>
  )
}

/** Bulk selection bar shown above a table while rows are selected. */
export function SelectionBar({ count, total, onSelectAll, onClear, children, matching }: { count: number; total?: number; onSelectAll?: () => void; onClear: () => void; children: ReactNode; /** The total spans pages: say "matching". */ matching?: boolean }) {
  return (
    <div role="region" aria-label="Selection" className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-recessed px-3 py-1">
      <span className="tabular text-sm font-medium text-strong">{count.toLocaleString('en-US')} selected</span>
      {onSelectAll && total != null && (
        <button type="button" onClick={onSelectAll} className="text-sm text-link hover:underline">Select all {total.toLocaleString('en-US')}{matching && ' matching'}</button>
      )}
      {children}
      <button type="button" onClick={onClear} className="text-sm text-link hover:underline">Clear selection</button>
    </div>
  )
}

/** Small table inside a panel or sheet: the same grammar as DataTable (12px cells, 40px rows, fill dividers) without a toolbar. */
export const mini = {
  table: 'w-full border-collapse text-left text-base',
  th: 'h-10 px-3 text-base font-semibold whitespace-nowrap text-strong',
  td: 'h-10 px-3',
  tr: 'border-b border-fill last:border-b-0',
  head: 'border-b border-fill',
}

export const PAGE_SIZES = [25, 50, 100]
/** The table footer (DESIGN.md › Data Table): range, rows per page, Previous/Next. Bound to ?page and ?size. */
export function TablePagination({ page, pageSize, total, defaultSize = 50 }: { page: number; pageSize: number; total: number; defaultSize?: number }) {
  const [params, setParams] = useSearchParams()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setParams(next, { replace: true })
  }
  return (
    <div className="tabular flex items-center justify-between rounded-b-md border-t border-fill bg-surface px-3 py-2 text-sm text-label shadow-ring">
      <span className="flex items-center gap-4">
        <span>
          {((page - 1) * pageSize + 1).toLocaleString('en-US')}–{Math.min(page * pageSize, total).toLocaleString('en-US')} of {total.toLocaleString('en-US')}
        </span>
        <label className="flex items-center gap-1.5 max-sm:hidden">
          Rows per page
          <Select size="sm" value={pageSize} onChange={(e) => set({ size: Number(e.target.value) === defaultSize ? null : e.target.value, page: null })}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </label>
      </span>
      <span className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => set({ page: page - 1 > 1 ? String(page - 1) : null })}>Previous</Button>
        <Button size="sm" disabled={page >= pageCount} onClick={() => set({ page: String(page + 1) })}>Next</Button>
      </span>
    </div>
  )
}

/**
 * The primary column of every list (DESIGN.md › Data Table): kind icon, the name (14/500 strong, a link, truncated)
 * and a muted 13px secondary token, on one line.
 */
export function PrimaryCell({ icon: Icon, iconLabel, name, to, token, mono }: { icon?: LucideIcon; iconLabel?: string; name: ReactNode; to?: string; token?: ReactNode; /** A reference ID shown before the name (CERT-0131, SR-10439). */ mono?: ReactNode }) {
  const label = typeof name === 'string' ? name : undefined
  return (
    <div className="flex min-w-0 items-center gap-2">
      {Icon && <Icon {...(iconLabel ? { 'aria-label': iconLabel } : { 'aria-hidden': true })} className="size-4 shrink-0 text-muted" strokeWidth={1.75} />}
      {mono && <span className="shrink-0 font-mono text-sm text-label">{mono}</span>}
      {to ? (
        <Link to={to} title={label} className="max-w-[72%] flex-none truncate font-medium text-strong hover:text-link hover:underline">{name}</Link>
      ) : (
        <span title={label} className="max-w-[72%] flex-none truncate font-medium text-strong">{name}</span>
      )}
      {token && <span className="min-w-0 truncate text-sm text-muted">{token}</span>}
    </div>
  )
}

/** Boards (Pipeline, Service) show at most this many cards per column. */
export const BOARD_CAP = 50
/** A board column: recessed well, 14/600 title with a count pill and optional muted figure, then cards. */
export function BoardColumn({ title, count, figure, children, footer }: { title: string; count: number; figure?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col rounded-md bg-recessed p-2">
      <h2 className="flex items-center gap-2 px-1.5 pb-2 text-base font-semibold text-strong">
        {title}
        <CountPill n={count} />
        {figure && <span className="tabular ml-auto text-sm font-normal text-label">{figure}</span>}
      </h2>
      <ol className="flex flex-col gap-2">{children}</ol>
      {footer}
    </section>
  )
}
/** A board card: white with a ring, 12px padding, Well Grey on hover (never the Pop shadow). */
export const boardCard = 'rounded-md bg-surface p-3 text-left shadow-ring transition-colors duration-150 hover:bg-recessed'
