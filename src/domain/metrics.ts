import type { Opportunity, Quote, Term } from './types'

/**
 * rules.md retention: 1 − lost ÷ Terms that reached expiration in [from, to]. Renewed and Rewritten are retained;
 * Non-renewed, Expired, and Canceled are lost.
 */
export function retention(terms: Pick<Term, 'expirationOffset' | 'status'>[], from: number, to: number) {
  const ended = terms.filter((t) => t.expirationOffset >= from && t.expirationOffset <= to && ['Renewed', 'Rewritten', 'Non-renewed', 'Expired', 'Canceled'].includes(t.status))
  const retained = ended.filter((t) => t.status === 'Renewed' || t.status === 'Rewritten').length
  return { rate: ended.length ? retained / ended.length : 1, retained, total: ended.length }
}

/** HOM-005/010: accepted premium of New business and Cross-sell Opportunities Won in [from, to]. Remarket is retention. */
export function wonPremium(opps: Pick<Opportunity, 'id' | 'stage' | 'type' | 'closedOffset'>[], quotes: Pick<Quote, 'opportunityId' | 'lines'>[], from: number, to: number) {
  const won = opps.filter((o) => o.stage === 'Won' && o.type !== 'Remarket' && o.closedOffset != null && o.closedOffset >= from && o.closedOffset <= to)
  const ids = new Set(won.map((o) => o.id))
  const lines = quotes.filter((q) => ids.has(q.opportunityId)).flatMap((q) => q.lines.filter((l) => l.accepted))
  return { premium: lines.reduce((n, l) => n + (l.premium ?? 0), 0), count: lines.length }
}

export function closeRatio(opps: Pick<Opportunity, 'stage' | 'closedOffset'>[], from: number) {
  const closed = opps.filter((o) => (o.stage === 'Won' || o.stage === 'Lost') && (o.closedOffset ?? -9999) >= from)
  return closed.length ? closed.filter((o) => o.stage === 'Won').length / closed.length : 0
}
