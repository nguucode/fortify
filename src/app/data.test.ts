import { createDataStore } from './data'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16)
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
  users: [
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: '' },
    { id: 'm', name: 'Marisol Reyes', role: 'account-manager', officeId: 'off', email: '' },
  ],
  carriers: [{ id: 'c', name: 'Lone Star Mutual', naic: '1', states: ['TX'], kinds: ['personal'], lines: ['Auto', 'Home'] }],
  accounts: [
    { id: 'acc-1', name: 'Torres Household', kind: 'Household', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'm', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' },
  ],
  contacts: [],
  policies: [{ id: 'pol-1', accountId: 'acc-1', carrierId: 'c', line: 'Home', policyNumber: 'LSM-1' }],
  terms: [{ id: 'trm-1', policyId: 'pol-1', effectiveOffset: -335, expirationOffset: 30, premium: 3000, status: 'Active', pendingCancellation: false }],
  xDates: [],
  leads: [
    { id: 'lea-1', name: 'Rosa Delgado', kind: 'Household', businessName: null, email: 'rosa@example.com', phone: '(555) 010-2222', state: 'TX', city: 'Houston', officeId: 'off', source: 'Web form', linesOfInterest: ['Auto'], currentCarrier: null, xDateOffset: null, assigneeId: 'p', status: 'Contacted', disqualifyReason: null, createdOffset: -2, attempts: [{ offset: -1, channel: 'Call', outcome: 'Connected' }], qualifiedAccountId: null, qualifiedOpportunityId: null },
  ],
  opportunities: [],
  quotes: [],
  renewals: [{ id: 'ren-1', accountId: 'acc-1', policyId: 'pol-1', termId: 'trm-1', status: 'In review', segment: 'personal', ownerId: 'm', renewalPremium: 3600, decision: null, decisionCarrierId: null, remarketOpportunityId: null, createdOffset: -15 }],
  serviceRequests: [],
  activities: [],
  tasks: [],
})

describe('qualifyLead (US-LEA-007)', () => {
  it('creates a Prospect Account and a New business Opportunity, copies attempts, and closes the Lead', () => {
    const s = createDataStore(base(), today)
    const { accountId, opportunityId } = s.qualifyLead({ leadId: 'lea-1', targetAccountId: null, actorId: 'p' })
    const st = s.getState()
    expect(st.accounts.find((a) => a.id === accountId)).toMatchObject({ name: 'Delgado Household', status: 'Prospect', producerId: 'p', accountManagerId: 'm' })
    expect(st.opportunities.find((o) => o.id === opportunityId)).toMatchObject({ type: 'New business', stage: 'Contacted', lines: ['Auto'], leadId: 'lea-1' })
    expect(st.leads[0]).toMatchObject({ status: 'Qualified', qualifiedAccountId: accountId, qualifiedOpportunityId: opportunityId })
    expect(st.activities.filter((a) => a.accountId === accountId).map((a) => a.type)).toEqual(expect.arrayContaining(['call', 'system']))
  })

  it('adds a Cross-sell to a matched Client instead of creating an Account', () => {
    const s = createDataStore(base(), today)
    const { accountId, opportunityId } = s.qualifyLead({ leadId: 'lea-1', targetAccountId: 'acc-1', actorId: 'p' })
    expect(accountId).toBe('acc-1')
    expect(s.getState().accounts).toHaveLength(1)
    expect(s.getState().opportunities.find((o) => o.id === opportunityId)!.type).toBe('Cross-sell')
  })
})

