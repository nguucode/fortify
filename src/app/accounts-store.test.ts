import { createDataStore } from './data'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16)
const acct = (id: string, name: string, extra: Partial<Dataset['accounts'][number]> = {}): Dataset['accounts'][number] => ({ id, name, kind: 'Household', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'm', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active', details: { street: '1 Main St', county: 'Harris County', preferredContact: 'Phone', source: 'Referral' }, ...extra })
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: '' }],
  users: [
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: '' },
    { id: 'p2', name: 'Jordan Lee', role: 'producer', officeId: 'off', email: '' },
    { id: 'm', name: 'Marisol Reyes', role: 'account-manager', officeId: 'off', email: '' },
    { id: 'm2', name: 'Lionel Fell', role: 'account-manager', officeId: 'off', email: '' },
    { id: 'x', name: 'Priya Nair', role: 'admin', officeId: 'off', email: '' },
  ],
  carriers: [],
  accounts: [acct('acc-1', 'Torres Household', { primaryContactId: 'con-1' }), acct('acc-2', 'Okafor Household', { status: 'Prospect' }), acct('acc-3', 'Torres HH (dup)', { status: 'Prospect' })],
  contacts: [
    { id: 'con-1', name: 'Ana Torres', email: 'ana@example.com', phone: '(555) 010-2231', accountIds: ['acc-1'], relationships: { 'acc-1': 'Primary' } },
    { id: 'con-2', name: 'Lucas Torres', email: 'lucas@example.com', phone: '(555) 010-2232', accountIds: ['acc-1', 'acc-3'], relationships: { 'acc-1': 'Child', 'acc-3': 'Primary' } },
  ],
  policies: [{ id: 'pol-1', accountId: 'acc-1', carrierId: 'c', line: 'Home', policyNumber: 'LSM-1' }],
  terms: [{ id: 'trm-1', policyId: 'pol-1', effectiveOffset: -335, expirationOffset: 30, premium: 3000, status: 'Active', pendingCancellation: false }],
  xDates: [],
  leads: [],
  opportunities: [{ id: 'opp-1', accountId: 'acc-2', type: 'New business', stage: 'Quoting', stageEnteredOffset: -2, lines: ['Auto'], ownerId: 'p', estimatedPremium: 900, targetCloseOffset: 20, source: 'Referral', lostReason: null, renewalId: null, leadId: null, createdOffset: -5, closedOffset: null }],
  quotes: [],
  renewals: [],
  serviceRequests: [],
  activities: [],
  tasks: [
    { id: 'tsk-1', accountId: 'acc-2', title: 'Call', type: 'Call', priority: 'Normal', source: 'Manual', assigneeId: 'p', dueOffset: 1, status: 'Open', linked: null },
    { id: 'tsk-2', accountId: 'acc-3', title: 'Email', type: 'Email', priority: 'Normal', source: 'Manual', assigneeId: 'm', dueOffset: 1, status: 'Open', linked: null },
  ],
  documents: [],
})
const lastAct = (s: ReturnType<typeof createDataStore>) => s.getState().activities.at(-1)!.subject

describe('createAccount (US-ACC-002)', () => {
  it('creates a Prospect with its primary Contact and logs it', () => {
    const s = createDataStore(base(), today)
    const id = s.createAccount({ kind: 'Household', name: 'Nguyen Household', officeId: 'off', producerId: 'p', accountManagerId: 'm', street: '9 Elm St', city: 'Houston', state: 'TX', zip: '77002', contact: { firstName: 'Linh', lastName: 'Nguyen', phone: '(555) 010-9000', email: 'linh@example.com' } }, 'p')
    const a = s.getState().accounts.find((x) => x.id === id)!
    expect(a).toMatchObject({ status: 'Prospect', name: 'Nguyen Household', zip: '77002' })
    const c = s.getState().contacts.find((x) => x.id === a.primaryContactId)!
    expect(c).toMatchObject({ name: 'Linh Nguyen', relationships: { [id]: 'Primary' } })
    expect(lastAct(s)).toBe('Account created by Dana Whitfield')
  })
})

describe('updateAccount (US-ACC-007)', () => {
  it('logs a mailing address change by name', () => {
    const s = createDataStore(base(), today)
    s.updateAccount('acc-1', { street: '2 Oak St' }, 'm')
    expect(s.getState().accounts[0].details!.street).toBe('2 Oak St')
    expect(lastAct(s)).toBe('Mailing address changed by Marisol Reyes')
  })
})

