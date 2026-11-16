import type { Carrier, Opportunity, Quote } from './types'

/** rules.md: Producer share is 50% on New business and Cross-sell, 40% on Remarket (counts as renewal). */
export const producerShare = (type: Opportunity['type']) => (type === 'Remarket' ? 0.4 : 0.5)
const DEFAULT_RATE = 0.12

/**
 * US-PIP-013: estimated agency commission = best quoted premium per line (accepted line once chosen, else the
 * lowest quoted), times that carrier's rate for the line. Falls back to estimated premium at the default rate.
 */
export function commissionFor(o: Opportunity, quotes: Quote[], carriers: Pick<Carrier, 'id' | 'commission'>[]) {
  const qs = quotes.filter((q) => q.opportunityId === o.id)
  const rate = (carrierId: string, line: string) => carriers.find((c) => c.id === carrierId)?.commission?.[line as keyof Carrier['commission']] ?? DEFAULT_RATE
  let agency = 0
  let quoted = false
  for (const line of o.lines) {
    const options = qs.flatMap((q) => q.lines.filter((l) => l.line === line && l.premium != null).map((l) => ({ q, l })))
    const pick = options.find((x) => x.l.accepted) ?? options.sort((a, b) => a.l.premium! - b.l.premium!)[0]
    if (pick) {
      quoted = true
      agency += pick.l.premium! * rate(pick.q.carrierId, line)
    }
  }
  if (!quoted) agency = o.estimatedPremium * DEFAULT_RATE
  const share = producerShare(o.type)
  return { agency, share, producer: agency * share }
}
