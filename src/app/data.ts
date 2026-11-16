import type {
  Account,
  AccountDetails,
  Claim,
  Holder,
  AccountDocument,
  Contact,
  DocumentType,
  SmsConsent,
  Activity,
  Dataset,
  Lead,
  Line,
  Opportunity,
  OpportunityStage,
  Quote,
  QuoteStatus,
  RenewalStatus,
  ServiceRequest,
  ServiceStatus,
  Task,
} from '@/domain/types'
import { addMonths, canQuoteTransition, canServiceTransition, checkStageMove, nextRenewalStatuses } from '@/domain/rules'
import { daysBetween, formatUSDate, resolveOffset } from '@/mock/dates'
import { addBusinessHours, businessHoursBetween, slaHours } from '@/domain/sla'

/**
 * The mutable mock store (US-FND-005). Every action builds the next state and commits it once,
 * so a failure mid-action leaves no partial records and subscribers re-render once.
 * Dates are day offsets from `today`.
 */
/** US-ACC-017: why an Account can't be archived, or null. Shared with the UI so the dialog shows the same reason. */
export function archiveBlock(s: Pick<Dataset, 'policies' | 'terms' | 'opportunities' | 'serviceRequests'>, a: Pick<Account, 'id' | 'name'>): string | null {
  const live = s.policies.filter((p) => p.accountId === a.id && s.terms.some((t) => t.policyId === p.id && (t.status === 'Active' || t.status === 'Bound'))).length
  if (live) return `${a.name} has ${live} active ${live === 1 ? 'policy' : 'policies'}. Accounts with active policies can't be archived.`
  const opps = s.opportunities.filter((o) => o.accountId === a.id && o.stage !== 'Won' && o.stage !== 'Lost').length
  if (opps) return `${a.name} has ${opps} open opportunit${opps === 1 ? 'y' : 'ies'}. Close ${opps === 1 ? 'it' : 'them'} as Won or Lost before archiving.`
  const srs = s.serviceRequests.filter((r) => r.accountId === a.id && r.status !== 'Done').length
  if (srs) return `${a.name} has ${srs} open service request${srs === 1 ? '' : 's'}. Close ${srs === 1 ? 'it' : 'them'} before archiving.`
  return null
}

