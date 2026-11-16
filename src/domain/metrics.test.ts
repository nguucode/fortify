import { closeRatio, retention, wonPremium } from './metrics'
import type { Opportunity, Quote, Term } from './types'

const t = (id: string, exp: number, status: Term['status'], pid = id): Term => ({ id, policyId: pid, effectiveOffset: exp - 365, expirationOffset: exp, premium: 1000, status, pendingCancellation: false })

describe('retention (rules.md)', () => {
  it('counts Renewed and Rewritten as retained; Non-renewed, Expired, Canceled as lost, over terms that reached expiration in the window', () => {
    const terms = [t('a', -10, 'Renewed'), t('b', -20, 'Rewritten'), t('c', -30, 'Non-renewed'), t('d', -40, 'Expired'), t('e', 30, 'Active'), t('f', -400, 'Canceled')]
    expect(retention(terms, -365, 0)).toEqual({ rate: 0.5, retained: 2, total: 4 })
  })
})

describe('pipeline metrics', () => {
  const o = (id: string, stage: Opportunity['stage'], type: Opportunity['type'], closed: number | null) => ({ id, stage, type, closedOffset: closed, ownerId: 'p' }) as Opportunity
  const q = (opp: string, prem: number) => ({ id: `q${opp}`, opportunityId: opp, status: 'Accepted', lines: [{ line: 'Home', premium: prem, accepted: true }] }) as unknown as Quote
  it('sums accepted premium of Won non-remarket opportunities in a period', () => {
    const opps = [o('1', 'Won', 'New business', -2), o('2', 'Won', 'Remarket', -2), o('3', 'Won', 'Cross-sell', -40)]
    expect(wonPremium(opps, [q('1', 500), q('2', 900), q('3', 300)], -10, 0)).toEqual({ premium: 500, count: 1 })
  })
  it('computes close ratio as won / (won + lost) in the window', () => {
    expect(closeRatio([o('1', 'Won', 'New business', -5), o('2', 'Lost', 'New business', -5), o('3', 'Lost', 'New business', -5), o('4', 'Won', 'New business', -200)], -90)).toBeCloseTo(1 / 3)
  })
})
