import type { Account, AccountKind, AccountStatus, Dataset, UsState } from './types'
import { ribbonTicks, type RibbonTick } from './ribbon'
import { resolveOffset } from '@/mock/dates'

/** The Accounts list view model (US-ACC-001). Built from the dataset by the store; queried here. */
export interface AccountRow {
  id: string
  name: string
  kind: AccountKind
  status: AccountStatus
  officeId: string
  officeName: string
  producerId: string
  producerName: string
  accountManagerId: string
  accountManagerName: string
  state: UsState
  contactName: string | null
  /** Lower-cased Contact name, email, and phone for search. */
  searchText: string
  activePolicyCount: number
  annualPremium: number
  nextExpiration: Date | null
  lastActivity: Date | null
  lifecycle: Account['lifecycle']
  ribbon: RibbonTick[]
}

export const ACCOUNT_VIEWS = ['All', 'Prospects', 'Clients', 'Former clients', 'Households', 'Businesses'] as const
export type AccountView = (typeof ACCOUNT_VIEWS)[number]

export type AccountSortKey = 'name' | 'status' | 'producerName' | 'accountManagerName' | 'officeName' | 'activePolicyCount' | 'annualPremium' | 'nextExpiration' | 'lastActivity'

export interface AccountFilters {
  officeId?: string
  producerId?: string
  accountManagerId?: string
  state?: UsState
  status?: AccountStatus
  kind?: AccountKind
}

export interface AccountQuery {
  view: AccountView
  search?: string
  filters?: AccountFilters
  sort?: { key: AccountSortKey; dir: 'asc' | 'desc' }
  page?: number
  pageSize?: number
  includeArchived?: boolean
}

const inView: Record<AccountView, (r: AccountRow) => boolean> = {
  All: () => true,
  Prospects: (r) => r.status === 'Prospect',
  Clients: (r) => r.status === 'Client',
  'Former clients': (r) => r.status === 'Former client',
  Households: (r) => r.kind === 'Household',
  Businesses: (r) => r.kind === 'Business',
}

function compare(a: AccountRow, b: AccountRow, key: AccountSortKey): number {
  const x = a[key]
  const y = b[key]
  // Empty values always sort last, whatever the direction is flipped to later.
  if (x == null && y == null) return 0
  if (x == null) return 1
  if (y == null) return -1
  if (x instanceof Date && y instanceof Date) return x.getTime() - y.getTime()
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y))
}

export function queryAccounts(all: AccountRow[], q: AccountQuery) {
  const live = all.filter((r) => q.includeArchived || r.lifecycle === 'active')
  const term = q.search?.trim().toLowerCase() ?? ''
  const f = q.filters ?? {}
  const scoped = live.filter(
    (r) =>
      (!term || r.name.toLowerCase().includes(term) || r.searchText.includes(term)) &&
      (!f.officeId || r.officeId === f.officeId) &&
      (!f.producerId || r.producerId === f.producerId) &&
      (!f.accountManagerId || r.accountManagerId === f.accountManagerId) &&
      (!f.state || r.state === f.state) &&
      (!f.status || r.status === f.status) &&
      (!f.kind || r.kind === f.kind),
  )
  const viewCounts = Object.fromEntries(ACCOUNT_VIEWS.map((v) => [v, scoped.filter(inView[v]).length])) as Record<AccountView, number>
  const matched = scoped.filter(inView[q.view])

  const sorted = [...matched].sort((a, b) => {
    if (q.sort) {
      const c = compare(a, b, q.sort.key)
      const bothPresent = a[q.sort.key] != null && b[q.sort.key] != null
      if (c !== 0) return q.sort.dir === 'desc' && bothPresent ? -c : c
    }
    return a.name.localeCompare(b.name)
  })

  const pageSize = q.pageSize ?? 50
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(1, q.page ?? 1), pageCount)
  return {
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageCount,
    pageSize,
    viewCounts,
    premiumTotal: matched.reduce((s, r) => s + r.annualPremium, 0),
  }
}

/** Derives the list view model. Premium and counts come from Active and Bound Terms only (synced AMS data). */
export function buildAccountRows(d: Dataset, today: Date = new Date()): AccountRow[] {
  const users = new Map(d.users.map((u) => [u.id, u.name]))
  const offices = new Map(d.offices.map((o) => [o.id, o.name]))
  const carriers = new Map(d.carriers.map((c) => [c.id, c.name]))
  const contacts = new Map(d.contacts.map((c) => [c.id, c]))
  const contactsByAccount = new Map<string, string[]>()
  const push = <T,>(m: Map<string, T[]>, k: string, v: T) => (m.get(k) ?? m.set(k, []).get(k)!).push(v)
  for (const c of d.contacts) for (const a of c.accountIds) push(contactsByAccount, a, `${c.name} ${c.email} ${c.phone}`)
  const policies = new Map(d.policies.map((p) => [p.id, p]))
  const liveByAccount = new Map<string, { premium: number; expiration: number; label: string }[]>()
  for (const t of d.terms) {
    if (t.status !== 'Active' && t.status !== 'Bound') continue
    const p = policies.get(t.policyId)!
    const list = liveByAccount.get(p.accountId) ?? []
    list.push({ premium: t.premium, expiration: t.expirationOffset, label: `${p.line} · ${carriers.get(p.carrierId)}` })
    liveByAccount.set(p.accountId, list)
  }
  const xByAccount = new Map<string, typeof d.xDates>()
  for (const x of d.xDates) push(xByAccount, x.accountId, x)

  return d.accounts.map((a) => {
    const live = liveByAccount.get(a.id) ?? []
    const nextOffset = live.length ? Math.min(...live.map((l) => l.expiration)) : null
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      status: a.status,
      officeId: a.officeId,
      officeName: offices.get(a.officeId) ?? '',
      producerId: a.producerId,
      producerName: users.get(a.producerId) ?? '',
      accountManagerId: a.accountManagerId,
      accountManagerName: users.get(a.accountManagerId) ?? '',
      state: a.state,
      contactName: a.primaryContactId ? (contacts.get(a.primaryContactId)?.name ?? null) : null,
      searchText: (contactsByAccount.get(a.id) ?? []).join(' ').toLowerCase(),
      activePolicyCount: live.length,
      annualPremium: live.reduce((s, l) => s + l.premium, 0),
      nextExpiration: nextOffset === null ? null : resolveOffset(nextOffset, today),
      lastActivity: a.lastActivityOffset === null ? null : resolveOffset(a.lastActivityOffset, today),
      lifecycle: a.lifecycle,
      ribbon: ribbonTicks(
        [
          ...live.map((l) => ({ kind: 'renewal' as const, date: resolveOffset(l.expiration, today), label: l.label })),
          ...(xByAccount.get(a.id) ?? []).map((x) => ({ kind: 'xdate' as const, date: resolveOffset(x.xDateOffset, today), label: `${x.line} · ${x.currentCarrier}` })),
        ],
        today,
      ),
    }
  })
}
