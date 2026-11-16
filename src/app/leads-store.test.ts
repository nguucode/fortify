import { createDataStore } from './data'
import type { Dataset, Lead } from '@/domain/types'

const today = new Date(2026, 10, 16)
const lead = (id: string, extra: Partial<Lead> = {}): Lead => ({ id, name: 'Rosa Delgado', kind: 'Household', businessName: null, email: 'rosa@example.com', phone: '(555) 010-2222', state: 'TX', city: 'Houston', officeId: 'off', source: 'Web form', linesOfInterest: ['Auto'], currentCarrier: 'Meridian National', xDateOffset: 120, assigneeId: 'p', status: 'New', disqualifyReason: null, createdOffset: -1, attempts: [], qualifiedAccountId: null, qualifiedOpportunityId: null, ...extra })
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
  users: [
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: '', licenses: ['TX'] },
    { id: 'p2', name: 'Jordan Lee', role: 'producer', officeId: 'off', email: '', licenses: ['FL'] },
    { id: 'g', name: 'Grant Holloway', role: 'principal', officeId: 'off', email: '' },
  ],
  carriers: [],
  accounts: [],
  contacts: [],
  policies: [],
  terms: [],
  xDates: [],
  leads: [lead('lea-1'), lead('lea-2', { status: 'Contacted', attempts: [{ offset: -3, channel: 'Call', outcome: 'No answer' }] })],
  opportunities: [],
  quotes: [],
  renewals: [],
  serviceRequests: [],
  activities: [],
  tasks: [],
})

describe('saveLead (US-LEA-002)', () => {
  it('creates a New lead and validates reachability and lines', () => {
    const s = createDataStore(base(), today)
    const input = { kind: 'Household' as const, firstName: 'Ana', lastName: 'Torres', businessName: null, phone: '(555) 010-3333', email: '', street: '', city: 'Houston', state: 'TX' as const, zip: '77019', linesOfInterest: ['Home' as const], currentCarrier: null, currentPremium: null, xDateOffset: null, source: 'Referral' as const, sourceDetail: 'Kim Alvarez, Lone Star Mortgage', notes: null, officeId: 'off', assigneeId: 'p' }
    const id = s.saveLead(null, input, 'p')
    expect(s.getState().leads.find((l) => l.id === id)).toMatchObject({ name: 'Ana Torres', status: 'New', createdOffset: 0, sourceDetail: 'Kim Alvarez, Lone Star Mortgage' })
    expect(() => s.saveLead(null, { ...input, phone: '', email: '' }, 'p')).toThrow('Add a phone number or an email')
    expect(() => s.saveLead(null, { ...input, linesOfInterest: [] }, 'p')).toThrow('line of interest')
    s.saveLead(id, { ...input, notes: 'Wants bundle' }, 'p')
    expect(s.getState().leads.find((l) => l.id === id)!.events!.at(-1)!.text).toBe('Details edited by Dana Whitfield')
  })
})

describe('logAttempt (US-LEA-005)', () => {
  it('moves a New lead to Contacted and keeps the follow-up', () => {
    const s = createDataStore(base(), today)
    s.logAttempt('lea-1', { channel: 'Call', outcome: 'Left voicemail', note: null, followUpOffset: 2 }, 'p')
    const l = s.getState().leads[0]
    expect(l).toMatchObject({ status: 'Contacted', followUpOffset: 2 })
    expect(l.attempts[0]).toMatchObject({ channel: 'Call', outcome: 'Left voicemail', byId: 'p' })
  })
  it('refuses SMS without consent', () => {
    const s = createDataStore(base(), today)
    expect(() => s.logAttempt('lea-1', { channel: 'SMS', outcome: 'Sent', note: null, followUpOffset: null }, 'p')).toThrow('No SMS consent')
  })
})

describe('assign and hand off (US-LEA-004)', () => {
  it('logs who assigned the lead', () => {
    const s = createDataStore(base(), today)
    s.assignLeads(['lea-1'], 'p2', 'g')
    expect(s.getState().leads[0].events!.at(-1)!.text).toBe('Assigned to Jordan Lee by Grant Holloway')
  })
})

describe('disqualifyLead (US-LEA-008)', () => {
  it('requires a note for Other and records reason, date, and user', () => {
    const s = createDataStore(base(), today)
    expect(() => s.disqualifyLead('lea-1', { reason: 'Other', note: 'short' }, 'p')).toThrow('10 characters')
    s.disqualifyLead('lea-1', { reason: 'Price only', note: null }, 'p')
    expect(s.getState().leads[0]).toMatchObject({ status: 'Disqualified', disqualifyReason: 'Price only', disqualifiedById: 'p', disqualifiedOffset: 0 })
  })
  it('merges a duplicate into the surviving lead', () => {
    const s = createDataStore(base(), today)
    s.disqualifyLead('lea-1', { reason: 'Duplicate lead', note: null, survivorId: 'lea-2' }, 'p')
    const survivor = s.getState().leads[1]
    expect(survivor.events!.at(-1)!.text).toBe('Duplicate L-1001 merged into this lead’s history')
  })
  it('saves Bought elsewhere as an X-date on a new Prospect account', () => {
    const s = createDataStore(base(), today)
    s.disqualifyLead('lea-1', { reason: 'Bought elsewhere', note: null, saveXDate: { line: 'Auto', carrier: 'Meridian National', offset: 300 } }, 'p')
    const st = s.getState()
    expect(st.accounts[0]).toMatchObject({ name: 'Delgado Household', status: 'Prospect' })
    expect(st.xDates[0]).toMatchObject({ accountId: st.accounts[0].id, line: 'Auto', currentCarrier: 'Meridian National', xDateOffset: 300 })
    expect(st.opportunities).toHaveLength(0)
  })
})
