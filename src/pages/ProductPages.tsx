import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Search, SearchX } from 'lucide-react'
import { useApp } from '@/app/store'
import { Markdown } from '@/product/Markdown'
import { docs, EPIC_ORDER, epics, glossary, health, routes, sessions, sitemap, slugify, stories, storiesForRoute, storyById, type Story } from '@/product/spec'
import { Badge, Button, Callout, CountPill, cx, FilterChip, Kbd, SearchField, Select, Tip } from '@/components/ui/primitives'
import { FilterMenu, ListToolbar, PageTitle } from '@/components/patterns'
import { StatusCell } from '@/components/ui/status'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/states'
import { EmptyState as Empty } from '@/components/ui/states'
import { NotFound as NotFoundPage } from './SystemPages'

function ProductNotFound({ what }: { what: string }) {
  return <Empty icon={SearchX} title={what} body="Check the ID, or find it in the backlog." action={<Link to="/product/backlog" className="text-base font-medium text-link hover:underline">Go to Backlog</Link>} />
}

const epicName = (code: string) => epics.find((e) => e.code === code)?.name ?? code
const PRIORITY_DOT: Record<string, string> = { P0: 'bg-danger', P1: 'bg-warning', P2: 'bg-muted' }

/** US-PRD-001: 240px tree (IA + Backlog) beside the page. Hidden by VITE_SHOW_PRODUCT=false. */
export function ProductLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (import.meta.env.VITE_SHOW_PRODUCT === 'false') return <NotFoundPage />
  const storyEpic = pathname.startsWith('/product/stories/') ? pathname.split('/').pop()!.slice(3, 6) : null
  const ia: [string, string][] = [['/product', 'Overview'], ['/product/sitemap', 'Sitemap'], ['/product/object-model', 'Object model'], ['/product/roles', 'Roles & permissions'], ['/product/glossary', 'Glossary']]
  const backlog: [string, string, number?][] = [['/product/backlog', 'All stories', stories.length], ['/product/backlog/map', 'Story map'], ...EPIC_ORDER.map((c) => [`/product/epics/${c.toLowerCase()}`, `${c} · ${epicName(c)}`, stories.filter((s) => s.epic === c).length] as [string, string, number])]
  const item = ([to, label, n]: [string, string, number?], active?: boolean) => (
    <NavLink
      key={to}
      to={to}
      end
      className={({ isActive }) => cx('flex items-center gap-2 rounded-md px-2.5 py-1.5 text-base', isActive || active ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:bg-recessed hover:text-strong')}
      aria-current={active ? 'page' : undefined}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {n != null && <span className="tabular text-xs text-muted">{n}</span>}
    </NavLink>
  )
  const current = [...ia, ...backlog].find(([to]) => to === pathname)?.[0] ?? (storyEpic ? `/product/epics/${storyEpic.toLowerCase()}` : '')
  return (
    <div className="flex min-h-full">
      <nav aria-label="Product" className="sticky top-0 h-[calc(100vh-56px)] w-60 shrink-0 overflow-y-auto border-r border-line px-2 py-5 max-lg:hidden">
        <p className="px-2.5 pb-1 text-xs text-muted">IA</p>
        {ia.map((x) => item(x))}
        <p className="mt-4 px-2.5 pb-1 text-xs text-muted">Backlog</p>
        {backlog.map((x) => item(x, x[0] === `/product/epics/${storyEpic?.toLowerCase()}`))}
      </nav>
      <div className="min-w-0 flex-1 px-8 pt-6 pb-12 max-sm:px-4">
        <label className="mb-4 block lg:hidden">
          <span className="sr-only">Jump to</span>
          <Select value={current} onChange={(e) => e.target.value && navigate(e.target.value)} className="w-full">
            <option value="">Jump to…</option>
            <optgroup label="IA">{ia.map(([to, l]) => <option key={to} value={to}>{l}</option>)}</optgroup>
            <optgroup label="Backlog">{backlog.map(([to, l]) => <option key={to} value={to}>{l}</option>)}</optgroup>
          </Select>
        </label>
        <Outlet />
      </div>
    </div>
  )
}

function Title({ title, description, meta }: { title: React.ReactNode; description?: string; meta?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <PageTitle title={title} description={description} />
      {meta && <p className="tabular mt-1 text-sm text-label">{meta}</p>}
    </div>
  )
}

/** US-PRD-005 + US-PRD-004 spec health */
export function ProductOverview() {
  const gaps = [...routes].filter((r) => storiesForRoute(r).length === 0)
  const count = (p: string) => stories.filter((s) => s.priority === p).length
  const stats: [string, string, string][] = [
    ['Stories', String(stories.length), '/product/backlog'],
    ['P0', String(count('P0')), '/product/backlog?priority=P0'],
    ['P1', String(count('P1')), '/product/backlog?priority=P1'],
    ['P2', String(count('P2')), '/product/backlog?priority=P2'],
    ['FE sessions', `${sessions(stories)}`, '/product/backlog'],
    ['Coverage gaps', String(gaps.length), '/product/sitemap'],
  ]
  return (
    <>
      <Title title="Product" description="Information architecture and user-story backlog, rendered from spec/." />
      <div className="grid grid-cols-6 gap-3 max-lg:grid-cols-3">
        {stats.map(([k, v, to]) => (
          <Link key={k} to={to} className="rounded-md bg-surface p-3 shadow-ring hover:bg-recessed">
            <span className="block text-sm text-label">{k}</span>
            <span className="tabular mt-1 block text-metric font-semibold text-strong">{v}</span>
          </Link>
        ))}
      </div>
      <Callout tone={health.length ? 'danger' : 'success'} className="mt-4">
        <p className="font-medium">Spec health: {health.length ? `${health.length} problems` : 'All checks pass'}</p>
        {health.slice(0, 10).map((h) => <p key={h} className="text-sm">{h}</p>)}
      </Callout>
      <h2 className="mt-8 mb-2 text-lg font-medium text-strong">Epics</h2>
      <div className="overflow-x-auto rounded-md bg-surface shadow-ring">
        <table className="tabular w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="h-10 border-b border-fill text-base font-semibold text-strong">
              {['Epic', 'Stories', 'P0', 'P1', 'P2', 'S', 'M', 'Draft', 'Done'].map((h, i) => <th key={h} className={cx('px-3', i > 0 && 'text-right')}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {epics.map((e) => {
              const list = stories.filter((s) => s.epic === e.code)
              const n = (f: (s: Story) => boolean) => list.filter(f).length
              return (
                <tr key={e.code} className="h-10 border-b border-fill last:border-0">
                  <td className="px-3"><Link to={`/product/epics/${e.code.toLowerCase()}`} className="text-link hover:underline"><span className="font-mono text-sm">{e.code}</span> · {e.name}</Link></td>
                  {[list.length, n((s) => s.priority === 'P0'), n((s) => s.priority === 'P1'), n((s) => s.priority === 'P2'), n((s) => s.size === 'S'), n((s) => s.size === 'M'), n((s) => s.status === 'Draft'), n((s) => s.status === 'Done')].map((v, i) => <td key={i} className="px-3 text-right">{v || <span className="text-muted">—</span>}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-3 max-lg:grid-cols-2">
        {[['Sitemap', 'Routes, navigation, and story coverage', '/product/sitemap'], ['Object model', 'Objects, lifecycles, timing, business rules', '/product/object-model'], ['Roles & permissions', 'Scopes and the permission matrix', '/product/roles'], ['Glossary', 'The canonical vocabulary', '/product/glossary']].map(([t, d, to]) => (
          <Link key={to} to={to} className="rounded-md bg-surface p-4 shadow-ring hover:bg-recessed">
            <p className="text-base font-medium text-strong">{t}</p>
            <p className="mt-0.5 text-sm text-muted">{d}</p>
          </Link>
        ))}
      </div>
    </>
  )
}

/** US-PRD-006 */
export function ProductSitemap() {
  const [open, setOpen] = useState<string | null>(null)
  const [gapsOnly, setGapsOnly] = useState(false)
  const gaps = [...routes].filter((r) => storiesForRoute(r).length === 0).length
  const row = (label: string, route: string, extra: string[], depth = 0, visibleTo?: string[]) => {
    const list = storiesForRoute(route)
    if (gapsOnly && list.length) return null
    return (
      <div key={`${label}${route}`} id={`route-${encodeURIComponent(route)}`}>
        <button onClick={() => setOpen(open === route ? null : route)} className={cx('grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-fill py-2 text-left hover:bg-recessed', depth ? 'pl-8' : 'pl-3', 'pr-3')} aria-expanded={open === route}>
          <span className="min-w-0">
            <span className="font-medium text-strong">{label}</span> <span className="font-mono text-sm text-label">{route}</span>
            <span className="ml-2 text-sm text-muted">{visibleTo ? visibleTo.join(', ') : depth ? '' : 'All roles'}{extra.length ? ` · ${extra.join(' · ')}` : ''}</span>
          </span>
          {list.length ? <CountPill n={list.length} /> : <span className="flex items-center gap-1 text-sm font-medium text-warning-text"><AlertTriangle aria-hidden className="size-3.5" /> No stories</span>}
        </button>
        {open === route && list.length > 0 && (
          <ul className="border-b border-fill bg-recessed px-8 py-2">
            {list.map((s) => (
              <li key={s.id} className="flex gap-3 py-1 text-base">
                <Link to={`/product/stories/${s.id}`} className="font-mono text-sm text-link hover:underline">{s.id}</Link>
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                <span className="text-sm text-label">{s.priority} · {s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  return (
    <>
      <Title title="Sitemap" description="Rendered from spec/ia/sitemap.yaml, the same file the sidebar reads." meta={`${routes.size} routes · ${gaps} routes without stories`} />
      <label className="mb-3 inline-flex items-center gap-2 text-base text-label">
        <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} className="size-4 accent-primary" />
        Show gaps only
      </label>
      {gapsOnly && gaps === 0 && <p className="mb-3 text-base text-muted">Every route has at least one story.</p>}
      <div className="overflow-hidden rounded-md bg-surface shadow-ring">
        <p className="bg-recessed px-3 py-1.5 text-sm font-medium text-label">Top bar</p>
        {!gapsOnly && sitemap.topBar.map((t) => (
          <p key={t.id} className="flex items-center gap-2 border-b border-fill px-3 py-2 text-base text-strong">
            {t.label}
            {t.shortcut && <Kbd>{t.shortcut}</Kbd>}
            {t.demo && <Badge>Demo</Badge>}
            <Link to="/product/epics/fnd" className="ml-auto text-sm text-link hover:underline">Shell</Link>
          </p>
        ))}
        <p className="bg-recessed px-3 py-1.5 text-sm font-medium text-label">Sidebar</p>
        {sitemap.sidebar.flatMap((e) =>
          'group' in e
            ? [<p key={e.group} className="px-3 pt-3 pb-1 text-xs text-muted">{e.group}</p>, ...e.items.flatMap((i) => [row(i.label, i.route, [...(i.views ?? []), ...(i.savedViews ?? [])], 0, i.visibleTo), ...(i.record ? [row(`${i.label} record`, i.record, i.tabs ?? [], 1)] : [])])]
            : [row(e.label, e.route, e.savedViews ?? [], 0, e.visibleTo)],
        )}
        <p className="bg-recessed px-3 py-1.5 text-sm font-medium text-label">Footer</p>
        {sitemap.footer.flatMap((f) => [row(f.label, f.route, [], 0, f.visibleTo), ...(f.pages ?? []).filter((p) => p !== f.route).map((p) => row(p.split('/').pop()!, p, [], 1))])}
        <p className="bg-recessed px-3 py-1.5 text-sm font-medium text-label">System</p>
        {sitemap.system.map((s) => row(s.id, s.route, []))}
      </div>
    </>
  )
}

/** US-PRD-007: object model + business rules (#business-rules). */
export function ProductObjectModel() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])
  return (
    <>
      <Title title="Object model" description="Objects, relationships, lifecycles, timing rules, and the business rules that override story assumptions." />
      <nav aria-label="On this page" className="mb-6 rounded-md bg-surface p-4 shadow-ring">
        <p className="mb-1.5 text-sm font-medium text-label">On this page</p>
        <ul className="columns-2 gap-6 text-base max-sm:columns-1">
          {[...docs['ia/object-model.md'].matchAll(/^## (.+)$/gm)].map((m) => (
            <li key={m[1]}><a href={`#${slugify(m[1])}`} className="inline-block min-h-6 py-0.5 text-link hover:underline">{m[1]}</a></li>
          ))}
          <li><a href="#business-rules" className="inline-block min-h-6 py-0.5 text-link hover:underline">Business rules</a></li>
        </ul>
      </nav>
      <Markdown source={docs['ia/object-model.md'].replace(/^# .*\n/, '')} />
      <h2 id="business-rules" className="mt-10 mb-2 text-lg font-medium text-strong">Business rules</h2>
      <Markdown source={docs['ia/rules.md'].replace(/^# .*\n/, '')} />
    </>
  )
}

/** US-PRD-008 */
export function ProductRoles() {
  const { user } = useApp()
  const [params, setParams] = useSearchParams()
  const role = params.get('role') ?? user.role
  const labels: Record<string, string> = { producer: 'Producer', 'account-manager': 'Account Manager', principal: 'Principal', admin: 'Admin' }
  const md = docs['ia/roles.md'].replace(/^# .*\n/, '')
  const col = Object.keys(labels).indexOf(role) + 2
  return (
    <>
      <Title title="Roles & permissions" description="Scope, the permission matrix, and the rules behind it." />
      <p className="mb-3 flex flex-wrap gap-x-4 text-sm text-label">
        Stories for:
        {Object.entries(labels).map(([k, v]) => <Link key={k} to={`/product/backlog?role=${k}`} className="text-link hover:underline">{v}</Link>)}
      </p>
      <label className="mb-4 flex items-center gap-2 text-base text-label">
        Highlight role
        <Select value={role} onChange={(e) => setParams({ role: e.target.value }, { replace: true })}>
          {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </label>
      <style>{`.roles-doc table:has(th:nth-child(5)) td:nth-child(n+2):not(:nth-child(${col})), .roles-doc table:has(th:nth-child(5)) th:nth-child(n+2):not(:nth-child(${col})) { color: var(--color-muted); } .roles-doc table:has(th:nth-child(5)) td:nth-child(${col}), .roles-doc table:has(th:nth-child(5)) th:nth-child(${col}) { background: var(--color-recessed); color: var(--color-strong); font-weight: 600; } .roles-doc table:has(th:nth-child(5)) thead th { position: sticky; top: 0; background: var(--color-surface); } .roles-doc table:has(th:nth-child(5)) td:first-child { position: sticky; left: 0; background: var(--color-surface); }`}</style>
      <div className="roles-doc">
        <Markdown source={md} />
      </div>
    </>
  )
}

/** US-PRD-009 */
export function ProductGlossary() {
  const [q, setQ] = useState('')
  const toast = useToast()
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [hash])
  const t = q.trim().toLowerCase()
  const list = glossary.filter((g) => !t || g.name.toLowerCase().includes(t) || g.definition.toLowerCase().includes(t) || g.avoid.some((a) => a.toLowerCase().includes(t)))
  const sections = [...new Set(list.map((g) => g.section))]
  return (
    <>
      <Title title="Glossary" description="The words Fortify uses, and the ones it avoids." meta={t ? `Showing ${list.length} of ${glossary.length} terms` : `${glossary.length} terms`} />
      <nav aria-label="Glossary sections" className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {[...new Set(glossary.map((g) => g.section))].map((sec) => (
          <a key={sec} href={`#section-${slugify(sec)}`} className="text-link hover:underline">
            {sec} <span className="tabular text-muted">{list.filter((g) => g.section === sec).length}</span>
          </a>
        ))}
      </nav>
      <SearchField label="Search terms" placeholder="Search terms or avoided words" value={q} onChange={setQ} className="mb-6 block" />
      {list.length === 0 && <EmptyState icon={Search} title="No terms match" body="Try a word the team might say instead, like “ticket” or “deal”." />}
      {sections.map((s) => (
        <section key={s} id={`section-${slugify(s)}`} className="mb-8 scroll-mt-4">
          <h2 className="mb-2 text-lg font-medium text-strong">{s}</h2>
          <ul className="flex flex-col divide-y divide-fill rounded-md bg-surface shadow-ring">
            {list.filter((g) => g.section === s).map((g) => (
              <li key={g.slug} id={g.slug} className={cx('grid grid-cols-[200px_1fr_auto] gap-4 px-4 py-3 max-md:grid-cols-1', hash === `#${g.slug}` && 'bg-recessed')}>
                <h3 className="text-base font-medium text-strong">{g.name}</h3>
                <div className="text-base text-ink">
                  {g.definition}
                  {g.avoid.length > 0 && <span className="mt-1 block text-sm text-muted">Avoid: {g.avoid.join(', ')}</span>}
                </div>
                <Tip label="Copy link">
                  <button aria-label={`Copy link to ${g.name}`} onClick={() => navigator.clipboard?.writeText(`${location.origin}/product/glossary#${g.slug}`).then(() => toast('Link copied', 'success'))} className="grid size-8 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong">
                    <Copy className="size-4" strokeWidth={1.75} />
                  </button>
                </Tip>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

const ROLE_SLUG: Record<string, string> = { producer: 'Producer', 'account-manager': 'Account Manager', principal: 'Principal', admin: 'Admin' }
const STATUSES = ['Draft', 'Ready', 'In design', 'In build', 'Done']

function useBacklogFilter(fixedEpic?: string) {
  const { user } = useApp()
  const [params, setParams] = useSearchParams()
  const rolesSel = params.get('role')?.split(',').filter(Boolean) ?? []
  const statusSel = params.get('status')?.split(',').filter(Boolean) ?? []
  const q = (params.get('q') ?? '').toLowerCase()
  const epicsSel = fixedEpic ? [fixedEpic] : (params.get('epic')?.split(',').filter(Boolean) ?? [])
  const pr = params.get('priority')?.split(',').filter(Boolean) ?? []
  const list = stories.filter((s) => (!epicsSel.length || epicsSel.includes(s.epic)) && (!pr.length || pr.includes(s.priority)) && (!rolesSel.length || rolesSel.some((r) => s.roles.includes(ROLE_SLUG[r] as never))) && (!statusSel.length || statusSel.includes(s.status)) && (!q || s.id.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)))
  const toggle = (key: string, v: string, current: string[]) => {
    const next = new URLSearchParams(params)
    const vals = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
    if (vals.length) next.set(key, vals.join(','))
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const setQ = (v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set('q', v)
    else next.delete('q')
    setParams(next, { replace: true })
  }
  const applied = [...rolesSel.map((r) => ['role', r, `Role is ${ROLE_SLUG[r] ?? r}`, rolesSel] as const), ...statusSel.map((v) => ['status', v, `Status is ${v}`, statusSel] as const), ...(fixedEpic ? [] : epicsSel.map((c) => ['epic', c, `Epic is ${c}`, epicsSel] as const))]
  const filtered = (epicsSel.length > 0 && !fixedEpic) || pr.length > 0 || rolesSel.length > 0 || statusSel.length > 0 || params.get('q')
  const toolbar = (
    <div className="mb-3 flex flex-col gap-2">
      <ListToolbar>
        <SearchField label="Search stories" placeholder="Search ID, title, or text" value={params.get('q') ?? ''} onChange={setQ} />
        {['P0', 'P1', 'P2'].map((p) => (
          <Button key={p} aria-pressed={pr.includes(p)} onClick={() => toggle('priority', p, pr)}>
            {p}
          </Button>
        ))}
        <FilterMenu filters={[]} count={applied.length}>
          {/* Multi-value: each pick adds or removes one value; applied values show as chips. */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-label">Role</span>
            <Select value="" onChange={(e) => e.target.value && toggle('role', e.target.value, rolesSel)}>
              <option value="">Add a role…</option>
              {Object.entries(ROLE_SLUG).map(([k, v]) => <option key={k} value={k}>{rolesSel.includes(k) ? '✓ ' : ''}{v}</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-label">Status</span>
            <Select value="" onChange={(e) => e.target.value && toggle('status', e.target.value, statusSel)}>
              <option value="">Add a status…</option>
              {STATUSES.map((v) => <option key={v} value={v}>{statusSel.includes(v) ? '✓ ' : ''}{v}</option>)}
            </Select>
          </label>
          {!fixedEpic && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-label">Epic</span>
              <Select value="" onChange={(e) => e.target.value && toggle('epic', e.target.value, epicsSel)}>
                <option value="">Add an Epic…</option>
                {EPIC_ORDER.map((c) => <option key={c} value={c}>{epicsSel.includes(c) ? '✓ ' : ''}{c} · {epicName(c)}</option>)}
              </Select>
            </label>
          )}
        </FilterMenu>
        <Button onClick={() => { const next = new URLSearchParams(params); next.set('role', user.role); setParams(next, { replace: true }) }} aria-pressed={rolesSel.length === 1 && rolesSel[0] === user.role}>
          Mine
        </Button>
      </ListToolbar>
      {(applied.length > 0 || filtered) && (
        <div className="flex flex-wrap items-center gap-2">
          {applied.map(([k, v, label, cur]) => (
            <FilterChip key={k + v} label={label} onRemove={() => toggle(k, v, [...cur])} />
          ))}
          {filtered && <button onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-sm font-medium text-link hover:underline">Clear all</button>}
        </div>
      )}
    </div>
  )
  return { list, toolbar, meta: `Showing ${list.length} of ${fixedEpic ? stories.filter((s) => s.epic === fixedEpic).length : stories.length} stories · ${list.filter((s) => s.priority === 'P0').length} P0 · ${sessions(list)} FE sessions` }
}

const PRIORITY_ORDER = ['P0', 'P1', 'P2']
const STATUS_ORDER = ['Draft', 'Ready', 'In design', 'In build', 'Done']
function StoryTable({ list, hideEpic }: { list: Story[]; hideEpic?: boolean }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const sort = params.get('sort') ?? ''
  const key = sort.replace(/^-/, '')
  const dir = sort.startsWith('-') ? -1 : 1
  const cmp: Record<string, (a: Story, b: Story) => number> = {
    id: (a, b) => a.id.localeCompare(b.id),
    priority: (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    size: (a, b) => a.size.localeCompare(b.size),
  }
  const rows = cmp[key] ? [...list].sort((a, b) => dir * cmp[key](a, b)) : list
  const head = (k: string, label: string, w: string) => {
    const on = key === k
    return (
      <th className={cx(w, 'px-3')} aria-sort={on ? (dir > 0 ? 'ascending' : 'descending') : undefined}>
        {cmp[k] ? (
          <button
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set('sort', on && dir > 0 ? `-${k}` : k)
              setParams(next, { replace: true })
            }}
            className="inline-flex items-center gap-1 hover:text-link"
          >
            {label}
            {on && (dir > 0 ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />)}
          </button>
        ) : (
          label
        )}
      </th>
    )
  }
  const roles = (r: string[]) => (r.length > 1 ? `${r[0]} +${r.length - 1}` : r[0] ?? '')
  return (
    <div className="overflow-x-auto rounded-md bg-surface shadow-ring">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-left">
        <thead>
          <tr className="h-10 border-b border-fill text-base font-semibold text-strong">
            {head('id', 'ID', 'w-32')}
            {head('title', 'Story', '')}
            {!hideEpic && head('epic', 'Epic', 'w-20')}
            {head('roles', 'Roles', 'w-44')}
            {head('priority', 'Priority', 'w-24')}
            {head('status', 'Status', 'w-28')}
            {head('size', 'Size', 'w-16')}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} tabIndex={0} onClick={() => navigate(`/product/stories/${s.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/product/stories/${s.id}`)} className="h-10 cursor-pointer border-b border-fill last:border-0 hover:bg-recessed focus-visible:bg-recessed focus-visible:outline-none">
              <td className="px-3 whitespace-nowrap"><Link to={`/product/stories/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-sm text-link hover:underline">{s.id}</Link></td>
              <td className="truncate px-3" title={s.title}>{s.title}</td>
              {!hideEpic && <td className="px-3 font-mono text-sm">{s.epic}</td>}
              <td className="truncate px-3 text-label" title={s.roles.join(', ')}>{roles(s.roles)}</td>
              <td className="px-3"><span className="inline-flex items-center gap-1.5"><span aria-hidden className={`size-2 rounded-full ${PRIORITY_DOT[s.priority]}`} />{s.priority}</span></td>
              <td className="px-3"><StatusCell status={s.status} /></td>
              <td className="px-3 text-label">{s.size}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <EmptyState icon={Search} title="No stories match" body="Clear a filter or search for an ID like US-REN-004." />}
    </div>
  )
}

/** US-PRD-010 */
export function ProductBacklog() {
  const { list, toolbar, meta } = useBacklogFilter()
  return (
    <>
      <Title title="Backlog" description="Every user story, in Epic order." meta={meta} />
      {toolbar}
      <StoryTable list={list} />
    </>
  )
}

/** US-PRD-011 */
export function ProductStoryMap() {
  const { list, toolbar, meta } = useBacklogFilter()
  const rows: [string, string][] = [['P0', 'P0 · Demo loop'], ['P1', 'P1 · Basic CRM'], ['P2', 'P2 · Nice to have']]
  return (
    <>
      <Title title="Story map" description="Epics across, priority down." meta={meta} />
      {toolbar}
      <div className="overflow-x-auto">
        <div className="grid gap-2" style={{ gridTemplateColumns: `140px repeat(${EPIC_ORDER.length}, minmax(150px, 1fr))`, minWidth: 140 + EPIC_ORDER.length * 158 }}>
          <span />
          {EPIC_ORDER.map((c) => <span key={c} className="px-1.5 text-sm font-semibold text-strong">{c}</span>)}
          {rows.map(([p, label]) => (
            <div key={p} className="contents">
              <span className="sticky left-0 z-10 bg-canvas pt-2 text-sm font-medium text-label">{label}</span>
              {EPIC_ORDER.map((c) => {
                const cell = list.filter((s) => s.epic === c && s.priority === p)
                return (
                  <div key={c} className="min-h-16 rounded-md bg-recessed p-1.5">
                    {cell.length > 0 ? <p className="tabular px-1 pb-1 text-xs text-label">{cell.length} · {sessions(cell)} sessions</p> : <p className="px-1 text-sm text-muted">—</p>}
                    {cell.map((s) => (
                      <Link key={s.id} to={`/product/stories/${s.id}`} className="mb-1 block rounded-md bg-surface px-2 py-1.5 text-sm shadow-ring hover:bg-recessed">
                        <span className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs text-label">{s.id.slice(3)}</span>
                          <StatusCell status={s.status} />
                        </span>
                        <span className="block truncate text-ink">{s.title}</span>
                      </Link>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/** US-PRD-012 */
export function ProductEpic() {
  const { code = '' } = useParams()
  const e = epics.find((x) => x.code === code.toUpperCase())
  const { list, toolbar } = useBacklogFilter(e?.code)
  if (!e) return <ProductNotFound what={`No Epic with code “${code.toUpperCase()}”`} />
  const all = stories.filter((s) => s.epic === e.code)
  const n = (p: string) => all.filter((s) => s.priority === p).length
  return (
    <>
      <Title title={<><span className="font-mono">{e.code}</span> · {e.name}</>} description={e.summary} meta={`${all.length} stories · ${n('P0')} P0 · ${n('P1')} P1 · ${n('P2')} P2 · ${sessions(all)} FE sessions`} />
      <p className="-mt-4 mb-4 text-sm text-label">
        Routes touched:{' '}
        {[...new Set(all.flatMap((x) => x.routes))].map((r) => (
          <Link key={r} to={`/product/sitemap#route-${encodeURIComponent(r)}`} className="mr-2 font-mono text-link hover:underline">{r}</Link>
        ))}
      </p>
      {(() => {
        const rest = e.body.trim().replace(/^# .*\n+/, '').trim()
        return rest && rest !== e.summary.trim() ? <div className="mb-6"><Markdown source={rest} /></div> : null
      })()}
      {toolbar}
      <StoryTable list={list} hideEpic />
    </>
  )
}

/** US-PRD-013 */
export function ProductStory() {
  const { id = '' } = useParams()
  const toast = useToast()
  const s = storyById.get(id)
  const blocks = useMemo(() => stories.filter((x) => x.dependsOn.includes(id)), [id])
  if (!s) return <ProductNotFound what={`No story with ID “${id}”`} />
  const idx = stories.indexOf(s)
  const prev = stories[idx - 1]
  const next = stories[idx + 1]
  const dep = (d: string) => {
    const t = storyById.get(d)
    return t ? (
      <Link key={d} to={`/product/stories/${d}`} className="mr-4 inline-flex min-h-7 items-center gap-2 whitespace-nowrap hover:underline">
        <span className="font-mono text-sm text-link">{d}</span>
        <StatusCell status={t.status} />
      </Link>
    ) : (
      <span key={d} className="mr-3 text-danger-text">{d} Missing</span>
    )
  }
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-label">
        <Link to="/product/backlog" className="hover:text-link hover:underline">Backlog</Link> / <Link to={`/product/epics/${s.epic.toLowerCase()}`} className="hover:text-link hover:underline">{s.epic}</Link> / <span className="font-mono">{s.id}</span>
      </nav>
      <div className="mb-4 flex items-start justify-between gap-4 max-sm:flex-col max-sm:gap-2">
        <PageTitle title={s.title} />
        <Button onClick={() => navigator.clipboard?.writeText(s.path).then(() => toast('File path copied', 'success'))}>
          <Copy aria-hidden className="size-4" strokeWidth={1.75} /> Copy file path
        </Button>
      </div>
      <dl className="mb-6 grid grid-cols-[140px_1fr] gap-x-6 max-sm:grid-cols-[88px_1fr] max-sm:gap-x-3 gap-y-2 rounded-md bg-surface p-4 text-base shadow-ring">
        {([
          ['ID', <span key="i" className="font-mono text-sm">{s.id}</span>],
          ['Epic', <Link key="e" to={`/product/epics/${s.epic.toLowerCase()}`} className="text-link hover:underline">{s.epic} · {epicName(s.epic)}</Link>],
          ['Roles', s.roles.join(', ')],
          ['Priority', <span key="p" className="inline-flex items-center gap-1.5"><span aria-hidden className={`size-2 rounded-full ${PRIORITY_DOT[s.priority]}`} />{s.priority}</span>],
          ['Status', <StatusCell key="s" status={s.status} />],
          ['Size', s.size],
          ['Routes', s.routes.map((r) => <Link key={r} to={`/product/sitemap#route-${encodeURIComponent(r)}`} className="mr-3 font-mono text-sm text-link hover:underline">{r}</Link>)],
          ['Depends on', s.dependsOn.length ? s.dependsOn.map(dep) : '—'],
          ['Blocks', blocks.length ? blocks.map((b) => dep(b.id)) : '—'],
          ['File', <span key="f" className="font-mono text-sm text-label">{s.path}</span>],
        ] as [string, React.ReactNode][]).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-label">{k}</dt>
            <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
      {(['Story', 'Acceptance criteria', 'UI states', 'Design notes', 'FE notes', 'Mock data'] as const).map((h) => (
        <section key={h} id={h.toLowerCase().replace(/\s+/g, '-')}>
          <h2 className="mt-6 mb-1 text-lg font-medium text-strong">{h}</h2>
          {s.sections[h] ? <Markdown source={s.sections[h]} /> : <Callout tone="warning">Not written yet. Add a “## {h}” section to {s.path}.</Callout>}
        </section>
      ))}
      <nav aria-label="Story pagination" className="mt-10 flex justify-between gap-4 border-t border-line pt-4 text-base">
        {prev ? (
          <Link to={`/product/stories/${prev.id}`} className="inline-flex min-w-0 items-center gap-1.5 text-link hover:underline">
            <ChevronLeft aria-hidden className="size-4 shrink-0" strokeWidth={1.75} /> <span className="truncate"><span className="font-mono text-sm">{prev.id}</span> {prev.title}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/product/stories/${next.id}`} className="inline-flex min-w-0 items-center gap-1.5 text-right text-link hover:underline">
            <span className="truncate"><span className="font-mono text-sm">{next.id}</span> {next.title}</span> <ChevronRight aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          </Link>
        )}
      </nav>
    </>
  )
}