describe('Contacts on an Account (US-ACC-010/013)', () => {
  it('links, makes primary, and refuses to unlink a contact on no other account', () => {
    const s = createDataStore(base(), today)
    s.makePrimary('acc-1', 'con-2', 'm')
    expect(s.getState().accounts[0].primaryContactId).toBe('con-2')
    expect(() => s.unlinkContact('con-1', 'acc-1', 'm')).toThrow('at least one account')
    s.unlinkContact('con-2', 'acc-3', 'm')
    expect(s.getState().contacts[1].accountIds).toEqual(['acc-1'])
  })
  it('requires a new primary before unlinking the primary', () => {
    const s = createDataStore(base(), today)
    s.linkContact('con-2', 'acc-2', 'Other', 'm')
    s.makePrimary('acc-2', 'con-2', 'm')
    s.linkContact('con-1', 'acc-2', 'Other', 'm')
    expect(() => s.unlinkContact('con-2', 'acc-2', 'm')).toThrow('new primary')
  })
  it('creates a contact linked with a relationship and records SMS opt-out date', () => {
    const s = createDataStore(base(), today)
    const id = s.saveContact(null, { firstName: 'Mia', lastName: 'Torres', phone: '(555) 010-1000', email: '', smsConsent: 'Opted out' }, { accountId: 'acc-1', relationship: 'Child' }, 'm')
    const c = s.getState().contacts.find((x) => x.id === id)!
    expect(c).toMatchObject({ name: 'Mia Torres', accountIds: ['acc-1'], relationships: { 'acc-1': 'Child' }, smsConsent: { state: 'Opted out', offset: 0 } })
    expect(() => s.saveContact(null, { firstName: 'No', lastName: 'Reach', phone: '', email: '' }, { accountId: 'acc-1', relationship: 'Other' }, 'm')).toThrow('phone or email')
  })
})

describe('reassignAccounts (US-ACC-015/016)', () => {
  it('moves the Producer and open work by default, skips accounts already owned, and logs each', () => {
    const s = createDataStore(base(), today)
    const r = s.reassignAccounts(['acc-1', 'acc-2'], { producerId: 'p2', moveOpenWork: true }, 'x')
    expect(r).toEqual({ changed: 2, skipped: 0 })
    expect(s.getState().opportunities[0].ownerId).toBe('p2')
    expect(s.getState().tasks[0].assigneeId).toBe('p2')
    expect(s.getState().activities.map((a) => a.subject)).toContain('Producer changed from Dana Whitfield to Jordan Lee by Priya Nair')
    expect(s.reassignAccounts(['acc-1'], { producerId: 'p2', moveOpenWork: true }, 'x')).toEqual({ changed: 0, skipped: 1 })
  })
  it('keeps open work with the old owner when asked', () => {
    const s = createDataStore(base(), today)
    s.reassignAccounts(['acc-2'], { producerId: 'p2', moveOpenWork: false }, 'x')
    expect(s.getState().opportunities[0].ownerId).toBe('p')
  })
})

describe('archive and restore (US-ACC-017)', () => {
  it('blocks archiving with active policies or open opportunities', () => {
    const s = createDataStore(base(), today)
    expect(() => s.archiveAccount('acc-1', 'Duplicate', 'x')).toThrow('active policies')
    expect(() => s.archiveAccount('acc-2', 'Duplicate', 'x')).toThrow('open opportunity')
  })
  it('archives, cancels open tasks, and restores the previous status', () => {
    const s = createDataStore(base(), today)
    s.archiveAccount('acc-3', 'Duplicate', 'x')
    expect(s.getState().accounts[2]).toMatchObject({ lifecycle: 'archived', archived: { reason: 'Duplicate', prevStatus: 'Prospect' } })
    expect(s.getState().tasks[1]).toMatchObject({ status: 'Canceled', closeNote: 'Account archived' })
    s.restoreAccount('acc-3', 'x')
    expect(s.getState().accounts[2]).toMatchObject({ lifecycle: 'active', status: 'Prospect' })
    expect(s.getState().tasks[1].status).toBe('Canceled')
    expect(lastAct(s)).toBe('Restored by Priya Nair')
  })
})

