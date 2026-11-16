import { createDataStore } from './data'
import type { Dataset } from '@/domain/types'

const now = new Date(2026, 10, 16, 10, 0)
const iso = (hAgo: number) => new Date(now.getTime() - hAgo * 3_600_000).toISOString()
const base = (): Dataset => ({
  offices: [{ id: 'off', name: 'Houston', city: 'Houston', state: 'TX', timeZone: 'America/Chicago' }],
  users: [
    { id: 'am', name: 'Marisol Reyes', role: 'account-manager', officeId: 'off', email: 'marisol@example.com', status: 'Active' },
    { id: 'p', name: 'Dana Whitfield', role: 'producer', officeId: 'off', email: 'dana@example.com', status: 'Active' },
  ],
  carriers: [],
  accounts: [
    { id: 'hh', name: 'Torres Household', kind: 'Household', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'am', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: 'c1', linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' },
    { id: 'biz', name: 'Torres Roofing LLC', kind: 'Business', status: 'Client', officeId: 'off', producerId: 'p', accountManagerId: 'am', state: 'TX', city: 'Houston', zip: '77019', coastal: false, primaryContactId: 'c1', linkedAccountIds: [], createdOffset: -10, lastActivityOffset: null, lifecycle: 'active' },
  ],
  contacts: [
    { id: 'c1', name: 'Mike Torres', email: 'mike@example.com', phone: '(555) 010-2290', accountIds: ['hh', 'biz'] },
    { id: 'c2', name: 'Ana Torres', email: 'ana@example.com', phone: '(555) 010-2291', accountIds: ['hh'], smsConsent: { state: 'Opted out', offset: -13 } },
  ],
  policies: [],
  terms: [],
  xDates: [],
  leads: [],
  opportunities: [],
  quotes: [],
  renewals: [],
  serviceRequests: [],
  activities: [],
  tasks: [],
  conversations: [
    { id: 'cnv-0001', channel: 'sms', subject: null, address: '(555) 010-4417', accountId: null, contactId: null, officeId: 'off', assigneeId: 'am', status: 'Open', unreadBy: ['am'], lastAt: iso(1), related: [] },
    { id: 'cnv-0002', channel: 'sms', subject: null, address: '(555) 010-2291', accountId: 'hh', contactId: 'c2', officeId: 'off', assigneeId: 'am', status: 'Open', unreadBy: [], lastAt: iso(2), related: [] },
  ],
  messages: [
    { id: 'msg-0001', conversationId: 'cnv-0001', kind: 'in', fromName: '(555) 010-4417', from: '(555) 010-4417', to: [], at: iso(1), body: 'Do you insure food trucks?' },
    { id: 'msg-0002', conversationId: 'cnv-0001', kind: 'in', fromName: '(555) 010-4417', from: '(555) 010-4417', to: [], at: iso(0.5), body: 'Hello?' },
  ],
})

describe('Inbox store (INB P1)', () => {
  it('blocks texting an opted-out Contact (US-INB-006)', () => {
    const s = createDataStore(base(), now)
    expect(() => s.sendSms('cnv-0002', 'Hi', 'am', now)).toThrow('opted out')
  })

  it('links an unmatched conversation, backfilling one Activity per message plus a system line (US-INB-007)', () => {
    const s = createDataStore(base(), now)
    s.linkConversation('cnv-0001', { accountId: 'biz', contactId: 'c1', saveAddress: false }, 'am')
    const acts = s.getState().activities.filter((a) => a.accountId === 'biz')
    expect(acts.map((a) => a.type)).toEqual(['sms', 'sms', 'system'])
    expect(acts[2].subject).toBe('Conversation linked from Inbox by Marisol Reyes')
    expect(s.getState().conversations![0]).toMatchObject({ accountId: 'biz', contactId: 'c1' })
  })

  it('moving a linked conversation keeps the old Activities and notes the move (US-INB-007)', () => {
    const s = createDataStore(base(), now)
    s.linkConversation('cnv-0001', { accountId: 'biz', contactId: 'c1', saveAddress: false }, 'am')
    s.linkConversation('cnv-0001', { accountId: 'hh', contactId: 'c1', saveAddress: false }, 'am')
    const biz = s.getState().activities.filter((a) => a.accountId === 'biz')
    expect(biz).toHaveLength(4)
    expect(biz[3].subject).toBe('Conversation moved to Torres Household')
  })

  it('assigning makes it unread for the assignee only (US-INB-010)', () => {
    const s = createDataStore(base(), now)
    s.assignConversations(['cnv-0002'], 'p', 'am')
    const c = s.getState().conversations!.find((x) => x.id === 'cnv-0002')!
    expect(c).toMatchObject({ assigneeId: 'p', unreadBy: ['p'] })
    expect(s.getState().activities.at(-1)!.subject).toBe('Conversation assigned to Dana Whitfield by Marisol Reyes')
  })

  it('logs a call: Connected needs notes; creates a Call Activity and a follow-up Task (US-INB-004)', () => {
    const s = createDataStore(base(), now)
    const input = { contactId: 'c1', accountId: 'hh', direction: 'Outbound' as const, at: iso(0.1), durationSec: 252, outcome: 'Connected' as const, notes: '', related: null, followUpOffset: 2 }
    expect(() => s.logCall(input, 'am', now)).toThrow('Add notes')
    expect(() => s.logCall({ ...input, notes: 'x', at: iso(-1) }, 'am', now)).toThrow('future')
    s.logCall({ ...input, notes: 'Reviewed renewal' }, 'am', now)
    expect(s.getState().activities.at(-1)).toMatchObject({ type: 'call', accountId: 'hh' })
    expect(s.getState().tasks.at(-1)).toMatchObject({ title: 'Follow up with Mike Torres', dueOffset: 2 })
  })

  it('call notes are editable by the author for 24 hours (US-INB-004)', () => {
    const s = createDataStore(base(), now)
    s.logCall({ contactId: 'c1', accountId: 'hh', direction: 'Outbound', at: iso(25), durationSec: 60, outcome: 'No answer', notes: '', related: null, followUpOffset: null }, 'am', now)
    const id = s.getState().messages!.at(-1)!.id
    expect(() => s.editCallNotes(id, 'late edit', 'am', now)).toThrow('24 hours')
    expect(() => s.editCallNotes(id, 'not mine', 'p', new Date(now.getTime() - 24 * 3_600_000))).toThrow('Only the author')
  })

  it('sending an email with an unresolved merge field is blocked (US-INB-005)', () => {
    const s = createDataStore(base(), now)
    expect(() => s.sendEmail({ conversationId: null, accountId: 'hh', contactId: 'c1', to: ['mike@example.com'], cc: [], subject: 'Hi', body: 'Policy {{policy.number}}', attachments: [] }, 'am', now)).toThrow('Fill in {{policy.number}} or remove it.')
    const id = s.sendEmail({ conversationId: null, accountId: 'hh', contactId: 'c1', to: ['mike@example.com'], cc: [], subject: 'Hi', body: 'Hello', attachments: [] }, 'am', now)
    expect(s.getState().activities.at(-1)).toMatchObject({ type: 'email', conversationId: id })
  })

  it('an inbound STOP opts the Contact out; a reply on a Done conversation reopens it unread (US-INB-011)', () => {
    const d = base()
    d.contacts[0].smsConsent = { state: 'Opted in', offset: -5 }
    d.conversations!.push({ id: 'cnv-0003', channel: 'sms', subject: null, address: '(555) 010-2290', accountId: 'hh', contactId: 'c1', officeId: 'off', assigneeId: 'am', status: 'Done', unreadBy: [], lastAt: iso(30), related: [] })
    const s = createDataStore(d, now)
    s.receiveMessage('cnv-0003', 'stop', null, now)
    expect(s.getState().contacts[0].smsConsent?.state).toBe('Opted out')
    expect(s.getState().conversations!.find((c) => c.id === 'cnv-0003')).toMatchObject({ status: 'Open', unreadBy: ['am'] })
    expect(s.getState().messages!.at(-1)!.body).toBe('Mike Torres replied STOP. Texting is off for (555) 010-2290.')
  })
})
