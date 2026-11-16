import { compareRenewal, riskReasons } from './renewals'
import type { Policy, Renewal, Term } from './types'

const term = { id: 't', policyId: 'p', effectiveOffset: -300, expirationOffset: 60, premium: 3200, status: 'Active', pendingCancellation: false } as Term
const ren = { id: 'r', accountId: 'a', policyId: 'p', termId: 't', status: 'In review', renewalPremium: 4414, ownerId: 'm' } as Renewal
const pol = { id: 'p', accountId: 'a', carrierId: 'c', line: 'Home', policyNumber: 'GHI-HO-1', dwelling: { roofYear: 2010, construction: 'Frame', coverageA: 420000, aopDeductible: 1000, floodZone: 'X', hurricanePct: 2, sinkhole: 'Full', windMit: null } } as Policy

describe('riskReasons (US-REN-002)', () => {
  it('lists every reason and stays empty when nothing applies', () => {
    expect(riskReasons(ren, term, { claimsThisTerm: 1, lastResort: true })).toEqual(['Premium +37.9%', '1 claim this term', 'Carrier of last resort (FL)'])
    expect(riskReasons({ ...ren, renewalPremium: 3250 }, term, { claimsThisTerm: 0, lastResort: false })).toEqual([])
    expect(riskReasons({ ...ren, renewalPremium: null }, { ...term, pendingCancellation: true }, { claimsThisTerm: 0, lastResort: false })).toEqual(['Pending cancellation'])
  })
})

describe('compareRenewal (US-REN-006)', () => {
  it('is null until renewal terms arrive and otherwise returns a premium total with deterministic coverage changes', () => {
    expect(compareRenewal({ ...ren, renewalPremium: null }, term, pol)).toBeNull()
    const c = compareRenewal(ren, term, pol)!
    expect(c.total).toEqual({ expiring: 3200, renewal: 4414, change: 1214, pct: 1214 / 3200 })
    expect(c.rows.find((r) => r.item === 'Hurricane deductible')).toBeTruthy()
    expect(compareRenewal(ren, term, pol)).toEqual(c)
  })
})
