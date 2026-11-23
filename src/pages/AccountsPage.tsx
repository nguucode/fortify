import { downloadCsv } from '@/app/csv'
import { AccountFormSheet, ReassignDialog } from './AccountSheets'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Building2, Download, Home, Plus, SearchX, Users } from 'lucide-react'
import { accountRows, useApp, useDemoControls } from '@/app/store'
import { savedViewsFor } from '@/app/sitemap'
import { scopeOf, visibleAccounts } from '@/domain/access'
import { ACCOUNT_VIEWS, queryAccounts, type AccountRow, type AccountSortKey, type AccountView } from '@/domain/accounts'
import { daysBetween, formatUSDate } from '@/mock/dates'
import { Button, cx, Due, ProgressLine, SearchField, Tip } from '@/components/ui/primitives'
import { DisplayMenu, PAGE_SIZES, TablePagination, FilterChips, FilterMenu, ListToolbar, PageTitle, SelectionBar, useTablePrefs, ViewTabs, type FilterDef } from '@/components/patterns'
import { dueTone } from '@/domain/urgency'
import { useIsMobile } from '@/app/media'
import { StatusCell } from '@/components/ui/status'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { RibbonAxis, TermRibbon } from '@/components/TermRibbon'

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compactUsd = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : usd(n))
const slug = (v: string) => v.toLowerCase().replace(/\s+/g, '-')
const VIEW_COPY: Record<AccountView, [string, string]> = {
  All: ['Your Book is empty', 'Ask your Principal to assign Accounts, or create one.'],
  // Account Managers see their Office, not a Book of their own (roles.md).
  Prospects: ['No prospects in your Book yet', 'Qualified leads become Prospects here.'],
  Clients: ['No clients yet', 'An Account becomes a Client when its first Term is bound.'],
  'Former clients': ['No former clients', 'Accounts with no active Term appear here.'],
  Households: ['No households yet', 'Personal-lines Accounts appear here.'],
  Businesses: ['No businesses yet', 'Commercial-lines Accounts appear here.'],
}

type Col = { key: AccountSortKey | 'ribbon'; label: string; align?: 'right'; sortable?: boolean; width?: number }
// Fixed widths for every column but Account, which keeps at least 284px; the table fits 1320px of content at 1440. Office is not a column: agency-scope
// roles see it as the Account's muted second token, and it is constant for Own and Office scopes (US-ACC-001 adaptation).
const COLS: Col[] = [
  { key: 'name', label: 'Account', sortable: true },
  { key: 'status', label: 'Status', sortable: true, width: 108 },
  { key: 'producerName', label: 'Producer', sortable: true, width: 152 },
  { key: 'accountManagerName', label: 'Account Manager', sortable: true, width: 164 },
  { key: 'activePolicyCount', label: 'Active policies', align: 'right', sortable: true, width: 116 },
  { key: 'annualPremium', label: 'Annual premium', align: 'right', sortable: true, width: 132 },
  { key: 'nextExpiration', label: 'Next expiration', sortable: true, width: 120 },
  { key: 'ribbon', label: 'Next 12 months', width: 144 },
  { key: 'lastActivity', label: 'Last activity', sortable: true, width: 100 },
]

