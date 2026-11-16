import { Faker, en_US, en, base } from '@faker-js/faker'
import type { Account, Activity, CallOutcome, Channel, Contact, Conversation, Dataset, Lead, Message, User } from '@/domain/types'

/**
 * US-INB-001..010 seed: ~350 conversations and ~1,200 messages (email 55%, SMS 30%, call 15%; 12% unmatched),
 * the scripted persona cases from the stories, and ~120 @mentions on existing notes. Own Faker seed so nothing
 * generated before it shifts.
 */
/** Timestamps are written against this fixed anchor and shifted to the real now on load (rebaseInbox). */
export const INBOX_ANCHOR = '2026-01-15T17:00:00.000Z'
export function rebaseInbox<T extends Pick<Dataset, 'conversations' | 'messages'>>(d: T, now = new Date()): T {
  const shift = now.getTime() - new Date(INBOX_ANCHOR).getTime()
  const move = (iso: string) => new Date(new Date(iso).getTime() + shift).toISOString()
  return { ...d, conversations: d.conversations?.map((c) => ({ ...c, lastAt: move(c.lastAt) })), messages: d.messages?.map((m) => ({ ...m, at: move(m.at) })) }
}

export function enrichInbox(seed: number, d: Pick<Dataset, 'accounts' | 'contacts' | 'users' | 'policies' | 'terms' | 'serviceRequests' | 'activities' | 'leads'>) {
  const now = new Date(INBOX_ANCHOR)
  const f = new Faker({ locale: [en_US, en, base] })
  f.seed(seed + 31)
  const int = (a: number, b: number) => f.number.int({ min: a, max: b })
  const pick = <T,>(xs: readonly T[]) => f.helpers.arrayElement(xs)
  const chance = (p: number) => f.datatype.boolean({ probability: p })
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()
  const conversations: Conversation[] = []
  const messages: Message[] = []
  const acts: Activity[] = []
  const user = (name: string) => d.users.find((u) => u.name === name)!
  const marisol = user('Marisol Reyes')
  const dana = user('Dana Whitfield')
  const contactsOf = new Map<string, Contact[]>()
  for (const c of d.contacts) for (const a of c.accountIds) contactsOf.set(a, [...(contactsOf.get(a) ?? []), c])
  const live = d.accounts.filter((a) => a.lifecycle === 'active' && contactsOf.get(a.id)?.length)
  const userEmail = (u: User) => u.email
  const ams = (office: string) => d.users.filter((u) => u.officeId === office && u.role === 'account-manager' && u.status !== 'Deactivated' && u.status !== 'Invited')

  const SUBJECTS = ['Question about my renewal', 'Need ID cards', 'Adding a driver', 'Billing question', 'Certificate request for a new job', 'Change of address', 'Quote follow-up', 'Roof inspection report', 'Can we lower the deductible?', 'Proof of insurance for the lender', 'New vehicle', 'Claim follow-up']
  const IN = ['Hi, can you help with this when you get a chance?', 'Thanks for the quick reply. One more question about the policy.', 'Attached is what the lender asked for.', 'We just bought a new car and need it added before Friday.', 'Can you send the updated ID cards?', 'Our renewal went up a lot. Can we look at other options?', 'Please send the certificate to the GC by tomorrow morning.']
  const OUT = ['Got it, I will take care of this today.', 'Done. The updated documents are attached.', 'I sent this to the carrier and will let you know when it is processed.', 'Thanks! Could you send the VIN and the date you took ownership?', 'Here is the certificate the GC asked for.']
  const SMS_IN = ['Hey, are my ID cards ready?', 'Can you call me back?', 'Thanks!', 'Got the email, all good.', 'Need a cert for a job tomorrow', 'What time works for a call?']
  const SMS_OUT = ['Yes, sending them now.', 'Calling you in 10 minutes.', 'You are welcome!', 'Sent to your email.', 'On it, will have it to you this morning.']

  let n = 0
  let m = 0
  const conv = (c: Omit<Conversation, 'id' | 'lastAt' | 'related' | 'unreadBy' | 'status'> & Partial<Pick<Conversation, 'related' | 'unreadBy' | 'status'>>) => {
    const x: Conversation = { related: [], unreadBy: [], status: 'Open', ...c, id: `cnv-${String(++n).padStart(4, '0')}`, lastAt: now.toISOString() }
    conversations.push(x)
    return x
  }
  const msg = (c: Conversation, x: Omit<Message, 'id' | 'conversationId'>) => {
    messages.push({ ...x, id: `msg-${String(++m).padStart(5, '0')}`, conversationId: c.id })
    if (x.at > c.lastAt || c.lastAt === now.toISOString()) c.lastAt = x.at
  }
  const log = (c: Conversation, type: Activity['type'], subject: string, body: string | null, offsetH: number, by: string) => {
    if (c.accountId) acts.push({ id: '', accountId: c.accountId, type, subject, body, occurredOffset: -Math.floor(offsetH / 24), createdById: by, linked: null, conversationId: c.id })
  }
  const unmatchedPhone = () => `(555) 01${int(0, 9)}-${int(1000, 9999)}`

  // ---------- Generic traffic ----------
  const GENERIC = 335
  for (let i = 0; i < GENERIC; i++) {
    const r = f.number.float({ min: 0, max: 1 })
    const channel: Channel = r < 0.55 ? 'email' : r < 0.85 ? 'sms' : 'call'
    const unmatched = chance(0.12) && channel !== 'call'
    const a: Account | undefined = unmatched ? undefined : pick(live)
    const contact = a ? pick(contactsOf.get(a.id)!) : undefined
    const officeId = a?.officeId ?? pick(['off-hou', 'off-sat', 'off-tpa'])
    const assigneeId = a ? (chance(0.7) ? a.accountManagerId : a.producerId) : pick(ams(officeId)).id
    const person = contact?.name ?? f.person.fullName()
    const address = channel === 'email' ? (contact?.email ?? f.internet.email({ firstName: person.split(' ')[0], lastName: person.split(' ').at(-1), provider: 'example.com' }).toLowerCase()) : (contact?.phone ?? unmatchedPhone())
    const startH = f.number.float({ min: 0.2, max: 24 * 30 })
    const done = chance(0.25)
    const c = conv({ channel, subject: channel === 'email' ? pick(SUBJECTS) : null, address, accountId: a?.id ?? null, contactId: contact?.id ?? null, officeId, assigneeId, status: done ? 'Done' : 'Open' })
    const me = d.users.find((u) => u.id === assigneeId)!
    if (channel === 'call') {
      const outcome = pick(['Connected', 'Connected', 'Left voicemail', 'No answer', 'Wrong number'] as CallOutcome[])
      const direction = pick(['Inbound', 'Outbound'] as const)
      const body = outcome === 'Connected' ? pick(['Reviewed the renewal options; client wants a remarket on the auto.', 'Client asked about adding a teen driver in March.', 'Walked through the claim process for the hail damage.', 'Confirmed the mortgagee change; sending updated dec page.']) : outcome === 'Left voicemail' ? 'Left a voicemail asking for a callback.' : ''
      msg(c, { kind: direction === 'Inbound' ? 'in' : 'out', fromName: direction === 'Inbound' ? person : me.name, from: direction === 'Inbound' ? address : userEmail(me), to: [], at: hoursAgo(startH), body, call: { direction, durationSec: outcome === 'Connected' ? int(60, 1500) : outcome === 'Left voicemail' ? int(20, 60) : 0, outcome, loggedById: me.id } })
      c.subject = `${direction} call · ${outcome}`
      log(c, 'call', `Call: ${outcome.toLowerCase()}`, body || null, startH, me.id)
      continue
    }
    const count = channel === 'email' ? int(1, 5) : int(2, 8)
    for (let k = 0; k < count; k++) {
      const inbound = k % 2 === 0
      const at = hoursAgo(startH - k * f.number.float({ min: 0.05, max: channel === 'sms' ? 0.5 : 6 }))
      if (channel === 'email')
        msg(c, { kind: inbound ? 'in' : 'out', fromName: inbound ? person : me.name, from: inbound ? address : userEmail(me), to: [inbound ? userEmail(me) : address], at, body: inbound ? pick(IN) : pick(OUT), attachments: chance(0.15) ? [{ name: pick(['ID-cards-2026.pdf', 'dec-page.pdf', 'photo-roof.jpg', 'lender-request.pdf']), sizeKb: int(40, 900) }] : undefined, simulated: !inbound || undefined })
      else msg(c, { kind: inbound ? 'in' : 'out', fromName: inbound ? person : me.name, from: inbound ? address : me.phone ?? '', to: [inbound ? 'agency' : address], at, body: inbound ? pick(SMS_IN) : pick(SMS_OUT), simulated: !inbound || undefined })
    }
    if (!done && count % 2 === 1 && chance(0.55)) c.unreadBy = [assigneeId]
    log(c, channel, channel === 'email' ? `Email: ${c.subject}` : 'SMS conversation', null, startH, assigneeId)
  }

  // ---------- Scripted cases ----------
  const torresHH = d.accounts.find((a) => a.name === 'Torres Household')!
  const torresBiz = d.accounts.find((a) => a.name === 'Torres Roofing LLC')!
  const mike = d.contacts.find((c) => c.name === 'Mike Torres')!
  const ana = d.contacts.find((c) => c.name === 'Ana Torres')!
  const auto = d.policies.find((p) => p.accountId === torresHH.id && p.line === 'Auto')
  const certSr = d.serviceRequests.find((s) => s.accountId === torresBiz.id && s.type === 'Certificate request')
  const ext = (name: string, sizeKb: number | null) => ({ name, sizeKb })

  // US-INB-002/008: F-150 request, 12-message thread, Certificate request linked to an SR.
  const f150 = conv({ channel: 'email', subject: 'Please add our new 2025 Ford F-150 to the auto policy', address: ana.email, accountId: torresHH.id, contactId: ana.id, officeId: torresHH.officeId, assigneeId: marisol.id, unreadBy: [marisol.id], related: auto ? [{ kind: 'policy', id: auto.id }] : [] })
  msg(f150, { kind: 'in', fromName: ana.name, from: ana.email, to: [marisol.email], at: hoursAgo(1.3), body: 'Hi Marisol,\n\nWe picked up a 2025 Ford F-150 on Saturday. Please add it to our auto policy with the same coverage as the Tahoe. The VIN is on the attached bill of sale.\n\nThanks,\nAna', attachments: [ext('bill-of-sale-F150.pdf', 212)] })
  log(f150, 'email', `Email: ${f150.subject}`, null, 1.3, marisol.id)

  const thread = conv({ channel: 'email', subject: 'ID cards and renewal questions', address: ana.email, accountId: torresHH.id, contactId: ana.id, officeId: torresHH.officeId, assigneeId: marisol.id, related: auto ? [{ kind: 'policy', id: auto.id }] : [] })
  for (let k = 0; k < 12; k++) {
    const inbound = k % 2 === 0
    msg(thread, { kind: inbound ? 'in' : 'out', fromName: inbound ? ana.name : marisol.name, from: inbound ? ana.email : marisol.email, to: [inbound ? marisol.email : ana.email], at: hoursAgo(24 * 9 - k * 14), body: inbound ? pick(IN) + (k > 0 ? '\n\n> On an earlier date, Marisol Reyes wrote:\n> Thanks, we got the ID cards…' : '') : pick(OUT), simulated: !inbound || undefined, attachments: k === 1 ? [ext('ID-cards-2026.pdf', 184)] : k === 5 ? [ext('renewal-comparison.pdf', 96), ext('old-dec-page.pdf', null)] : undefined })
  }
  log(thread, 'email', `Email: ${thread.subject}`, null, 24 * 9, marisol.id)

  const cert = conv({ channel: 'email', subject: 'COI needed for the Bellaire Blvd job site', address: mike.email, accountId: torresBiz.id, contactId: mike.id, officeId: torresBiz.officeId, assigneeId: marisol.id, unreadBy: [marisol.id], related: certSr ? [{ kind: 'service', id: certSr.id }] : [] })
  msg(cert, { kind: 'in', fromName: 'Mike Torres', from: mike.email, to: [marisol.email], cc: ['office@torresroofing.example'], at: hoursAgo(3), body: 'Marisol, the GC on the Bellaire Blvd job needs a certificate naming them as additional insured before we start Monday.\n\nGC: Westbrook Builders, 4400 Post Oak Pkwy, Houston TX 77027.\n\nOffice manager cc\'d.' })
  log(cert, 'email', `Email: ${cert.subject}`, null, 3, marisol.id)

  const cc = conv({ channel: 'email', subject: 'Annual safety meeting: insurance Q&A', address: mike.email, accountId: torresBiz.id, contactId: mike.id, officeId: torresBiz.officeId, assigneeId: dana.id, status: 'Done' })
  msg(cc, { kind: 'in', fromName: 'Mike Torres', from: mike.email, to: [dana.email], cc: Array.from({ length: 24 }, (_, i) => `crew${i + 1}@torresroofing.example`), at: hoursAgo(24 * 12), body: 'Dana, adding the whole crew so they can send their questions about the WC policy directly.' })

  // US-INB-003/006 SMS consent cases.
  const setConsent = (c: Contact, state: Contact['smsConsent'] extends infer T ? T : never) => (c.smsConsent = state)
  setConsent(mike, { state: 'Opted in', offset: -45, source: 'Verbal on call', byId: marisol.id })
  const sms1 = conv({ channel: 'sms', subject: null, address: mike.phone, accountId: torresBiz.id, contactId: mike.id, officeId: torresBiz.officeId, assigneeId: marisol.id, unreadBy: [marisol.id] })
  msg(sms1, { kind: 'in', fromName: mike.name, from: mike.phone, to: ['agency'], at: hoursAgo(26), body: 'Morning. Can you get me a cert for the job at 1200 Westheimer? Starting tomorrow.' })
  msg(sms1, { kind: 'out', fromName: marisol.name, from: marisol.phone ?? '', to: [mike.phone], at: hoursAgo(25.8), body: 'Yes. Who is the certificate holder?', simulated: true })
  msg(sms1, { kind: 'in', fromName: mike.name, from: mike.phone, to: ['agency'], at: hoursAgo(0.6), body: 'Greenway Plaza Partners LP. Same address as last time.' })
  msg(sms1, { kind: 'in', fromName: mike.name, from: mike.phone, to: ['agency'], at: hoursAgo(0.5), body: '[image]', attachments: [ext('IMG_2231.jpg', 1840)] })
  log(sms1, 'sms', 'SMS conversation', null, 26, marisol.id)

  const stopAt = new Date(now.getTime() - 13 * 86_400_000)
  setConsent(ana, { state: 'Opted out', offset: -13, source: 'Replied STOP' })
  const sms2 = conv({ channel: 'sms', subject: null, address: ana.phone, accountId: torresHH.id, contactId: ana.id, officeId: torresHH.officeId, assigneeId: marisol.id })
  msg(sms2, { kind: 'out', fromName: marisol.name, from: marisol.phone ?? '', to: [ana.phone], at: new Date(stopAt.getTime() - 3_600_000).toISOString(), body: 'Hi Ana, your renewal documents are in your email. Reply here with any questions.', simulated: true })
  msg(sms2, { kind: 'in', fromName: ana.name, from: ana.phone, to: ['agency'], at: stopAt.toISOString(), body: 'STOP' })
  msg(sms2, { kind: 'system', fromName: 'Fortify', from: '', to: [], at: new Date(stopAt.getTime() + 1000).toISOString(), body: `Ana Torres replied STOP. Texting is off for ${ana.phone}.` })

  // STOP then START, Unknown consent, and a phone shared in a Household.
  const hh = live.filter((a) => a.kind === 'Household' && a.officeId === 'off-hou' && a.accountManagerId === marisol.id && (contactsOf.get(a.id)?.length ?? 0) >= 2 && a.id !== torresHH.id)
  if (hh.length >= 3) {
    const [c1] = contactsOf.get(hh[0].id)!
    setConsent(c1, { state: 'Opted in', offset: -2, source: 'Replied START' })
    const s = conv({ channel: 'sms', subject: null, address: c1.phone, accountId: hh[0].id, contactId: c1.id, officeId: 'off-hou', assigneeId: marisol.id })
    msg(s, { kind: 'in', fromName: c1.name, from: c1.phone, to: ['agency'], at: hoursAgo(24 * 6), body: 'stop' })
    msg(s, { kind: 'system', fromName: 'Fortify', from: '', to: [], at: hoursAgo(24 * 6 - 0.01), body: `${c1.name} replied STOP. Texting is off for ${c1.phone}.` })
    msg(s, { kind: 'in', fromName: c1.name, from: c1.phone, to: ['agency'], at: hoursAgo(48), body: 'START' })
    msg(s, { kind: 'system', fromName: 'Fortify', from: '', to: [], at: hoursAgo(48 - 0.01), body: `${c1.name} replied START. Texting is on for ${c1.phone}.` })
    msg(s, { kind: 'in', fromName: c1.name, from: c1.phone, to: ['agency'], at: hoursAgo(47.9), body: 'Sorry, meant to stop the other number. Can you text me when the cards are ready?' })
    const [c2, c3] = contactsOf.get(hh[1].id)!
    setConsent(c2, { state: 'Unknown', offset: null })
    c3.phone = c2.phone
    const s2 = conv({ channel: 'sms', subject: null, address: c2.phone, accountId: hh[1].id, contactId: c2.id, officeId: 'off-hou', assigneeId: marisol.id, unreadBy: [marisol.id] })
    msg(s2, { kind: 'in', fromName: c2.name, from: c2.phone, to: ['agency'], at: hoursAgo(5), body: 'Is this the right number to text about our home policy? The roof was replaced in May and we have the paperwork.' })
  }

  // US-INB-001/007: unmatched number, multi-Account match, a sender who is a Lead.
  const un = conv({ channel: 'sms', subject: null, address: '(555) 010-4417', accountId: null, contactId: null, officeId: 'off-hou', assigneeId: marisol.id, unreadBy: [marisol.id] })
  msg(un, { kind: 'in', fromName: '(555) 010-4417', from: '(555) 010-4417', to: ['agency'], at: hoursAgo(0.9), body: 'Hi, a friend gave me this number. Do you insure food trucks in Houston? Looking for a quote.' })
  const multi = conv({ channel: 'email', subject: 'Question about the umbrella', address: mike.email, accountId: null, contactId: mike.id, officeId: 'off-hou', assigneeId: marisol.id, unreadBy: [marisol.id] })
  msg(multi, { kind: 'in', fromName: mike.name, from: mike.email, to: [marisol.email], at: hoursAgo(7), body: 'Does the umbrella cover the trucks too, or only the house cars?' })
  const lead: Lead | undefined = d.leads.find((l) => l.status === 'New' && l.email && l.officeId === 'off-hou')
  if (lead) {
    const lc = conv({ channel: 'email', subject: 'Re: your quote request', address: lead.email!, accountId: null, contactId: null, leadId: lead.id, officeId: 'off-hou', assigneeId: marisol.id })
    msg(lc, { kind: 'in', fromName: lead.name, from: lead.email!, to: [marisol.email], at: hoursAgo(30), body: 'Following up on the web form I sent last week. Is anyone looking at it?' })
  }

  // US-INB-004: calls logged 23 h and 25 h ago by Marisol.
  for (const [h, outcome] of [[23, 'Connected'], [25, 'Connected']] as const) {
    const c = conv({ channel: 'call', subject: `Outbound call · ${outcome}`, address: mike.phone, accountId: torresBiz.id, contactId: mike.id, officeId: torresBiz.officeId, assigneeId: marisol.id, status: 'Done' })
    msg(c, { kind: 'out', fromName: marisol.name, from: marisol.email, to: [], at: hoursAgo(h), body: h === 23 ? 'Mike wants the WC audit moved to after the busy season. Asked the carrier.' : 'Reviewed the GL renewal. Mike will send updated payroll by Friday.', call: { direction: 'Outbound', durationSec: h === 23 ? 252 : 410, outcome, loggedById: marisol.id } })
    log(c, 'call', 'Call: connected', null, h, marisol.id)
  }

  // ---------- Persona tuning: Marisol has 18 open, 7 unread ----------
  const mine = () => conversations.filter((c) => c.assigneeId === marisol.id && c.status === 'Open')
  for (const c of conversations) if (mine().length < 18 && c.status === 'Open' && c.officeId === 'off-hou' && c.assigneeId !== marisol.id && !c.accountId) c.assigneeId = marisol.id
  for (const c of conversations) if (mine().length < 18 && c.status === 'Open' && c.accountId && d.accounts.find((a) => a.id === c.accountId)?.accountManagerId === marisol.id && c.assigneeId !== marisol.id) c.assigneeId = marisol.id
  const scripted = (c: Conversation) => Number(c.id.slice(4)) > GENERIC
  const ranked = mine().sort((x, y) => Number(scripted(y)) - Number(scripted(x)) || y.lastAt.localeCompare(x.lastAt))
  for (const c of ranked.slice(18)) c.status = 'Done'
  let unread = mine().filter((c) => c.unreadBy.includes(marisol.id)).length
  for (const c of mine()) {
    const has = c.unreadBy.includes(marisol.id)
    if (has && unread > 7 && !scripted(c)) { c.unreadBy = []; unread-- }
    else if (!has && unread < 7 ) { c.unreadBy = [marisol.id]; unread++ }
  }
  for (const c of conversations) if (c.status === 'Done') c.unreadBy = []

  // ---------- US-INB-009: @mentions on existing notes ----------
  const notes = d.activities.filter((a) => a.type === 'note' || a.type === 'call')
  const acc = new Map(d.accounts.map((a) => [a.id, a]))
  for (const a of f.helpers.arrayElements(notes, 114)) {
    const account = acc.get(a.accountId)
    if (!account) continue
    const other = a.createdById === account.producerId ? account.accountManagerId : account.producerId
    const who = d.users.find((u) => u.id === other)
    if (!who) continue
    a.mentions = [other]
    a.body = `@${who.name} ${pick(['can you call them back about the renewal?', 'they asked about adding umbrella coverage, worth a cross-sell.', 'heads up, new driver in March.', 'the client wants a remarket on auto.', 'please review the payroll numbers before audit.'])}`
    a.mentionReadBy = chance(0.6) ? [other] : []
  }
  const danaNotes = live.filter((a) => a.producerId === dana.id).slice(0, 6)
  danaNotes.forEach((a, i) => {
    const author = d.users.find((u) => u.id === a.accountManagerId)!
    acts.push({ id: '', accountId: i === 5 ? (live.find((x) => x.producerId !== dana.id && x.officeId === 'off-hou')?.id ?? a.id) : a.id, type: 'note', subject: 'Note', body: `@${dana.name} ${['client is shopping their home policy, can you call?', 'new teen driver in June, quote the auto change.', 'they want a BOP quote for the new location.', 'renewal came in 18% higher, please review.', 'referral from this client: their neighbor wants a quote.', 'moved this one to the San Antonio team, FYI.'][i]}`, occurredOffset: -i, createdById: author.id, linked: null, mentions: [dana.id], mentionReadBy: i < 3 ? [] : [dana.id] })
  })

  const maxId = d.activities.reduce((mx, a) => Math.max(mx, Number(a.id.replace(/\D/g, '')) || 0), 0)
  acts.forEach((a, i) => (a.id = `act-${String(maxId + i + 1).padStart(4, '0')}`))
  return { conversations, messages, activities: acts }
}
