import { searchRecords } from './search'
import type { Dataset, User } from './types'

const u = (id: string, role: User['role'], officeId = 'hou'): User => ({ id, name: id, role, officeId, email: '' })
const acct = (id: string, name: string, producerId: string, officeId = 'hou') => ({ id, name, kind: 'Household', status: 'Client', officeId, producerId, accountManagerId: 'm', state: 'TX', city: '', zip: '', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: 0, lastActivityOffset: null, lifecycle: 'active' }) as Dataset['accounts'][number]
const data = {
  accounts: [acct('a1', 'Torres Household', 'p1'), acct('a2', 'Torrez Plumbing', 'p2'), acct('a3', 'Tampa Torres', 'p3', 'tpa')],
  contacts: [{ id: 'c1', name: 'Ana Torres', email: 'ana@example.com', phone: '(555) 010-1234', accountIds: ['a1'] }],
  leads: [{ id: 'l1', name: 'Mike Torres', businessName: null, email: 'mike@example.com', phone: '555-010-9999', officeId: 'hou', assigneeId: 'p1', status: 'New' }],
  opportunities: [{ id: 'o1', accountId: 'a1', lines: ['Auto'], type: 'Cross-sell', stage: 'New', ownerId: 'p1' }],
  policies: [{ id: 'pol1', accountId: 'a1', carrierId: 'c', line: 'Home', policyNumber: 'GHI-HO-4471023' }, { id: 'pol2', accountId: 'a2', carrierId: 'c', line: 'GL', policyNumber: 'GHI-GL-4471' }],
  serviceRequests: [{ id: 'SR-10483', accountId: 'a1', subject: 'Add mortgagee', type: 'Policy change', status: 'New' }],
} as unknown as Dataset

describe('searchRecords (US-FND-003)', () => {
  it('puts the exact policy number match first', () => {
    const r = searchRecords(data, u('x', 'principal'), 'ghi-ho-4471023')
    expect(r.exact).toMatchObject({ kind: 'Policy', to: '/policies/pol1' })
  })
  it('matches phone numbers regardless of formatting', () => {
    const r = searchRecords(data, u('x', 'principal'), '5550101234')
    expect(r.groups.Contacts.map((x) => x.id)).toEqual(['c1'])
    expect(searchRecords(data, u('x', 'principal'), '(555) 010-9999').groups.Leads.map((x) => x.id)).toEqual(['l1'])
  })
  it('never returns records outside the user scope', () => {
    const r = searchRecords(data, u('p1', 'producer'), 'torre')
    expect(r.groups.Accounts.map((x) => x.id)).toEqual(['a1'])
    expect(searchRecords(data, u('m', 'account-manager'), 'torres').groups.Accounts.map((x) => x.id)).toEqual(['a1'])
  })
  it('caps groups at 5 but reports the total, and ignores queries under 2 characters', () => {
    const many = { ...data, accounts: Array.from({ length: 9 }, (_, i) => acct(`z${i}`, `Smith ${i}`, 'p1')) }
    const r = searchRecords(many, u('x', 'principal'), 'smith')
    expect(r.groups.Accounts).toHaveLength(5)
    expect(r.totals.Accounts).toBe(9)
    expect(searchRecords(data, u('x', 'principal'), 't').groups.Accounts).toHaveLength(0)
  })
})