describe('pipeline (US-PIP-006 … US-PIP-010)', () => {
  const won = () => {
    const s = createDataStore(base(), today)
    const { opportunityId } = s.qualifyLead({ leadId: 'lea-1', targetAccountId: null, actorId: 'p' })
    const q1 = s.addQuote(opportunityId, { carrierId: 'c', lines: ['Auto'] }, 'p')
    const q2 = s.addQuote(opportunityId, { carrierId: 'c', lines: ['Auto'] }, 'p')
    return { s, opportunityId, q1, q2 }
  }

  it('auto-advances to Quoting on the first Quote and records responses', () => {
    const { s, opportunityId, q1 } = won()
    expect(s.getState().opportunities.find((o) => o.id === opportunityId)!.stage).toBe('Quoting')
    s.recordQuoteResponse(q1, { status: 'Quoted', premiums: { Auto: 1840 } }, 'p')
    expect(s.getState().quotes.find((q) => q.id === q1)).toMatchObject({ status: 'Quoted', lines: [{ line: 'Auto', premium: 1840, accepted: false }] })
    expect(() => s.recordQuoteResponse(q1, { status: 'Accepted' }, 'p')).toThrow()
  })

  it('marks Won: Bound Terms awaiting AMS, Account becomes Client, other Quotes Not taken', () => {
    const { s, opportunityId, q1, q2 } = won()
    s.recordQuoteResponse(q1, { status: 'Quoted', premiums: { Auto: 1840 } }, 'p')
    s.markPresented([q1], 'p')
    s.acceptLines(opportunityId, { Auto: q1 })
    s.markWon(opportunityId, { lines: [{ line: 'Auto', quoteId: q1, boundPremium: 1800, effectiveDate: new Date(2026, 11, 1), termMonths: 6, binderNumber: 'B-100' }] }, 'p')
    const st = s.getState()
    const o = st.opportunities.find((x) => x.id === opportunityId)!
    expect(o.stage).toBe('Won')
    const term = st.terms.find((t) => t.binderNumber === 'B-100')!
    expect(term).toMatchObject({ status: 'Bound', premium: 1800, source: 'fortify-won', effectiveOffset: 15, expirationOffset: 15 + 182 })
    expect(st.accounts.find((a) => a.id === o.accountId)!.status).toBe('Client')
    expect(st.quotes.find((q) => q.id === q1)!.status).toBe('Accepted')
    expect(st.quotes.find((q) => q.id === q2)!.status).toBe('Not taken')
  })

  it('refuses Won without an accepted line', () => {
    const { s, opportunityId } = won()
    expect(() => s.markWon(opportunityId, { lines: [] }, 'p')).toThrow('Accept at least one Quote line')
  })
})

describe('renewals (US-REN-005, US-REN-008)', () => {
  it('starts remarketing with a Remarket Opportunity owned by the Producer', () => {
    const s = createDataStore(base(), today)
    const oppId = s.startRemarket('ren-1', 'm')
    const st = s.getState()
    expect(st.renewals[0]).toMatchObject({ status: 'Remarketing', remarketOpportunityId: oppId })
    expect(st.opportunities.find((o) => o.id === oppId)).toMatchObject({ type: 'Remarket', ownerId: 'p', renewalId: 'ren-1', lines: ['Home'] })
  })
  it('rejects a status skip', () => {
    const s = createDataStore(base(), today)
    expect(() => s.setRenewalStatus('ren-1', 'Decided', 'm')).toThrow()
  })
})

describe('service requests (US-SRV-004, US-SRV-005)', () => {
  it('creates with sequential ids and moves status with an Activity', () => {
    const s = createDataStore(base(), today)
    const id = s.createServiceRequest({ accountId: 'acc-1', policyId: 'pol-1', type: 'Policy change', subject: 'Add 2024 Ford F-150', description: 'New truck', priority: 'High', details: {} }, 'm')
    expect(id).toBe('SR-10483')
    s.setServiceStatus(id, 'Waiting on carrier', 'm', { note: 'Endorsement from Lone Star Mutual' })
    expect(s.getState().serviceRequests[0].status).toBe('Waiting on carrier')
    expect(s.getState().activities.some((a) => a.subject.includes('Waiting on carrier'))).toBe(true)
    expect(() => s.setServiceStatus(id, 'New', 'm')).toThrow()
  })
})

describe('subscriptions', () => {
  it('notifies listeners once per transaction', () => {
    const s = createDataStore(base(), today)
    let n = 0
    s.subscribe(() => n++)
    s.qualifyLead({ leadId: 'lea-1', targetAccountId: null, actorId: 'p' })
    expect(n).toBe(1)
  })
})

