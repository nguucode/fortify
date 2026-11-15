import { checkStageMove, canQuoteTransition, addMonths, nextRenewalStatuses, renewalWindowDays, canServiceTransition, findMatches } from './rules'
import type { Account, Contact, Lead, Opportunity, Quote } from './types'

const opp = (p: Partial<Opportunity> = {}): Opportunity =>
  ({ id: 'o', accountId: 'a', type: 'New business', stage: 'Contacted', stageEnteredOffset: 0, lines: ['Auto'], ownerId: 'p', estimatedPremium: 0, targetCloseOffset: 30, source: '', lostReason: null, renewalId: null, leadId: null, createdOffset: 0, closedOffset: null, ...p })
const quote = (status: Quote['status']) => ({ status }) as Quote

describe('checkStageMove (US-PIP-005)', () => {
  it('blocks Quoting without lines', () => {
    expect(checkStageMove(opp({ lines: [] }), 'Quoting', [])).toEqual({ ok: false, message: 'Add a line before quoting' })
  })
  it('blocks Proposed without a Quoted or Presented Quote', () => {
    expect(checkStageMove(opp(), 'Proposed', [quote('Requested')])).toEqual({ ok: false, message: 'Add a quoted Quote before moving to Proposed' })
    expect(checkStageMove(opp(), 'Proposed', [quote('Quoted')])).toEqual({ ok: true })
  })
  it('never sets Won or Lost directly, and freezes closed Opportunities', () => {
    expect(checkStageMove(opp(), 'Won', []).ok).toBe(false)
    expect(checkStageMove(opp({ stage: 'Lost' }), 'Contacted', []).ok).toBe(false)
  })
})

describe('canQuoteTransition (US-PIP-007)', () => {
  it('allows the documented transitions only', () => {
    expect(canQuoteTransition('Requested', 'Quoted')).toBe(true)
    expect(canQuoteTransition('Referred', 'Declined')).toBe(true)
    expect(canQuoteTransition('Quoted', 'Presented')).toBe(true)
    expect(canQuoteTransition('Presented', 'Accepted')).toBe(true)
    expect(canQuoteTransition('Requested', 'Accepted')).toBe(false)
    expect(canQuoteTransition('Declined', 'Quoted')).toBe(false)
  })
})

describe('addMonths (US-PIP-010)', () => {
  it('clamps to month end', () => {
    expect(addMonths(new Date(2027, 0, 31), 6)).toEqual(new Date(2027, 6, 31))
    expect(addMonths(new Date(2027, 7, 31), 6)).toEqual(new Date(2028, 1, 29))
    expect(addMonths(new Date(2026, 10, 15), 12)).toEqual(new Date(2027, 10, 15))
  })
})

describe('renewals (US-REN-001, US-REN-005)', () => {
  it('maps segments to windows from rules.md', () => {
    expect([renewalWindowDays('personal'), renewalWindowDays('fl-residential-property'), renewalWindowDays('small-commercial'), renewalWindowDays('large-commercial')]).toEqual([45, 120, 60, 90])
  })
  it('lists next statuses', () => {
    expect(nextRenewalStatuses('Upcoming')).toEqual(['In review'])
    expect(nextRenewalStatuses('In review')).toEqual(['Remarketing', 'Presented'])
    expect(nextRenewalStatuses('Remarketing')).toEqual(['Presented'])
    expect(nextRenewalStatuses('Presented')).toEqual(['Decided'])
    expect(nextRenewalStatuses('Decided')).toEqual([])
  })
})

describe('canServiceTransition (US-SRV-004)', () => {
  it('never returns to New and reopens Done only within 30 days', () => {
    expect(canServiceTransition('New', 'In progress', 0)).toEqual({ ok: true })
    expect(canServiceTransition('In progress', 'New', 0).ok).toBe(false)
    expect(canServiceTransition('Waiting on carrier', 'Waiting on client', 0)).toEqual({ ok: true })
    expect(canServiceTransition('Done', 'In progress', 10)).toEqual({ ok: true })
    expect(canServiceTransition('Done', 'In progress', 31)).toEqual({ ok: false, reason: 'Done more than 30 days ago. Create a new request instead.' })
  })
})

describe('findMatches (US-LEA-006)', () => {
  const accounts = [
    { id: 'a1', name: 'Torres Household', kind: 'Household', status: 'Client', zip: '77019' },
    { id: 'a2', name: 'Torres Roofing LLC', kind: 'Business', status: 'Client', zip: '77019' },
    { id: 'a3', name: 'Nguyen Household', kind: 'Household', status: 'Prospect', zip: '33606' },
  ] as Account[]
  const contacts = [
    { id: 'c1', name: 'Mike Torres', email: 'mike.torres@example.com', phone: '(555) 010-1234', accountIds: ['a1', 'a2'] },
    { id: 'c2', name: 'Lan Nguyen', email: 'lan@example.com', phone: '(555) 010-9999', accountIds: ['a3'] },
  ] as Contact[]
  const lead = (p: Partial<Lead & { zip: string }>) => ({ id: 'l', name: 'X Y', kind: 'Household', businessName: null, email: 'none@example.com', phone: '(555) 010-0000', zip: '00000', ...p }) as Lead & { zip: string }

  it('ranks a phone match (digits only) as Strong and resolves every Account of the Contact', () => {
    const m = findMatches(lead({ phone: '555.010.1234' }), { accounts, contacts })
    expect(m.map((x) => [x.accountId, x.strength])).toEqual([['a1', 'Strong'], ['a2', 'Strong']])
  })
  it('ranks the Business first for a Commercial Lead', () => {
    const m = findMatches(lead({ kind: 'Business', email: 'MIKE.TORRES@example.com ' }), { accounts, contacts })
    expect(m[0].accountId).toBe('a2')
  })
  it('finds Possible matches on last name plus ZIP and on normalized business name plus ZIP', () => {
    expect(findMatches(lead({ name: 'Ana Torres', zip: '77019' }), { accounts, contacts }).map((x) => x.strength)).toContain('Possible')
    const biz = findMatches(lead({ kind: 'Business', businessName: 'Torres Roofing, L.L.C.', zip: '77019' }), { accounts, contacts })
    expect(biz.find((x) => x.accountId === 'a2')?.strength).toBe('Possible')
  })
  it('returns nothing when nothing matches and caps at 5', () => {
    expect(findMatches(lead({}), { accounts, contacts })).toEqual([])
  })
})
