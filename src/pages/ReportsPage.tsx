import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, useSearchParams } from 'react-router'
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf } from '@/app/hooks'
import { downloadCsv } from '@/app/csv'
import { commissionFor, producerShare } from '@/domain/commission'
import { PRESETS, previous, rangeFor, type Preset } from '@/domain/reportRange'
import { riskReasons } from '@/domain/renewals'
import type { Account, Dataset, Line, Opportunity, User } from '@/domain/types'
import { BarChart, fmtUsd, fmtUsdFull, LineChart } from '@/components/charts'
import { FilterChips, FilterMenu, ListToolbar, mini, PageTitle, Panel, TabBar, useTab, type FilterDef } from '@/components/patterns'
import { Button, controlCls, cx, Select, Tip } from '@/components/ui/primitives'

type Key = 'pipeline' | 'production' | 'xdates' | 'renewals' | 'retention' | 'service' | 'commission'
type Role = User['role']
const CATALOG: { key: Key; title: string; group: string; roles: Role[] }[] = [
  { key: 'pipeline', title: 'Pipeline', group: 'Sales', roles: ['producer', 'principal', 'admin'] },
  { key: 'production', title: 'Production', group: 'Sales', roles: ['producer', 'principal', 'admin'] },
  { key: 'xdates', title: 'X-dates', group: 'Sales', roles: ['producer', 'principal', 'admin'] },
  { key: 'renewals', title: 'Renewals', group: 'Retention', roles: ['producer', 'account-manager', 'principal', 'admin'] },
  { key: 'retention', title: 'Retention', group: 'Retention', roles: ['producer', 'account-manager', 'principal', 'admin'] },
  { key: 'service', title: 'Service', group: 'Service', roles: ['account-manager', 'principal', 'admin'] },
  { key: 'commission', title: 'Commission', group: 'Commission', roles: ['producer', 'principal', 'admin'] },
]
const DEFAULT: Record<Role, Key> = { producer: 'pipeline', 'account-manager': 'renewals', principal: 'pipeline', admin: 'production' }
const SYNCED: Key[] = ['production', 'retention', 'commission', 'renewals']
const COMMERCIAL = new Set<Line>(['BOP', 'GL', 'WC', 'Commercial auto', 'Commercial umbrella'])
const kindOf = (l: Line) => (COMMERCIAL.has(l) ? 'Commercial' : 'Personal')
const pct = (n: number | null, digits = 1) => (n == null || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(digits)}%`)
const signedPct = (n: number | null) => (n == null || !Number.isFinite(n) ? '—' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`)
const inR = (o: number | null | undefined, r: { from: number; to: number }) => o != null && o >= r.from && o <= r.to
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const monthKey = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const monthLabel = (k: string) => new Date(`${k}-01T00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

type Filters = { range: { from: number; to: number }; prev: { from: number; to: number }; compare: boolean; office: string | null; producer: string | null; lines: 'all' | 'Personal' | 'Commercial' }
type Ctx = { data: Dataset; user: User; f: Filters; accounts: Map<string, Account>; inScope: (a: Account | undefined) => boolean; lineOk: (l: Line) => boolean; onTable: (head: string[], rows: (string | number)[][]) => void }

/** US-RPT-001 */
export function ReportsPage() {
  const { data, user } = useApp()
  const [params, setParams] = useSearchParams()
  const allowed = CATALOG.filter((r) => r.roles.includes(user.role))
  const key = params.get('report') as Key | null
  useEffect(() => {
    if (!key) { const n = new URLSearchParams(params); n.set('report', DEFAULT[user.role]); setParams(n, { replace: true }) }
  }, [key, user.role]) // eslint-disable-line react-hooks/exhaustive-deps
  const entry = CATALOG.find((r) => r.key === key)
  const ok = !!entry && entry.roles.includes(user.role)
  const [table, setTable] = useState<{ head: string[]; rows: (string | number)[][] } | null>(null)

  // US-RPT-002 filters live in the URL and are clamped to the viewer's scope.
  const preset = (params.get('range') as Preset) ?? '12m'
  const cFrom = params.get('from') ?? ''
  const cTo = params.get('to') ?? ''
  const range = rangeFor(preset, new Date(), { from: cFrom, to: cTo })
  const wide = user.role === 'principal' || user.role === 'admin'
  // The demo data holds about 12 months of history; a previous period reaching past that would compare against
  // missing data and produce inflated deltas, so compare only when the whole previous period is covered.
  const HISTORY_DAYS = 365
  const prevCovered = previous(range).from >= -HISTORY_DAYS
  const f: Filters = { range, prev: previous(range), compare: params.get('compare') !== 'off' && prevCovered, office: wide ? params.get('office') : user.role === 'account-manager' ? user.officeId : null, producer: wide ? params.get('producer') : null, lines: (params.get('lines') as Filters['lines']) ?? 'all' }
  const accounts = useMemo(() => new Map(data.accounts.map((a) => [a.id, a])), [data.accounts])
  const inScope = (a: Account | undefined) => !!a && (user.role === 'producer' ? a.producerId === user.id : (!f.office || a.officeId === f.office) && (!f.producer || a.producerId === f.producer))
  const lineOk = (l: Line) => f.lines === 'all' || kindOf(l) === f.lines
  const setP = (patch: Record<string, string | null>) => { const n = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }) }
  const office = data.offices.find((o) => o.id === f.office)
  const scopeLine = user.role === 'producer' ? `My Book · ${user.name}` : f.office ? `Office · ${office?.name} ${office?.state}` : `Agency · ${data.offices.length} offices`
  const lastSync = data.syncRuns?.find((r) => r.status !== 'Failed')
  const syncLabel = lastSync ? new Date(lastSync.at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null
  const filters: FilterDef[] = [
    ...(wide ? [
      { k: 'office', label: 'Office', empty: 'All offices', opts: data.offices.map((o) => [o.id, `${o.name} ${o.state}`] as [string, string]) },
      { k: 'producer', label: 'Producer', empty: 'All producers', opts: data.users.filter((u) => u.role === 'producer' && (!f.office || u.officeId === f.office)).map((u) => [u.id, u.name] as [string, string]) },
    ] : []),
    { k: 'lines', label: 'Lines', empty: 'All lines', opts: [['Personal', 'Personal lines'], ['Commercial', 'Commercial lines']] },
  ]
  const rangeChip = preset !== '12m' ? [{ k: 'range', label: `Date range is ${PRESETS.find(([k]) => k === preset)?.[1] ?? ''}` }] : []
  const chips = [
    ...(preset !== '12m' ? [PRESETS.find(([k]) => k === preset)?.[1] ?? ''] : []),
    ...(wide && f.office ? [`${office?.name} ${office?.state}`] : []),
    ...(f.producer ? [data.users.find((u) => u.id === f.producer)?.name ?? ''] : []),
    ...(f.lines !== 'all' ? [`${f.lines} lines`] : []),
  ]
  const exportCsv = () => {
    if (!table || !entry) return
    const meta = [[`Fortify ${entry.title} report`], [`Scope: ${scopeLine}`], [`Range: ${dateOf(range.from)} to ${dateOf(range.to)}`], [`Filters: ${chips.join(', ') || 'None'}`], []]
    downloadCsv(`${entry.key}-report`, meta[0] as string[], [...meta.slice(1), table.head, ...table.rows])
  }
  const ctx: Ctx = { data, user, f, accounts, inScope, lineOk, onTable: (head, rows) => setTable({ head, rows }) }
  const groups = [...new Set(allowed.map((r) => r.group))]
  const badCustom = preset === 'custom' && cFrom && cTo && cTo < cFrom

  return (
    <div className="flex min-h-full max-md:flex-col">
      <nav aria-label="Reports" className="w-60 shrink-0 border-r border-line px-2 py-5 max-md:w-full max-md:border-r-0 max-md:border-b">
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <p className="px-2.5 pb-1 text-xs text-muted">{g}</p>
            {allowed.filter((r) => r.group === g).map((r) => (
              <NavLink key={r.key} to={`/reports?${new URLSearchParams({ ...Object.fromEntries(params), report: r.key })}`} className={() => cx('flex rounded-md px-2.5 py-1.5 text-base', key === r.key ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:bg-recessed hover:text-strong')}>{r.title}</NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1 px-8 pt-6 pb-12 max-sm:px-4">
        {!key ? null : !entry ? (
          <p className="text-base">Report not found. <Link className="text-link underline" to={`/reports?report=${DEFAULT[user.role]}`}>Open {CATALOG.find((r) => r.key === DEFAULT[user.role])?.title}</Link></p>
        ) : !ok ? (
          <p className="text-base">This report isn't available for your role. <Link className="text-link underline" to={`/reports?report=${DEFAULT[user.role]}`}>Open {CATALOG.find((r) => r.key === DEFAULT[user.role])?.title}</Link></p>
        ) : (
          <>
            <PageTitle
              className="mb-4"
              title={entry.title}
              description={<span className="block truncate" title={scopeLine}>{scopeLine}{SYNCED.includes(entry.key) && syncLabel && ` · Data as of ${syncLabel} (AMS sync)`}</span>}
              actions={
                <Tip label={table?.rows.length ? 'Download the breakdown table' : 'Nothing to export'}>
                  <span tabIndex={table?.rows.length ? -1 : 0}><Button disabled={!table?.rows.length} onClick={exportCsv}><Download aria-hidden className="size-4" strokeWidth={1.75} />Export CSV</Button></span>
                </Tip>
              }
            />
            <ListToolbar className="mb-3">
              <Select size="md" aria-label="Date range" value={preset} onChange={(e) => setP({ range: e.target.value === '12m' ? null : e.target.value })}>{PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              {preset === 'custom' && (
                <>
                  <input type="date" aria-label="From" value={cFrom} onChange={(e) => setP({ from: e.target.value || null })} className={controlCls()} />
                  <input type="date" aria-label="To" value={cTo} onChange={(e) => setP({ to: e.target.value || null })} className={controlCls()} />
                  {badCustom && <span role="alert" className="text-sm text-danger-text">End date must be after the start date</span>}
                </>
              )}
              <FilterMenu filters={filters} />
              <label className="ml-2 flex h-9 items-center gap-2 text-base"><input type="checkbox" checked={params.get('compare') !== 'off'} disabled={!prevCovered} onChange={(e) => setP({ compare: e.target.checked ? null : 'off' })} />Compare to previous period</label>
            </ListToolbar>
            <FilterChips className="mb-4" filters={filters} extra={rangeChip} onClearAll={(n) => ['from', 'to', 'compare'].forEach((k) => n.delete(k))} />
            <p className="tabular mb-4 text-sm text-muted">{dateOf(range.from)} to {dateOf(range.to)}{f.compare && ` · compared with ${dateOf(f.prev.from)} to ${dateOf(f.prev.to)}`}{params.get('compare') !== 'off' && !prevCovered && ' · No comparison: the previous period is outside the demo data’s 12 months'}</p>
            {entry.key === 'pipeline' && <PipelineReport {...ctx} />}
            {entry.key === 'production' && <ProductionReport {...ctx} />}
            {entry.key === 'xdates' && <XDatesReport {...ctx} />}
            {entry.key === 'renewals' && <RenewalsReport {...ctx} />}
            {entry.key === 'retention' && <RetentionReport {...ctx} />}
            {entry.key === 'service' && <ServiceReport {...ctx} />}
            {entry.key === 'commission' && <CommissionReport {...ctx} syncLabel={syncLabel} />}
          </>
        )}
      </div>
    </div>
  )
}

// ---------- shared pieces ----------
function Card({ label, value, delta, better = 'up', full, hint }: { label: string; value: string; delta?: number | null; better?: 'up' | 'down'; full?: string; hint?: string }) {
  const show = delta != null && Number.isFinite(delta)
  const Icon = (delta ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight
  const good = show && (better === 'up' ? delta! >= 0 : delta! <= 0)
  const v = <p className="tabular text-metric font-semibold text-strong">{value}</p>
  return (
    <div className="rounded-md bg-surface p-4 shadow-ring">
      <p className="text-sm text-label">{label}</p>
      {full || hint ? <Tip label={full ?? hint}><span tabIndex={0} className="inline-block">{v}</span></Tip> : v}
      {show && <p className={cx('tabular mt-0.5 flex items-center gap-0.5 text-sm', good ? 'text-success-text' : 'text-danger-text')}><Icon aria-hidden className="size-3.5" />{signedPct(delta!)} vs previous</p>}
    </div>
  )
}
const Cards = ({ children }: { children: ReactNode }) => <div className="mb-4 grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1">{children}</div>
const delta = (now: number | null, before: number | null, f: Filters) => (!f.compare || now == null || before == null || before === 0 ? null : (now - before) / Math.abs(before))
const money = (n: number) => (Math.abs(n) >= 1e6 ? fmtUsd(n) : fmtUsdFull(n))

/** Clickable horizontal bars (stage, status, buckets) so each bar is a real link. */
function Bars({ title, rows, summary }: { title: string; rows: { label: string; value: number; note?: string; to?: string; danger?: boolean }[]; summary: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <Panel title={title}>
      <p className="sr-only">{summary}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => {
          const inner = (
            <>
              <span className={cx('w-36 shrink-0 truncate text-sm', r.danger ? 'font-medium text-danger-text' : 'text-label')}>{r.label}</span>
              <span className="relative h-5 flex-1 rounded-sm bg-recessed"><span className="absolute inset-y-0 left-0 rounded-sm bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></span>
              <span className="tabular w-40 shrink-0 text-right text-sm text-ink">{r.value.toLocaleString('en-US')}{r.note && <span className="text-muted"> · {r.note}</span>}</span>
            </>
          )
          return <li key={r.label}>{r.to ? <Link to={r.to} className="flex items-center gap-3 rounded-md px-1 py-0.5 hover:bg-recessed">{inner}</Link> : <div className="flex items-center gap-3 px-1 py-0.5">{inner}</div>}</li>
        })}
      </ul>
    </Panel>
  )
}

/** Breakdown table; also registers itself as the CSV export (US-RPT-002). */
function Table({ head, rows, links, onTable, empty, align }: { head: string[]; rows: (string | number)[][]; links?: (string | undefined)[]; onTable?: Ctx['onTable']; empty: string; align?: ('left' | 'right')[] }) {
  const sig = JSON.stringify([head, rows])
  useEffect(() => { onTable?.(head, rows) }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const fmt = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('en-US') : v)
  if (!rows.length) return <p className="py-6 text-base text-label">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className={cx(mini.table, 'tabular min-w-[560px]')}>
        <thead><tr className={mini.head}>{head.map((h, i) => <th key={h} className={cx(mini.th, (align?.[i] ?? (i ? 'right' : 'left')) === 'right' && 'text-right')}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={mini.tr}>
              {r.map((c, i) => <td key={i} className={cx(mini.td, (align?.[i] ?? (i ? 'right' : 'left')) === 'right' && 'text-right')}>{i === 0 && links?.[ri] ? <Link className="text-link hover:underline" to={links[ri]!}>{fmt(c)}</Link> : fmt(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
/** Breakdown tabs bound to ?by= (falls back to the first tab when the param names a tab this report lacks). */
function useBy<T extends string>(tabs: [T, string][]): T {
  const by = useTab(tabs[0][0], 'by') as T
  return tabs.some(([k]) => k === by) ? by : tabs[0][0]
}
const ByTabs = ({ tabs }: { tabs: [string, string][] }) => <div className="mb-2"><TabBar param="by" tabs={tabs.map(([id, label]) => ({ id, label }))} /></div>

/** Best quoted premium for an Opportunity: accepted lines, else the lowest quote per line, else the estimate. */
function bestPremium(o: Opportunity, data: Dataset) {
  const qs = data.quotes.filter((q) => q.opportunityId === o.id)
  let total = 0
  let found = false
  for (const line of o.lines) {
    const opts = qs.flatMap((q) => q.lines.filter((l) => l.line === line && l.premium != null))
    const pick = opts.find((l) => l.accepted) ?? opts.sort((a, b) => a.premium! - b.premium!)[0]
    if (pick) { total += pick.premium!; found = true }
  }
  return found ? total : o.estimatedPremium
}
const OPEN = ['New', 'Contacted', 'Gathering info', 'Quoting', 'Proposed']

/** US-RPT-003 */
function PipelineReport({ data, user, f, accounts, inScope, lineOk, onTable }: Ctx) {
  const opps = data.opportunities.filter((o) => inScope(accounts.get(o.accountId)) && o.lines.some(lineOk))
  const open = opps.filter((o) => OPEN.includes(o.stage))
  const closedIn = (r: Filters['range']) => opps.filter((o) => (o.stage === 'Won' || o.stage === 'Lost') && inR(o.closedOffset, r))
  const ratio = (r: Filters['range']) => { const c = closedIn(r); return c.length ? c.filter((o) => o.stage === 'Won').length / c.length : null }
  const days = (r: Filters['range']) => { const w = closedIn(r).filter((o) => o.stage === 'Won'); return w.length ? w.reduce((n, o) => n + (o.closedOffset! - o.createdOffset), 0) / w.length : null }
  const openPrem = open.reduce((n, o) => n + bestPremium(o, data), 0)
  const created = (r: Filters['range']) => opps.filter((o) => inR(o.createdOffset, r)).length
  const lost = closedIn(f.range).filter((o) => o.stage === 'Lost')
  const reasons = Object.entries(lost.reduce<Record<string, number>>((m, o) => ((m[o.lostReason ?? 'Other'] = (m[o.lostReason ?? 'Other'] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])
  const wide = user.role !== 'producer'
  const groups = wide ? data.users.filter((u) => u.role === 'producer' && (!f.office || u.officeId === f.office) && (!f.producer || u.id === f.producer)).map((u) => [u.name, (o: Opportunity) => o.ownerId === u.id, `/pipeline?view=list&producer=${u.id}`] as const) : (['New business', 'Cross-sell', 'Remarket'] as const).map((t) => [t, (o: Opportunity) => o.type === t, `/pipeline?view=list&type=${encodeURIComponent(t)}`] as const)
  const rows = groups.map(([name, fn]) => {
    const mine = opps.filter(fn)
    const o = mine.filter((x) => OPEN.includes(x.stage))
    const c = mine.filter((x) => (x.stage === 'Won' || x.stage === 'Lost') && inR(x.closedOffset, f.range))
    const won = c.filter((x) => x.stage === 'Won')
    return [name, o.length, fmtUsdFull(o.reduce((n, x) => n + bestPremium(x, data), 0)), won.length, c.length - won.length, c.length ? pct(won.length / c.length, 0) : '—', fmtUsdFull(won.reduce((n, x) => n + bestPremium(x, data), 0))]
  })
  return (
    <>
      <Cards>
        <Card label="Open Opportunities" value={String(open.length)} delta={delta(created(f.range), created(f.prev), f)} />
        <Card label="Open pipeline premium" value={money(openPrem)} full={fmtUsdFull(openPrem)} />
        <Card label="Close ratio" value={ratio(f.range) == null ? '—' : pct(ratio(f.range), 0)} hint={ratio(f.range) == null ? 'No closed Opportunities in this range' : undefined} delta={delta(ratio(f.range), ratio(f.prev), f)} />
        <Card label="Avg days to close" value={days(f.range) == null ? '—' : `${Math.round(days(f.range)!)} days`} delta={delta(days(f.range), days(f.prev), f)} better="down" />
      </Cards>
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-lg:grid-cols-1">
        <Bars title="Open by stage" summary={`Open Opportunities by stage: ${OPEN.map((s) => `${s} ${open.filter((o) => o.stage === s).length}`).join(', ')}`} rows={OPEN.map((s) => { const xs = open.filter((o) => o.stage === s); return { label: s, value: xs.length, note: fmtUsd(xs.reduce((n, o) => n + bestPremium(o, data), 0)), to: `/pipeline?view=list&stage=${encodeURIComponent(s)}` } })} />
        <Panel title="Lost reasons">
          {reasons.length ? <ul className="flex flex-col gap-1.5 text-base">{reasons.map(([r, n]) => <li key={r} className="tabular flex justify-between gap-2"><span>{r}</span><span className="text-label">{n} · {pct(n / lost.length, 0)}</span></li>)}</ul> : <p className="text-base text-label">No Opportunities lost in this range.</p>}
        </Panel>
      </div>
      <div className="mt-4">
        <Panel title={wide ? 'By Producer' : 'By type'}>
          <Table head={[wide ? 'Producer' : 'Type', 'Open', 'Open premium', 'Won', 'Lost', 'Close ratio', 'Won premium']} rows={rows} links={groups.map((g) => g[2])} onTable={onTable} empty="No Opportunities in this range." />
        </Panel>
      </div>
    </>
  )
}

/** US-RPT-004: bound = accepted quote premium on Won Opportunities; quoted = lowest quote on the same lines. */
function ProductionReport({ data, user, f, accounts, inScope, lineOk, onTable }: Ctx) {
  const tabs: ['line' | 'carrier' | 'type' | 'producer', string][] = [['line', 'By line'], ['carrier', 'By carrier'], ['type', 'By type'], ...(user.role === 'producer' ? [] : [['producer', 'By Producer']] as ['producer', string][])]
  const tab = useBy(tabs)
  type Row = { o: Opportunity; line: Line; carrierId: string; bound: number; quoted: number; offset: number }
  const won = (r: Filters['range']): Row[] =>
    data.opportunities.filter((o) => o.stage === 'Won' && inR(o.closedOffset, r) && inScope(accounts.get(o.accountId))).flatMap((o) => {
      const qs = data.quotes.filter((q) => q.opportunityId === o.id)
      return qs.flatMap((q) => q.lines.filter((l) => l.accepted && l.premium != null && lineOk(l.line)).map((l) => ({ o, line: l.line, carrierId: q.carrierId, bound: l.premium!, quoted: Math.min(...qs.flatMap((x) => x.lines.filter((y) => y.line === l.line && y.premium != null).map((y) => y.premium!))), offset: o.closedOffset! })))
    })
  const now = won(f.range)
  const before = won(f.prev)
  const sum = (xs: Row[], k: 'bound' | 'quoted') => xs.reduce((n, x) => n + x[k], 0)
  const variance = (xs: Row[]) => (sum(xs, 'quoted') ? (sum(xs, 'bound') - sum(xs, 'quoted')) / sum(xs, 'quoted') : null)
  const canComm = user.role === 'principal' || user.role === 'admin' || user.role === 'producer'
  const comm = (xs: Row[]) => xs.reduce((n, x) => { const rate = data.carriers.find((c) => c.id === x.carrierId)?.commission?.[x.line as never] ?? 0.12; return n + x.bound * rate * (user.role === 'producer' ? producerShare(x.o.type) : 1) }, 0)
  const months = [...new Set(now.map((x) => monthKey(x.offset)))].sort()
  const trend = months.map((m) => ({ month: monthLabel(m), personal: sum(now.filter((x) => monthKey(x.offset) === m && kindOf(x.line) === 'Personal'), 'bound'), commercial: sum(now.filter((x) => monthKey(x.offset) === m && kindOf(x.line) === 'Commercial'), 'bound') }))
  const keyOf = (x: Row) => (tab === 'line' ? x.line : tab === 'carrier' ? (data.carriers.find((c) => c.id === x.carrierId)?.name ?? '—') : tab === 'type' ? x.o.type : (data.users.find((u) => u.id === x.o.ownerId)?.name ?? '—'))
  const groups = [...new Set(now.map(keyOf))].sort()
  const rows = groups.map((g) => { const xs = now.filter((x) => keyOf(x) === g); return [g, xs.length, fmtUsdFull(sum(xs, 'quoted')), fmtUsdFull(sum(xs, 'bound')), signedPct(variance(xs)), ...(canComm ? [fmtUsdFull(comm(xs))] : [])] })
  return (
    <>
      <Cards>
        <Card label="Bound premium" value={money(sum(now, 'bound'))} full={fmtUsdFull(sum(now, 'bound'))} delta={delta(sum(now, 'bound'), sum(before, 'bound'), f)} />
        <Card label="Terms bound" value={String(now.length)} delta={delta(now.length, before.length, f)} />
        <Card label="Avg premium per Term" value={now.length ? fmtUsdFull(sum(now, 'bound') / now.length) : '—'} delta={delta(now.length ? sum(now, 'bound') / now.length : null, before.length ? sum(before, 'bound') / before.length : null, f)} />
        <Card label="Bound vs lowest quote" value={signedPct(variance(now))} hint="Bound premium compared with the lowest quote on the same lines" />
      </Cards>
      <Panel title="Bound premium by month">
        {trend.length ? <LineChart data={trend} x="month" series={[{ key: 'personal', label: 'Personal lines' }, { key: 'commercial', label: 'Commercial lines' }]} summary={`Bound premium by month, ${trend.length} months`} /> : <p className="text-base text-label">Nothing bound in this range.</p>}
      </Panel>
      <div className="mt-4">
        <Panel>
          <ByTabs tabs={tabs} />
          <Table head={[tabs.find((t) => t[0] === tab)![1].replace('By ', '').replace(/^\w/, (c) => c.toUpperCase()), 'Terms bound', 'Quoted premium', 'Bound premium', 'Variance', ...(canComm ? [user.role === 'producer' ? 'Est. commission (your share)' : 'Est. commission'] : [])]} rows={rows} links={groups.map(() => '/policies?view=recent-production')} onTable={onTable} empty="Nothing bound in this range." />
        </Panel>
      </div>
    </>
  )
}

/** US-RPT-008 */
function XDatesReport({ data, accounts, inScope, lineOk, f, onTable }: Ctx) {
  const xs = data.xDates.filter((x) => inScope(accounts.get(x.accountId)) && lineOk(x.line))
  const next90 = xs.filter((x) => x.xDateOffset >= 0 && x.xDateOffset <= 90)
  const passed = (r: Filters['range']) => xs.filter((x) => inR(x.xDateOffset, r) && x.xDateOffset <= 0)
  const opp = (x: (typeof xs)[number]) => data.opportunities.find((o) => o.id === x.opportunityId)
  const rate = (r: Filters['range'], won = false) => { const p = passed(r); return p.length ? p.filter((x) => opp(x) && (!won || opp(x)!.stage === 'Won')).length / p.length : null }
  const months = Array.from({ length: 12 }, (_, i) => monthKey(i * 30.4))
  const forecast = [...new Set(months)].map((m) => ({ month: monthLabel(m), personal: xs.filter((x) => x.xDateOffset >= 0 && monthKey(x.xDateOffset) === m && kindOf(x.line) === 'Personal').length, commercial: xs.filter((x) => x.xDateOffset >= 0 && monthKey(x.xDateOffset) === m && kindOf(x.line) === 'Commercial').length }))
  const lines = [...new Set(xs.map((x) => x.line))].sort()
  const rows = lines.map((l) => { const up = xs.filter((x) => x.line === l && x.xDateOffset >= 0); const past = passed(f.range).filter((x) => x.line === l); return [l, up.length, fmtUsdFull(up.reduce((n, x) => n + (x.premium ?? 0), 0)), past.filter((x) => opp(x)).length, past.filter((x) => opp(x)?.stage === 'Won').length] })
  return (
    <>
      <Cards>
        <Card label="X-dates in the next 90 days" value={String(next90.length)} />
        <Card label="Premium in play" value={money(next90.reduce((n, x) => n + (x.premium ?? 0), 0))} />
        <Card label="X-date to Opportunity" value={pct(rate(f.range), 0)} delta={delta(rate(f.range), rate(f.prev), f)} />
        <Card label="X-date to Won" value={pct(rate(f.range, true), 0)} delta={delta(rate(f.range, true), rate(f.prev, true), f)} />
      </Cards>
      <Panel title="Upcoming X-dates by month"><BarChart data={forecast} x="month" series={[{ key: 'personal', label: 'Personal lines' }, { key: 'commercial', label: 'Commercial lines' }]} summary="Upcoming X-dates per month for the next 12 months" format={(n) => String(n)} fullFormat={(n) => String(n)} /></Panel>
      <div className="mt-4"><Panel title="By line"><Table head={['Line', 'Upcoming', 'Premium in play', 'Converted to Opportunity', 'Won']} rows={rows} links={lines.map((l) => `/x-dates?line=${encodeURIComponent(l)}`)} onTable={onTable} empty="No X-dates in scope." /></Panel></div>
    </>
  )
}

/** US-RPT-005: open Renewals always count; Done ones count when their Term expired in the range. */
function RenewalsReport({ data, user, f, accounts, inScope, lineOk, onTable }: Ctx) {
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  const pols = new Map(data.policies.map((p) => [p.id, p]))
  const all = data.renewals.filter((r) => inScope(accounts.get(r.accountId)) && lineOk(pols.get(r.policyId)?.line ?? 'Auto') && (user.role !== 'account-manager' || accounts.get(r.accountId)?.officeId === user.officeId))
  const due = (r: Filters['range']) => all.filter((x) => x.status !== 'Done' || inR(terms.get(x.termId)?.expirationOffset, r))
  const now = due(f.range)
  const change = (x: (typeof all)[number]) => { const t = terms.get(x.termId); return t && x.renewalPremium != null ? (x.renewalPremium - t.premium) / t.premium : null }
  const avg = (xs: typeof all) => { const c = xs.map(change).filter((n): n is number => n != null); return c.length ? c.reduce((a, b) => a + b, 0) / c.length : null }
  const risky = now.filter((x) => x.status !== 'Done' && x.status !== 'Decided' && terms.get(x.termId) && riskReasons(x, terms.get(x.termId)!, { claimsThisTerm: 0, lastResort: false }).length)
  const done = now.filter((x) => x.status === 'Done').length
  const STAT = ['Upcoming', 'In review', 'Remarketing', 'Presented', 'Decided', 'Done'] as const
  const buckets: [string, (n: number) => boolean][] = [['Decrease', (n) => n < 0], ['0–5%', (n) => n >= 0 && n < 0.05], ['5–10%', (n) => n >= 0.05 && n < 0.1], ['10–20%', (n) => n >= 0.1 && n < 0.2], ['Over 20%', (n) => n >= 0.2]]
  const decided = (xs: typeof all, d: string) => xs.filter((x) => x.decision === d).length
  const people = user.role === 'producer' ? [] : data.users.filter((u) => u.role === 'account-manager' && (!f.office || u.officeId === f.office) && (user.role !== 'account-manager' || u.officeId === user.officeId))
  const rows = user.role === 'producer'
    ? [...(['Renew as is', 'Rewrite', 'Non-renewed'] as const).map((d): (string | number)[] => [d, decided(now, d)]), ['Still open', now.filter((x) => !x.decision).length]]
    : people.map((u) => { const xs = now.filter((x) => x.ownerId === u.id); const open = xs.filter((x) => !x.decision); return [u.name, xs.length, decided(xs, 'Renew as is'), decided(xs, 'Rewrite'), decided(xs, 'Non-renewed'), `${open.length} (${open.filter((x) => x.status === 'Remarketing').length} remarketing)`] })
  return (
    <>
      <Cards>
        <Card label="Renewals due" value={String(now.length)} delta={delta(now.length, due(f.prev).length, f)} />
        <Card label="Done" value={`${done} · ${pct(now.length ? done / now.length : null, 0)}`} />
        <Card label="At risk" value={String(risky.length)} better="down" />
        <Card label="Avg premium change" value={signedPct(avg(now))} better="down" />
      </Cards>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Bars title="By status" summary="Renewals per status" rows={STAT.map((s) => ({ label: s, value: now.filter((x) => x.status === s).length, to: `/renewals?view=${s.toLowerCase().replace(/\s+/g, '-')}` }))} />
        <Bars title="Premium change" summary="Renewals by premium change bucket" rows={buckets.map(([l, fn]) => ({ label: l, value: now.filter((x) => { const c = change(x); return c != null && fn(c) }).length, to: l === 'Over 20%' ? '/renewals?change=20' : '/renewals' }))} />
      </div>
      <div className="mt-4"><Panel title={user.role === 'producer' ? 'Decisions' : 'Decisions by Account Manager'}><Table head={user.role === 'producer' ? ['Decision', 'Renewals'] : ['Account Manager', 'Due', 'Renew as is', 'Rewrite', 'Non-renewed', 'Still open']} rows={rows} links={rows.map(() => '/renewals')} onTable={onTable} empty="No Renewals in this range." /></Panel></div>
    </>
  )
}

/** US-RPT-006 */
function RetentionReport({ data, user, f, accounts, inScope, lineOk, onTable }: Ctx) {
  const tabs: ['carrier' | 'line', string][] = [['carrier', 'By carrier'], ['line', 'By line']]
  const tab = useBy(tabs)
  const pols = new Map(data.policies.map((p) => [p.id, p]))
  const ENDED = ['Renewed', 'Rewritten', 'Non-renewed', 'Expired', 'Canceled']
  const LOST = ['Non-renewed', 'Expired', 'Canceled']
  const terms = data.terms.filter((t) => { const p = pols.get(t.policyId); const a = p && accounts.get(p.accountId); return p && inScope(a) && lineOk(p.line) && (user.role !== 'account-manager' || a?.officeId === user.officeId) && ENDED.includes(t.status) })
  const ended = (r: Filters['range']) => terms.filter((t) => inR(t.expirationOffset, r))
  const rate = (xs: typeof terms) => (xs.length ? 1 - xs.filter((t) => LOST.includes(t.status)).length / xs.length : null)
  const now = ended(f.range)
  const lost = now.filter((t) => LOST.includes(t.status))
  const prem = (xs: typeof terms) => xs.reduce((n, t) => n + t.premium, 0)
  const trend = Array.from({ length: 12 }, (_, i) => { const end = -30 * i; const r = { from: end - 29, to: end }; const v = rate(ended(r)); return { month: monthLabel(monthKey(end)), ...(v == null ? {} : { retention: Math.round(v * 1000) / 10 }) } }).reverse()
  const keyOf = (t: (typeof terms)[number]) => (tab === 'carrier' ? (data.carriers.find((c) => c.id === pols.get(t.policyId)?.carrierId)?.name ?? '—') : pols.get(t.policyId)!.line)
  const groups = [...new Set(now.map(keyOf))].sort()
  const rows = groups.map((g) => { const xs = now.filter((t) => keyOf(t) === g); const l = xs.filter((t) => LOST.includes(t.status)).length; return [g, xs.length, xs.length - l, l, pct(rate(xs))] })
  return (
    <>
      <Cards>
        <Card label="Policy retention" value={pct(rate(now))} delta={delta(rate(now), rate(ended(f.prev)), f)} />
        <Card label="Terms expiring" value={String(now.length)} />
        <Card label="Terms lost" value={String(lost.length)} better="down" delta={delta(lost.length, ended(f.prev).filter((t) => LOST.includes(t.status)).length, f)} />
        <Card label="Premium lost" value={money(prem(lost))} full={fmtUsdFull(prem(lost))} better="down" />
      </Cards>
      <div className="grid grid-cols-[3fr_2fr] gap-4 max-lg:grid-cols-1">
        <Panel title="Monthly policy retention"><LineChart data={trend} x="month" series={[{ key: 'retention', label: 'Retention %' }]} summary="Monthly policy retention, last 12 months" format={(n) => `${n}%`} fullFormat={(n) => `${n.toFixed(1)}%`} /></Panel>
        <Panel title="Lost by outcome">
          <Table head={['Outcome', 'Terms', 'Premium lost', 'Share']} rows={LOST.map((s) => { const xs = lost.filter((t) => t.status === s); return [s, xs.length, fmtUsdFull(prem(xs)), pct(lost.length ? xs.length / lost.length : null, 0)] })} links={LOST.map((s) => `/policies?view=${s === 'Canceled' ? 'canceled' : 'expired'}`)} empty="No Terms lost in this range." />
        </Panel>
      </div>
      <div className="mt-4"><Panel><ByTabs tabs={tabs} /><Table head={[tab === 'carrier' ? 'Carrier' : 'Line', 'Expiring', 'Retained', 'Lost', 'Retention']} rows={rows} onTable={onTable} empty="No Terms reached expiration in this range." /></Panel></div>
    </>
  )
}

/** US-RPT-007. Seeded requests have no close date, so they fall back to the due date (clamped to today). */
function ServiceReport({ data, user, f, accounts, inScope, lineOk, onTable }: Ctx) {
  const pols = new Map(data.policies.map((p) => [p.id, p]))
  const srs = data.serviceRequests.filter((s) => { const a = accounts.get(s.accountId); const p = s.policyId ? pols.get(s.policyId) : undefined; return inScope(a) && (!p || lineOk(p.line)) && (user.role !== 'account-manager' || a?.officeId === user.officeId) })
  const doneAt = (s: (typeof srs)[number]) => s.doneOffset ?? Math.min(0, Math.max(s.createdOffset, s.dueOffset))
  const opened = (r: Filters['range']) => srs.filter((s) => inR(s.createdOffset, r))
  const doneIn = (r: Filters['range']) => srs.filter((s) => s.status === 'Done' && inR(doneAt(s), r))
  const med = (xs: typeof srs) => median(xs.map((s) => doneAt(s) - s.createdOffset))
  const open = srs.filter((s) => s.status !== 'Done')
  const TYPES = ['Policy change', 'Certificate request', 'Claim report', 'ID card / evidence', 'Billing question', 'Cancellation request', 'General'] as const
  const ams = data.users.filter((u) => u.role === 'account-manager' && (!f.office || u.officeId === f.office) && (user.role !== 'account-manager' || u.officeId === user.officeId))
  const certs = (data.certificates ?? []).filter((c) => inScope(accounts.get(c.accountId)))
  const days = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)} days`)
  const rows = ams.map((u) => { const mine = srs.filter((s) => s.ownerId === u.id); return [u.name, mine.filter((s) => s.status !== 'Done').length, doneIn(f.range).filter((s) => s.ownerId === u.id).length, days(med(doneIn(f.range).filter((s) => s.ownerId === u.id))), mine.filter((s) => s.status === 'Waiting on carrier').length] })
  return (
    <>
      <Cards>
        <Card label="Opened" value={String(opened(f.range).length)} delta={delta(opened(f.range).length, opened(f.prev).length, f)} better="down" />
        <Card label="Done" value={String(doneIn(f.range).length)} delta={delta(doneIn(f.range).length, doneIn(f.prev).length, f)} />
        <Card label="Open now" value={String(open.length)} />
        <Card label="Median days to Done" value={days(med(doneIn(f.range)))} better="down" delta={delta(med(doneIn(f.range)), med(doneIn(f.prev)), f)} />
      </Cards>
      <p className="tabular mb-4 text-base">Certificates issued: {certs.filter((c) => inR(c.issuedOffset, f.range)).length} · Needs review now: {certs.filter((c) => c.status === 'Needs review').length} · <Link to="/certificates" className="text-link underline">Open Certificates</Link></p>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Bars title="Open by status" summary="Open Service Requests by status" rows={(['New', 'In progress', 'Waiting on carrier', 'Waiting on client'] as const).map((s) => ({ label: s, value: open.filter((x) => x.status === s).length, to: `/service?view=list&status=${encodeURIComponent(s)}` }))} />
        <Bars title="Open by age" summary="Open Service Requests by age" rows={([['0–2 days', 0, 2], ['3–7 days', 3, 7], ['8–14 days', 8, 14], ['15+ days', 15, 99999]] as const).map(([l, a, b]) => ({ label: l, value: open.filter((s) => -s.createdOffset >= a && -s.createdOffset <= b).length, danger: a === 15 }))} />
      </div>
      <div className="mt-4"><Panel title="By type"><Table head={['Type', 'Opened', 'Done', 'Open', 'Median days to Done']} rows={TYPES.map((t) => [t, opened(f.range).filter((s) => s.type === t).length, doneIn(f.range).filter((s) => s.type === t).length, open.filter((s) => s.type === t).length, days(med(doneIn(f.range).filter((s) => s.type === t)))])} links={TYPES.map((t) => `/service?view=list&type=${encodeURIComponent(t)}`)} empty="No Service Requests in this range." /></Panel></div>
      <div className="mt-4"><Panel title="By Account Manager"><Table head={['Account Manager', 'Open', 'Done', 'Median days to Done', 'Waiting on carrier']} rows={rows} links={ams.map((u) => `/service?view=list&assignee=${u.id}`)} onTable={onTable} empty="No Account Managers in scope." /></Panel></div>
    </>
  )
}

