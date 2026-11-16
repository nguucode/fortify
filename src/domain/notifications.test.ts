import { deriveNotifications } from './notifications'
import type { Dataset, User } from './types'

const u = (id: string, role: User['role']): User => ({ id, name: id, role, officeId: 'hou', email: '' })
const data = {
  accounts: [{ id: 'a1', name: 'Torres Household', producerId: 'p', accountManagerId: 'm', officeId: 'hou' }],
  leads: [
    { id: 'l1', name: 'Rosa Delgado', assigneeId: 'p', status: 'New', createdOffset: 0, source: 'Web form', linesOfInterest: ['Auto'] },
    { id: 'l2', name: 'Old Lead', assigneeId: 'p', status: 'New', createdOffset: -30, source: 'Phone', linesOfInterest: ['Home'] },
  ],
  tasks: [
    { id: 't1', accountId: 'a1', title: 'Call Ana', assigneeId: 'p', status: 'Open', dueOffset: -2, source: 'Manual' },
    { id: 't2', accountId: 'a1', title: 'X-date follow-up', assigneeId: 'm', status: 'Open', dueOffset: 0, source: 'X-date' },
  ],
  renewals: [{ id: 'r1', accountId: 'a1', termId: 'tm1', ownerId: 'm', status: 'In review', renewalPremium: 3600, createdOffset: -10 }],
  terms: [{ id: 'tm1', premium: 3000, pendingCancellation: false }],
  serviceRequests: [{ id: 'SR-1', accountId: 'a1', ownerId: 'm', createdById: 'p', status: 'New', subject: 'Add mortgagee', createdOffset: -1 }],
  policies: [],
} as unknown as Dataset

describe('deriveNotifications (US-FND-008)', () => {
  it('gives a Producer new Leads from the last week and overdue Tasks, newest first', () => {
    const n = deriveNotifications(data, u('p', 'producer'))
    expect(n.map((x) => x.kind)).toEqual(['lead-assigned', 'task-overdue', 'renewal-at-risk'])
    expect(n[1]).toMatchObject({ title: 'Task overdue: Call Ana', to: '/accounts/a1' })
  })
  it('gives an Account Manager at-risk Renewals and Service Requests others assigned, but not X-date follow-ups', () => {
    const kinds = deriveNotifications(data, u('m', 'account-manager')).map((x) => x.kind)
    expect(kinds).toEqual(expect.arrayContaining(['renewal-at-risk', 'service-assigned']))
    expect(kinds).not.toContain('xdate-followup')
  })
})
