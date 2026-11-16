import { createDataStore } from './data'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16, 10, 0)
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
  users: [
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: '' },
    { id: 'm', name: 'Marisol Reyes', role: 'account-manager', officeId: 'off', email: '' },
    { id: 'g', name: 'Grant Holloway', role: 'principal', officeId: 'off', email: '' },
    { id: 'g2', name: 'Priya Shah', role: 'principal', officeId: 'off', email: '' },
  ],
  carriers: [{ id: 'c', name: 'Keystone Commercial Casualty', naic: '1', states: ['TX'], kinds: ['commercial'], lines: ['GL'] }],
  accounts: [
    { id: 'acc-1', name: 'Okafor Household', kind: 'Household', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'm', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' },
    { id: 'acc-2', name: 'Brazos Builders Inc.', kind: 'Business', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'm', state: 'TX', city: 'Houston', zip: '77002', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' },
  ],
  contacts: [],
  policies: [{ id: 'pol-1', accountId: 'acc-2', carrierId: 'c', line: 'GL', policyNumber: 'KCC-GL-0019387' }, { id: 'pol-2', accountId: 'acc-2', carrierId: 'c', line: 'GL', policyNumber: 'KCC-GL-0019387' }],
  terms: [
    { id: 'trm-1', policyId: 'pol-1', effectiveOffset: -340, expirationOffset: 25, premium: 9000, status: 'Active', pendingCancellation: false },
    { id: 'trm-2', policyId: 'pol-1', effectiveOffset: 25, expirationOffset: 390, premium: 9500, status: 'Bound', pendingCancellation: false },
  ],
  xDates: [],
  leads: [],
  opportunities: [],
  quotes: [],
  renewals: [],
  serviceRequests: [{ id: 'SR-10490', accountId: 'acc-2', policyId: 'pol-1', type: 'Claim report', subject: 'Slip', description: 'x', priority: 'Normal', status: 'New', ownerId: 'm', createdById: 'm', createdOffset: -1, dueOffset: 0, resolution: null, details: {} }],
  activities: [],
  tasks: [],
  holders: [{ id: 'hld-1', accountId: 'acc-2', name: 'Westheimer Commons', address: '1 Main', city: 'Houston', state: 'TX', zip: '77002', email: 'certs@example.com', type: 'Additional insured', status: 'Active' }],
  certificates: [{ id: 'CERT-0123', accountId: 'acc-2', holderId: 'hld-1', policyIds: ['pol-1'], additionalInsured: true, waiver: false, primaryNonContrib: false, operations: 'Job 2291', status: 'Requested', serviceRequestId: null, createdOffset: -1, createdById: 'p' }],
  claims: [{ id: 'CL-2041', accountId: 'acc-2', policyId: 'pol-1', serviceRequestId: 'SR-10490', lossType: 'Liability', lossOffset: -3, description: 'Slip and fall at job site', status: 'Reported', details: {}, createdOffset: -1 }],
})

describe('X-dates (US-XDT-002/004/005)', () => {
  it('creates a follow-up Task once inside the quote window and moves or cancels it with the X-date', () => {
    const s = createDataStore(base(), today)
    const id = s.saveXDate(null, { accountId: 'acc-1', line: 'Home', currentCarrier: 'Gulf Harbor', xDateOffset: 30, premium: 2300, interestLevel: 'High' }, 'p')
    let st = s.getState()
    const t = st.tasks.find((x) => x.id === st.xDates[0].followUpTaskId)!
    expect(t).toMatchObject({ title: 'Quote ahead of X-date: Home, Okafor Household', source: 'X-date', assigneeId: 'p', dueOffset: 0, status: 'Open' })
    s.saveXDate(id, { xDateOffset: 40 }, 'p')
    st = s.getState()
    expect(st.tasks.find((x) => x.id === t.id)!.dueOffset).toBe(0)
    s.saveXDate(id, { xDateOffset: 200 }, 'p')
    expect(s.getState().tasks.find((x) => x.id === t.id)).toMatchObject({ status: 'Canceled' })
    expect(s.getState().tasks.find((x) => x.id === t.id)!.closeNote).toMatch(/^X-date moved to/)
  })
  it('does not create a Task outside the window or when Closed', () => {
    const s = createDataStore(base(), today)
    s.saveXDate(null, { accountId: 'acc-1', line: 'Home', currentCarrier: 'Gulf Harbor', xDateOffset: 100, premium: null, interestLevel: 'High' }, 'p')
    s.saveXDate(null, { accountId: 'acc-1', line: 'Auto', currentCarrier: 'Gulf Harbor', xDateOffset: 10, premium: null, interestLevel: 'Closed' }, 'p')
    expect(s.getState().tasks).toHaveLength(0)
  })
  it('starts one Opportunity from bundled X-dates and completes their follow-ups', () => {
    const s = createDataStore(base(), today)
    const a = s.saveXDate(null, { accountId: 'acc-1', line: 'Home', currentCarrier: 'GH', xDateOffset: 30, premium: 2000, interestLevel: 'High' }, 'p')
    const b = s.saveXDate(null, { accountId: 'acc-1', line: 'Auto', currentCarrier: 'GH', xDateOffset: 40, premium: 1500, interestLevel: 'Medium' }, 'p')
    const oppId = s.startQuoteFromXDates([a, b], 'p')
    const st = s.getState()
    expect(st.opportunities[0]).toMatchObject({ id: oppId, type: 'Cross-sell', stage: 'New', lines: ['Home', 'Auto'], estimatedPremium: 3500, targetCloseOffset: 30 })
    expect(st.xDates.every((x) => x.opportunityId === oppId)).toBe(true)
    expect(st.tasks.every((t) => t.status === 'Done')).toBe(true)
  })
})

