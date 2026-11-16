import { canSeeAccount } from './access'
import type { Dataset, User } from './types'

export const SEARCH_GROUPS = ['Accounts', 'Contacts', 'Leads', 'Opportunities', 'Policies', 'Service Requests'] as const
export type SearchGroup = (typeof SEARCH_GROUPS)[number]
export interface SearchHit {
  id: string
  kind: 'Account' | 'Contact' | 'Lead' | 'Opportunity' | 'Policy' | 'Service Request'
  label: string
  secondary: string
  mono?: boolean
  to: string
}
export interface SearchResult {
  exact: SearchHit | null
  groups: Record<SearchGroup, SearchHit[]>
  totals: Record<SearchGroup, number>
}

const digits = (s: string) => s.replace(/\D/g, '')

/** US-FND-003: scoped global search. Records outside the user's scope never match. */
export function searchRecords(data: Pick<Dataset, 'accounts' | 'contacts' | 'leads' | 'opportunities' | 'policies' | 'serviceRequests'>, user: User, query: string, cap = 5): SearchResult {
  const q = query.trim().toLowerCase()
  const qd = digits(q)
  // A query made only of digits and phone punctuation is a phone number.
  const phoneQuery = qd.length >= 7 && q.replace(/[\s()+.-]/g, '') === qd
  const empty = Object.fromEntries(SEARCH_GROUPS.map((g) => [g, []])) as unknown as Record<SearchGroup, SearchHit[]>
  if (q.length < 2) return { exact: null, groups: empty, totals: Object.fromEntries(SEARCH_GROUPS.map((g) => [g, 0])) as Record<SearchGroup, number> }

  const accounts = new Map(data.accounts.filter((a) => a.lifecycle === 'active' && canSeeAccount(user, a)).map((a) => [a.id, a]))
  const has = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q)
  const phone = (p: string) => phoneQuery && digits(p).includes(qd)

  const all: Record<SearchGroup, SearchHit[]> = {
    Accounts: [...accounts.values()].filter((a) => has(a.name)).map((a) => ({ id: a.id, kind: 'Account', label: a.name, secondary: `${a.kind} · ${a.status}`, to: `/accounts/${a.id}` })),
    Contacts: data.contacts
      .filter((c) => c.accountIds.some((id) => accounts.has(id)) && (has(c.name) || has(c.email) || phone(c.phone)))
      .map((c) => ({ id: c.id, kind: 'Contact', label: c.name, secondary: accounts.get(c.accountIds.find((id) => accounts.has(id))!)?.name ?? '', to: `/accounts/${c.accountIds.find((id) => accounts.has(id))}` })),
    Leads: data.leads
      // Leads are scoped like roles.md: Producer sees own, Office roles their Office, Agency roles all.
      .filter((l) => (user.role === 'producer' ? l.assigneeId === user.id : user.role === 'account-manager' ? l.officeId === user.officeId : true))
      .filter((l) => has(l.name) || has(l.businessName) || has(l.email) || phone(l.phone))
      .map((l) => ({ id: l.id, kind: 'Lead', label: l.name, secondary: `${l.businessName ? `${l.businessName} · ` : ''}${l.status}`, to: `/leads/${l.id}` })),
    Opportunities: data.opportunities
      .filter((o) => accounts.has(o.accountId) && (user.role !== 'producer' || o.ownerId === user.id))
      .filter((o) => has(o.name) || has(accounts.get(o.accountId)!.name) || o.lines.some((l) => has(l)))
      .map((o) => ({ id: o.id, kind: 'Opportunity', label: o.name ?? `${accounts.get(o.accountId)!.name} · ${o.lines.join(', ')}`, secondary: `${o.type} · ${o.stage}`, to: `/pipeline/${o.id}` })),
    Policies: data.policies
      .filter((p) => accounts.has(p.accountId) && (has(p.policyNumber) || has(accounts.get(p.accountId)!.name)))
      .map((p) => ({ id: p.id, kind: 'Policy', label: p.policyNumber, secondary: `${p.line} · ${accounts.get(p.accountId)!.name}`, mono: true, to: `/policies/${p.id}` })),
    'Service Requests': data.serviceRequests
      .filter((r) => accounts.has(r.accountId) && (has(r.id) || has(r.subject) || has(accounts.get(r.accountId)!.name)))
      .map((r) => ({ id: r.id, kind: 'Service Request', label: `${r.id} ${r.subject}`, secondary: `${accounts.get(r.accountId)!.name} · ${r.status}`, to: `/service/${r.id}` })),
  }
  const exactPolicy = data.policies.find((p) => accounts.has(p.accountId) && p.policyNumber.toLowerCase() === q)
  return {
    exact: exactPolicy ? all.Policies.find((h) => h.id === exactPolicy.id)! : null,
    groups: Object.fromEntries(SEARCH_GROUPS.map((g) => [g, all[g].filter((h) => h.id !== exactPolicy?.id).slice(0, cap)])) as Record<SearchGroup, SearchHit[]>,
    totals: Object.fromEntries(SEARCH_GROUPS.map((g) => [g, all[g].length])) as Record<SearchGroup, number>,
  }
}
