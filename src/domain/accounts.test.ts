import { queryAccounts, type AccountRow } from './accounts'

const row = (p: Partial<AccountRow> & { id: string; name: string }): AccountRow => ({
  kind: 'Household',
  status: 'Client',
  officeId: 'off-hou',
  officeName: 'Houston',
  producerId: 'p1',
  producerName: 'Dana Whitfield',
  accountManagerId: 'm1',
  accountManagerName: 'Marisol Reyes',
  state: 'TX',
  contactName: null,
  searchText: '',
  activePolicyCount: 1,
  annualPremium: 1000,
  nextExpiration: null,
  lastActivity: null,
  lifecycle: 'active',
  ribbon: [],
  ...p,
})

const rows: AccountRow[] = [
  row({ id: 'a1', name: 'Torres Household', contactName: 'Mike Torres', searchText: 'mike torres (555) 010-1111', annualPremium: 4200 }),
  row({ id: 'a2', name: 'Torres Roofing LLC', kind: 'Business', contactName: 'Mike Torres', annualPremium: 61800 }),
  row({ id: 'a3', name: 'Abbott Household', status: 'Prospect', activePolicyCount: 0, annualPremium: 0, officeId: 'off-tpa', officeName: 'Tampa', state: 'FL' }),
  row({ id: 'a4', name: 'Nguyen Household', status: 'Former client', activePolicyCount: 0, annualPremium: 0 }),
  row({ id: 'a5', name: 'Old Dup Household', lifecycle: 'archived' }),
]

describe('queryAccounts', () => {
  it('counts each saved view, excluding archived and merged Accounts', () => {
    const r = queryAccounts(rows, { view: 'All' })
    expect(r.viewCounts).toEqual({ All: 4, Prospects: 1, Clients: 2, 'Former clients': 1, Households: 3, Businesses: 1 })
    expect(r.total).toBe(4)
  })

  it('filters by the selected saved view', () => {
    expect(queryAccounts(rows, { view: 'Businesses' }).rows.map((x) => x.id)).toEqual(['a2'])
    expect(queryAccounts(rows, { view: 'Prospects' }).rows.map((x) => x.id)).toEqual(['a3'])
  })

  it('searches name, Contact, email, and phone case-insensitively', () => {
    expect(queryAccounts(rows, { view: 'All', search: 'TORRES' }).rows.map((x) => x.id)).toEqual(['a1', 'a2'])
    expect(queryAccounts(rows, { view: 'All', search: '010-1111' }).rows.map((x) => x.id)).toEqual(['a1'])
  })

  it('applies filters such as Office and State', () => {
    expect(queryAccounts(rows, { view: 'All', filters: { state: 'FL' } }).rows.map((x) => x.id)).toEqual(['a3'])
  })

  it('filters by Status, Kind, and Account Manager', () => {
    expect(queryAccounts(rows, { view: 'All', filters: { status: 'Prospect' } }).rows.map((x) => x.id)).toEqual(['a3'])
    expect(queryAccounts(rows, { view: 'All', filters: { kind: 'Business' } }).rows.map((x) => x.id)).toEqual(['a2'])
    expect(queryAccounts(rows, { view: 'All', filters: { accountManagerId: 'nobody' } }).total).toBe(0)
  })

  it('sorts by premium descending and keeps name order as the default', () => {
    expect(queryAccounts(rows, { view: 'All', sort: { key: 'annualPremium', dir: 'desc' } }).rows[0].id).toBe('a2')
    expect(queryAccounts(rows, { view: 'All' }).rows.map((x) => x.name)).toEqual([
      'Abbott Household',
      'Nguyen Household',
      'Torres Household',
      'Torres Roofing LLC',
    ])
  })

  it('paginates and reports the premium total of the filtered set', () => {
    const r = queryAccounts(rows, { view: 'All', page: 2, pageSize: 3 })
    expect(r.rows).toHaveLength(1)
    expect(r.total).toBe(4)
    expect(r.premiumTotal).toBe(66000)
  })

  it('shows archived Accounts only when includeArchived is set', () => {
    expect(queryAccounts(rows, { view: 'All', includeArchived: true }).total).toBe(5)
  })
})

describe('buildAccountRows', () => {
  it('derives premium, policy count, next expiration, and ribbon from Active Terms', async () => {
    const { buildAccountRows } = await import('./accounts')
    const today = new Date(2026, 10, 15)
    const dataset = {
      offices: [{ id: 'o', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
      users: [
        { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'o', email: '' },
        { id: 'm', name: 'Marisol Reyes', role: 'account-manager', officeId: 'o', email: '' },
      ],
      carriers: [{ id: 'c', name: 'Gulf Harbor Insurance', naic: '1', states: ['TX'], kinds: ['personal'], lines: ['Home'] }],
      accounts: [
        { id: 'a', name: 'Torres Household', kind: 'Household', status: 'Client', officeId: 'o', producerId: 'p', accountManagerId: 'm', state: 'TX', city: '', zip: '', coastal: false, primaryContactId: 'k', linkedAccountIds: [], createdOffset: -10, lastActivityOffset: -2, lifecycle: 'active' },
      ],
      contacts: [{ id: 'k', name: 'Mike Torres', email: 'mike.torres@example.com', phone: '(555) 010-1234', accountIds: ['a'] }],
      policies: [
        { id: 'h', accountId: 'a', carrierId: 'c', line: 'Home', policyNumber: 'GHI-1' },
        { id: 'u', accountId: 'a', carrierId: 'c', line: 'Auto', policyNumber: 'GHI-2' },
      ],
      terms: [
        { id: 't0', policyId: 'h', effectiveOffset: -700, expirationOffset: -335, premium: 3000, status: 'Renewed', pendingCancellation: false },
        { id: 't1', policyId: 'h', effectiveOffset: -335, expirationOffset: 30, premium: 3200, status: 'Active', pendingCancellation: false },
        { id: 't2', policyId: 'u', effectiveOffset: -200, expirationOffset: 165, premium: 1400, status: 'Active', pendingCancellation: false },
      ],
      xDates: [{ id: 'x', accountId: 'a', line: 'Umbrella', currentCarrier: 'Captive carrier', xDateOffset: 90, premium: null, interestLevel: 'High' }],
    } as unknown as import('./types').Dataset

    const [r] = buildAccountRows(dataset, today)
    expect(r.activePolicyCount).toBe(2)
    expect(r.annualPremium).toBe(4600)
    expect(r.nextExpiration).toEqual(new Date(2026, 11, 15))
    expect(r.contactName).toBe('Mike Torres')
    expect(r.searchText).toContain('mike.torres@example.com')
    expect(r.ribbon.map((t) => `${t.kind}:${t.label}`)).toEqual(['renewal:Home · Gulf Harbor Insurance', 'xdate:Umbrella · Captive carrier', 'renewal:Auto · Gulf Harbor Insurance'])
  })
})