export function createDataStore(seed: Dataset, today: Date = new Date()) {
  let state: Dataset = seed
  const listeners = new Set<() => void>()
  const offsetOf = (d: Date) => daysBetween(today, d)
  const seq = (prefix: string, list: { id: string }[], start = 1) => {
    const max = list.reduce((m, x) => Math.max(m, Number(x.id.replace(/\D/g, '')) || 0), start - 1)
    return `${prefix}${String(max + 1).padStart(4, '0')}`
  }

  const commit = (next: Dataset) => {
    state = next
    listeners.forEach((l) => l())
  }
  const userName = (id: string) => state.users.find((u) => u.id === id)?.name ?? 'Someone'
  const activity = (s: Dataset, a: Omit<Activity, 'id' | 'occurredOffset'> & { occurredOffset?: number }): Activity => ({
    id: seq('act-', s.activities),
    occurredOffset: 0,
    ...a,
  })
  const must = <T,>(v: T | undefined, what: string): T => {
    if (!v) throw new Error(`${what} not found`)
    return v
  }

  function moveStage(s: Dataset, o: Opportunity, to: OpportunityStage, actorId: string): Dataset {
    const quotes = s.quotes.filter((q) => q.opportunityId === o.id)
    const check = checkStageMove(o, to, quotes)
    if (!check.ok) throw new Error(check.message)
    const next = { ...o, stage: to, stageEnteredOffset: 0 }
    return {
      ...s,
      opportunities: s.opportunities.map((x) => (x.id === o.id ? next : x)),
      activities: [
        ...s.activities,
        activity(s, { accountId: o.accountId, type: 'system', subject: `Stage changed from ${o.stage} to ${to}`, body: null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } }),
      ],
    }
  }

  return {
    getState: () => state,
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    reset(next: Dataset) {
      commit(next)
    },

    /** US-LEA-007: no target → new Prospect Account; Client target → Cross-sell; otherwise New business. */
    qualifyLead({ leadId, targetAccountId, actorId }: { leadId: string; targetAccountId: string | null; actorId: string }) {
      const s = state
      const lead = must(s.leads.find((l) => l.id === leadId), 'Lead')
      if (lead.status === 'Qualified' || lead.status === 'Disqualified') throw new Error('This Lead is already closed.')
      const producerId = lead.assigneeId ?? actorId
      let accounts = s.accounts
      let account: Account
      if (targetAccountId) {
        account = must(s.accounts.find((a) => a.id === targetAccountId), 'Account')
      } else {
        const managers = s.users.filter((u) => u.role === 'account-manager' && u.officeId === lead.officeId)
        // The Producer's usual Account Manager in this Office: the one they share the most Accounts with.
        const shared = new Map<string, number>()
        for (const a of s.accounts) if (a.producerId === producerId && a.officeId === lead.officeId) shared.set(a.accountManagerId, (shared.get(a.accountManagerId) ?? 0) + 1)
        const am = [...shared.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? managers[0]?.id ?? actorId
        const last = lead.name.trim().split(/\s+/).pop()
        account = {
          id: seq('acc-', s.accounts),
          name: lead.kind === 'Business' && lead.businessName ? lead.businessName : `${last} Household`,
          kind: lead.kind,
          status: 'Prospect',
          officeId: lead.officeId,
          producerId,
          accountManagerId: am,
          state: lead.state,
          city: lead.city,
          zip: '',
          coastal: false,
          primaryContactId: null,
          linkedAccountIds: [],
          createdOffset: 0,
          lastActivityOffset: 0,
          lifecycle: 'active',
        }
        accounts = [...accounts, account]
      }
      const opp: Opportunity = {
        id: seq('opp-', s.opportunities),
        accountId: account.id,
        type: account.status === 'Client' ? 'Cross-sell' : 'New business',
        // US-LEA-007: a Lead already contacted starts its Opportunity at Contacted.
        stage: lead.status === 'Contacted' ? 'Contacted' : 'New',
        stageEnteredOffset: 0,
        lines: lead.linesOfInterest,
        ownerId: producerId,
        estimatedPremium: 0,
        targetCloseOffset: 30,
        source: lead.source,
        lostReason: null,
        renewalId: null,
        leadId: lead.id,
        createdOffset: 0,
        closedOffset: null,
      }
      const withActs = { ...s, accounts }
      const acts: Activity[] = []
      for (const at of lead.attempts) {
        acts.push(activity({ ...withActs, activities: [...s.activities, ...acts] }, { accountId: account.id, type: at.channel === 'Call' ? 'call' : at.channel === 'Email' ? 'email' : 'sms', subject: `${at.channel} with ${lead.name}: ${at.outcome}`, body: null, occurredOffset: at.offset, createdById: producerId, linked: { kind: 'lead', id: lead.id } }))
      }
      acts.push(activity({ ...withActs, activities: [...s.activities, ...acts] }, { accountId: account.id, type: 'system', subject: `${userName(actorId)} qualified Lead ${lead.name} into ${opp.type} Opportunity`, body: null, createdById: actorId, linked: { kind: 'opportunity', id: opp.id } }))
      commit({
        ...s,
        accounts,
        opportunities: [...s.opportunities, opp],
        leads: s.leads.map((l) => (l.id === lead.id ? { ...l, status: 'Qualified', qualifiedAccountId: account.id, qualifiedOpportunityId: opp.id } : l)),
        activities: [...s.activities, ...acts],
      })
      return { accountId: account.id, opportunityId: opp.id }
    },

    // ---------- Accounts & Contacts (ACC P1) ----------

    /** US-ACC-002: a new Account starts as Prospect with its primary Contact. */
    createAccount(
      input: { kind: Account['kind']; name: string; officeId: string; producerId: string; accountManagerId: string; street: string; city: string; state: Account['state']; zip: string; contact: { firstName: string; lastName: string; phone: string; email: string }; business?: Partial<AccountDetails> },
      actorId: string,
    ) {
      const s = state
      const id = seq('acc-', s.accounts)
      const contactId = seq('con-', s.contacts)
      const relationship = input.kind === 'Business' ? 'Owner' : 'Primary'
      const contact: Contact = { id: contactId, name: `${input.contact.firstName} ${input.contact.lastName}`.trim(), firstName: input.contact.firstName, lastName: input.contact.lastName, email: input.contact.email, phone: input.contact.phone, accountIds: [id], relationships: { [id]: relationship }, smsConsent: { state: 'Unknown', offset: null }, preferredContact: 'Phone' }
      const account: Account = {
        id, name: input.name.trim(), kind: input.kind, status: 'Prospect', officeId: input.officeId, producerId: input.producerId, accountManagerId: input.accountManagerId,
        state: input.state, city: input.city, zip: input.zip, coastal: false, primaryContactId: contactId, linkedAccountIds: [], createdOffset: 0, lastActivityOffset: 0, lifecycle: 'active',
        details: { street: input.street, county: '', preferredContact: 'Phone', source: 'Created in Fortify', ...input.business },
      }
      commit({ ...s, accounts: [...s.accounts, account], contacts: [...s.contacts, contact], activities: [...s.activities, activity(s, { accountId: id, type: 'system', subject: `Account created by ${userName(actorId)}`, body: null, createdById: actorId, linked: null })] })
      return id
    },

    /** US-ACC-007: Fortify-owned fields only; owners, status, and kind never change here. */
    updateAccount(id: string, patch: Partial<AccountDetails> & { name?: string; city?: string; zip?: string }, actorId: string) {
      const s = state
      const a = must(s.accounts.find((x) => x.id === id), 'Account')
      if (a.lifecycle !== 'active') throw new Error('Archived accounts are read-only.')
      const { name, city, zip, ...details } = patch
      const next: Account = { ...a, name: name?.trim() || a.name, city: city ?? a.city, zip: zip ?? a.zip, details: { ...(a.details ?? { street: '', county: '', preferredContact: 'Phone', source: '' }), ...details } }
      const addressChanged = (patch.street !== undefined && patch.street !== a.details?.street) || (city !== undefined && city !== a.city) || (zip !== undefined && zip !== a.zip)
      const subject = addressChanged ? `Mailing address changed by ${userName(actorId)}` : `Account details updated by ${userName(actorId)}`
      commit({ ...s, accounts: s.accounts.map((x) => (x.id === id ? next : x)), activities: [...s.activities, activity(s, { accountId: id, type: 'system', subject, body: null, createdById: actorId, linked: null })] })
    },

    /** US-ACC-013: create (id null, linked to an Account) or edit a Contact everywhere it appears. */
    saveContact(
      id: string | null,
      input: { firstName: string; lastName: string; phone: string; email: string; suffix?: string | null; workPhone?: string | null; dobOffset?: number | null; preferredContact?: Contact['preferredContact']; smsConsent?: SmsConsent; street?: string | null },
      link: { accountId: string; relationship: string } | null,
      actorId: string,
    ) {
      const s = state
      if (!input.firstName.trim() || !input.lastName.trim()) throw new Error('Enter a first and last name.')
      if (!input.phone.trim() && !input.email.trim()) throw new Error('Add a phone or email so the agency can reach them.')
      const name = `${input.firstName.trim()} ${input.lastName.trim()}${input.suffix ? ` ${input.suffix}` : ''}`
      const prev = id ? must(s.contacts.find((c) => c.id === id), 'Contact') : null
      const consentState = input.smsConsent ?? prev?.smsConsent?.state ?? 'Unknown'
      const consent = { state: consentState, offset: consentState !== (prev?.smsConsent?.state ?? 'Unknown') ? 0 : (prev?.smsConsent?.offset ?? null) }
      if (!prev) {
        if (!link) throw new Error('A new contact needs an account.')
        const c: Contact = { id: seq('con-', s.contacts), name, firstName: input.firstName.trim(), lastName: input.lastName.trim(), suffix: input.suffix ?? null, email: input.email.trim(), phone: input.phone.trim(), workPhone: input.workPhone ?? null, dobOffset: input.dobOffset ?? null, preferredContact: input.preferredContact ?? 'Phone', smsConsent: consent, street: input.street ?? null, accountIds: [link.accountId], relationships: { [link.accountId]: link.relationship } }
        commit({ ...s, contacts: [...s.contacts, c], activities: [...s.activities, activity(s, { accountId: link.accountId, type: 'system', subject: `${name} added as ${link.relationship} by ${userName(actorId)}`, body: null, createdById: actorId, linked: null })] })
        return c.id
      }
      const next: Contact = { ...prev, ...input, name, firstName: input.firstName.trim(), lastName: input.lastName.trim(), smsConsent: consent }
      const acts: Activity[] = []
      for (const accountId of prev.accountIds) acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId, type: 'system', subject: `Contact details updated: ${name}`, body: null, createdById: actorId, linked: null }))
      commit({ ...s, contacts: s.contacts.map((c) => (c.id === prev.id ? next : c)), activities: [...s.activities, ...acts] })
      return prev.id
    },

    linkContact(contactId: string, accountId: string, relationship: string, actorId: string) {
      const s = state
      const c = must(s.contacts.find((x) => x.id === contactId), 'Contact')
      if (c.accountIds.includes(accountId)) throw new Error(`${c.name} is already on this account.`)
      const a = must(s.accounts.find((x) => x.id === accountId), 'Account')
      commit({
        ...s,
        contacts: s.contacts.map((x) => (x.id === contactId ? { ...x, accountIds: [...x.accountIds, accountId], relationships: { ...x.relationships, [accountId]: relationship } } : x)),
        accounts: s.accounts.map((x) => (x.id === accountId && !x.primaryContactId ? { ...x, primaryContactId: contactId } : x)),
        activities: [...s.activities, activity(s, { accountId, type: 'system', subject: `${c.name} linked to ${a.name} as ${relationship} by ${userName(actorId)}`, body: null, createdById: actorId, linked: null })],
      })
    },

    /** US-ACC-010: the Contact record is never deleted; it must stay on at least one Account. */
    unlinkContact(contactId: string, accountId: string, actorId: string) {
      const s = state
      const c = must(s.contacts.find((x) => x.id === contactId), 'Contact')
      const a = must(s.accounts.find((x) => x.id === accountId), 'Account')
      if (c.accountIds.length <= 1) throw new Error(`${c.name} is on no other account. Every contact must belong to at least one account.`)
      const others = s.contacts.filter((x) => x.id !== contactId && x.accountIds.includes(accountId))
      if (a.primaryContactId === contactId && others.length) throw new Error('Choose a new primary contact first.')
      const relationships = { ...c.relationships }
      delete relationships[accountId]
      commit({
        ...s,
        contacts: s.contacts.map((x) => (x.id === contactId ? { ...x, accountIds: x.accountIds.filter((id) => id !== accountId), relationships } : x)),
        accounts: s.accounts.map((x) => (x.id === accountId && x.primaryContactId === contactId ? { ...x, primaryContactId: null } : x)),
        activities: [...s.activities, activity(s, { accountId, type: 'system', subject: `${c.name} removed from ${a.name} by ${userName(actorId)}`, body: null, createdById: actorId, linked: null })],
      })
    },

    makePrimary(accountId: string, contactId: string, actorId: string) {
      const s = state
      const c = must(s.contacts.find((x) => x.id === contactId && x.accountIds.includes(accountId)), 'Contact')
      commit({ ...s, accounts: s.accounts.map((x) => (x.id === accountId ? { ...x, primaryContactId: contactId } : x)), activities: [...s.activities, activity(s, { accountId, type: 'system', subject: `${c.name} made primary contact by ${userName(actorId)}`, body: null, createdById: actorId, linked: null })] })
    },

    /**
     * US-ACC-015/016: reassign one or many Accounts. Open work (Opportunities and Tasks for the Producer; Renewals,
     * Service Requests and Tasks for the Account Manager) follows the new owner unless moveOpenWork is false.
     */
    reassignAccounts(ids: string[], change: { producerId?: string; accountManagerId?: string; moveOpenWork: boolean }, actorId: string) {
      const s = state
      const set = new Set(ids)
      let changed = 0
      let skipped = 0
      const moveP = new Map<string, string>()
      const moveM = new Map<string, string>()
      const acts: Activity[] = []
      const accounts = s.accounts.map((a) => {
        if (!set.has(a.id)) return a
        const p = change.producerId && change.producerId !== a.producerId ? change.producerId : null
        const m = change.accountManagerId && change.accountManagerId !== a.accountManagerId ? change.accountManagerId : null
        if (!p && !m) {
          skipped++
          return a
        }
        changed++
        const by = userName(actorId)
        if (p) {
          moveP.set(a.id, a.producerId)
          acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId: a.id, type: 'system', subject: `Producer changed from ${userName(a.producerId)} to ${userName(p)} by ${by}`, body: null, createdById: actorId, linked: null }))
        }
        if (m) {
          moveM.set(a.id, a.accountManagerId)
          acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId: a.id, type: 'system', subject: `Account Manager changed from ${userName(a.accountManagerId)} to ${userName(m)} by ${by}`, body: null, createdById: actorId, linked: null }))
        }
        return { ...a, producerId: p ?? a.producerId, accountManagerId: m ?? a.accountManagerId }
      })
      const open = (stage: string) => stage !== 'Won' && stage !== 'Lost'
      commit({
        ...s,
        accounts,
        opportunities: change.moveOpenWork ? s.opportunities.map((o) => (moveP.get(o.accountId) === o.ownerId && open(o.stage) ? { ...o, ownerId: change.producerId! } : o)) : s.opportunities,
        renewals: change.moveOpenWork ? s.renewals.map((r) => (moveM.get(r.accountId) === r.ownerId && r.status !== 'Done' ? { ...r, ownerId: change.accountManagerId! } : r)) : s.renewals,
        serviceRequests: change.moveOpenWork ? s.serviceRequests.map((r) => (moveM.get(r.accountId) === r.ownerId && r.status !== 'Done' ? { ...r, ownerId: change.accountManagerId! } : r)) : s.serviceRequests,
        tasks: change.moveOpenWork
          ? s.tasks.map((t) => (t.status !== 'Open' ? t : moveP.get(t.accountId) === t.assigneeId ? { ...t, assigneeId: change.producerId! } : moveM.get(t.accountId) === t.assigneeId ? { ...t, assigneeId: change.accountManagerId! } : t))
          : s.tasks,
        activities: [...s.activities, ...acts],
      })
      return { changed, skipped }
    },

    /** US-ACC-017: blocked with active policies, open Opportunities, or open Service Requests; open Tasks are canceled. */
    archiveAccount(id: string, reason: string, actorId: string) {
      const s = state
      const a = must(s.accounts.find((x) => x.id === id), 'Account')
      const block = archiveBlock(s, a)
      if (block) throw new Error(block)
      commit({
        ...s,
        accounts: s.accounts.map((x) => (x.id === id ? { ...x, lifecycle: 'archived', archived: { offset: 0, byId: actorId, reason, prevStatus: x.status } } : x)),
        tasks: s.tasks.map((t) => (t.accountId === id && t.status === 'Open' ? { ...t, status: 'Canceled', closeNote: 'Account archived' } : t)),
        activities: [...s.activities, activity(s, { accountId: id, type: 'system', subject: `Archived by ${userName(actorId)}: ${reason}`, body: null, createdById: actorId, linked: null })],
      })
    },

    restoreAccount(id: string, actorId: string) {
      const s = state
      const a = must(s.accounts.find((x) => x.id === id), 'Account')
      if (a.lifecycle !== 'archived') throw new Error('This account is not archived.')
      commit({
        ...s,
        accounts: s.accounts.map((x) => (x.id === id ? { ...x, lifecycle: 'active', status: x.archived?.prevStatus ?? x.status, archived: undefined } : x)),
        activities: [...s.activities, activity(s, { accountId: id, type: 'system', subject: `Restored by ${userName(actorId)}`, body: null, createdById: actorId, linked: null })],
      })
    },

    /** US-ACC-018: Fortify-owned records move to the survivor; the duplicate becomes Merged and points at it. */
    mergeAccounts(survivorId: string, duplicateId: string, fields: Partial<AccountDetails> & { name?: string }, actorId: string) {
      const s = state
      const keep = must(s.accounts.find((x) => x.id === survivorId), 'Account')
      const dup = must(s.accounts.find((x) => x.id === duplicateId), 'Account')
      if (keep.id === dup.id) throw new Error('Pick a different account.')
      if (keep.kind !== dup.kind) throw new Error('Only accounts of the same kind can be merged.')
      const live = (accId: string) => s.policies.some((p) => p.accountId === accId && s.terms.some((t) => t.policyId === p.id && (t.status === 'Active' || t.status === 'Bound')))
      if (live(keep.id) && live(dup.id)) throw new Error('Both accounts have active policies. Merge the records in the AMS first; Fortify will follow the next sync.')
      const move = <T extends { accountId: string }>(xs: T[]) => xs.map((x) => (x.accountId === dup.id ? { ...x, accountId: keep.id } : x))
      let movedContacts = 0
      const contacts = s.contacts.map((c) => {
        if (!c.accountIds.includes(dup.id)) return c
        const rel = { ...c.relationships }
        const r = rel[dup.id]
        delete rel[dup.id]
        if (!c.accountIds.includes(keep.id)) {
          movedContacts++
          rel[keep.id] = r ?? 'Other'
        }
        return { ...c, accountIds: [...new Set(c.accountIds.map((id) => (id === dup.id ? keep.id : id)))], relationships: rel }
      })
      const movedActs = s.activities.filter((x) => x.accountId === dup.id).length
      const movedOpps = s.opportunities.filter((x) => x.accountId === dup.id).length
      const { name, ...details } = fields
      const next = {
        ...s,
        accounts: s.accounts.map((x) => (x.id === keep.id ? { ...x, name: name ?? x.name, details: { ...x.details!, ...details } } : x.id === dup.id ? { ...x, lifecycle: 'merged' as const, mergedIntoId: keep.id } : x)),
        contacts,
        opportunities: move(s.opportunities),
        xDates: move(s.xDates),
        serviceRequests: move(s.serviceRequests),
        activities: move(s.activities),
        tasks: move(s.tasks),
        documents: (s.documents ?? []).map((d) => (d.accountId === dup.id && d.source === 'Uploaded' ? { ...d, accountId: keep.id } : d)),
      }
      const summary = `Merged ${dup.name} into this account by ${userName(actorId)} · ${movedContacts} contacts, ${movedActs} activities, ${movedOpps} opportunit${movedOpps === 1 ? 'y' : 'ies'} moved`
      commit({ ...next, activities: [...next.activities, activity(next, { accountId: keep.id, type: 'system', subject: summary, body: null, createdById: actorId, linked: null })] })
    },

    /** US-ACC-009: uploads are mock files; nothing is ever deleted. */
    addDocuments(accountId: string, files: { name: string; size: number }[], type: DocumentType, linked: AccountDocument['linked'], actorId: string) {
      const s = state
      const docs = s.documents ?? []
      const added: AccountDocument[] = []
      for (const f of files) {
        if (f.size > 25 * 1024 * 1024) throw new Error(`${f.name} is over 25 MB.`)
        added.push({ id: seq('doc-', [...docs, ...added]), accountId, name: f.name, type, source: 'Uploaded', linked, addedById: actorId, addedOffset: 0, size: f.size })
      }
      commit({ ...s, documents: [...added, ...docs], activities: [...s.activities, activity(s, { accountId, type: 'system', subject: `Uploaded ${files.length} document${files.length === 1 ? '' : 's'}`, body: null, createdById: actorId, linked: null })] })
    },

    updateDocument(id: string, patch: Partial<Pick<AccountDocument, 'name' | 'type' | 'linked'>>) {
      const s = state
      const d = must((s.documents ?? []).find((x) => x.id === id), 'Document')
      if (d.source === 'AMS') throw new Error('AMS documents are read-only.')
      commit({ ...s, documents: s.documents!.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
    },

    /**
     * US-WRK-006: complete an open Task. With log:false the Activity waits for logTaskCompletion (called when the
     * Undo window closes), so undoing never has to remove an Activity.
     */
    completeTask(id: string, actorId: string, opts: { note?: string; outcome?: string; log?: boolean } = {}) {
      const s = state
      const t = must(s.tasks.find((x) => x.id === id), 'Task')
      if (t.status !== 'Open') throw new Error('This task is already closed.')
      commit({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, status: 'Done', doneOffset: 0, closeNote: opts.note ?? null, outcome: opts.outcome } : x)) })
      if (opts.log !== false) this.logTaskCompletion(id, actorId)
    },
    logTaskCompletion(id: string, actorId: string) {
      const s = state
      const t = must(s.tasks.find((x) => x.id === id), 'Task')
      if (t.status !== 'Done') return
      const primary = s.contacts.find((c) => c.id === s.accounts.find((a) => a.id === t.accountId)?.primaryContactId)
      const who = (t.contactIds?.length ? s.contacts.filter((c) => t.contactIds!.includes(c.id)).map((c) => c.name).join(', ') : primary?.name) ?? 'the client'
      const outcome = t.outcome
      const [type, subject] =
        t.type === 'Call' ? (['call', `Call with ${who}${outcome ? ` · ${outcome}` : ''}`] as const)
        : t.type === 'Email' ? (['email', `Email sent: ${t.title}`] as const)
        : t.type === 'Meeting' ? (['meeting', `Meeting: ${t.title}${t.durationMin ? ` · ${t.durationMin} min` : ''}${t.contactIds?.length ? ` · with ${who}` : ''}`] as const)
        : (['system', `Completed task: ${t.title}`] as const)
      commit({ ...s, activities: [...s.activities, activity(s, { accountId: t.accountId, type, subject, body: t.closeNote ?? null, createdById: actorId, linked: t.linked })] })
    },
    reopenTask(id: string) {
      const s = state
      commit({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, status: 'Open', closeNote: null, doneOffset: null } : x)) })
    },
    cancelTask(id: string, reason: string, actorId: string) {
      const s = state
      const t = must(s.tasks.find((x) => x.id === id), 'Task')
      if (t.status !== 'Open') throw new Error('This task is already closed.')
      commit({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, status: 'Canceled', closeNote: reason, doneOffset: 0 } : x)), activities: [...s.activities, activity(s, { accountId: t.accountId, type: 'system', subject: `Task canceled: ${t.title} (${reason})`, body: null, createdById: actorId, linked: t.linked })] })
    },

    /** US-LEA-002: add (id null) or edit a New/Contacted Lead. */
    saveLead(
      id: string | null,
      input: { kind: Lead['kind']; firstName: string; lastName: string; businessName: string | null; phone: string; email: string; street: string; city: string; state: Lead['state']; zip: string; linesOfInterest: Line[]; currentCarrier: string | null; currentPremium: number | null; xDateOffset: number | null; source: Lead['source']; sourceDetail: string | null; notes: string | null; officeId: string; assigneeId: string | null },
      actorId: string,
    ) {
      const s = state
      if (input.kind === 'Household' ? !input.lastName.trim() : !input.businessName?.trim()) throw new Error(input.kind === 'Household' ? 'Add a last name.' : 'Add the business name.')
      if (!input.phone.trim() && !input.email.trim()) throw new Error('Add a phone number or an email.')
      if (!input.linesOfInterest.length) throw new Error('Choose at least one line of interest.')
      const { firstName, lastName, ...rest } = input
      const fields = { ...rest, name: `${firstName.trim()} ${lastName.trim()}`.trim() || input.businessName!.trim() }
      if (id === null) {
        const l: Lead = { ...fields, id: seq('lea-', s.leads), status: 'New', disqualifyReason: null, createdOffset: 0, attempts: [], qualifiedAccountId: null, qualifiedOpportunityId: null, events: [{ offset: 0, text: `Added by ${userName(actorId)}`, byId: actorId }] }
        commit({ ...s, leads: [l, ...s.leads] })
        return l.id
      }
      const prev = must(s.leads.find((l) => l.id === id), 'Lead')
      if (prev.status !== 'New' && prev.status !== 'Contacted') throw new Error('Closed leads are read-only.')
      commit({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, ...fields, events: [...(l.events ?? []), { offset: 0, text: `Details edited by ${userName(actorId)}`, byId: actorId }] } : l)) })
      return id
    },

    /** US-LEA-005: the first attempt moves a New Lead to Contacted. */
    logAttempt(id: string, a: { channel: 'Call' | 'Email' | 'SMS'; outcome: string; note: string | null; followUpOffset: number | null }, actorId: string) {
      const s = state
      const l = must(s.leads.find((x) => x.id === id), 'Lead')
      if (l.status !== 'New' && l.status !== 'Contacted') throw new Error('This lead is closed.')
      if (a.channel === 'SMS' && !l.smsConsent) throw new Error('No SMS consent recorded for this lead.')
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      commit({ ...s, leads: s.leads.map((x) => (x.id === id ? { ...x, status: 'Contacted', followUpOffset: a.followUpOffset, attempts: [{ offset: 0, channel: a.channel, outcome: a.outcome, note: a.note, byId: actorId, time }, ...x.attempts] } : x)) })
    },

    /**
     * US-LEA-008: one reason (Other needs a 10+ character note). Duplicate merges attempts into the survivor;
     * Bought elsewhere can save an X-date on a matched or new Prospect Account. Nothing is deleted.
     */
    disqualifyLead(id: string, d: { reason: string; note: string | null; survivorId?: string; saveXDate?: { line: Line; carrier: string; offset: number; accountId?: string | null } }, actorId: string) {
      const s = state
      const l = must(s.leads.find((x) => x.id === id), 'Lead')
      if (l.status !== 'New' && l.status !== 'Contacted') throw new Error('This lead is already closed.')
      if (d.reason === 'Other' && (d.note ?? '').trim().length < 10) throw new Error('Describe the reason in at least 10 characters.')
      const code = (x: string) => `L-${1000 + Number(x.replace(/\D/g, ''))}`
      let leads = s.leads.map((x) => (x.id === id ? { ...x, status: 'Disqualified' as const, disqualifyReason: d.reason, disqualifyNote: d.note, disqualifiedOffset: 0, disqualifiedById: actorId, events: [...(x.events ?? []), { offset: 0, text: `Disqualified by ${userName(actorId)}: ${d.reason}`, byId: actorId }] } : x))
      if (d.reason === 'Duplicate lead') {
        const sv = must(s.leads.find((x) => x.id === d.survivorId), 'Surviving lead')
        leads = leads.map((x) => (x.id === sv.id ? { ...x, attempts: [...x.attempts, ...l.attempts].sort((a, b) => b.offset - a.offset), events: [...(x.events ?? []), { offset: 0, text: `Duplicate ${code(l.id)} merged into this lead’s history`, byId: actorId }] } : x))
      }
      let accounts = s.accounts
      let xDates = s.xDates
      if (d.reason === 'Bought elsewhere' && d.saveXDate) {
        let accountId = d.saveXDate.accountId ?? null
        if (!accountId) {
          accountId = seq('acc-', s.accounts)
          const managers = s.users.filter((u) => u.role === 'account-manager' && u.officeId === l.officeId)
          accounts = [...accounts, { id: accountId, name: l.kind === 'Business' && l.businessName ? l.businessName : `${l.name.trim().split(/\s+/).pop()} Household`, kind: l.kind, status: 'Prospect', officeId: l.officeId, producerId: l.assigneeId ?? actorId, accountManagerId: managers[0]?.id ?? actorId, state: l.state, city: l.city, zip: l.zip ?? '', coastal: false, primaryContactId: null, linkedAccountIds: [], createdOffset: 0, lastActivityOffset: 0, lifecycle: 'active', details: { street: l.street ?? '', county: '', preferredContact: 'Phone', source: l.source } }]
        }
        xDates = [...xDates, { id: seq('xdt-', s.xDates), accountId, line: d.saveXDate.line, currentCarrier: d.saveXDate.carrier, xDateOffset: d.saveXDate.offset, premium: l.currentPremium ?? null, interestLevel: 'Medium' }]
        leads = leads.map((x) => (x.id === id ? { ...x, qualifiedAccountId: accountId } : x))
      }
      commit({ ...s, leads, accounts, xDates })
    },

    /** US-FND-019 bulk Reassign: open Leads only; returns how many changed. */
    assignLeads(ids: string[], assigneeId: string, _actorId: string) {
      const s = state
      const set = new Set(ids)
      let n = 0
      const leads = s.leads.map((l) => {
        if (!set.has(l.id) || l.status === 'Qualified' || l.status === 'Disqualified' || l.assigneeId === assigneeId) return l
        n++
        return { ...l, assigneeId, events: [...(l.events ?? []), { offset: 0, text: `Assigned to ${userName(assigneeId)} by ${userName(_actorId)}`, byId: _actorId }] }
      })
      commit({ ...s, leads })
      return n
    },

    /** US-PIP-003: create (id null) or edit an open Opportunity. */
    saveOpportunity(
      id: string | null,
      input: Pick<Opportunity, 'accountId' | 'type' | 'lines' | 'targetCloseOffset' | 'estimatedPremium' | 'ownerId' | 'source'> & { probability: number; name: string | null; notes: string | null; lineDetails: NonNullable<Opportunity['lineDetails']> },
      actorId: string,
    ) {
      const s = state
      if (input.lines.length === 0) throw new Error('Add at least one line')
      const account = must(s.accounts.find((a) => a.id === input.accountId), 'Account')
      const name = input.name?.trim() || `${account.name} · ${input.lines.join(', ')}`
      const fields = { ...input, name, estimatedPremium: Math.max(0, Math.min(9_999_999, input.estimatedPremium)) }
      if (id === null) {
        if (input.type === 'Remarket') throw new Error('Remarket Opportunities start from a Renewal.')
        const opp: Opportunity = { ...fields, id: seq('opp-', s.opportunities), stage: 'New', stageEnteredOffset: 0, lostReason: null, renewalId: null, leadId: null, createdOffset: 0, closedOffset: null }
        const subject = `${userName(actorId)} added a ${opp.type} opportunity on ${account.name}: ${opp.lines.join(', ')}`
        commit({ ...s, opportunities: [...s.opportunities, opp], activities: [...s.activities, activity(s, { accountId: account.id, type: 'system', subject, body: null, createdById: actorId, linked: { kind: 'opportunity', id: opp.id } })] })
        return opp.id
      }
      const prev = must(s.opportunities.find((o) => o.id === id), 'Opportunity')
      if (prev.stage === 'Won' || prev.stage === 'Lost') throw new Error('This Opportunity is closed.')
      const acts =
        prev.ownerId !== input.ownerId
          ? [activity(s, { accountId: prev.accountId, type: 'system', subject: `Producer changed from ${userName(prev.ownerId)} to ${userName(input.ownerId)}`, body: null, createdById: actorId, linked: { kind: 'opportunity', id } })]
          : []
      commit({ ...s, opportunities: s.opportunities.map((o) => (o.id === id ? { ...o, ...fields, type: prev.type === 'Remarket' ? 'Remarket' : fields.type } : o)), activities: [...s.activities, ...acts] })
      return id
    },

    moveStage(opportunityId: string, to: OpportunityStage, actorId: string) {
      commit(moveStage(state, must(state.opportunities.find((o) => o.id === opportunityId), 'Opportunity'), to, actorId))
    },

    /** US-PIP-006: the first Quote moves an early-stage Opportunity to Quoting. */
    addQuote(opportunityId: string, input: { carrierId: string; lines: Line[]; warnings?: Quote['warnings'] }, actorId: string) {
      let s = state
      const o = must(s.opportunities.find((x) => x.id === opportunityId), 'Opportunity')
      const q: Quote = {
        id: seq('quo-', s.quotes),
        opportunityId,
        carrierId: input.carrierId,
        status: 'Requested',
        lines: input.lines.map((line) => ({ line, premium: null, accepted: false })),
        fees: 0,
        declineReason: null,
        warnings: input.warnings ?? [],
        requestedOffset: 0,
        validUntilOffset: null,
        presentedOffset: null,
      }
      s = { ...s, quotes: [...s.quotes, q] }
      if (['New', 'Contacted', 'Gathering info'].includes(o.stage)) s = moveStage(s, o, 'Quoting', actorId)
      commit(s)
      return q.id
    },

    recordQuoteResponse(quoteId: string, r: { status: QuoteStatus; premiums?: Partial<Record<Line, number>>; fees?: number; declineReason?: string }, actorId: string) {
      const s = state
      const q = must(s.quotes.find((x) => x.id === quoteId), 'Quote')
      if (!canQuoteTransition(q.status, r.status)) throw new Error(`A ${q.status} Quote cannot become ${r.status}.`)
      const next: Quote = {
        ...q,
        status: r.status,
        lines: q.lines.map((l) => ({ ...l, premium: r.premiums?.[l.line] ?? l.premium })),
        fees: r.fees ?? q.fees,
        declineReason: r.declineReason ?? q.declineReason,
        validUntilOffset: r.status === 'Quoted' ? 30 : q.validUntilOffset,
      }
      const o = s.opportunities.find((x) => x.id === q.opportunityId)!
      commit({
        ...s,
        quotes: s.quotes.map((x) => (x.id === quoteId ? next : x)),
        activities: [...s.activities, activity(s, { accountId: o.accountId, type: 'system', subject: `${s.carriers.find((c) => c.id === q.carrierId)?.name} responded: ${r.status}`, body: null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } })],
      })
    },

    /** US-PIP-008: marking Presented also moves the Opportunity to Proposed. */
    markPresented(quoteIds: string[], actorId: string) {
      let s = state
      const quotes = s.quotes.map((q) => (quoteIds.includes(q.id) && canQuoteTransition(q.status, 'Presented') ? { ...q, status: 'Presented' as const, presentedOffset: 0 } : q))
      s = { ...s, quotes }
      const o = s.opportunities.find((x) => x.id === s.quotes.find((q) => q.id === quoteIds[0])?.opportunityId)
      if (o && o.stage !== 'Proposed' && o.stage !== 'Won' && o.stage !== 'Lost') s = moveStage(s, o, 'Proposed', actorId)
      commit(s)
    },

    /** US-PIP-009: choose one Quote per line, or none. */
    acceptLines(opportunityId: string, choice: Partial<Record<Line, string | null>>) {
      const s = state
      commit({
        ...s,
        quotes: s.quotes.map((q) =>
          q.opportunityId !== opportunityId ? q : { ...q, lines: q.lines.map((l) => (l.line in choice ? { ...l, accepted: choice[l.line] === q.id } : l)) },
        ),
      })
    },

    /** US-PIP-010: one transaction creates Bound Terms, closes Quotes, and makes the Account a Client. */
    markWon(
      opportunityId: string,
      input: { lines: { line: Line; quoteId: string; boundPremium: number; effectiveDate: Date; termMonths: number; binderNumber: string }[] },
      actorId: string,
    ) {
      const s = state
      const o = must(s.opportunities.find((x) => x.id === opportunityId), 'Opportunity')
      if (o.stage === 'Won' || o.stage === 'Lost') throw new Error('This Opportunity is closed.')
      if (!input.lines.length) throw new Error('Accept at least one Quote line before marking Won.')
      let policies = s.policies
      let terms = s.terms
      for (const l of input.lines) {
        const q = must(s.quotes.find((x) => x.id === l.quoteId), 'Quote')
        const policyId = seq('pol-', policies)
        policies = [...policies, { id: policyId, accountId: o.accountId, carrierId: q.carrierId, line: l.line, policyNumber: `Binder ${l.binderNumber}` }]
        const eff = offsetOf(l.effectiveDate)
        terms = [
          ...terms,
          {
            id: seq('trm-', terms),
            policyId,
            effectiveOffset: eff,
            expirationOffset: offsetOf(addMonths(l.effectiveDate, l.termMonths)),
            premium: l.boundPremium,
            status: 'Bound',
            pendingCancellation: false,
            source: 'fortify-won',
            binderNumber: l.binderNumber,
            binderExpiresOffset: eff + 30,
          },
        ]
      }
      const acceptedIds = new Set(input.lines.map((l) => l.quoteId))
      const quotes = s.quotes.map((q) => {
        if (q.opportunityId !== o.id) return q
        if (acceptedIds.has(q.id)) return { ...q, status: 'Accepted' as const }
        return ['Requested', 'Quoted', 'Referred', 'Presented'].includes(q.status) ? { ...q, status: 'Not taken' as const } : q
      })
      commit({
        ...s,
        policies,
        terms,
        quotes,
        opportunities: s.opportunities.map((x) => (x.id === o.id ? { ...x, stage: 'Won', stageEnteredOffset: 0, closedOffset: 0 } : x)),
        accounts: s.accounts.map((a) => (a.id === o.accountId ? { ...a, status: 'Client', lastActivityOffset: 0 } : a)),
        activities: [
          ...s.activities,
          activity(s, { accountId: o.accountId, type: 'system', subject: `${userName(actorId)} marked the Opportunity Won: ${input.lines.map((l) => l.line).join(', ')} bound`, body: null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } }),
        ],
      })
    },

    /**
     * US-PIP-011: a reason is required (Other needs a note). Acceptance is cleared, every live Quote becomes Not taken,
     * and the chosen X-dates are created.
     */
    markLost(opportunityId: string, reason: string, actorId: string, opts: { note?: string; xDates?: { line: Line; carrier: string; premium: number | null; offset: number }[] } = {}) {
      const s = state
      const o = must(s.opportunities.find((x) => x.id === opportunityId), 'Opportunity')
      if (o.stage === 'Won' || o.stage === 'Lost') throw new Error('This Opportunity is closed.')
      if (reason === 'Other' && !opts.note?.trim()) throw new Error('Add a note for Other.')
      const xd = reason === 'Duplicate' ? [] : (opts.xDates ?? [])
      let xDates = s.xDates
      for (const x of xd) xDates = [...xDates, { id: seq('xdt-', xDates), accountId: o.accountId, line: x.line, currentCarrier: x.carrier, xDateOffset: x.offset, premium: x.premium, interestLevel: 'Medium' as const }]
      commit({
        ...s,
        xDates,
        opportunities: s.opportunities.map((x) => (x.id === o.id ? { ...x, stage: 'Lost', lostReason: reason, notes: opts.note ?? x.notes, stageEnteredOffset: 0, closedOffset: 0 } : x)),
        quotes: s.quotes.map((q) => (q.opportunityId === o.id && ['Requested', 'Quoted', 'Referred', 'Presented', 'Accepted'].includes(q.status) ? { ...q, status: 'Not taken', lines: q.lines.map((l) => ({ ...l, accepted: false })) } : q)),
        activities: [...s.activities, activity(s, { accountId: o.accountId, type: 'system', subject: `Opportunity marked Lost: ${reason}${xd.length ? ` · ${xd.length} X-date${xd.length === 1 ? '' : 's'} saved` : ''}`, body: opts.note ?? null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } })],
      })
    },

    /** US-PIP-011: within 90 days of the loss; Quotes stay Not taken, X-dates are kept. */
    reopenOpportunity(opportunityId: string, actorId: string) {
      const s = state
      const o = must(s.opportunities.find((x) => x.id === opportunityId), 'Opportunity')
      if (o.stage !== 'Lost') throw new Error('Only a Lost Opportunity can be reopened.')
      if ((o.closedOffset ?? 0) < -90) throw new Error('Lost more than 90 days ago. Start a new Opportunity instead.')
      commit({
        ...s,
        opportunities: s.opportunities.map((x) => (x.id === o.id ? { ...x, stage: 'Gathering info', lostReason: null, closedOffset: null, stageEnteredOffset: 0 } : x)),
        activities: [...s.activities, activity(s, { accountId: o.accountId, type: 'system', subject: 'Opportunity reopened', body: null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } })],
      })
    },

    /** US-PIP-014: a Remarket that keeps the incumbent's renewal is Won without creating a Policy. */
    markWonWithIncumbent(opportunityId: string, actorId: string) {
      const s = state
      const o = must(s.opportunities.find((x) => x.id === opportunityId), 'Opportunity')
      if (o.type !== 'Remarket') throw new Error('Only a Remarket Opportunity can renew with the incumbent.')
      if (o.stage === 'Won' || o.stage === 'Lost') throw new Error('This Opportunity is closed.')
      commit({
        ...s,
        opportunities: s.opportunities.map((x) => (x.id === o.id ? { ...x, stage: 'Won', stageEnteredOffset: 0, closedOffset: 0, renewedWithIncumbent: true } : x)),
        quotes: s.quotes.map((q) => (q.opportunityId === o.id && ['Requested', 'Quoted', 'Referred', 'Presented'].includes(q.status) ? { ...q, status: 'Not taken' } : q)),
        activities: [...s.activities, activity(s, { accountId: o.accountId, type: 'system', subject: 'Remarket won · renewed with incumbent', body: null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } })],
      })
    },

    updateXDate(id: string, patch: Partial<Omit<Dataset['xDates'][number], 'id'>>, actorId: string) {
      const s = state
      const x = must(s.xDates.find((v) => v.id === id), 'X-date')
      commit({ ...s, xDates: s.xDates.map((v) => (v.id === id ? { ...v, ...patch } : v)), activities: [...s.activities, activity(s, { accountId: x.accountId, type: 'system', subject: `X-date updated by ${userName(actorId)}: ${patch.line ?? x.line}`, body: null, createdById: actorId, linked: null })] })
    },

    /** US-XDT: add an X-date to an Account. */
    createXDate(input: Omit<Dataset['xDates'][number], 'id'>) {
      const s = state
      const id = seq('xdt-', s.xDates)
      commit({ ...s, xDates: [...s.xDates, { ...input, id }] })
      return id
    },

    setRenewalStatus(renewalId: string, to: RenewalStatus, actorId: string, note?: string) {
      const s = state
      const r = must(s.renewals.find((x) => x.id === renewalId), 'Renewal')
      if (!nextRenewalStatuses(r.status).includes(to)) throw new Error(`A ${r.status} Renewal cannot move to ${to}.`)
      commit({
        ...s,
        renewals: s.renewals.map((x) => (x.id === r.id ? { ...x, status: to } : x)),
        activities: [...s.activities, activity(s, { accountId: r.accountId, type: 'system', subject: `${userName(actorId)} moved the Renewal to ${to}${note ? `: ${note}` : ''}`, body: null, createdById: actorId, linked: { kind: 'renewal', id: r.id } })],
      })
    },

    /** US-REN-008: the Account's Producer owns the Remarket Opportunity (rules.md). */
    startRemarket(renewalId: string, actorId: string) {
      const s = state
      const r = must(s.renewals.find((x) => x.id === renewalId), 'Renewal')
      if (!nextRenewalStatuses(r.status).includes('Remarketing')) throw new Error(`A ${r.status} Renewal cannot start remarketing.`)
      const account = must(s.accounts.find((a) => a.id === r.accountId), 'Account')
      const policy = must(s.policies.find((p) => p.id === r.policyId), 'Policy')
      const term = s.terms.find((t) => t.id === r.termId)
      const opp: Opportunity = {
        id: seq('opp-', s.opportunities),
        accountId: account.id,
        type: 'Remarket',
        stage: 'Gathering info',
        stageEnteredOffset: 0,
        lines: [policy.line],
        ownerId: account.producerId,
        estimatedPremium: r.renewalPremium ?? term?.premium ?? 0,
        targetCloseOffset: term ? term.expirationOffset - 7 : 30,
        source: 'Renewal',
        lostReason: null,
        renewalId: r.id,
        leadId: null,
        createdOffset: 0,
        closedOffset: null,
      }
      commit({
        ...s,
        opportunities: [...s.opportunities, opp],
        renewals: s.renewals.map((x) => (x.id === r.id ? { ...x, status: 'Remarketing', remarketOpportunityId: opp.id } : x)),
        activities: [...s.activities, activity(s, { accountId: account.id, type: 'system', subject: `${userName(actorId)} started remarketing ${policy.line}`, body: null, createdById: actorId, linked: { kind: 'renewal', id: r.id } })],
      })
      return opp.id
    },

    /** US-REN-007/009: from Presented, or from Remarketing once the Remarket Opportunity is closed. */
    decideRenewal(renewalId: string, decision: NonNullable<Dataset['renewals'][number]['decision']>, actorId: string, carrierId: string | null = null) {
      const s = state
      const r = must(s.renewals.find((x) => x.id === renewalId), 'Renewal')
      const rem = r.remarketOpportunityId ? s.opportunities.find((o) => o.id === r.remarketOpportunityId) : undefined
      const remClosed = r.status === 'Remarketing' && (rem?.stage === 'Won' || rem?.stage === 'Lost')
      if (r.status !== 'Presented' && !remClosed) throw new Error('Record a decision after the renewal is presented.')
      commit({
        ...s,
        renewals: s.renewals.map((x) => (x.id === r.id ? { ...x, status: 'Decided', decision, decisionCarrierId: carrierId ?? x.decisionCarrierId } : x)),
        activities: [...s.activities, activity(s, { accountId: r.accountId, type: 'system', subject: `${userName(actorId)} recorded the decision: ${decision}`, body: null, createdById: actorId, linked: { kind: 'renewal', id: r.id } })],
      })
    },

    /** Demo control "Sync renewal outcome": the AMS confirms Decided Renewals (rules.md). */
    syncRenewalOutcomes() {
      const s = state
      const decided = s.renewals.filter((r) => r.status === 'Decided')
      const termStatus = { 'Renew as is': 'Renewed', Rewrite: 'Rewritten', 'Non-renewed': 'Non-renewed' } as const
      commit({
        ...s,
        renewals: s.renewals.map((r) => (r.status === 'Decided' ? { ...r, status: 'Done' } : r)),
        terms: s.terms.map((t) => {
          const r = decided.find((x) => x.termId === t.id)
          if (r?.decision) return { ...t, status: termStatus[r.decision] }
          return t.source === 'fortify-won' ? { ...t, source: 'ams', status: t.status === 'Bound' && t.effectiveOffset <= 0 ? 'Active' : t.status } : t
        }),
      })
      return decided.length
    },

    /**
     * US-SRV-005 + type forms (008/009/010/011/012): SLA Due in business hours (US-SRV-014); certificate and claim
     * requests create their linked records; cancellations can create a retention Task and an X-date.
     */
    createServiceRequest(input: Pick<ServiceRequest, 'accountId' | 'policyId' | 'type' | 'subject' | 'description' | 'priority' | 'details'> & { requestedVia?: string | null; attachments?: { name: string; size: number }[] }, actorId: string, now: Date = new Date()) {
      const s = state
      const account = must(s.accounts.find((a) => a.id === input.accountId), 'Account')
      const d = input.details as Record<string, unknown>
      const max = s.serviceRequests.reduce((m, r) => Math.max(m, Number(r.id.slice(3))), 10482)
      const id = `SR-${max + 1}`
      const special = !!(d.additionalInsured || d.waiver || d.primaryNonContrib)
      const nonpayment = d.topic === 'Missed payment or late notice' && d.noticeReceived === true
      const due = addBusinessHours(now, slaHours(input.type, { special, nonpayment }))
      let certificates = s.certificates ?? []
      let holders = s.holders ?? []
      let claims = s.claims ?? []
      let tasks = s.tasks
      let xDates = s.xDates
      const linked: Record<string, string> = {}
      if (input.type === 'Certificate request') {
        if (account.kind !== 'Business') throw new Error('Certificates are for Business Accounts. Use ID card / evidence for a Household.')
        let holderId = d.holderId as string | undefined
        if (!holderId && d.holder) {
          holderId = seq('hld-', holders)
          holders = [...holders, { id: holderId, accountId: account.id, ...(d.holder as Omit<Holder, 'id' | 'accountId'>) }]
        }
        if (!holderId) throw new Error('Choose a holder.')
        if (!(d.policyIds as string[] | undefined)?.length) throw new Error('Include at least one policy.')
        const certId = `CRT-${String(certificates.length + 3100).padStart(4, '0')}`
        certificates = [...certificates, { id: certId, accountId: account.id, holderId, policyIds: d.policyIds as string[], additionalInsured: !!d.additionalInsured, waiver: !!d.waiver, primaryNonContrib: !!d.primaryNonContrib, operations: String(d.operations ?? ''), status: special ? 'Needs review' : 'Requested', serviceRequestId: id, createdOffset: 0, createdById: actorId }]
        linked.certificateId = certId
      }
      if (input.type === 'Claim report') {
        const claimId = `CL-${2042 + claims.length}`
        claims = [...claims, { id: claimId, accountId: account.id, policyId: input.policyId, serviceRequestId: id, lossType: (d.lossType as Claim['lossType']) ?? 'Property', lossOffset: Number(d.lossOffset ?? 0), lossTime: (d.lossTime as string) ?? null, description: String(d.description ?? input.description), status: 'Reported', details: d, createdOffset: 0, events: [{ offset: 0, text: `Reported by ${userName(actorId)}`, byId: actorId }] }]
        linked.claimId = claimId
      }
      if (input.type === 'Cancellation request') {
        const pol = s.policies.find((p) => p.id === input.policyId)
        if (d.retention && account.producerId) {
          tasks = [...tasks, { id: seq('tsk-', tasks), accountId: account.id, title: `Retention call: ${account.name}, ${pol?.policyNumber ?? ''}`.replace(/, $/, ''), type: 'Call', priority: 'High', source: 'Service Request', assigneeId: account.producerId, dueOffset: 1, status: 'Open', linked: { kind: 'service', id } }]
        }
        if (d.reason === 'Replaced with another carrier' && d.newCarrier && d.newExpirationOffset != null) {
          xDates = [...xDates, { id: seq('xdt-', xDates), accountId: account.id, line: (d.line as Line) ?? pol?.line ?? 'Auto', currentCarrier: String(d.newCarrier), xDateOffset: Number(d.newExpirationOffset), premium: null, interestLevel: 'Medium' }]
        }
      }
      const srv: ServiceRequest = { ...input, details: { ...d, ...linked }, id, status: 'New', ownerId: account.accountManagerId, createdById: actorId, createdOffset: 0, dueOffset: offsetOf(due), dueAt: due.toISOString(), resolution: null }
      commit({
        ...s,
        serviceRequests: [...s.serviceRequests, srv],
        certificates,
        holders,
        claims,
        tasks,
        xDates,
        activities: [...s.activities, activity(s, { accountId: account.id, type: 'system', subject: `${userName(actorId)} opened ${srv.id}: ${srv.subject}`, body: null, createdById: actorId, linked: { kind: 'service', id: srv.id } })],
      })
      return srv.id
    },

    /** US-SRV-004/007/014: Waiting on client pauses the SLA; leaving it pushes Due later by the waited business hours. */
    setServiceStatus(id: string, to: ServiceStatus, actorId: string, meta: { note?: string; resolution?: string; outcome?: ServiceRequest['outcome'] } = {}, now: Date = new Date()) {
      const s = state
      const sr = must(s.serviceRequests.find((x) => x.id === id), 'Service Request')
      const check = canServiceTransition(sr.status, to, sr.status === 'Done' ? 0 : 0)
      if (!check.ok) throw new Error(check.reason)
      if (to === 'Done' && !meta.resolution?.trim()) throw new Error('Add a resolution before closing.')
      let dueAt = sr.dueAt
      let waitingSince = sr.waitingSince ?? null
      if (to === 'Waiting on client') waitingSince = now.toISOString()
      else if (sr.status === 'Waiting on client' && waitingSince && dueAt) {
        const waited = businessHoursBetween(new Date(waitingSince), now)
        dueAt = addBusinessHours(new Date(dueAt), waited).toISOString()
        waitingSince = null
      }
      commit({
        ...s,
        serviceRequests: s.serviceRequests.map((x) => (x.id === id ? { ...x, status: to, dueAt, waitingSince, dueOffset: dueAt ? offsetOf(new Date(dueAt)) : x.dueOffset, resolution: to === 'Done' ? meta.resolution! : x.resolution, outcome: meta.outcome ?? x.outcome } : x)),
        activities: [...s.activities, activity(s, { accountId: sr.accountId, type: 'system', subject: `${userName(actorId)} moved ${sr.id} from ${sr.status} to ${to}${meta.note ? `: ${meta.note}` : ''}`, body: null, createdById: actorId, linked: { kind: 'service', id: sr.id } })],
      })
    },

    /** US-SRV-015: Type and Account never change; a hand-set Due needs a reason; reassignment is logged. */
    updateServiceRequest(id: string, patch: Partial<Pick<ServiceRequest, 'subject' | 'description' | 'ownerId' | 'dueAt' | 'priority' | 'details' | 'requestedVia' | 'attachments'>> & { dueReason?: string }, actorId: string) {
      const s = state
      const sr = must(s.serviceRequests.find((x) => x.id === id), 'Service Request')
      if (sr.status === 'Done') throw new Error('Reopen the request to edit it.')
      if (patch.dueAt && patch.dueAt !== sr.dueAt && !patch.dueReason?.trim()) throw new Error('Add a reason for the new due date.')
      const acts: Activity[] = []
      if (patch.ownerId && patch.ownerId !== sr.ownerId) acts.push(activity(s, { accountId: sr.accountId, type: 'system', subject: `${userName(actorId)} reassigned ${sr.id} to ${userName(patch.ownerId)}`, body: null, createdById: actorId, linked: { kind: 'service', id: sr.id } }))
      if (patch.dueAt && patch.dueAt !== sr.dueAt) acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId: sr.accountId, type: 'system', subject: `Due changed to ${formatUSDate(new Date(patch.dueAt))}: ${patch.dueReason}`, body: null, createdById: actorId, linked: { kind: 'service', id: sr.id } }))
      const { dueReason, ...rest } = patch
      commit({ ...s, serviceRequests: s.serviceRequests.map((x) => (x.id === id ? { ...x, ...rest, dueReason: dueReason ?? x.dueReason, dueOffset: rest.dueAt ? offsetOf(new Date(rest.dueAt)) : x.dueOffset } : x)), activities: [...s.activities, ...acts] })
    },

    logActivity(input: Omit<Activity, 'id' | 'occurredOffset'>) {
      const s = state
      // US-WRK-011: the author is never notified of their own mention.
      if (input.mentions) input = { ...input, mentions: [...new Set(input.mentions)].filter((u) => u !== input.createdById) }
      commit({ ...s, activities: [...s.activities, activity(s, input)], accounts: s.accounts.map((a) => (a.id === input.accountId ? { ...a, lastActivityOffset: 0 } : a)) })
    },

    /** US-WRK-005: create (id null) or edit an open Task; system Tasks keep their title and source. */
    saveTask(id: string | null, input: Pick<Task, 'accountId' | 'title' | 'type' | 'priority' | 'assigneeId' | 'dueOffset' | 'linked'> & { dueTime: string | null; durationMin: number | null; description: string | null; contactIds?: string[]; location?: string | null }, actorId: string) {
      const s = state
      if (!input.title.trim()) throw new Error('Add a title')
      if (input.type === 'Meeting' && !input.dueTime) throw new Error('Meetings need a time')
      const fields = { ...input, title: input.title.trim().slice(0, 140), description: input.description?.slice(0, 2000) ?? null, durationMin: input.type === 'Meeting' ? (input.durationMin ?? 30) : null }
      if (id === null) {
        const t: Task = { ...fields, id: seq('tsk-', s.tasks), source: 'Manual', status: 'Open' }
        commit({ ...s, tasks: [...s.tasks, t] })
        return t.id
      }
      const prev = must(s.tasks.find((t) => t.id === id), 'Task')
      if (prev.status !== 'Open') throw new Error('Done and canceled Tasks are read-only.')
      const next: Task = { ...prev, ...fields, title: prev.source === 'Manual' ? fields.title : prev.title, source: prev.source }
      const changes = [
        prev.dueOffset !== next.dueOffset && `Task due date changed to ${formatUSDate(resolveOffset(next.dueOffset, today))}`,
        prev.assigneeId !== next.assigneeId && `Task reassigned from ${userName(prev.assigneeId)} to ${userName(next.assigneeId)}`,
        prev.priority !== next.priority && `Task priority changed to ${next.priority}`,
      ].filter((x): x is string => !!x)
      const acts: Activity[] = []
      for (const subject of changes) acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId: prev.accountId, type: 'system', subject, body: null, createdById: actorId, linked: prev.linked }))
      commit({ ...s, tasks: s.tasks.map((t) => (t.id === id ? next : t)), activities: [...s.activities, ...acts] })
      return id
    },

    createTask(input: Omit<Task, 'id' | 'status'>) {
      const s = state
      const t: Task = { ...input, id: seq('tsk-', s.tasks), status: 'Open' }
      commit({ ...s, tasks: [...s.tasks, t] })
      return t.id
    },
  }
}

export type DataStore = ReturnType<typeof createDataStore>
