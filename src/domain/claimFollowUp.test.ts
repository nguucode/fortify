import { followUps } from './claimFollowUp'
import type { Claim } from './types'

const today = new Date(2026, 10, 18, 12) // Wed 11/18/2026
const base: Claim = { id: 'CL-1', accountId: 'a', policyId: null, serviceRequestId: 'SR-1', lossType: 'Property', lossOffset: -20, description: '', status: 'Open', details: {}, createdOffset: -20 }
const d = { activities: [], tasks: [], serviceRequests: [{ id: 'SR-1', status: 'In progress' }] } as never

describe('claim follow-up rules (US-CLM-006)', () => {
  it('flags no claim # after 2 business days', () => {
    expect(followUps({ ...base, status: 'Submitted to carrier', submittedOffset: -1 }, d, today)).toEqual([])
    expect(followUps({ ...base, status: 'Submitted to carrier', submittedOffset: -3 }, d, today)[0]).toMatchObject({ rule: 'noClaimNumber' })
  })
  it('flags Open claims with no check-in for 7 business days; a logged call resets it', () => {
    const open = { ...base, statusDates: { Open: -14 } }
    expect(followUps(open, d, today)[0]).toMatchObject({ rule: 'checkIn' })
    const withCall = { ...(d as object), activities: [{ type: 'call', occurredOffset: -2, linked: { kind: 'claim', id: 'CL-1' } }] } as never
    expect(followUps(open, withCall, today)).toEqual([])
  })
  it('waits 14 business days while the claim report request is Waiting on client', () => {
    const waiting = { ...(d as object), serviceRequests: [{ id: 'SR-1', status: 'Waiting on client' }] } as never
    expect(followUps({ ...base, statusDates: { Open: -14 } }, waiting, today)).toEqual([])
    expect(followUps({ ...base, statusDates: { Open: -25 } }, waiting, today)[0]).toMatchObject({ rule: 'checkInWaitingOnClient' })
  })
})
