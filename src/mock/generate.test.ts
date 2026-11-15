import { generateDataset } from './generate'

describe('generateDataset', () => {
  const data = generateDataset(20261115)

  it('is deterministic for a seed', () => {
    expect(JSON.stringify(generateDataset(20261115))).toBe(JSON.stringify(data))
  })

  it('matches the scale in spec/ia/mock-data.md', () => {
    expect(data.offices.map((o) => o.name)).toEqual(['Houston', 'San Antonio', 'Tampa'])
    expect(data.users).toHaveLength(25)
    const roles = data.users.reduce<Record<string, number>>((m, u) => ({ ...m, [u.role]: (m[u.role] ?? 0) + 1 }), {})
    expect(roles).toEqual({ admin: 1, principal: 2, producer: 10, 'account-manager': 12 })
    expect(data.carriers).toHaveLength(10)
    expect(data.accounts.filter((a) => a.kind === 'Household')).toHaveLength(480)
    expect(data.accounts.filter((a) => a.kind === 'Business')).toHaveLength(120)
  })

  it('lands near the approximate counts in mock-data.md (±15%)', () => {
    const near = (n: number, target: number) => expect(Math.abs(n - target) / target).toBeLessThan(0.15)
    near(data.contacts.length, 1400)
    near(data.policies.length, 1500)
    near(data.terms.length, 3500)
    near(data.xDates.length, 250)
  })

  it('splits Accounts roughly 60/40 between TX and FL', () => {
    const tx = data.accounts.filter((a) => a.state === 'TX').length / data.accounts.length
    expect(tx).toBeGreaterThan(0.55)
    expect(tx).toBeLessThan(0.65)
  })

  it('includes the View as users from the shared seed list', () => {
    const byName = Object.fromEntries(data.users.map((u) => [u.name, u.role]))
    expect(byName['Dana Whitfield']).toBe('producer')
    expect(byName['Marisol Reyes']).toBe('account-manager')
    expect(byName['Grant Holloway']).toBe('principal')
    expect(byName['Priya Nair']).toBe('admin')
  })

  it('keeps every reference intact and roles correct', () => {
    const users = new Map(data.users.map((u) => [u.id, u]))
    const policies = new Set(data.policies.map((p) => p.id))
    const accounts = new Set(data.accounts.map((a) => a.id))
    for (const a of data.accounts) {
      expect(users.get(a.producerId)?.role).toBe('producer')
      expect(users.get(a.accountManagerId)?.role).toBe('account-manager')
      expect(users.get(a.accountManagerId)?.officeId).toBe(a.officeId)
    }
    for (const t of data.terms) expect(policies.has(t.policyId)).toBe(true)
    for (const p of data.policies) expect(accounts.has(p.accountId)).toBe(true)
    for (const x of data.xDates) expect(accounts.has(x.accountId)).toBe(true)
  })

  it('makes an Account a Client exactly when it has an Active or Bound Term', () => {
    const live = new Set(
      data.terms
        .filter((t) => t.status === 'Active' || t.status === 'Bound')
        .map((t) => data.policies.find((p) => p.id === t.policyId)!.accountId),
    )
    for (const a of data.accounts) expect(a.status === 'Client').toBe(live.has(a.id))
  })

  it('links Torres Household and Torres Roofing LLC through Mike Torres', () => {
    const hh = data.accounts.find((a) => a.name === 'Torres Household')!
    const biz = data.accounts.find((a) => a.name === 'Torres Roofing LLC')!
    expect(hh.linkedAccountIds).toContain(biz.id)
    expect(biz.linkedAccountIds).toContain(hh.id)
    const mike = data.contacts.find((c) => c.name === 'Mike Torres')!
    expect(mike.accountIds).toEqual(expect.arrayContaining([hh.id, biz.id]))
  })

  it('includes the hand-made edge cases', () => {
    expect(data.accounts.filter((a) => a.lifecycle === 'archived')).toHaveLength(3)
    expect(data.accounts.filter((a) => a.lifecycle === 'merged')).toHaveLength(1)
    expect(data.accounts.some((a) => a.lastActivityOffset === null)).toBe(true)
    expect(data.accounts.some((a) => a.name.length > 40)).toBe(true)
    expect(data.accounts.some((a) => a.primaryContactId === null)).toBe(true)
  })

  it('generates the selling, retention, and service objects at the mock-data.md scale', () => {
    const near = (n: number, target: number) => expect(Math.abs(n - target) / target).toBeLessThan(0.2)
    near(data.leads.length, 180)
    near(data.opportunities.length, 220)
    near(data.quotes.length, 450)
    near(data.serviceRequests.length, 300)
    near(data.tasks.length, 600)
    expect(data.activities.length).toBeGreaterThan(1500)
  })

  it('opens Renewals only for Active Terms inside their window, one per Term', () => {
    const terms = new Map(data.terms.map((t) => [t.id, t]))
    const windows = { personal: 45, 'fl-residential-property': 120, 'small-commercial': 60, 'large-commercial': 90 }
    expect(data.renewals.length).toBeGreaterThan(80)
    for (const r of data.renewals) {
      const t = terms.get(r.termId)!
      expect(t.status).toBe('Active')
      expect(t.expirationOffset).toBeLessThanOrEqual(windows[r.segment])
    }
    expect(new Set(data.renewals.map((r) => r.termId)).size).toBe(data.renewals.length)
  })

  it('keeps loop references intact', () => {
    const accounts = new Set(data.accounts.map((a) => a.id))
    const opps = new Set(data.opportunities.map((o) => o.id))
    for (const o of data.opportunities) expect(accounts.has(o.accountId)).toBe(true)
    for (const q of data.quotes) expect(opps.has(q.opportunityId)).toBe(true)
    for (const s of data.serviceRequests) expect(accounts.has(s.accountId)).toBe(true)
    for (const a of data.activities) expect(accounts.has(a.accountId)).toBe(true)
    for (const l of data.leads.filter((x) => x.status === 'Qualified')) expect(accounts.has(l.qualifiedAccountId!)).toBe(true)
    expect(data.serviceRequests.every((s) => /^SR-\d{5}$/.test(s.id))).toBe(true)
  })
})