describe('mergeAccounts (US-ACC-018)', () => {
  it('moves records to the survivor, dedupes contacts, and marks the duplicate merged', () => {
    const s = createDataStore(base(), today)
    s.mergeAccounts('acc-1', 'acc-3', {}, 'x')
    const st = s.getState()
    expect(st.accounts[2]).toMatchObject({ lifecycle: 'merged', mergedIntoId: 'acc-1' })
    expect(st.tasks[1].accountId).toBe('acc-1')
    expect(st.contacts[1].accountIds).toEqual(['acc-1'])
    expect(st.activities.at(-1)!.subject).toMatch(/^Merged Torres HH \(dup\) into this account by Priya Nair/)
  })
  it('refuses different kinds or two accounts with active policies', () => {
    const s = createDataStore({ ...base(), accounts: [...base().accounts.slice(0, 2), acct('acc-3', 'Biz', { kind: 'Business' })] }, today)
    expect(() => s.mergeAccounts('acc-1', 'acc-3', {}, 'x')).toThrow('same kind')
  })
})

describe('documents (US-ACC-009)', () => {
  it('adds uploaded documents and logs one activity', () => {
    const s = createDataStore(base(), today)
    s.addDocuments('acc-1', [{ name: 'loss-run.pdf', size: 1000 }, { name: 'photo.jpg', size: 2000 }], 'Loss run', null, 'm')
    expect(s.getState().documents!.map((d) => d.source)).toEqual(['Uploaded', 'Uploaded'])
    expect(lastAct(s)).toBe('Uploaded 2 documents')
  })
})

describe('completeTask (US-WRK-006)', () => {
  it('marks a Call Done and logs a call Activity with the outcome and primary contact', () => {
    const s = createDataStore({ ...base(), tasks: [{ ...base().tasks[0], accountId: 'acc-1' }] }, today)
    s.completeTask('tsk-1', 'p', { note: 'Asked for loss runs', outcome: 'Left voicemail' })
    expect(s.getState().tasks[0]).toMatchObject({ status: 'Done', closeNote: 'Asked for loss runs', doneOffset: 0 })
    expect(s.getState().activities.at(-1)).toMatchObject({ type: 'call', subject: 'Call with Ana Torres · Left voicemail', accountId: 'acc-1' })
  })
  it('can defer the Activity until the undo window closes, so undo never removes one', () => {
    const s = createDataStore(base(), today)
    s.completeTask('tsk-2', 'm', { log: false })
    expect(s.getState().activities).toHaveLength(0)
    s.reopenTask('tsk-2')
    expect(s.getState().tasks[1].status).toBe('Open')
    s.completeTask('tsk-2', 'm', { log: false })
    s.logTaskCompletion('tsk-2', 'm')
    expect(lastAct(s)).toBe('Email sent: Email')
  })
  it('logs a General task as a system Activity and cancels with a reason', () => {
    const s = createDataStore({ ...base(), tasks: [{ ...base().tasks[0], type: 'General', title: 'Send loss runs to underwriter' }, base().tasks[1]] }, today)
    s.completeTask('tsk-1', 'p', {})
    expect(lastAct(s)).toBe('Completed task: Send loss runs to underwriter')
    s.cancelTask('tsk-2', 'Duplicate', 'm')
    expect(s.getState().tasks[1]).toMatchObject({ status: 'Canceled', closeNote: 'Duplicate' })
  })
})

describe('mentions (US-WRK-011)', () => {
  it('stores mentions on a note but never the author', () => {
    const s = createDataStore(base(), today)
    s.logActivity({ accountId: 'acc-1', type: 'note', subject: 'Ask @Dana Whitfield about the roof', body: null, createdById: 'm', linked: null, mentions: ['p', 'm'] })
    expect(s.getState().activities.at(-1)!.mentions).toEqual(['p'])
  })
})

describe('dwcLine (US-ACC-006)', () => {
  it('reads filed, due, or missing by the April 30 deadline', async () => {
    const { dwcLine } = await import('@/pages/AccountPanels')
    expect(dwcLine(-10, new Date(2026, 2, 22))).toEqual({ text: 'DWC-005 filed 03/12/2026', warn: false })
    expect(dwcLine(-400, new Date(2026, 2, 1))).toEqual({ text: 'DWC-005 due by 04/30/2026', warn: false })
    expect(dwcLine(null, new Date(2026, 10, 16))).toEqual({ text: 'DWC-005 not on file for 2026', warn: true })
  })
})