describe('Certificates (US-CRT-005/007/009)', () => {
  it('issues straight away without marks, otherwise submits for review', () => {
    const s = createDataStore(base(), today)
    s.prepareCertificate('CERT-0123', { marks: { 'pol-1': { ai: false, wvd: false, pnc: false } }, delivery: 'certs@example.com' }, 'm', today)
    expect(s.getState().certificates![0]).toMatchObject({ status: 'Issued', issuedById: 'm' })
  })
  it('blocks an additional-insured holder without ADDL INSD, and needs another Principal to approve', () => {
    const s = createDataStore(base(), today)
    expect(() => s.prepareCertificate('CERT-0123', { marks: { 'pol-1': { ai: false, wvd: false, pnc: false } }, delivery: '', requireAi: true }, 'm', today)).toThrow('additional insured')
    s.prepareCertificate('CERT-0123', { marks: { 'pol-1': { ai: true, wvd: false, pnc: false } }, delivery: 'x@y.z' }, 'g', today)
    expect(s.getState().certificates![0]).toMatchObject({ status: 'Needs review', submittedById: 'g' })
    expect(() => s.reviewCertificate('CERT-0123', 'approve', null, 'g', today)).toThrow('Another Principal')
    expect(() => s.reviewCertificate('CERT-0123', 'return', 'short', 'g2', today)).toThrow('10 characters')
    s.reviewCertificate('CERT-0123', 'approve', null, 'g2', today)
    expect(s.getState().certificates![0]).toMatchObject({ status: 'Issued', approvedById: 'g2' })
  })
  it('re-issues unflagged certificates and sends flagged ones to review', () => {
    const s = createDataStore(base(), today)
    s.prepareCertificate('CERT-0123', { marks: { 'pol-1': { ai: true, wvd: false, pnc: false } }, delivery: 'x@y.z' }, 'm', today)
    s.reviewCertificate('CERT-0123', 'approve', null, 'g', today)
    const r = s.reissueCertificates(['CERT-0123'], 'm', today)
    const st = s.getState()
    expect(r).toEqual({ reissued: 0, review: 1 })
    expect(st.certificates![0]).toMatchObject({ status: 'Replaced', replacedById: st.certificates![1].id })
    expect(st.certificates![1]).toMatchObject({ status: 'Needs review', reissueOfId: 'CERT-0123' })
  })
})

describe('Claims (US-CLM-003/004/005)', () => {
  it('submits, assigns a number and adjuster, closes with an outcome, and reopens', () => {
    const s = createDataStore(base(), today)
    s.submitClaim('CL-2041', 'Carrier portal', 'm')
    expect(s.getState().claims![0].status).toBe('Submitted to carrier')
    expect(s.getState().serviceRequests[0].status).toBe('In progress')
    expect(() => s.recordClaimNumber('CL-2041', { number: 'x', adjuster: null }, 'm')).toThrow('4 to 30')
    s.recordClaimNumber('CL-2041', { number: 'KCC-26-0038812', adjuster: null }, 'm')
    expect(s.getState().claims![0].status).toBe('Claim # assigned')
    s.recordClaimNumber('CL-2041', { number: 'KCC-26-0038812', adjuster: { name: 'Jo Park', type: 'Carrier staff' } }, 'm')
    expect(s.getState().claims![0].status).toBe('Open')
    s.closeClaim('CL-2041', { outcome: 'Paid', amount: 6240, note: null, denialReason: null }, 'm')
    expect(s.getState().claims![0]).toMatchObject({ status: 'Closed', outcome: 'Paid', paidAmount: 6240, closedOffset: 0 })
    s.reopenClaim('CL-2041', 'Supplement for hidden damage', 'm')
    expect(s.getState().claims![0]).toMatchObject({ status: 'Open', carrierClaimNumber: 'KCC-26-0038812' })
  })
  it('withdraws a reported claim with a reason', () => {
    const s = createDataStore(base(), today)
    s.withdrawClaim('CL-2041', 'Client paid out of pocket', 'm')
    expect(s.getState().claims![0]).toMatchObject({ status: 'Closed', outcome: 'Withdrawn' })
  })
})