// One format for the whole column: relative, with the absolute date in a tooltip.
function relative(d: Date, today: Date) {
  const days = -daysBetween(today, d)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function AccountsPage() {
  const { user, api, data, officeFilter } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const views = savedViewsFor('/accounts') as AccountView[]
  const view = views.find((v) => slug(v) === params.get('view')) ?? views[0] ?? ACCOUNT_VIEWS[0]
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const sortParam = params.get('sort')
  const sort = sortParam ? { key: sortParam.replace(/^-/, '') as AccountSortKey, dir: sortParam.startsWith('-') ? ('desc' as const) : ('asc' as const) } : undefined
  const page = Math.max(1, Math.trunc(Number(params.get('page'))) || 1)
  const pageSize = PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 50
  const filters = {
    officeId: params.get('office') ?? officeFilter ?? undefined,
    producerId: params.get('producer') ?? undefined,
    accountManagerId: params.get('am') ?? undefined,
    state: (params.get('state') as 'TX' | 'FL' | null) ?? undefined,
    status: (params.get('status') as AccountRow['status'] | null) ?? undefined,
    kind: (params.get('kind') as AccountRow['kind'] | null) ?? undefined,
  }
  const includeArchived = user.role === 'admin' && params.get('archived') === '1'
  const FILTER_KEYS = ['office', 'producer', 'am', 'state', 'status', 'kind', 'archived']

  const set = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  // Search narrows after 300ms without typing (US-ACC-001).
  useEffect(() => {
    if (draft === q) return
    const t = setTimeout(() => set({ q: draft || null }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  // `loaded` stays true across refetches so rows remain in place under a progress line (US-FND-007).
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reassign, setReassign] = useState(false)
  const mobile = useIsMobile()
  // Mobile is a read-only rendition (US-FND-011): no bulk selection.
  const canBulk = !mobile && (user.role === 'principal' || user.role === 'admin')
  const [state, setState] = useState<{ status: 'loading' | 'error' | 'ready'; loaded: boolean; rows: AccountRow[]; refId?: string }>({ status: 'loading', loaded: false, rows: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, status: 'loading' }))
    api
      .request('/accounts', (empty) => (empty ? [] : visibleAccounts(user, accountRows())))
      .then((rows) => live && setState({ status: 'ready', loaded: true, rows }))
      .catch(() => live && setState({ status: 'error', loaded: false, rows: [], refId: `ERR-${Math.random().toString(16).slice(2, 6).toUpperCase()}` }))
    return () => {
      live = false
    }
  }, [api, user, attempt])
  // Refetch when a presenter flips a Demo control, so empty and error states show at once (not on mount).
  const controls = useDemoControls()
  const firstControls = useRef(true)
  useEffect(() => {
    if (firstControls.current) {
      firstControls.current = false
      return
    }
    setAttempt((n) => n + 1)
  }, [controls.forceErrorOn, controls.empty])

  const today = useMemo(() => new Date(), [])
  const [prefs, savePrefs] = useTablePrefs('accounts')
  const cols = COLS.filter((c, i) => i === 0 || !prefs.hidden.includes(c.key))
  const rowH = prefs.compact ? 'h-8' : 'h-10'
  const agencyScope = scopeOf(user) === 'Agency'
  const result = queryAccounts(state.rows, { view, search: q, filters, sort, page, pageSize, includeArchived })
  const isFiltered = !!(q || officeFilter || FILTER_KEYS.some((k) => params.get(k)))
  const ready = state.status === 'ready'
  const refetching = state.status === 'loading' && state.loaded
  const showRows = ready || refetching
  const emptyCopy: [string, string] =
    view === 'All' && user.role === 'account-manager' ? ['No accounts in your Office yet', 'Accounts assigned to your Office appear here.'] : VIEW_COPY[view]
  const showEmpty = ready && result.total === 0

  const exportCsv = () => {
    const all = queryAccounts(state.rows, { view, search: q, filters, sort, page: 1, pageSize: 100000, includeArchived }).rows
    const head = ['Account', 'Kind', 'Status', 'Producer', 'Account Manager', 'Office', 'Active policies', 'Annual premium', 'Next expiration']
    downloadCsv('accounts', head, all.map((r) => [r.name, r.kind, r.status, r.producerName, r.accountManagerName, r.officeName, r.activePolicyCount, r.annualPremium, r.nextExpiration ? formatUSDate(r.nextExpiration) : '']))
    toast(`Exported ${all.length.toLocaleString('en-US')} accounts`, 'success')
  }

  const producers = data.users.filter((u) => u.role === 'producer')
  const managers = data.users.filter((u) => u.role === 'account-manager')
  const FILTERS: FilterDef[] = [
    { k: 'status', label: 'Status', opts: [['Prospect', 'Prospect'], ['Client', 'Client'], ['Former client', 'Former client']] },
    { k: 'kind', label: 'Kind', opts: [['Household', 'Household'], ['Business', 'Business']] },
    { k: 'office', label: 'Office', opts: data.offices.map((o) => [o.id, `${o.name} ${o.state}`]) },
    { k: 'producer', label: 'Producer', opts: producers.map((p) => [p.id, p.name]) },
    { k: 'am', label: 'Account Manager', opts: managers.map((p) => [p.id, p.name]) },
    { k: 'state', label: 'State', opts: [['TX', 'Texas'], ['FL', 'Florida']] },
  ]

  const show = (k: string) => cols.some((c) => c.key === k)
  const onSort = (key: AccountSortKey) => {
    const next = sort?.key !== key ? key : sort.dir === 'asc' ? `-${key}` : null
    set({ sort: next })
  }

  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Accounts" description="Households and Businesses the agency sells to and services." />
      <ViewTabs views={views} counts={showRows ? result.viewCounts : null} />

      <ListToolbar
        className="mt-4"
        end={
          <Button variant="primary" className={cx(showEmpty && !isFiltered && 'invisible')} onClick={() => setCreating(true)}>
            <Plus aria-hidden className="size-4" strokeWidth={1.75} /> New account
          </Button>
        }
      >
        <SearchField label="Search accounts" placeholder="Search accounts" value={draft} onChange={setDraft} />
        <FilterMenu filters={FILTERS}>
          {user.role === 'admin' && (
            <label className="flex items-center gap-2 text-base text-ink">
              <input type="checkbox" checked={includeArchived} onChange={(e) => set({ archived: e.target.checked ? '1' : null })} className="size-4 accent-primary" />
              Include archived
            </label>
          )}
        </FilterMenu>
        {!mobile && (
          <>
            <DisplayMenu columns={COLS} prefs={prefs} onChange={savePrefs} />
            <Button onClick={exportCsv} disabled={!ready || result.total === 0}>
              <Download aria-hidden className="size-4" strokeWidth={1.75} /> Export
            </Button>
          </>
        )}
      </ListToolbar>

      <FilterChips className="mt-3" filters={FILTERS} extra={includeArchived ? [{ k: 'archived', label: 'Including archived' }] : []} />
      {selected.size > 0 && (
        <SelectionBar matching count={selected.size} total={result.total} onSelectAll={result.total > selected.size ? () => setSelected(new Set(queryAccounts(state.rows, { view, search: q, filters, sort, page: 1, pageSize: 100000, includeArchived }).rows.map((r) => r.id))) : undefined} onClear={() => setSelected(new Set())}>
          <Button size="sm" onClick={() => setReassign(true)}>Reassign {selected.size.toLocaleString('en-US')} accounts</Button>
        </SelectionBar>
      )}
      {creating && <AccountFormSheet onClose={() => setCreating(false)} />}
      {reassign && <ReassignDialog accountIds={[...selected]} onClose={() => setReassign(false)} onDone={(p) => { setSelected(new Set()); if (p) set({ producer: p }) }} />}

      <p className="tabular mt-3 text-sm text-muted" aria-live="polite">
        {showRows ? `Showing ${result.rows.length.toLocaleString('en-US')} of ${result.total.toLocaleString('en-US')} accounts · ${compactUsd(result.premiumTotal)} annual premium` : ' '}
      </p>

      <div className="relative mt-2 overflow-x-auto rounded-t-md bg-surface shadow-ring">
        {refetching && <ProgressLine className="absolute inset-x-0 top-10 z-20" />}
        {mobile ? (
          // US-FND-011: the same stacked rows as every other list below 768px: name, status, one key value.
          <ul className="divide-y divide-fill" aria-busy={state.status === 'loading'}>
            {showRows &&
              result.rows.map((r) => (
                <li key={r.id}>
                  <Link to={`/accounts/${r.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2 text-base active:bg-recessed">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-strong">{r.name}</span>
                      <span className="mt-0.5 block text-sm"><StatusCell status={r.status} /></span>
                    </span>
                    <span className="tabular max-w-[45%] shrink-0 truncate text-right text-sm text-label">{r.annualPremium ? usd(r.annualPremium) : '—'}</span>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <table
            className="w-full table-fixed border-collapse text-left"
            // The Account column keeps at least 284px; narrower windows scroll with that column sticky.
            style={{ minWidth: 284 + cols.reduce((sum, c) => sum + (c.width ?? 0), 0) }}
            aria-busy={state.status === 'loading'}
          >
            <colgroup>
              {cols.map((c) => (
                <col key={c.key} style={c.width ? { width: c.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr className="h-10 border-b border-fill">
                {cols.map((c) => {
                  const active = sort?.key === c.key
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cx('px-3 text-base font-semibold whitespace-nowrap text-strong', c.align === 'right' && 'text-right', c.key === 'name' && 'sticky left-0 z-10 bg-surface')}
                    >
                      {c.key === 'name' && canBulk && (
                        <input type="checkbox" aria-label="Select all on this page" checked={result.rows.length > 0 && result.rows.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set([...selected, ...result.rows.map((r) => r.id)]) : new Set([...selected].filter((id) => !result.rows.some((r) => r.id === id))))} className="mr-2 size-4 align-middle accent-primary" />
                      )}
                      {c.sortable ? (
                        <button onClick={() => onSort(c.key as AccountSortKey)} className={cx('inline-flex items-center gap-1 rounded-sm hover:text-link', c.align === 'right' && 'flex-row-reverse')}>
                          {c.label}
                          {active && (sort.dir === 'asc' ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />)}
                        </button>
                      ) : c.key === 'ribbon' ? (
                        <RibbonAxis label={c.label} />
                      ) : (
                        c.label
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {state.status === 'loading' && !state.loaded && <SkeletonRows cols={cols.length} />}
              {showRows &&
                result.rows.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      onClick={(e) => !(e.target as HTMLElement).closest('a,button,[tabindex]') && navigate(`/accounts/${r.id}`)}
                      className={cx(rowH, 'cursor-pointer border-b border-fill text-base transition-colors duration-100 hover:bg-recessed')}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {canBulk && <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => setSelected((x) => { const n = new Set(x); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n })} className="size-4 shrink-0 accent-primary" />}
                          {r.kind === 'Household' ? <Home aria-label="Household" className="size-4 shrink-0 text-muted" strokeWidth={1.75} /> : <Building2 aria-label="Business" className="size-4 shrink-0 text-muted" strokeWidth={1.75} />}
                          <Tip label={r.name}>
                            <Link to={`/accounts/${r.id}`} className="max-w-[72%] flex-none truncate font-medium text-strong hover:text-link hover:underline">
                              {r.name}
                            </Link>
                          </Tip>
                          <span className="min-w-0 truncate text-sm text-muted">
                            {r.contactName ?? 'No contact'}
                            {agencyScope && ` · ${r.officeName}`}
                          </span>
                        </div>
                      </td>
                      {show('status') && <td className="px-3"><StatusCell status={r.status} /></td>}
                      {show('producerName') && <td className="truncate px-3 text-ink">{r.producerName}</td>}
                      {show('accountManagerName') && <td className="truncate px-3 text-ink">{r.accountManagerName}</td>}
                      {show('activePolicyCount') && <td className="tabular px-3 text-right">{r.activePolicyCount || <span className="text-muted">—</span>}</td>}
                      {show('annualPremium') && <td className="tabular px-3 text-right">{r.annualPremium ? usd(r.annualPremium) : <span className="text-muted">—</span>}</td>}
                      {show('nextExpiration') && (
                        <td className="px-3">
                          {r.nextExpiration ? <Due tone={dueTone(daysBetween(today, r.nextExpiration))}>{formatUSDate(r.nextExpiration)}</Due> : <span className="text-muted">—</span>}
                        </td>
                      )}
                      {show('ribbon') && <td className="px-3"><TermRibbon ticks={r.ribbon} /></td>}
                      {show('lastActivity') && <td className="tabular truncate px-3 text-label">
                        {r.lastActivity ? (
                          <Tip label={formatUSDate(r.lastActivity)}>
                            <span>{relative(r.lastActivity, today)}</span>
                          </Tip>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
        {state.status === 'error' && <ErrorState what="accounts" refId={state.refId!} onRetry={() => setAttempt((n) => n + 1)} />}
        {showEmpty &&
          (isFiltered ? (
            <EmptyState icon={SearchX} title="No accounts match these filters" body="Try a different search, or clear the filters to see every account in your scope." action={<Button onClick={() => { setDraft(''); set({ q: null, ...Object.fromEntries(FILTER_KEYS.map((k) => [k, null])) }) }}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={Users} title={emptyCopy[0]} body={emptyCopy[1]} action={<Button variant="primary" onClick={() => toast('Creating Accounts arrives with US-ACC-002.')}><Plus aria-hidden className="size-4" strokeWidth={1.75} /> New account</Button>} />
          ))}
      </div>

      {showRows && result.total > 0 && <TablePagination page={result.page} pageSize={result.pageSize} total={result.total} />}
    </div>
  )
}
