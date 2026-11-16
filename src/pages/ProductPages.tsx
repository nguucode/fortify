import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, CheckCircle2, Copy, Search } from 'lucide-react'
import { useApp } from '@/app/store'
import { Markdown } from '@/product/Markdown'
import { docs, EPIC_ORDER, epics, glossary, health, routes, sessions, sitemap, stories, storiesForRoute, storyById, type Story } from '@/product/spec'
import { Button, CountPill, cx, Tip } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/states'
import { NotFound } from './SystemPages'

const epicName = (code: string) => epics.find((e) => e.code === code)?.name ?? code
const PRIORITY_DOT: Record<string, string> = { P0: 'bg-danger', P1: 'bg-warning', P2: 'bg-muted' }

/** US-PRD-001: 240px tree (IA + Backlog) beside the page. Hidden by VITE_SHOW_PRODUCT=false. */
export function ProductLayout() {
  const { pathname } = useLocation()
  if (import.meta.env.VITE_SHOW_PRODUCT === 'false') return <NotFound />
  const storyEpic = pathname.startsWith('/product/stories/') ? pathname.split('/').pop()!.slice(3, 6) : null
  const item = (to: string, label: string, active?: boolean) => (
    <NavLink
      key={to}
      to={to}
      end
      className={({ isActive }) => cx('block truncate rounded-md px-2.5 py-1.5 text-base', isActive || active ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:bg-recessed hover:text-strong')}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </NavLink>
  )
  return (
    <div className="flex min-h-full max-md:flex-col">
      <nav aria-label="Product" className="w-60 shrink-0 border-r border-line px-2 py-5 max-md:w-full max-md:border-r-0 max-md:border-b">
        <p className="px-2.5 pb-1 text-xs text-muted">IA</p>
        {item('/product', 'Overview')}
        {item('/product/sitemap', 'Sitemap')}
        {item('/product/object-model', 'Object model')}
        {item('/product/roles', 'Roles & permissions')}
        {item('/product/glossary', 'Glossary')}
        <p className="mt-4 px-2.5 pb-1 text-xs text-muted">Backlog</p>
        {item('/product/backlog', 'All stories')}
        {item('/product/backlog/map', 'Story map')}
        {EPIC_ORDER.map((c) => item(`/product/epics/${c.toLowerCase()}`, `${c} · ${epicName(c)}`, storyEpic === c))}
      </nav>
      <div className="min-w-0 flex-1 px-8 pt-6 pb-12 max-sm:px-4">
        <Outlet />
      </div>
    </div>
  )
}

function Title({ title, description, meta }: { title: React.ReactNode; description?: string; meta?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-title font-semibold text-strong">{title}</h1>
      {description && <p className="mt-1 text-base text-muted">{description}</p>}
      {meta && <p className="tabular mt-1 text-sm text-label">{meta}</p>}
    </header>
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
      <dl className="grid grid-cols-6 gap-3 max-lg:grid-cols-3">
        {stats.map(([k, v, to]) => (
          <Link key={k} to={to} className="rounded-md bg-surface p-3 shadow-ring hover:shadow-pop">
            <dt className="text-sm text-label">{k}</dt>
            <dd className="tabular mt-1 text-metric font-semibold text-strong">{v}</dd>
          </Link>
        ))}
      </dl>
      <section className={cx('mt-4 flex items-start gap-2 rounded-md px-4 py-3 shadow-ring', health.length ? 'bg-danger-tint' : 'bg-success-tint')}>
        {health.length ? <AlertTriangle aria-hidden className="mt-0.5 size-4 text-danger" /> : <CheckCircle2 aria-hidden className="mt-0.5 size-4 text-success" />}
        <div className="text-base text-ink">
          <p className="font-medium">Spec health: {health.length ? `${health.length} problems` : 'All checks pass'}</p>
          {health.slice(0, 10).map((h) => <p key={h} className="text-sm">{h}</p>)}
        </div>
      </section>
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
          <Link key={to} to={to} className="rounded-md bg-surface p-4 shadow-ring hover:shadow-pop">
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
  const gaps = [...routes].filter((r) => storiesForRoute(r).length === 0).length
  const row = (label: string, route: string, extra: string[], depth = 0, visibleTo?: string[]) => {
    const list = storiesForRoute(route)
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
      <div className="overflow-hidden rounded-md bg-surface shadow-ring">
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
      <label className="mb-4 flex items-center gap-2 text-base text-label">
        Highlight role
        <select value={role} onChange={(e) => setParams({ role: e.target.value }, { replace: true })} className="h-9 rounded-md bg-surface px-2 text-base text-ink shadow-control">
          {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <style>{`.roles-doc table td:nth-child(n+2):not(:nth-child(${col})), .roles-doc table th:nth-child(n+2):not(:nth-child(${col})) { color: var(--color-muted); } .roles-doc table td:nth-child(${col}), .roles-doc table th:nth-child(${col}) { background: var(--color-selection); }`}</style>
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
      <Title title="Glossary" description="The words Fortify uses, and the ones it avoids." meta={`${glossary.length} terms`} />
      <label className="relative mb-6 block w-80 max-sm:w-full">
        <span className="sr-only">Search terms</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms or avoided words" className="h-9 w-full rounded-md bg-surface pr-3 pl-8 text-base shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary" />
      </label>
      {list.length === 0 && <EmptyState icon={Search} title="No terms match" body="Try a word the team might say instead, like “ticket” or “deal”." />}
      {sections.map((s) => (
        <section key={s} className="mb-8">
          <h2 className="mb-2 text-lg font-medium text-strong">{s}</h2>
          <dl className="flex flex-col divide-y divide-fill rounded-md bg-surface shadow-ring">
            {list.filter((g) => g.section === s).map((g) => (
              <div key={g.slug} id={g.slug} className={cx('grid grid-cols-[200px_1fr_auto] gap-4 px-4 py-3 max-md:grid-cols-1', hash === `#${g.slug}` && 'bg-selection')}>
                <dt className="font-medium text-strong">{g.name}</dt>
                <dd className="text-base text-ink">
                  {g.definition}
                  {g.avoid.length > 0 && <span className="mt-1 block text-sm text-muted">Avoid: {g.avoid.join(', ')}</span>}
                </dd>
                <Tip label="Copy link">
                  <button aria-label={`Copy link to ${g.name}`} onClick={() => navigator.clipboard?.writeText(`${location.origin}/product/glossary#${g.slug}`).then(() => toast('Link copied', 'success'))} className="grid size-8 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong">
                    <Copy className="size-4" />
                  </button>
                </Tip>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  )
}

function useBacklogFilter(fixedEpic?: string) {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase()
  const epicsSel = fixedEpic ? [fixedEpic] : (params.get('epic')?.split(',').filter(Boolean) ?? [])
  const pr = params.get('priority')?.split(',').filter(Boolean) ?? []
  const list = stories.filter((s) => (!epicsSel.length || epicsSel.includes(s.epic)) && (!pr.length || pr.includes(s.priority)) && (!q || s.id.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)))
  const toggle = (key: string, v: string, current: string[]) => {
    const next = new URLSearchParams(params)
    const vals = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
    if (vals.length) next.set(key, vals.join(','))
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const toolbar = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <label className="relative w-72 max-sm:w-full">
        <span className="sr-only">Search stories</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          defaultValue={params.get('q') ?? ''}
          onChange={(e) => {
            const next = new URLSearchParams(params)
            if (e.target.value) next.set('q', e.target.value)
            else next.delete('q')
            setParams(next, { replace: true })
          }}
          placeholder="Search ID, title, or text"
          className="h-9 w-full rounded-md bg-surface pr-3 pl-8 text-base shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      {['P0', 'P1', 'P2'].map((p) => (
        <button key={p} aria-pressed={pr.includes(p)} onClick={() => toggle('priority', p, pr)} className={cx('h-8 rounded-md px-2.5 text-sm font-medium shadow-ring', pr.includes(p) ? 'bg-recessed font-semibold text-strong' : 'bg-surface text-label hover:bg-recessed')}>
          {p}
        </button>
      ))}
      {!fixedEpic && (
        <select value="" onChange={(e) => e.target.value && toggle('epic', e.target.value, epicsSel)} className="h-8 rounded-md bg-surface px-2 text-sm text-ink shadow-control" aria-label="Add Epic filter">
          <option value="">Epic…</option>
          {EPIC_ORDER.map((c) => <option key={c} value={c}>{c} · {epicName(c)}</option>)}
        </select>
      )}
      {!fixedEpic && epicsSel.map((c) => (
        <button key={c} onClick={() => toggle('epic', c, epicsSel)} className="h-8 rounded-md bg-surface px-2.5 text-sm text-ink shadow-ring hover:bg-recessed" aria-label={`Remove Epic ${c}`}>
          {c} ×
        </button>
      ))}
    </div>
  )
  return { list, toolbar, meta: `Showing ${list.length} of ${fixedEpic ? stories.filter((s) => s.epic === fixedEpic).length : stories.length} stories · ${list.filter((s) => s.priority === 'P0').length} P0 · ${sessions(list)} FE sessions` }
}

function StoryTable({ list, hideEpic }: { list: Story[]; hideEpic?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md bg-surface shadow-ring">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="h-10 border-b border-fill text-base font-semibold text-strong">
            <th className="w-32 px-3">ID</th>
            <th className="px-3">Story</th>
            {!hideEpic && <th className="w-20 px-3">Epic</th>}
            <th className="w-56 px-3">Roles</th>
            <th className="w-24 px-3">Priority</th>
            <th className="w-28 px-3">Status</th>
            <th className="w-16 px-3">Size</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id} className="h-10 border-b border-fill last:border-0 hover:bg-recessed">
              <td className="px-3"><Link to={`/product/stories/${s.id}`} className="font-mono text-sm text-link hover:underline">{s.id}</Link></td>
              <td className="truncate px-3">{s.title}</td>
              {!hideEpic && <td className="px-3 font-mono text-sm">{s.epic}</td>}
              <td className="truncate px-3 text-label">{s.roles.join(', ')}</td>
              <td className="px-3"><span className="inline-flex items-center gap-1.5"><span aria-hidden className={`size-2 rounded-full ${PRIORITY_DOT[s.priority]}`} />{s.priority}</span></td>
              <td className="px-3 text-label">{s.status}</td>
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
              <span className="pt-2 text-sm font-medium text-label">{label}</span>
              {EPIC_ORDER.map((c) => {
                const cell = list.filter((s) => s.epic === c && s.priority === p)
                return (
                  <div key={c} className="min-h-16 rounded-md bg-recessed p-1.5">
                    {cell.length > 0 && <p className="tabular px-1 pb-1 text-xs text-muted">{cell.length} · {sessions(cell)} sessions</p>}
                    {cell.map((s) => (
                      <Link key={s.id} to={`/product/stories/${s.id}`} className="mb-1 block rounded-md bg-surface px-2 py-1.5 text-sm shadow-ring hover:shadow-pop">
                        <span className="font-mono text-xs text-label">{s.id.slice(3)}</span>
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
  if (!e) return <NotFound what="Epic" />
  const all = stories.filter((s) => s.epic === e.code)
  const n = (p: string) => all.filter((s) => s.priority === p).length
  return (
    <>
      <Title title={<><span className="font-mono">{e.code}</span> · {e.name}</>} description={e.summary} meta={`${all.length} stories · ${n('P0')} P0 · ${n('P1')} P1 · ${n('P2')} P2 · ${sessions(all)} FE sessions · route ${e.route}`} />
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
  if (!s) return <NotFound what="story" />
  const dep = (d: string) => {
    const t = storyById.get(d)
    return t ? (
      <Link key={d} to={`/product/stories/${d}`} className="mr-3 inline-flex items-center gap-1.5 text-link hover:underline">
        <StatusCell status={t.status === 'Done' ? 'Done' : 'New'} />
        <span className="font-mono text-sm">{d}</span>
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
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-title font-semibold text-strong">{s.title}</h1>
        <Button onClick={() => navigator.clipboard?.writeText(s.path).then(() => toast('File path copied', 'success'))}>
          <Copy aria-hidden className="size-4" /> Copy file path
        </Button>
      </div>
      <dl className="mb-6 grid grid-cols-[140px_1fr] gap-x-6 gap-y-2 rounded-md bg-surface p-4 text-base shadow-ring">
        {([
          ['ID', <span key="i" className="font-mono text-sm">{s.id}</span>],
          ['Epic', <Link key="e" to={`/product/epics/${s.epic.toLowerCase()}`} className="text-link hover:underline">{s.epic} · {epicName(s.epic)}</Link>],
          ['Roles', s.roles.join(', ')],
          ['Priority', s.priority],
          ['Status', s.status],
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
          <Markdown source={s.sections[h]} />
        </section>
      ))}
    </>
  )
}
