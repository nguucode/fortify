import { createDataStore } from './data'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16, 10, 0)
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
  users: [
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: '' },
    { id: 'm', name: 'Marisol Reyes', role: 'account-manager', officeId: 'off', email: '' },
    { id: 'm2', name: 'Marcus Hill', role: 'account-manager', officeId: 'off', email: '' },
  ],
  carriers: [],
  accounts: [{ id: 'acc-1', name: 'Torres Roofing LLC', kind: 'Business', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'm', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' }],
  contacts: [],
  policies: [{ id: 'pol-1', accountId: 'acc-1', carrierId: 'c', line: 'GL', policyNumber: 'BFS-1' }],
  terms: [{ id: 'trm-1', policyId: 'pol-1', effectiveOffset: -300, expirationOffset: 65, premium: 12000, status: 'Active', pendingCancellation: false }],
  xDates: [],
  leads: [],
  opportunities: [],
  quotes: [],
  renewals: [],
  serviceRequests: [],
  activities: [],
  tasks: [],
  certificates: [],
  holders: [],
  claims: [],
})
const sr = { accountId: 'acc-1', policyId: 'pol-1', subject: 'x', description: 'Client called about this', priority: 'Normal' as const }

describe('createServiceRequest SLA and linked records (US-SRV-008/009/012/014)', () => {
  it('sets Due from the type in business hours', () => {
    const s = createDataStore(base(), today)
    const id = s.createServiceRequest({ ...sr, type: 'Claim report', details: { lossType: 'Liability', lossOffset: -2, description: 'Customer slipped at job site' } }, 'm', today)
    const r = s.getState().serviceRequests.find((x) => x.id === id)!
    expect(new Date(r.dueAt!)).toEqual(new Date(2026, 10, 16, 14, 0))
  })
  it('creates a Claim from a claim report', () => {
    const s = createDataStore(base(), today)
    const id = s.createServiceRequest({ ...sr, type: 'Claim report', details: { lossType: 'Liability', lossOffset: -2, description: 'Customer slipped at job site' } }, 'm', today)
    const c = s.getState().claims![0]
    expect(c).toMatchObject({ id: 'CL-2042', status: 'Reported', serviceRequestId: id, policyId: 'pol-1', lossType: 'Liability' })
  })
  it('creates a Certificate in Needs review when special wording is asked, plus a new holder', () => {
    const s = createDataStore(base(), today)
    s.createServiceRequest({ ...sr, type: 'Certificate request', details: { holder: { name: 'Harris County', address: '1 Main', city: 'Houston', state: 'TX', zip: '77002', email: '' }, policyIds: ['pol-1'], additionalInsured: true, waiver: false, primaryNonContrib: false, operations: 'Re: Job #2291' } }, 'm', today)
    const st = s.getState()
    expect(st.holders![0]).toMatchObject({ name: 'Harris County', accountId: 'acc-1' })
    expect(st.certificates![0]).toMatchObject({ status: 'Needs review', holderId: st.holders![0].id, additionalInsured: true })
  })
  it('creates a retention task and an X-date for a cancellation replaced elsewhere', () => {
    const s = createDataStore(base(), today)
    s.createServiceRequest({ ...sr, type: 'Cancellation request', details: { reason: 'Replaced with another carrier', newCarrier: 'Meridian National', newExpirationOffset: 300, retention: true, line: 'GL' } }, 'm', today)
    const st = s.getState()
    expect(st.tasks[0]).toMatchObject({ title: 'Retention call: Torres Roofing LLC, BFS-1', assigneeId: 'p' })
    expect(st.xDates[0]).toMatchObject({ currentCarrier: 'Meridian National', xDateOffset: 300, line: 'GL' })
  })
})

describe('setServiceStatus pause and outcomes (US-SRV-007/014)', () => {
  it('pauses the SLA while waiting on client and pushes Due later by the waited business hours', () => {
    const s = createDataStore(base(), today)
    const id = s.createServiceRequest({ ...sr, type: 'Policy change', details: {} }, 'm', today)
    const due0 = new Date(s.getState().serviceRequests[0].dueAt!)
    s.setServiceStatus(id, 'Waiting on client', 'm', {}, new Date(2026, 10, 16, 11, 0))
    s.setServiceStatus(id, 'In progress', 'm', {}, new Date(2026, 10, 16, 14, 0))
    expect(new Date(s.getState().serviceRequests[0].dueAt!).getTime() - due0.getTime()).toBe(3 * 3_600_000)
  })
  it('records a policy change outcome when closing', () => {
    const s = createDataStore(base(), today)
    const id = s.createServiceRequest({ ...sr, type: 'Policy change', details: {} }, 'm', today)
    s.setServiceStatus(id, 'Done', 'm', { resolution: 'Endorsement issued', outcome: { kind: 'Endorsement issued', effectiveOffset: 0, premium: { kind: 'Additional premium', amount: 214 } } })
    expect(s.getState().serviceRequests[0].outcome).toMatchObject({ kind: 'Endorsement issued' })
  })
})

describe('updateServiceRequest (US-SRV-015)', () => {
  it('logs a reassignment and requires a reason for a hand-set due', () => {
    const s = createDataStore(base(), today)
    const id = s.createServiceRequest({ ...sr, type: 'General', details: {} }, 'm', today)
    s.updateServiceRequest(id, { ownerId: 'm2' }, 'm')
    expect(s.getState().activities.at(-1)!.subject).toBe(`Marisol Reyes reassigned ${id} to Marcus Hill`)
    expect(() => s.updateServiceRequest(id, { dueAt: new Date(2026, 10, 20, 17).toISOString() }, 'm')).toThrow('reason')
  })
})
