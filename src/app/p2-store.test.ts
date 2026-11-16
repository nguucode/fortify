import { createDataStore } from './data'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16, 10, 0)
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: 'America/Chicago' }, { id: 'tpa', name: 'Tampa', city: 'Tampa', state: 'FL', timeZone: 'America/New_York' }],
  users: [
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: 'd@example.com', status: 'Active' },
    { id: 'am', name: 'Marisol Reyes', role: 'account-manager', officeId: 'off', email: 'm@example.com', status: 'Active' },
    { id: 'am2', name: 'Lena Ortiz', role: 'account-manager', officeId: 'tpa', email: 'l@example.com', status: 'Active' },
  ],
  carriers: [],
  accounts: [{ id: 'a', name: 'Torres Household', kind: 'Household', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'am', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' }],
  contacts: [],
  policies: [],
  terms: [],
  xDates: [
    { id: 'x1', accountId: 'a', line: 'Auto', currentCarrier: 'Acme', xDateOffset: -46, premium: 1200, interestLevel: 'Medium' },
    { id: 'x2', accountId: 'a', line: 'Auto', currentCarrier: 'Acme', xDateOffset: -400, premium: 1200, interestLevel: 'Medium', termMonths: 6 },
    { id: 'x3', accountId: 'a', line: 'Home', currentCarrier: 'Acme', xDateOffset: -10, premium: 900, interestLevel: 'Closed' },
  ],
  leads: [],
  opportunities: [],
  quotes: [],
  renewals: [],
  serviceRequests: [],
  activities: [],
  tasks: [],
})

describe('P2 batch 2 store', () => {
  it('rolls a passed X-date forward by its term until it is in the future (US-XDT-006)', () => {
    const s = createDataStore(base(), today)
    expect(s.rollForwardXDate('x1', 'p')).toBe('10/01/2027')
    expect(s.rollForwardXDate('x2', 'p')).toBe('04/12/2027') // 10/12/2025 + 6-month steps
    expect(s.getState().activities.at(-1)!.subject).toBe('Rolled forward from 10/12/2025 by Dana Whitfield')
  })
  it('bulk reports skips with reasons (Closed X-dates are not rolled)', () => {
    const s = createDataStore(base(), today)
    const r = s.bulk(['x1', 'x3'], (id) => s.rollForwardXDate(id, 'p'))
    expect(r.updated).toBe(1)
    expect(r.skipped).toEqual([{ id: 'x3', reason: 'Change the interest level from Closed first.' }])
  })
  it('only the author edits a note, within 24 hours (US-WRK-003)', () => {
    const s = createDataStore(base(), today)
    s.logActivity({ accountId: 'a', type: 'note', subject: 'Note', body: 'first', createdById: 'p', linked: null })
    const id = s.getState().activities.at(-1)!.id
    expect(() => s.editNote(id, 'x', 'am')).toThrow('Only the author')
    s.editNote(id, 'second', 'p')
    expect(s.getState().activities.at(-1)).toMatchObject({ body: 'second' })
    expect(() => s.editNote(id, 'late', 'p', new Date(Date.now() + 25 * 3_600_000))).toThrow('24 hours')
  })
})
