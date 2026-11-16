import { createDataStore } from './data'
import { commissionFor } from '@/domain/commission'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16)
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
  users: [{ id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: '' }],
  carriers: [{ id: 'c1', name: 'Meridian National', naic: '1', states: ['TX'], kinds: ['personal'], lines: ['Home', 'Auto'], commission: { Home: 0.15, Auto: 0.1 } }],
  accounts: [{ id: 'acc-1', name: 'Torres Household', kind: 'Household', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'm', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' }],
  contacts: [],
  policies: [{ id: 'pol-1', accountId: 'acc-1', carrierId: 'c1', line: 'Home', policyNumber: 'GSI-HO-204118' }],
  terms: [{ id: 'trm-1', policyId: 'pol-1', effectiveOffset: -300, expirationOffset: 55, premium: 2310, status: 'Active', pendingCancellation: false }],
  xDates: [],
  leads: [],
  opportunities: [
    { id: 'opp-1', accountId: 'acc-1', type: 'Cross-sell', stage: 'Proposed', stageEnteredOffset: -2, lines: ['Home', 'Auto'], ownerId: 'p', estimatedPremium: 3000, targetCloseOffset: 10, source: 'X-date', lostReason: null, renewalId: null, leadId: null, createdOffset: -20, closedOffset: null, lineDetails: { Home: { currentCarrier: 'Meridian National', currentPremium: 2310, xDateOffset: 120 } } },
    { id: 'opp-2', accountId: 'acc-1', type: 'Remarket', stage: 'Proposed', stageEnteredOffset: -2, lines: ['Home'], ownerId: 'p', estimatedPremium: 3188, targetCloseOffset: 10, source: 'Renewal', lostReason: null, renewalId: 'ren-1', leadId: null, createdOffset: -20, closedOffset: null },
  ],
  quotes: [{ id: 'q-1', opportunityId: 'opp-1', carrierId: 'c1', status: 'Accepted', lines: [{ line: 'Home', premium: 2700, accepted: true }, { line: 'Auto', premium: 1200, accepted: false }], requestedOffset: -10, respondedOffset: -5, fees: 0, declineReason: null, warnings: [] } as unknown as Dataset['quotes'][number]],
  renewals: [{ id: 'ren-1', accountId: 'acc-1', policyId: 'pol-1', termId: 'trm-1', status: 'Remarketing', segment: 'personal', ownerId: 'm', renewalPremium: 3188, decision: null, decisionCarrierId: null, remarketOpportunityId: 'opp-2', createdOffset: -15 }],
  serviceRequests: [],
  activities: [],
  tasks: [],
})

describe('markLost (US-PIP-011)', () => {
  it('clears acceptance, closes quotes, and creates chosen X-dates', () => {
    const s = createDataStore(base(), today)
    s.markLost('opp-1', 'Price', 'p', { xDates: [{ line: 'Home', carrier: 'Meridian National', premium: 2310, offset: 120 }] })
    const st = s.getState()
    expect(st.opportunities[0]).toMatchObject({ stage: 'Lost', lostReason: 'Price', closedOffset: 0 })
    expect(st.quotes[0].status).toBe('Not taken')
    expect(st.quotes[0].lines.every((l) => !l.accepted)).toBe(true)
    expect(st.xDates[0]).toMatchObject({ accountId: 'acc-1', line: 'Home', currentCarrier: 'Meridian National', premium: 2310, xDateOffset: 120 })
  })
  it('needs a note for Other, and reopens within 90 days to Gathering info', () => {
    const s = createDataStore(base(), today)
    expect(() => s.markLost('opp-1', 'Other', 'p', { note: '' })).toThrow('note')
    s.markLost('opp-1', 'Price', 'p')
    s.reopenOpportunity('opp-1', 'p')
    expect(s.getState().opportunities[0]).toMatchObject({ stage: 'Gathering info', lostReason: null, closedOffset: null })
    expect(s.getState().quotes[0].status).toBe('Not taken')
  })
})

describe('Remarket renew with incumbent (US-PIP-014)', () => {
  it('wins without a new policy', () => {
    const s = createDataStore(base(), today)
    s.markWonWithIncumbent('opp-2', 'p')
    const st = s.getState()
    expect(st.opportunities[1].stage).toBe('Won')
    expect(st.policies).toHaveLength(1)
    expect(st.activities.at(-1)!.subject).toBe('Remarket won · renewed with incumbent')
  })
})

describe('commissionFor (US-PIP-013)', () => {
  it('uses best quoted premium times the carrier rate per line, and the producer share by type', () => {
    const st = base()
    expect(commissionFor(st.opportunities[0], st.quotes, st.carriers)).toEqual({ agency: 0.15 * 2700 + 0.1 * 1200, share: 0.5, producer: (0.15 * 2700 + 0.1 * 1200) * 0.5 })
    expect(commissionFor(st.opportunities[1], st.quotes, st.carriers).share).toBe(0.4)
  })
})
