import { ProgressLine } from '@/components/ui/primitives'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import { useLocation, useNavigate } from 'react-router'
import { Building2, ClipboardCheck, FileText, History, type LucideIcon, Search, Target, User, UserPlus, ArrowRight } from 'lucide-react'
import { allNavItems, isVisible } from '@/app/sitemap'
import { dataStore, useApp } from '@/app/store'
import { searchRecords, SEARCH_GROUPS, type SearchGroup, type SearchHit } from '@/domain/search'

const ICON: Record<SearchHit['kind'], LucideIcon> = { Account: Building2, Contact: User, Lead: UserPlus, Opportunity: Target, Policy: FileText, 'Service Request': ClipboardCheck }
const LIST: Record<SearchGroup, string> = { Accounts: '/accounts', Contacts: '/contacts', Leads: '/leads', Opportunities: '/pipeline', Policies: '/policies', 'Service Requests': '/service?view=list' }
const RECORD = /^\/(accounts|leads|pipeline|policies|renewals|service)\/([^/]+)$/
const RECENT_KEY = 'fortify.recent'

function readRecent(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Resolves a record path to a label now, so renamed or deleted records never show stale text. */
function describe(path: string): { label: string; kind: string; icon: LucideIcon } | null {
  const m = RECORD.exec(path)
  if (!m) return null
  const s = dataStore().getState()
  const acc = (id: string) => s.accounts.find((a) => a.id === id)?.name ?? ''
  const [, kind, id] = m
  if (kind === 'accounts') return { label: acc(id), kind: 'Account', icon: Building2 }
  if (kind === 'leads') return { label: s.leads.find((l) => l.id === id)?.name ?? '', kind: 'Lead', icon: UserPlus }
  if (kind === 'pipeline') {
    const o = s.opportunities.find((x) => x.id === id)
    return o ? { label: o.name ?? `${acc(o.accountId)} · ${o.lines.join(', ')}`, kind: 'Opportunity', icon: Target } : null
  }
  if (kind === 'policies') return { label: s.policies.find((p) => p.id === id)?.policyNumber ?? '', kind: 'Policy', icon: FileText }
  if (kind === 'renewals') {
    const r = s.renewals.find((x) => x.id === id)
    return r ? { label: acc(r.accountId), kind: 'Renewal', icon: History } : null
  }
  return { label: s.serviceRequests.find((r) => r.id === id)?.subject ?? '', kind: 'Service Request', icon: ClipboardCheck }
}

/** US-FND-003: recents, role-filtered actions, and scoped search across six record types. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, data } = useApp()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const returnFocus = useRef<HTMLElement | null>(null)

  // Remember the last 5 records viewed this session.
  useEffect(() => {
    if (!RECORD.test(pathname)) return
    try {
      sessionStorage.setItem(RECENT_KEY, JSON.stringify([pathname, ...readRecent().filter((p) => p !== pathname)].slice(0, 5)))
    } catch {
      /* storage blocked: no recents */
    }
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!open) returnFocus.current = document.activeElement as HTMLElement
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebounced('')
    }
  }, [open])

  const result = useMemo(() => (open ? searchRecords(data, user, debounced) : null), [open, data, user, debounced])
  const pending = query.trim() !== debounced.trim() && query.trim().length >= 2
  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }
  const actions = [
    user.role !== 'admin' && user.role !== 'account-manager' && { label: 'Add lead', to: '/leads' },
    { label: 'Go to Renewals', to: '/renewals' },
    { label: 'Go to Tasks', to: '/tasks' },
  ].filter(Boolean) as { label: string; to: string }[]
  const recents = open ? readRecent().flatMap((p) => { const d = describe(p); return d?.label ? [{ p, d }] : [] }) : []
  const searching = debounced.trim().length >= 2
  const any = result && (result.exact || SEARCH_GROUPS.some((g) => result.groups[g].length))
  const item = 'flex h-10 cursor-default items-center gap-2.5 rounded-md px-2.5 text-base data-[selected=true]:bg-recessed'
  const group = '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-label'
  const hit = (h: SearchHit) => {
    const Icon = ICON[h.kind]
    return (
      <Command.Item key={`${h.kind}${h.id}`} value={`${h.kind} ${h.id}`} onSelect={() => go(h.to)} className={item}>
        <Icon aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        <span className={`min-w-0 truncate ${h.mono ? 'font-mono text-sm' : ''}`}>{h.label}</span>
        <span className="min-w-0 truncate text-sm text-muted">{h.secondary}</span>
        <span className="ml-auto shrink-0 text-xs text-muted">{h.kind}</span>
      </Command.Item>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            if (returnFocus.current) {
              e.preventDefault()
              returnFocus.current.focus()
            }
          }}
          className="fixed top-24 left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-lg bg-surface shadow-pop"
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Command label="Search" shouldFilter={false}>
            <div className="relative flex items-center border-b border-fill">
              <Search aria-hidden className="ml-4 size-4 text-muted" strokeWidth={1.75} />
              <Command.Input value={query} onValueChange={setQuery} autoFocus placeholder="Search accounts, people, policy numbers, phones" className="h-12 w-full px-3 text-lg outline-none" />
              {pending && <ProgressLine className="absolute inset-x-0 -bottom-px" />}
            </div>
            <Command.List className="max-h-[420px] overflow-y-auto p-1.5">
              {!searching ? (
                <>
                  {recents.length > 0 && (
                    <Command.Group heading="Recent" className={group}>
                      {recents.map(({ p, d }) => (
                        <Command.Item key={p} value={`recent ${p}`} onSelect={() => go(p)} className={item}>
                          <d.icon aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                          <span className="truncate">{d.label}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted">{d.kind}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  <Command.Group heading="Actions" className={group}>
                    {actions.map((a) => (
                      <Command.Item key={a.label} value={`action ${a.label}`} onSelect={() => go(a.to)} className={item}>
                        <ArrowRight aria-hidden className="size-4 text-muted" strokeWidth={1.75} />
                        {a.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Go to" className={group}>
                    {allNavItems.filter((i) => isVisible(i, user.role)).map((i) => (
                      <Command.Item key={i.id} value={`go ${i.label}`} onSelect={() => go(i.route)} className={item}>
                        {i.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              ) : !any ? (
                <div className="px-3 py-6 text-base">
                  <p className="text-strong">No results for “{debounced.trim()}”</p>
                  <p className="mt-0.5 text-sm text-muted">Try a policy number, phone, or email.</p>
                </div>
              ) : (
                <>
                  {result!.exact && <Command.Group heading="Exact match" className={group}>{hit(result!.exact)}</Command.Group>}
                  {SEARCH_GROUPS.filter((g) => result!.groups[g].length).map((g) => (
                    <Command.Group key={g} heading={g} className={group}>
                      {result!.groups[g].map(hit)}
                      {result!.totals[g] > result!.groups[g].length && (
                        <Command.Item value={`all ${g}`} onSelect={() => go(`${LIST[g]}${LIST[g].includes('?') ? '&' : '?'}q=${encodeURIComponent(debounced.trim())}`)} className={`${item} text-sm text-link`}>
                          See all {result!.totals[g]} results
                        </Command.Item>
                      )}
                    </Command.Group>
                  ))}
                </>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