/** US-RPT-009: synced commission = Term premium × carrier rate; first Term of a Policy is new business. */
function CommissionReport({ data, user, f, accounts, inScope, lineOk, onTable, syncLabel }: Ctx & { syncLabel: string | null }) {
  const pols = new Map(data.policies.map((p) => [p.id, p]))
  const firstTerm = new Map<string, number>()
  for (const t of data.terms) firstTerm.set(t.policyId, Math.min(firstTerm.get(t.policyId) ?? Infinity, t.effectiveOffset))
  const own = user.role === 'producer'
  const recs = (r: Filters['range']) => data.terms.filter((t) => t.source !== 'fortify-won' && inR(t.effectiveOffset, r)).flatMap((t) => {
    const p = pols.get(t.policyId)
    const a = p && accounts.get(p.accountId)
    if (!p || !a || !inScope(a) || !lineOk(p.line)) return []
    const rate = data.carriers.find((c) => c.id === p.carrierId)?.commission?.[p.line as never] ?? 0.12
    const isNew = firstTerm.get(p.id) === t.effectiveOffset
    const agency = t.premium * rate
    const share = isNew ? 0.5 : 0.4
    return [{ producerId: a.producerId, carrierId: p.carrierId, premium: t.premium, isNew, agency, producer: agency * share, offset: t.effectiveOffset }]
  })
  const now = recs(f.range)
  const amt = (x: (typeof now)[number]) => (own ? x.producer : x.agency)
  const total = (xs: typeof now) => xs.reduce((n, x) => n + amt(x), 0)
  const pipe = data.opportunities.filter((o) => OPEN.includes(o.stage) && inScope(accounts.get(o.accountId)) && o.lines.some(lineOk)).reduce((n, o) => { const c = commissionFor(o, data.quotes, data.carriers); return n + (own ? c.producer : c.agency) }, 0)
  const months = [...new Set(now.map((x) => monthKey(x.offset)))].sort()
  const trend = months.map((m) => ({ month: monthLabel(m), new: Math.round(total(now.filter((x) => monthKey(x.offset) === m && x.isNew))), renewal: Math.round(total(now.filter((x) => monthKey(x.offset) === m && !x.isNew))) }))
  const producers = own ? [] : data.users.filter((u) => u.role === 'producer' && now.some((x) => x.producerId === u.id))
  const carriers = data.carriers.filter((c) => now.some((x) => x.carrierId === c.id))
  return (
    <>
      <p className="-mt-2 mb-4 text-sm text-muted">From AMS{syncLabel && ` · synced ${syncLabel}`}{own && ' · Your producer share only'}</p>
      <Cards>
        <Card label="Commission" value={money(total(now))} full={fmtUsdFull(total(now))} delta={delta(total(now), total(recs(f.prev)), f)} />
        <Card label="New business" value={money(total(now.filter((x) => x.isNew)))} />
        <Card label="Renewal" value={money(total(now.filter((x) => !x.isNew)))} />
        <Card label="Estimated on open pipeline" value={money(pipe)} />
      </Cards>
      <Panel title="Commission by month"><BarChart data={trend} x="month" series={[{ key: 'new', label: 'New business' }, { key: 'renewal', label: 'Renewal' }]} summary="Commission per month, new business and renewal" /></Panel>
      {own ? (
        <div className="mt-4"><Panel title="By carrier"><Table head={['Carrier', 'Your commission', 'Premium']} rows={carriers.map((c) => { const xs = now.filter((x) => x.carrierId === c.id); return [c.name, fmtUsdFull(total(xs)), fmtUsdFull(xs.reduce((n, x) => n + x.premium, 0))] })} onTable={onTable} empty="No commission in this range." /></Panel></div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <Panel title="By Producer"><Table head={['Producer', 'Agency commission', 'New', 'Renewal', 'Producer share']} rows={producers.map((u) => { const xs = now.filter((x) => x.producerId === u.id); return [u.name, fmtUsdFull(total(xs)), fmtUsdFull(total(xs.filter((x) => x.isNew))), fmtUsdFull(total(xs.filter((x) => !x.isNew))), fmtUsdFull(xs.reduce((n, x) => n + x.producer, 0))] })} onTable={onTable} empty="No commission in this range." /></Panel>
          <Panel title="By carrier"><Table head={['Carrier', 'Commission', 'Effective rate']} rows={carriers.map((c) => { const xs = now.filter((x) => x.carrierId === c.id); const prem = xs.reduce((n, x) => n + x.premium, 0); return [c.name, fmtUsdFull(total(xs)), pct(prem ? total(xs) / prem : null)] })} empty="No commission in this range." /></Panel>
        </div>
      )}
    </>
  )
}