describe('saveOpportunity (US-PIP-003)', () => {
  const input = { accountId: 'acc-1', type: 'Cross-sell' as const, lines: ['Umbrella' as const], targetCloseOffset: 30, estimatedPremium: 420, ownerId: 'p', source: 'Referral', probability: 10, name: null, notes: null, lineDetails: {} }
  it('creates a New Opportunity named after the Account and lines, and logs it on the Account', () => {
    const s = createDataStore(base(), today)
    const id = s.saveOpportunity(null, input, 'm')
    const o = s.getState().opportunities.find((x) => x.id === id)!
    expect(o).toMatchObject({ stage: 'New', type: 'Cross-sell', lines: ['Umbrella'], ownerId: 'p', estimatedPremium: 420, name: 'Torres Household · Umbrella' })
    expect(s.getState().activities.at(-1)).toMatchObject({ accountId: 'acc-1', subject: 'Marisol Reyes added a Cross-sell opportunity on Torres Household: Umbrella' })
  })
  it('rejects an Opportunity with no lines, or a Remarket created by hand', () => {
    const s = createDataStore(base(), today)
    expect(() => s.saveOpportunity(null, { ...input, lines: [] }, 'p')).toThrow('Add at least one line')
    expect(() => s.saveOpportunity(null, { ...input, type: 'Remarket' }, 'p')).toThrow(/Renewal/)
  })
  it('logs a Producer change on edit', () => {
    const s = createDataStore(base(), today)
    const id = s.saveOpportunity(null, input, 'p')
    s.saveOpportunity(id, { ...input, ownerId: 'm' }, 'p')
    expect(s.getState().activities.at(-1)!.subject).toBe('Producer changed from Dana Whitfield to Marisol Reyes')
  })
  it('refuses to edit a closed Opportunity', () => {
    const s = createDataStore(base(), today)
    const id = s.saveOpportunity(null, input, 'p')
    s.markLost(id, 'Price', 'p')
    expect(() => s.saveOpportunity(id, input, 'p')).toThrow('closed')
  })
})

describe('saveTask (US-WRK-005)', () => {
  const input = { accountId: 'acc-1', title: 'Call Ana about flood quote', type: 'Call' as const, priority: 'Normal' as const, assigneeId: 'm', dueOffset: 2, dueTime: null, durationMin: null, description: null, linked: null }
  it('creates an Open Manual Task', () => {
    const s = createDataStore(base(), today)
    const id = s.saveTask(null, input, 'p')
    expect(s.getState().tasks.find((t) => t.id === id)).toMatchObject({ status: 'Open', source: 'Manual', assigneeId: 'm', title: 'Call Ana about flood quote' })
  })
  it('requires a time for a Meeting and a title', () => {
    const s = createDataStore(base(), today)
    expect(() => s.saveTask(null, { ...input, type: 'Meeting' }, 'p')).toThrow('Meetings need a time')
    expect(() => s.saveTask(null, { ...input, title: '  ' }, 'p')).toThrow('Add a title')
  })
  it('logs a due date change on the Account and keeps a system Task title', () => {
    const s = createDataStore({ ...base(), tasks: [{ id: 'tsk-1', accountId: 'acc-1', title: 'Renewal review', type: 'General', priority: 'Normal', source: 'Renewal', assigneeId: 'm', dueOffset: 1, status: 'Open', linked: null }] }, today)
    s.saveTask('tsk-1', { ...input, title: 'Renamed', dueOffset: 4 }, 'm')
    const t = s.getState().tasks[0]
    expect(t).toMatchObject({ title: 'Renewal review', source: 'Renewal', dueOffset: 4 })
    expect(s.getState().activities.at(-1)!.subject).toBe('Task due date changed to 11/20/2026')
  })
  it('refuses to edit a Done Task', () => {
    const s = createDataStore({ ...base(), tasks: [{ id: 'tsk-1', accountId: 'acc-1', title: 'x', type: 'General', priority: 'Normal', source: 'Manual', assigneeId: 'm', dueOffset: 1, status: 'Done', linked: null }] }, today)
    expect(() => s.saveTask('tsk-1', input, 'm')).toThrow('read-only')
  })
})

describe('assignLeads (US-FND-019 bulk Reassign)', () => {
  it('assigns open Leads to a Producer and skips closed ones', () => {
    const s = createDataStore({ ...base(), leads: [{ ...base().leads[0], assigneeId: null }, { ...base().leads[0], id: 'lea-2', status: 'Qualified', assigneeId: null }] }, today)
    const n = s.assignLeads(['lea-1', 'lea-2'], 'p', 'm')
    expect(n).toBe(1)
    expect(s.getState().leads.map((l) => [l.id, l.assigneeId])).toEqual([['lea-1', 'p'], ['lea-2', null]])
  })
})
