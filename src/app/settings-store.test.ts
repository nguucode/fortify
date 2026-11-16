import { createDataStore } from './data'
import { unknownTokens, renderTemplate } from '@/domain/templates'
import type { Dataset } from '@/domain/types'

const today = new Date(2026, 10, 16, 10, 0)
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: 'America/Chicago', zip: '77027', phone: '(713) 555-0140' }],
  users: [
    { id: 'x', name: 'Priya Nair', role: 'admin', officeId: 'off', email: 'priya@example.com', status: 'Active' },
    { id: 'p', name: 'Kevin Ruiz', role: 'producer', officeId: 'off', email: 'kevin@example.com', status: 'Active' },
  ],
  carriers: [],
  accounts: [{ id: 'acc-1', name: 'Torres Roofing LLC', kind: 'Business', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'x', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' }],
  contacts: [],
  policies: [],
  terms: [],
  xDates: [],
  leads: [],
  opportunities: [{ id: 'opp-1', accountId: 'acc-1', type: 'New business', stage: 'Quoting', stageEnteredOffset: -2, lines: ['GL'], ownerId: 'p', estimatedPremium: 900, targetCloseOffset: 20, source: 'X', lostReason: null, renewalId: null, leadId: null, createdOffset: -5, closedOffset: null }],
  quotes: [],
  renewals: [],
  serviceRequests: [],
  activities: [],
  tasks: [],
  settings: { stages: { Quoting: { probability: 50, staleDays: 14 }, Proposed: { probability: 70, staleDays: 10 } }, lostReasons: [{ name: 'Price' }], dqReasons: [{ name: 'Spam' }] },
  templates: [],
  syncRuns: [],
})

describe('users (US-SET-003)', () => {
  it('invites with a unique email and blocks deactivating someone who still owns work', () => {
    const s = createDataStore(base(), today)
    expect(() => s.saveUser(null, { name: 'Jo Ng', email: 'kevin@example.com', role: 'producer', officeId: 'off', title: null, phone: null }, 'x')).toThrow('already in use by Kevin Ruiz')
    const id = s.saveUser(null, { name: 'Jo Ng', email: 'jo@example.com', role: 'producer', officeId: 'off', title: null, phone: null }, 'x')
    expect(s.getState().users.find((u) => u.id === id)).toMatchObject({ status: 'Invited' })
    expect(() => s.setUserStatus('p', 'Deactivated', 'x')).toThrow('Move 1 Accounts')
    expect(() => s.setUserStatus('x', 'Deactivated', 'x')).toThrow('your own')
  })
})

describe('settings (US-SET-004/006/012)', () => {
  it('validates office phone and ZIP, saves pipeline settings, and records a sync run', () => {
    const s = createDataStore(base(), today)
    expect(() => s.updateOffice('off', { phone: '555' }, 'x')).toThrow('10 digits')
    s.updateOffice('off', { address1: '1 Main St', zip: '77002' }, 'x')
    expect(s.getState().offices[0]).toMatchObject({ address1: '1 Main St', zip: '77002' })
    s.saveSettings({ ...s.getState().settings!, lostReasons: [{ name: 'Price' }, { name: 'Coverage', retired: true }] }, 'x')
    expect(s.getState().settings!.lostReasons).toHaveLength(2)
    s.syncNow(false, today)
    expect(s.getState().syncRuns![0]).toMatchObject({ status: 'Succeeded' })
    s.syncNow(true, today)
    expect(s.getState().syncRuns![0]).toMatchObject({ status: 'Failed', error: 'AMS connection timed out after 30s' })
  })
})

describe('templates (US-SET-008)', () => {
  it('flags unknown merge fields and renders known ones, marking missing values', () => {
    expect(unknownTokens('Hi {{contact.firstName}}, {{account.nickname}}')).toEqual(['{{account.nickname}}'])
    expect(renderTemplate('Hi {{account.name}} {{policy.number}}', { 'account.name': 'Torres Roofing LLC' })).toBe('Hi Torres Roofing LLC [no value]')
  })
  it('saves and blocks unknown fields or long SMS', () => {
    const s = createDataStore(base(), today)
    expect(() => s.saveTemplate(null, { name: 'x', channel: 'Email', category: 'Sales', usedIn: '', subject: 's', body: '{{account.nickname}}' }, 'x')).toThrow('1 unknown field')
    expect(() => s.saveTemplate(null, { name: 'x', channel: 'SMS', category: 'Sales', usedIn: '', body: 'a'.repeat(321) }, 'x')).toThrow('2 segments')
    const id = s.saveTemplate(null, { name: 'Hello', channel: 'Email', category: 'Sales', usedIn: 'Inbox email', subject: 'Hi', body: 'Hi {{contact.firstName}}' }, 'x')
    expect(s.getState().templates!.find((t) => t.id === id)).toMatchObject({ status: 'Active', editedById: 'x', editedOffset: 0 })
  })
})
