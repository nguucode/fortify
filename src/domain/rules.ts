import type { Account, Contact, Lead, Opportunity, OpportunityStage, Quote, QuoteStatus, RenewalSegment, RenewalStatus, ServiceStatus } from './types'

type Check = { ok: true } | { ok: false; message: string }

/** US-PIP-005: one rule shared by the stage bar and the board. Won and Lost go through their dialogs. */
export function checkStageMove(o: Opportunity, to: OpportunityStage, quotes: Pick<Quote, 'status'>[]): Check {
  if (o.stage === 'Won' || o.stage === 'Lost') return { ok: false, message: 'This Opportunity is closed.' }
  if (to === 'Won' || to === 'Lost') return { ok: false, message: `Use “Mark ${to.toLowerCase()}” to close an Opportunity.` }
  if (to === 'Quoting' && o.lines.length === 0) return { ok: false, message: 'Add a line before quoting' }
  if (to === 'Proposed' && !quotes.some((q) => q.status === 'Quoted' || q.status === 'Presented'))
    return { ok: false, message: 'Add a quoted Quote before moving to Proposed' }
  return { ok: true }
}

/** US-PIP-007 transition map; closing an Opportunity moves open Quotes to Not taken (rules.md). */
const QUOTE_NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  Requested: ['Quoted', 'Declined', 'Referred', 'Not taken'],
  Referred: ['Quoted', 'Declined', 'Not taken'],
  Quoted: ['Presented', 'Not taken'],
  Presented: ['Accepted', 'Not taken'],
  Declined: [],
  Accepted: [],
  'Not taken': [],
}
export const canQuoteTransition = (from: QuoteStatus, to: QuoteStatus) => QUOTE_NEXT[from].includes(to)

/** Month arithmetic that clamps to the last day (01/31 + 6 months = 07/31; 08/31 + 6 = 02/28 or 29). */
export function addMonths(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d.getDate(), lastDay))
  return target
}

const WINDOW: Record<RenewalSegment, number> = { personal: 45, 'fl-residential-property': 120, 'small-commercial': 60, 'large-commercial': 90 }
export const renewalWindowDays = (s: RenewalSegment) => WINDOW[s]

const RENEWAL_NEXT: Record<RenewalStatus, RenewalStatus[]> = {
  Upcoming: ['In review'],
  'In review': ['Remarketing', 'Presented'],
  Remarketing: ['Presented'],
  Presented: ['Decided'],
  Decided: [],
  Done: [],
}
export const nextRenewalStatuses = (s: RenewalStatus) => RENEWAL_NEXT[s]

/** US-SRV-004. `daysSinceDone` only matters when reopening. */
export function canServiceTransition(from: ServiceStatus, to: ServiceStatus, daysSinceDone: number): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: 'Already in that status.' }
  if (to === 'New') return { ok: false, reason: 'A request cannot return to New.' }
  if (from === 'Done') {
    if (to !== 'In progress') return { ok: false, reason: 'Reopen to In progress first.' }
    return daysSinceDone <= 30 ? { ok: true } : { ok: false, reason: 'Done more than 30 days ago. Create a new request instead.' }
  }
  return { ok: true }
}

// ---- Duplicate check for Qualify (US-LEA-006) ----

const digits = (s: string) => s.replace(/\D/g, '')
const email = (s: string) => s.trim().toLowerCase()
// Strip the legal suffix before punctuation so "L.L.C." and "LLC" fold the same way.
const SUFFIX = /[\s,]+(l\.?\s?l\.?\s?c\.?|inc\.?|co\.?|corp\.?|ltd\.?)$/i
const bizName = (s: string) => s.trim().replace(SUFFIX, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const lastName = (s: string) => s.trim().split(/\s+/).pop()!.toLowerCase()

export interface Match {
  accountId: string
  strength: 'Strong' | 'Possible'
  reasons: string[]
  contactId: string | null
}

export function findMatches(
  lead: Pick<Lead, 'name' | 'kind' | 'businessName' | 'email' | 'phone'> & { zip?: string },
  { accounts, contacts }: { accounts: Pick<Account, 'id' | 'name' | 'kind' | 'zip'>[]; contacts: Contact[] },
): Match[] {
  const out = new Map<string, Match>()
  const add = (accountId: string, strength: Match['strength'], reason: string, contactId: string | null) => {
    const m = out.get(accountId)
    if (!m) out.set(accountId, { accountId, strength, reasons: [reason], contactId })
    else {
      if (!m.reasons.includes(reason)) m.reasons.push(reason)
      if (strength === 'Strong') m.strength = 'Strong'
    }
  }
  for (const c of contacts) {
    const strong = (lead.email && email(c.email) === email(lead.email) && 'Email') || (digits(lead.phone).length >= 7 && digits(c.phone) === digits(lead.phone) && 'Phone')
    if (strong) c.accountIds.forEach((a) => add(a, 'Strong', strong, c.id))
  }
  if (lead.zip) {
    for (const a of accounts) {
      if (a.zip !== lead.zip) continue
      if (a.kind === 'Household' && a.name.toLowerCase().startsWith(lastName(lead.name) + ' ')) add(a.id, 'Possible', 'Last name + ZIP', null)
      if (a.kind === 'Business' && lead.businessName && bizName(a.name) === bizName(lead.businessName)) add(a.id, 'Possible', 'Business name + ZIP', null)
    }
  }
  const kindOf = new Map(accounts.map((a) => [a.id, a.kind]))
  return [...out.values()]
    .sort((x, y) => (x.strength === y.strength ? 0 : x.strength === 'Strong' ? -1 : 1) || (lead.kind === 'Business' ? (kindOf.get(x.accountId) === 'Business' ? -1 : 1) : 0))
    .slice(0, 5)
}
