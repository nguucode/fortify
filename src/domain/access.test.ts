import { visibleAccounts, canSeeCommission, scopeOf } from './access'
import type { Account, User } from './types'

const u = (id: string, role: User['role'], officeId = 'off-hou'): User => ({ id, name: id, role, officeId, email: '' })
const acc = (id: string, producerId: string, accountManagerId: string, officeId = 'off-hou') =>
  ({ id, producerId, accountManagerId, officeId }) as Account

describe('scope (spec/ia/roles.md)', () => {
  const accounts = [
    acc('a1', 'p1', 'm1', 'off-hou'),
    acc('a2', 'p2', 'm1', 'off-hou'),
    acc('a3', 'p2', 'm2', 'off-tpa'),
    acc('a4', 'p3', 'p1', 'off-tpa'), // p1 is listed as AM here: still in p1's Book
  ]

  it('gives a Producer only their Book', () => {
    expect(scopeOf(u('p1', 'producer'))).toBe('Own')
    expect(visibleAccounts(u('p1', 'producer'), accounts).map((a) => a.id)).toEqual(['a1', 'a4'])
  })

  it('gives an Account Manager every Account in their Office', () => {
    expect(scopeOf(u('m1', 'account-manager'))).toBe('Office')
    expect(visibleAccounts(u('m9', 'account-manager', 'off-hou'), accounts).map((a) => a.id)).toEqual(['a1', 'a2'])
  })

  it('gives Principal and Admin the whole agency', () => {
    expect(visibleAccounts(u('x', 'principal'), accounts)).toHaveLength(4)
    expect(visibleAccounts(u('y', 'admin'), accounts)).toHaveLength(4)
  })
})

describe('commission visibility', () => {
  it('shows a Producer only their own commission', () => {
    expect(canSeeCommission(u('p1', 'producer'), 'p1')).toBe(true)
    expect(canSeeCommission(u('p1', 'producer'), 'p2')).toBe(false)
  })
  it('hides commission from Account Managers and shows it to Principal and Admin', () => {
    expect(canSeeCommission(u('m1', 'account-manager'), 'p1')).toBe(false)
    expect(canSeeCommission(u('x', 'principal'), 'p1')).toBe(true)
    expect(canSeeCommission(u('y', 'admin'), 'p1')).toBe(true)
  })
})

describe('action gates (roles.md, rules.md)', async () => {
  const { canWorkLead, canEditOpportunity, canEditRenewal, canEditService } = await import('./access')
  const p = u('p1', 'producer'), m = u('m1', 'account-manager'), pr = u('x', 'principal'), ad = u('y', 'admin')
  const account = acc('a1', 'p1', 'm1')

  it('lets the assigned Producer or a Principal work a Lead; not Account Managers or Admins', () => {
    const lead = { assigneeId: 'p1', officeId: 'off-hou' }
    expect(canWorkLead(p, lead)).toBe(true)
    expect(canWorkLead(u('p2', 'producer'), lead)).toBe(false)
    expect(canWorkLead(pr, lead)).toBe(true)
    expect(canWorkLead(m, lead)).toBe(false)
    expect(canWorkLead(ad, lead)).toBe(false)
  })

  it('lets Account Managers edit only Remarket Opportunities; Admin reads', () => {
    expect(canEditOpportunity(p, account, 'New business')).toBe(true)
    expect(canEditOpportunity(m, account, 'New business')).toBe(false)
    expect(canEditOpportunity(m, account, 'Remarket')).toBe(true)
    expect(canEditOpportunity(ad, account, 'Remarket')).toBe(false)
  })

  it('lets Producers touch a Renewal only while remarketing', () => {
    expect(canEditRenewal(m, account, 'In review')).toBe(true)
    expect(canEditRenewal(p, account, 'In review')).toBe(false)
    expect(canEditRenewal(p, account, 'Remarketing')).toBe(true)
    expect(canEditRenewal(ad, account, 'In review')).toBe(false)
  })

  it('lets Producers edit only Service Requests they created', () => {
    expect(canEditService(m, account, 'someone')).toBe(true)
    expect(canEditService(p, account, 'p1')).toBe(true)
    expect(canEditService(p, account, 'm1')).toBe(false)
    expect(canEditService(ad, account, 'm1')).toBe(false)
  })
})
