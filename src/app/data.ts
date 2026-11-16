import type {
  Account,
  AccountDetails,
  AgencySettings,
  Office,
  Template,
  User,
  CertMarks,
  Claim,
  Holder,
  AccountDocument,
  Contact,
  Conversation,
  Message,
  CallOutcome,
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
import { unknownTokens } from '@/domain/templates'
import { START_WORDS, STOP_WORDS } from '@/domain/sms'

/**
 * The mutable mock store (US-FND-005). Every action builds the next state and commits it once,
 * so a failure mid-action leaves no partial records and subscribers re-render once.
 * Dates are day offsets from `today`.
 */
/** CRT: issuing a certificate closes its Certificate request (US-SRV-004). */
function closeLinkedSr(s: Dataset, srId: string | null, resolution: string): Dataset['serviceRequests'] {
  return s.serviceRequests.map((r) => (r.id === srId && r.status !== 'Done' ? { ...r, status: 'Done', resolution } : r))
}

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

/** US-SET-011 seed states. */
export const INTEGRATION_DEFAULTS: NonNullable<AgencySettings['integrations']> = {
  ams: { status: 'Connected', sinceOffset: -400 },
  email: { status: 'Connected', sinceOffset: -400 },
  sms: { status: 'Connected', sinceOffset: -300 },
  phone: { status: 'Error', sinceOffset: -14, error: 'Authorization expired on' },
  calendar: { status: 'Connected', sinceOffset: -250 },
  esign: { status: 'Not connected' },
  rater: { status: 'Not connected' },
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
    /** US-LEA-010: Ready rows become New Leads (Source "Purchased list"), split evenly across Producers or unassigned. */
    importLeads(rows: { first: string; last: string; phone: string; email: string; zip: string; city: string; street: string; line: Line; carrier: string | null }[], meta: { listName: string; vendor: string; officeId: string; assignees: string[] }, actorId: string) {
      const s = state
      if (!meta.listName.trim()) throw new Error('Name the list.')
      if (rows.length > 2000) throw new Error('Import up to 2,000 rows at a time.')
      const office = must(s.offices.find((o) => o.id === meta.officeId), 'Office')
      let n = s.leads.reduce((m, x) => Math.max(m, Number(x.id.replace(/\D/g, '')) || 0), 0)
      const fmt = (p: string) => { const d = p.replace(/\D/g, ''); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p }
      const fresh: Lead[] = rows.map((r, i) => ({
        id: `lea-${String(++n).padStart(4, '0')}`, kind: 'Household', name: `${r.first} ${r.last}`, businessName: null, phone: fmt(r.phone), email: r.email, street: r.street, city: r.city || office.city, state: office.state as Lead['state'], zip: r.zip,
        linesOfInterest: [r.line], currentCarrier: r.carrier, currentPremium: null, xDateOffset: null, source: 'Purchased list', sourceDetail: meta.listName.trim(), notes: `Vendor: ${meta.vendor || 'Unknown'}`, officeId: office.id,
        assigneeId: meta.assignees.length ? meta.assignees[i % meta.assignees.length] : null, status: 'New', disqualifyReason: null, createdOffset: 0, attempts: [], qualifiedAccountId: null, qualifiedOpportunityId: null, events: [{ offset: 0, text: `Imported from ${meta.listName.trim()} by ${userName(actorId)}`, byId: actorId }],
      }) as Lead)
      commit({ ...s, leads: [...fresh, ...s.leads] })
      return fresh.length
    },
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
    /** US-LEA-009: back to Contacted; the old reason stays in the timeline. Duplicates can't be reopened. */
    reopenLead(id: string, actorId: string) {
      const s = state
      const l = must(s.leads.find((x) => x.id === id), 'Lead')
      if (l.status !== 'Disqualified') throw new Error('Only a Disqualified lead can be reopened.')
      if (l.disqualifyReason === 'Duplicate lead') throw new Error('Duplicate leads were merged and can’t be reopened.')
      const was = `${l.disqualifyReason ?? 'No reason'}${l.disqualifiedOffset != null ? ` (${formatUSDate(resolveOffset(l.disqualifiedOffset, today))})` : ''}`
      commit({ ...s, leads: s.leads.map((x) => (x.id === id ? { ...x, status: 'Contacted' as const, disqualifyReason: null, events: [...(x.events ?? []), { offset: 0, text: `Reopened by ${userName(actorId)} · previously Disqualified: ${was}`, byId: actorId }] } : x)) })
    },
    disqualifyLead(id: string, d: { reason: string; note: string | null; survivorId?: string; saveXDate?: { line: Line; carrier: string; offset: number; accountId?: string | null } }, actorId: string) {
      const s = state
      const l = must(s.leads.find((x) => x.id === id), 'Lead')
      if (l.status !== 'New' && l.status !== 'Contacted') throw new Error('This lead is already closed.')
      if (d.reason === 'Other' && (d.note ?? '').trim().length < 10) throw new Error('Describe the reason in at least 10 characters.')
      const code = (x: string) => `L-${1000 + Number(x.replace(/\D/g, ''))}`
      let leads = s.leads.map((x) => (x.id === id ? { ...x, status: 'Disqualified' as const, disqualifyReason: d.reason, disqualifyNote: d.note, mergedIntoId: d.reason === 'Duplicate lead' ? (d.survivorId ?? null) : null, disqualifiedOffset: 0, disqualifiedById: actorId, events: [...(x.events ?? []), { offset: 0, text: `Disqualified by ${userName(actorId)}: ${d.reason}`, byId: actorId }] } : x))
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

    /** US-XDT: add an X-date to an Account (follow-up rule applies). */
    createXDate(input: Omit<Dataset['xDates'][number], 'id'>, actorId = 'system') {
      return this.saveXDate(null, input, actorId)
    },

    /**
     * US-XDT-002/004: add or edit an X-date. Inside the quote window (45 days personal, 90 commercial) an open
     * follow-up Task exists for the Producer; moving out of the window or setting Closed cancels it (never deletes).
     */
    saveXDate(id: string | null, input: Partial<Omit<Dataset['xDates'][number], 'id'>>, actorId: string) {
      const s = state
      const prev = id ? must(s.xDates.find((x) => x.id === id), 'X-date') : null
      if (!prev && (!input.accountId || !input.line || !input.currentCarrier || input.xDateOffset == null)) throw new Error('Account, line, current carrier, and X-date are required.')
      const xid = prev?.id ?? seq('xdt-', s.xDates)
      const next = { ...(prev ?? { id: xid, premium: null, interestLevel: 'Medium' as const, source: { kind: 'manual' as const } }), ...input, id: xid } as Dataset['xDates'][number]
      const account = must(s.accounts.find((a) => a.id === next.accountId), 'Account')
      const window = account.kind === 'Business' ? 90 : 45
      const opens = next.xDateOffset - window
      const inWindow = opens <= 0 && next.xDateOffset >= 0
      let tasks = s.tasks
      const open = next.followUpTaskId ? tasks.find((t) => t.id === next.followUpTaskId && t.status === 'Open') : undefined
      const cancel = (note: string) => { tasks = tasks.map((t) => (t.id === open!.id ? { ...t, status: 'Canceled', closeNote: note, doneOffset: 0 } : t)) }
      if (next.interestLevel === 'Closed' || next.opportunityId) {
        if (open) cancel(next.interestLevel === 'Closed' ? 'Interest closed' : 'Opportunity started')
      } else if (inWindow) {
        if (open) tasks = tasks.map((t) => (t.id === open.id ? { ...t, dueOffset: Math.max(0, opens) } : t))
        else {
          const tid = seq('tsk-', tasks)
          tasks = [...tasks, { id: tid, accountId: account.id, title: `Quote ahead of X-date: ${next.line}, ${account.name}`, type: 'Call', priority: 'Normal', source: 'X-date', assigneeId: account.producerId, dueOffset: Math.max(0, opens), status: 'Open', linked: { kind: 'xdate', id: xid } }]
          next.followUpTaskId = tid
        }
      } else if (open) {
        cancel(`X-date moved to ${formatUSDate(resolveOffset(next.xDateOffset, today))}`)
      }
      commit({
        ...s,
        tasks,
        xDates: prev ? s.xDates.map((x) => (x.id === xid ? next : x)) : [...s.xDates, next],
        activities: [...s.activities, activity(s, { accountId: account.id, type: 'system', subject: `X-date ${prev ? 'updated' : 'added'}: ${next.line} with ${next.currentCarrier}, ${formatUSDate(resolveOffset(next.xDateOffset, today))}`, body: null, createdById: actorId, linked: { kind: 'xdate', id: xid } })],
      })
      return xid
    },

    /** US-XDT-005: one Opportunity for the chosen X-dates on one Account; their follow-ups are completed. */
    startQuoteFromXDates(ids: string[], actorId: string) {
      const s = state
      const xs = ids.map((id) => must(s.xDates.find((x) => x.id === id), 'X-date'))
      const account = must(s.accounts.find((a) => a.id === xs[0].accountId), 'Account')
      if (xs.some((x) => x.accountId !== account.id)) throw new Error('Bundle X-dates from one account only.')
      const opp: Opportunity = { id: seq('opp-', s.opportunities), accountId: account.id, type: account.status === 'Client' ? 'Cross-sell' : 'New business', stage: 'New', stageEnteredOffset: 0, lines: [...new Set(xs.map((x) => x.line))], ownerId: account.producerId, estimatedPremium: xs.reduce((n, x) => n + (x.premium ?? 0), 0), targetCloseOffset: Math.min(...xs.map((x) => x.xDateOffset)), source: 'X-date', lostReason: null, renewalId: null, leadId: null, createdOffset: 0, closedOffset: null, lineDetails: Object.fromEntries(xs.map((x) => [x.line, { currentCarrier: x.currentCarrier, currentPremium: x.premium ?? undefined, xDateOffset: x.xDateOffset }])) }
      const taskIds = new Set(xs.map((x) => x.followUpTaskId).filter(Boolean))
      commit({
        ...s,
        opportunities: [...s.opportunities, opp],
        xDates: s.xDates.map((x) => (ids.includes(x.id) ? { ...x, opportunityId: opp.id } : x)),
        tasks: s.tasks.map((t) => (taskIds.has(t.id) && t.status === 'Open' ? { ...t, status: 'Done', doneOffset: 0, closeNote: 'Opportunity started from X-date' } : t)),
        activities: [...s.activities, activity(s, { accountId: account.id, type: 'system', subject: 'Opportunity started from X-date', body: null, createdById: actorId, linked: { kind: 'opportunity', id: opp.id } })],
      })
      return opp.id
    },

    // ---------- Settings (SET P1) ----------
    /** US-SET-003: invite (id null) or edit; email is unique; a user can't change their own role. */
    saveUser(id: string | null, input: { name: string; email: string; role: User['role']; officeId: string; title: string | null; phone: string | null }, actorId: string) {
      const s = state
      if (!input.name.trim()) throw new Error('Enter a name.')
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error('Enter a valid email.')
      const clash = s.users.find((u) => u.id !== id && u.email.toLowerCase() === input.email.toLowerCase())
      if (clash) throw new Error(`This email is already in use by ${clash.name}`)
      if (id === actorId && s.users.find((u) => u.id === id)?.role !== input.role) throw new Error('You can’t change your own role or status.')
      if (id === null) {
        const nid = seq('usr-', s.users)
        commit({ ...s, users: [...s.users, { id: nid, ...input, name: input.name.trim(), status: 'Invited', active: false, licenseRecords: [] }] })
        return nid
      }
      commit({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...input, name: input.name.trim() } : u)) })
      return id
    },
    /** US-SET-003: deactivation is blocked while the user owns Accounts, open Leads, or open Tasks. No delete. */
    setUserStatus(id: string, status: 'Active' | 'Deactivated', actorId: string) {
      const s = state
      if (id === actorId) throw new Error('You can’t change your own role or status.')
      if (status === 'Deactivated') {
        const accts = s.accounts.filter((a) => a.lifecycle === 'active' && (a.producerId === id || a.accountManagerId === id)).length
        const leads = s.leads.filter((l) => l.assigneeId === id && (l.status === 'New' || l.status === 'Contacted')).length
        const tasks = s.tasks.filter((t) => t.assigneeId === id && t.status === 'Open').length
        if (accts || leads || tasks) throw new Error(`Move ${accts} Accounts, ${leads} Leads, and ${tasks} open Tasks first.`)
      }
      commit({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, status, active: status === 'Active' } : u)) })
    },
    updateOffice(id: string, patch: Partial<Pick<Office, 'address1' | 'address2' | 'city' | 'zip' | 'phone' | 'email'>>, _actorId: string) {
      const s = state
      if (patch.phone != null && patch.phone.replace(/\D/g, '').length !== 10) throw new Error('Enter a phone number with 10 digits.')
      if (patch.zip != null && !/^\d{5}$/.test(patch.zip)) throw new Error('Enter a 5-digit ZIP code.')
      commit({ ...s, offices: s.offices.map((o) => (o.id === id ? { ...o, ...patch } : o)) })
    },
    saveSettings(next: AgencySettings, _actorId: string) {
      commit({ ...state, settings: next })
    },
    /** US-SET-008: unknown merge fields and SMS over 2 segments are blocked. No delete; retire instead. */
    saveTemplate(id: string | null, input: Pick<Template, 'name' | 'channel' | 'category' | 'usedIn' | 'body'> & { subject?: string | null }, actorId: string) {
      const s = state
      if (!input.name.trim()) throw new Error('Name the template.')
      const unknown = unknownTokens(`${input.subject ?? ''} ${input.body}`)
      if (unknown.length) throw new Error(`${unknown.length} unknown field${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`)
      if (input.channel === 'SMS' && input.body.length > 320) throw new Error('Keep SMS under 2 segments.')
      const list = s.templates ?? []
      const tid = id ?? `tpl-${Date.now().toString(36)}`
      const next: Template = { ...(list.find((t) => t.id === id) ?? { status: 'Active' as const }), ...input, id: tid, editedOffset: 0, editedById: actorId } as Template
      commit({ ...s, templates: id ? list.map((t) => (t.id === id ? next : t)) : [...list, next] })
      return tid
    },
    setTemplateStatus(id: string, status: Template['status']) {
      commit({ ...state, templates: (state.templates ?? []).map((t) => (t.id === id ? { ...t, status } : t)) })
    },
    /** US-SET-011: simulated connect/disconnect; the AMS can't be disconnected. */
    setIntegration(key: string, status: 'Connected' | 'Not connected', actorId: string) {
      const s = state
      if (key === 'ams') throw new Error('Fortify needs the AMS to show policies.')
      const cur = s.settings!
      commit({ ...s, settings: { ...cur, integrations: { ...INTEGRATION_DEFAULTS, ...(cur.integrations ?? {}), [key]: { status, sinceOffset: status === 'Connected' ? 0 : null, error: null } } } })
      void actorId
    },
    /** US-SET-012: a manual run; with a forced error it fails like the AMS timing out. */
    syncNow(fail: boolean, now: Date = new Date()) {
      const s = state
      const last = s.syncRuns?.find((r) => r.status !== 'Failed')
      const run = fail
        ? { id: `sync-${(s.syncRuns?.length ?? 0) + 1}`, at: now.toISOString(), status: 'Failed' as const, durationSec: 30, counts: {}, error: 'AMS connection timed out after 30s' }
        : { id: `sync-${(s.syncRuns?.length ?? 0) + 1}`, at: now.toISOString(), status: 'Succeeded' as const, durationSec: 3, counts: { ...(last?.counts ?? {}), 'Records changed': 12 }, skipped: 0 }
      commit({ ...s, syncRuns: [run, ...(s.syncRuns ?? [])] })
    },

    // ---------- P2 batch 2: bulk actions, roll forward, note edits ----------
    /** Runs one action per id and reports what was skipped and why ("10 updated, 2 skipped"). */
    bulk(ids: string[], fn: (id: string) => void) {
      const skipped: { id: string; reason: string }[] = []
      let updated = 0
      for (const id of ids) {
        try { fn(id); updated++ } catch (e) { skipped.push({ id, reason: (e as Error).message }) }
      }
      return { updated, skipped }
    },
    /** US-SRV-016 */
    reassignService(id: string, toId: string, actorId: string, batch: string | null = null) {
      const s = state
      const sr = must(s.serviceRequests.find((x) => x.id === id), 'Service Request')
      if (sr.status === 'Done') throw new Error('Done')
      if (sr.ownerId === toId) throw new Error('Already assigned')
      commit({ ...s, serviceRequests: s.serviceRequests.map((x) => (x.id === id ? { ...x, ownerId: toId, assignBatch: batch ? { id: batch, byId: actorId, offset: 0 } : null } : x)), activities: [...s.activities, activity(s, { accountId: sr.accountId, type: 'system', subject: `${id} reassigned from ${userName(sr.ownerId)} to ${userName(toId)} by ${userName(actorId)}`, body: null, createdById: actorId, linked: { kind: 'service', id } })] })
    },
    /** US-REN-013: only within the new owner's Office. */
    reassignRenewal(id: string, toId: string, actorId: string) {
      const s = state
      const r = must(s.renewals.find((x) => x.id === id), 'Renewal')
      const to = must(s.users.find((u) => u.id === toId), 'User')
      if (s.accounts.find((a) => a.id === r.accountId)?.officeId !== to.officeId) throw new Error('Office mismatch')
      if (r.ownerId === toId) throw new Error('Already assigned')
      commit({ ...s, renewals: s.renewals.map((x) => (x.id === id ? { ...x, ownerId: toId } : x)), activities: [...s.activities, activity(s, { accountId: r.accountId, type: 'system', subject: `Renewal reassigned to ${to.name} by ${userName(actorId)}`, body: null, createdById: actorId, linked: { kind: 'renewal', id } })] })
    },
    /** US-XDT-006: forward by the term length until the date is in the future; the follow-up rule re-runs. */
    rollForwardXDate(id: string, actorId: string) {
      const s = state
      const x = must(s.xDates.find((v) => v.id === id), 'X-date')
      if (x.interestLevel === 'Closed') throw new Error('Change the interest level from Closed first.')
      if (x.xDateOffset >= 0) throw new Error('Not passed yet')
      if (x.opportunityId && s.opportunities.some((o) => o.id === x.opportunityId && !['Won', 'Lost'].includes(o.stage))) throw new Error('Has an open Opportunity')
      const months = x.termMonths ?? 12
      let d = resolveOffset(x.xDateOffset, today)
      const from = formatUSDate(d)
      while (offsetOf(d) < 0) d = addMonths(d, months)
      this.saveXDate(id, { xDateOffset: offsetOf(d), opportunityId: null }, actorId)
      const s2 = state
      commit({ ...s2, activities: [...s2.activities, activity(s2, { accountId: x.accountId, type: 'system', subject: `Rolled forward from ${from} by ${userName(actorId)}`, body: null, createdById: actorId, linked: { kind: 'xdate', id } })] })
      return formatUSDate(d)
    },
    /** US-WRK-003: the author may edit a note for 24 hours; nothing is ever deleted. */
    editNote(activityId: string, body: string, actorId: string, now: Date = new Date()) {
      const s = state
      const a = must(s.activities.find((x) => x.id === activityId), 'Activity')
      if (a.type !== 'note') throw new Error('Only notes can be edited.')
      if (a.createdById !== actorId) throw new Error('Only the author can edit a note.')
      if (!a.loggedAt || now.getTime() - new Date(a.loggedAt).getTime() > 24 * 3_600_000) throw new Error('Notes can be edited for 24 hours after they’re logged.')
      if (!body.trim()) throw new Error('A note can’t be empty.')
      commit({ ...s, activities: s.activities.map((x) => (x.id === activityId ? { ...x, body: body.trim(), editedAt: now.toISOString() } : x)) })
    },

    // ---------- Inbox (INB P1) ----------
    /** US-INB-002: read state is per user. */
    markConversationRead(id: string, userId: string) {
      const s = state
      const c = (s.conversations ?? []).find((x) => x.id === id)
      if (!c || !c.unreadBy.includes(userId)) return
      commit({ ...s, conversations: s.conversations!.map((x) => (x.id === id ? { ...x, unreadBy: x.unreadBy.filter((u) => u !== userId) } : x)) })
    },
    markConversationsUnread(ids: string[], userId: string) {
      const s = state
      commit({ ...s, conversations: (s.conversations ?? []).map((x) => (ids.includes(x.id) && !x.unreadBy.includes(userId) ? { ...x, unreadBy: [...x.unreadBy, userId] } : x)) })
    },
    /** US-INB-010: the assignee gets it unread; linked ones log a system Activity. */
    assignConversations(ids: string[], toId: string, actorId: string) {
      const s = state
      if (ids.length > 50) throw new Error('Select up to 50 at a time')
      const to = must(s.users.find((u) => u.id === toId), 'User')
      const acts: Activity[] = []
      const conversations = (s.conversations ?? []).map((c) => {
        if (!ids.includes(c.id) || c.assigneeId === toId) return c
        if (c.accountId) acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId: c.accountId, type: 'system', subject: `Conversation assigned to ${to.name} by ${userName(actorId)}`, body: null, createdById: actorId, linked: null, conversationId: c.id }))
        return { ...c, assigneeId: toId, unreadBy: toId === actorId ? c.unreadBy : [...new Set([...c.unreadBy, toId])] }
      })
      commit({ ...s, conversations, activities: [...s.activities, ...acts] })
    },
    setConversationStatus(ids: string[], status: Conversation['status'], reason: string | null = null) {
      const s = state
      if (ids.length > 50) throw new Error('Select up to 50 at a time')
      commit({ ...s, conversations: (s.conversations ?? []).map((c) => (ids.includes(c.id) ? { ...c, status, doneReason: status === 'Done' ? reason : null, unreadBy: status === 'Done' ? [] : c.unreadBy } : c)) })
    },
    /** US-INB-005: simulated; appends to the thread (or starts one) and logs an Email Activity. */
    sendEmail(input: { conversationId: string | null; accountId: string | null; contactId: string | null; to: string[]; cc: string[]; subject: string; body: string; attachments: string[] }, actorId: string, now: Date = new Date()) {
      const s = state
      if (!input.to.length) throw new Error('Add at least one recipient.')
      if (!input.subject.trim()) throw new Error('Add a subject.')
      if (!input.body.trim()) throw new Error('Write a message.')
      const unknown = input.body.match(/\{\{\s*[a-zA-Z.]+\s*\}\}/)
      if (unknown) throw new Error(`Fill in ${unknown[0]} or remove it.`)
      const me = must(s.users.find((u) => u.id === actorId), 'User')
      const list = s.conversations ?? []
      let conv = input.conversationId ? must(list.find((c) => c.id === input.conversationId), 'Conversation') : null
      const at = now.toISOString()
      if (!conv) conv = { id: seq('cnv-', list), channel: 'email', subject: input.subject.trim(), address: input.to[0], accountId: input.accountId, contactId: input.contactId, officeId: input.accountId ? (s.accounts.find((a) => a.id === input.accountId)?.officeId ?? me.officeId) : me.officeId, assigneeId: actorId, status: 'Open', unreadBy: [], lastAt: at, related: [] }
      const docs = (s.documents ?? []).filter((d) => input.attachments.includes(d.id))
      const m: Message = { id: seq('msg-', s.messages ?? []), conversationId: conv.id, kind: 'out', fromName: me.name, from: me.email, to: input.to, cc: input.cc, at, body: input.body.slice(0, 20000), attachments: docs.length ? docs.map((d) => ({ name: d.name, sizeKb: null })) : undefined, simulated: true }
      const next = { ...conv, lastAt: at, status: 'Open' as const }
      commit({
        ...s,
        conversations: input.conversationId ? list.map((c) => (c.id === next.id ? next : c)) : [next, ...list],
        messages: [...(s.messages ?? []), m],
        activities: next.accountId ? [...s.activities, activity(s, { accountId: next.accountId, type: 'email', subject: `Email: ${input.subject.trim()}`, body: input.body.slice(0, 500), createdById: actorId, linked: null, conversationId: next.id })] : s.activities,
      })
      return next.id
    },
    /** US-INB-006: simulated SMS; opted-out Contacts can't be texted. */
    sendSms(conversationId: string, body: string, actorId: string, now: Date = new Date()) {
      const s = state
      const c = must((s.conversations ?? []).find((x) => x.id === conversationId), 'Conversation')
      const contact = s.contacts.find((x) => x.id === c.contactId)
      if (contact?.smsConsent?.state === 'Opted out') throw new Error(`${contact.name} opted out. Texting is off.`)
      if (!body.trim()) throw new Error('Write a message.')
      if (body.length > 918) throw new Error('Keep texts under 918 characters.')
      const me = must(s.users.find((u) => u.id === actorId), 'User')
      const at = now.toISOString()
      const m: Message = { id: seq('msg-', s.messages ?? []), conversationId, kind: 'out', fromName: me.name, from: me.phone ?? '', to: [c.address], at, body, simulated: true }
      commit({
        ...s,
        conversations: s.conversations!.map((x) => (x.id === conversationId ? { ...x, lastAt: at, status: 'Open' } : x)),
        messages: [...(s.messages ?? []), m],
        activities: c.accountId ? [...s.activities, activity(s, { accountId: c.accountId, type: 'sms', subject: 'SMS sent', body: body.slice(0, 500), createdById: actorId, linked: null, conversationId })] : s.activities,
      })
    },
    /** US-INB-003/006: consent changes log a system Activity on each of the Contact's Accounts. */
    recordSmsConsent(contactId: string, consent: SmsConsent, source: string, actorId: string | null) {
      const s = state
      const c = must(s.contacts.find((x) => x.id === contactId), 'Contact')
      const acts: Activity[] = []
      for (const accountId of c.accountIds) acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, { accountId, type: 'system', subject: `SMS consent: ${consent} (${source})${actorId ? ` by ${userName(actorId)}` : ''}`, body: null, createdById: actorId ?? c.accountIds[0], linked: null }))
      commit({ ...s, contacts: s.contacts.map((x) => (x.id === contactId ? { ...x, smsConsent: { state: consent, offset: 0, source, byId: actorId } } : x)), activities: [...s.activities, ...acts] })
    },
    /** US-INB-004: a call conversation + message, a Call Activity, and an optional follow-up Task. */
    logCall(input: { contactId: string; accountId: string; direction: 'Inbound' | 'Outbound'; at: string; durationSec: number; outcome: CallOutcome; notes: string; related: Conversation['related'][number] | null; followUpOffset: number | null }, actorId: string, now: Date = new Date()) {
      const s = state
      const contact = must(s.contacts.find((c) => c.id === input.contactId), 'Contact')
      const a = must(s.accounts.find((x) => x.id === input.accountId), 'Account')
      if (input.outcome === 'Connected' && !input.notes.trim()) throw new Error('Add notes for a connected call.')
      if (input.notes.length > 2000) throw new Error('Keep notes under 2,000 characters.')
      if (input.durationSec < 0 || input.durationSec > 35999) throw new Error('Duration must be between 0:00 and 9:59:59.')
      if (new Date(input.at) > now) throw new Error('The call time can’t be in the future.')
      const me = must(s.users.find((u) => u.id === actorId), 'User')
      const list = s.conversations ?? []
      const conv: Conversation = { id: seq('cnv-', list), channel: 'call', subject: `${input.direction} call · ${input.outcome}`, address: contact.phone, accountId: a.id, contactId: contact.id, officeId: a.officeId, assigneeId: actorId, status: 'Done', unreadBy: [], lastAt: input.at, related: input.related ? [input.related] : [] }
      const m: Message = { id: seq('msg-', s.messages ?? []), conversationId: conv.id, kind: input.direction === 'Inbound' ? 'in' : 'out', fromName: input.direction === 'Inbound' ? contact.name : me.name, from: input.direction === 'Inbound' ? contact.phone : me.email, to: [], at: input.at, body: input.notes.trim(), call: { direction: input.direction, durationSec: input.durationSec, outcome: input.outcome, loggedById: actorId } }
      const linked = input.related && input.related.kind !== 'task' ? { kind: input.related.kind, id: input.related.id } : null
      const acts = [activity(s, { accountId: a.id, type: 'call', subject: `Call with ${contact.name}: ${input.outcome.toLowerCase()}`, body: input.notes.trim() || null, createdById: actorId, linked, conversationId: conv.id })]
      const tasks = input.followUpOffset != null ? [...s.tasks, { id: seq('tsk-', s.tasks), accountId: a.id, title: `Follow up with ${contact.name}`, type: 'Call' as const, priority: 'Normal' as const, source: 'Manual' as const, assigneeId: actorId, dueOffset: input.followUpOffset, dueTime: '17:00', durationMin: null, description: null, status: 'Open' as const, linked: null }] : s.tasks
      commit({ ...s, conversations: [conv, ...list], messages: [...(s.messages ?? []), m], activities: [...s.activities, ...acts], tasks, accounts: s.accounts.map((x) => (x.id === a.id ? { ...x, lastActivityOffset: 0 } : x)) })
      return conv.id
    },
    /** US-INB-004: only the author, within 24 hours. */
    editCallNotes(messageId: string, body: string, actorId: string, now: Date = new Date()) {
      const s = state
      const m = must((s.messages ?? []).find((x) => x.id === messageId), 'Message')
      if (m.call?.loggedById !== actorId || now.getTime() - new Date(m.at).getTime() > 24 * 3_600_000) throw new Error('Only the author can edit notes, for 24 hours.')
      if (m.call.outcome === 'Connected' && !body.trim()) throw new Error('Add notes for a connected call.')
      commit({ ...s, messages: s.messages!.map((x) => (x.id === messageId ? { ...x, body: body.trim().slice(0, 2000) } : x)) })
    },
    /** US-INB-007: link (or move) a conversation; Activities are backfilled, never deleted. */
    linkConversation(id: string, input: { accountId: string; contactId: string | null; newContact?: { firstName: string; lastName: string } | null; saveAddress: boolean }, actorId: string) {
      let s = state
      const c = must((s.conversations ?? []).find((x) => x.id === id), 'Conversation')
      const a = must(s.accounts.find((x) => x.id === input.accountId), 'Account')
      if (c.accountId === a.id) throw new Error(`Already linked to ${a.name}.`)
      const isPhone = c.channel !== 'email'
      let contactId = input.contactId
      if (!contactId && input.newContact) {
        this.saveContact(null, { firstName: input.newContact.firstName, lastName: input.newContact.lastName, phone: isPhone ? c.address : '', email: isPhone ? '' : c.address }, { accountId: a.id, relationship: a.kind === 'Business' ? 'Employee' : 'Other' }, actorId)
        s = state
        contactId = s.contacts[s.contacts.length - 1].id
      } else if (contactId && input.saveAddress) {
        s = { ...s, contacts: s.contacts.map((x) => (x.id === contactId ? (isPhone ? { ...x, phone: x.phone || c.address } : { ...x, email: x.email || c.address }) : x)) }
      }
      const msgs = (s.messages ?? []).filter((m) => m.conversationId === id && m.kind !== 'system')
      const acts: Activity[] = []
      const add = (x: Omit<Activity, 'id' | 'occurredOffset'> & { occurredOffset?: number }) => acts.push(activity({ ...s, activities: [...s.activities, ...acts] }, x))
      const off = (iso: string) => Math.min(0, daysBetween(today, new Date(iso)))
      for (const m of msgs) add({ accountId: a.id, type: c.channel, subject: c.channel === 'email' ? `Email: ${c.subject ?? ''}` : c.channel === 'sms' ? (m.kind === 'in' ? 'SMS received' : 'SMS sent') : `Call: ${m.call?.outcome.toLowerCase() ?? ''}`, body: m.body.slice(0, 500) || null, createdById: actorId, linked: null, conversationId: id, occurredOffset: off(m.at) })
      add({ accountId: a.id, type: 'system', subject: `Conversation linked from Inbox by ${userName(actorId)}`, body: null, createdById: actorId, linked: null, conversationId: id })
      if (c.accountId) add({ accountId: c.accountId, type: 'system', subject: `Conversation moved to ${a.name}`, body: null, createdById: actorId, linked: null, conversationId: id })
      commit({ ...s, conversations: s.conversations!.map((x) => (x.id === id ? { ...x, accountId: a.id, contactId, leadId: null, officeId: a.officeId, related: c.accountId ? [] : x.related } : x)), activities: [...s.activities, ...acts] })
    },
    linkConversationLead(id: string, leadId: string) {
      const s = state
      commit({ ...s, conversations: (s.conversations ?? []).map((x) => (x.id === id ? { ...x, leadId } : x)) })
    },
    /** US-INB-008: a created record shows as a chip plus a system line in the thread. */
    addConversationRelated(id: string, rel: Conversation['related'][number], text: string, now: Date = new Date()) {
      const s = state
      const sys: Message = { id: seq('msg-', s.messages ?? []), conversationId: id, kind: 'system', fromName: 'Fortify', from: '', to: [], at: now.toISOString(), body: text }
      commit({ ...s, conversations: (s.conversations ?? []).map((x) => (x.id === id ? { ...x, related: [...x.related.filter((r) => r.id !== rel.id), rel] } : x)), messages: [...(s.messages ?? []), sys] })
    },
    /** US-INB-011: a simulated inbound message. Done reopens; STOP/START change consent; read at once if open. */
    receiveMessage(conversationId: string, body: string, viewingId: string | null, now: Date = new Date()) {
      let s = state
      const c = must((s.conversations ?? []).find((x) => x.id === conversationId), 'Conversation')
      const contact = s.contacts.find((x) => x.id === c.contactId)
      const name = contact?.name ?? c.address
      const at = now.toISOString()
      const msgs: Message[] = [{ id: seq('msg-', s.messages ?? []), conversationId, kind: 'in', fromName: name, from: c.address, to: [], at, body, arrived: true }]
      const word = body.trim().toUpperCase()
      if (c.channel === 'sms' && contact && (STOP_WORDS.includes(word) || START_WORDS.includes(word))) {
        const stop = STOP_WORDS.includes(word)
        this.recordSmsConsent(contact.id, stop ? 'Opted out' : 'Opted in', stop ? 'Replied STOP' : 'Replied START', null)
        s = state
        msgs.push({ id: `msg-${Number(msgs[0].id.slice(4)) + 1}`, conversationId, kind: 'system', fromName: 'Fortify', from: '', to: [], at: new Date(now.getTime() + 1000).toISOString(), body: `${name} replied ${stop ? 'STOP' : 'START'}. Texting is ${stop ? 'off' : 'on'} for ${c.address}.` })
      }
      const reading = viewingId === conversationId
      commit({ ...s, conversations: s.conversations!.map((x) => (x.id === conversationId ? { ...x, status: 'Open', lastAt: at, unreadBy: reading ? x.unreadBy : [...new Set([...x.unreadBy, x.assigneeId])] } : x)), messages: [...(s.messages ?? []), ...msgs] })
    },
    /** US-INB-009: shared with the Notifications panel. */
    markMentionsRead(activityIds: string[], userId: string) {
      const s = state
      commit({ ...s, activities: s.activities.map((a) => (activityIds.includes(a.id) && a.mentions?.includes(userId) && !a.mentionReadBy?.includes(userId) ? { ...a, mentionReadBy: [...(a.mentionReadBy ?? []), userId] } : a)) })
    },

    // ---------- Certificates (CRT P1) ----------
    saveHolder(id: string | null, input: Omit<Holder, 'id' | 'status'> & { status?: Holder['status'] }, actorId: string) {
      const s = state
      if (!input.name.trim() || !input.address.trim() || !input.city.trim() || !input.state.trim()) throw new Error('Name and full address are required.')
      if (!/^\d{5}(-\d{4})?$/.test(input.zip)) throw new Error('Enter a 5-digit ZIP')
      if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error('Enter a valid email.')
      const holders = s.holders ?? []
      const hid = id ?? seq('hld-', holders)
      const next: Holder = { status: 'Active', type: 'Holder-only', ...(id ? holders.find((h) => h.id === id) : {}), ...input, id: hid }
      const prevH = id ? holders.find((h) => h.id === id) : undefined
      if (prevH && (prevH.address !== next.address || prevH.city !== next.city || prevH.zip !== next.zip)) next.addressChangedOffset = 0
      commit({ ...s, holders: id ? holders.map((h) => (h.id === id ? next : h)) : [...holders, next], activities: [...s.activities, activity(s, { accountId: input.accountId, type: 'system', subject: `Holder ${id ? 'updated' : 'added'}: ${next.name}`, body: null, createdById: actorId, linked: null })] })
      return hid
    },
    setHolderStatus(id: string, status: 'Active' | 'Inactive', actorId: string) {
      const s = state
      const h = must((s.holders ?? []).find((x) => x.id === id), 'Holder')
      commit({ ...s, holders: s.holders!.map((x) => (x.id === id ? { ...x, status } : x)), activities: [...s.activities, activity(s, { accountId: h.accountId, type: 'system', subject: `Holder ${status === 'Active' ? 'reactivated' : 'deactivated'}: ${h.name}`, body: null, createdById: actorId, linked: null })] })
    },

    /** US-CRT-005: no marks issues now; any ADDL INSD / SUBR WVD / P&NC goes to Principal review. */
    prepareCertificate(id: string, input: { marks: Record<string, CertMarks>; delivery: string; requireAi?: boolean; policyIds?: string[] }, actorId: string, now: Date = new Date()) {
      const s = state
      const c = must((s.certificates ?? []).find((x) => x.id === id), 'Certificate')
      if (c.status !== 'Requested') throw new Error('Only a Requested certificate can be prepared.')
      const policyIds = input.policyIds ?? c.policyIds
      if (!policyIds.length) throw new Error('Include at least one policy.')
      const anyMark = Object.values(input.marks).some((m) => m.ai || m.wvd || m.pnc)
      if (input.requireAi && !Object.values(input.marks).some((m) => m.ai)) throw new Error('This holder is an additional insured. Check ADDL INSD on at least one policy, or change the holder type.')
      const at = now.toISOString()
      const flags = { additionalInsured: Object.values(input.marks).some((m) => m.ai), waiver: Object.values(input.marks).some((m) => m.wvd), primaryNonContrib: Object.values(input.marks).some((m) => m.pnc) }
      const next = anyMark
        ? { ...c, ...flags, policyIds, marks: input.marks, delivery: input.delivery, status: 'Needs review' as const, preparedById: actorId, submittedById: actorId, submittedAt: at, history: [...(c.history ?? []), { at, text: `Submitted for review by ${userName(actorId)}`, byId: actorId }] }
        : { ...c, ...flags, policyIds, marks: input.marks, delivery: input.delivery, status: 'Issued' as const, preparedById: actorId, issuedById: actorId, issuedAt: at, issuedOffset: 0, history: [...(c.history ?? []), { at, text: `Issued by ${userName(actorId)} · sent to ${input.delivery || 'holder'}`, byId: actorId }] }
      commit({ ...s, certificates: s.certificates!.map((x) => (x.id === id ? next : x)), serviceRequests: next.status === 'Issued' ? closeLinkedSr(s, c.serviceRequestId, `Certificate ${c.id} issued.`) : s.serviceRequests })
    },

    /** US-CRT-007: a Principal who prepared, submitted, or requested it can't approve; Return needs a 10+ character note. */
    reviewCertificate(id: string, action: 'approve' | 'return' | 'withdraw', note: string | null, actorId: string, now: Date = new Date()) {
      const s = state
      const c = must((s.certificates ?? []).find((x) => x.id === id), 'Certificate')
      if (c.status !== 'Needs review') throw new Error('This certificate is not waiting for review.')
      const at = now.toISOString()
      if (action === 'withdraw') {
        if (c.submittedById !== actorId) throw new Error('Only the person who submitted it can withdraw it.')
        commit({ ...s, certificates: s.certificates!.map((x) => (x.id === id ? { ...x, status: 'Requested', history: [...(x.history ?? []), { at, text: `Withdrawn from review by ${userName(actorId)}`, byId: actorId }] } : x)) })
        return
      }
      const reviewer = s.users.find((u) => u.id === actorId)
      if (reviewer?.role !== 'principal') throw new Error('Only a Principal can review certificates.')
      if ([c.preparedById, c.submittedById, c.createdById].includes(actorId)) throw new Error('You prepared this certificate. Another Principal must review it.')
      if (action === 'return') {
        if ((note ?? '').trim().length < 10) throw new Error('Add a note of at least 10 characters.')
        commit({ ...s, certificates: s.certificates!.map((x) => (x.id === id ? { ...x, status: 'Requested', returnNote: note, history: [...(x.history ?? []), { at, text: `Returned by ${userName(actorId)}: ${note}`, byId: actorId }] } : x)) })
        return
      }
      commit({
        ...s,
        certificates: s.certificates!.map((x) => (x.id === id ? { ...x, status: x.reissueOfId ? 'Re-issued' : 'Issued', approvedById: actorId, issuedById: actorId, issuedAt: at, issuedOffset: 0, returnNote: null, history: [...(x.history ?? []), { at, text: `Approved and issued by ${userName(actorId)}`, byId: actorId }] } : x)),
        serviceRequests: closeLinkedSr(s, c.serviceRequestId, `Certificate ${c.id} issued.`),
      })
    },
    resendCertificate(id: string, actorId: string, now: Date = new Date()) {
      const s = state
      const c = must((s.certificates ?? []).find((x) => x.id === id), 'Certificate')
      const to = c.delivery || s.holders?.find((h) => h.id === c.holderId)?.email || 'the holder'
      commit({ ...s, certificates: s.certificates!.map((x) => (x.id === id ? { ...x, history: [...(x.history ?? []), { at: now.toISOString(), text: `Resent to ${to}`, byId: actorId }] } : x)), activities: [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `Certificate resent to ${to}`, body: null, createdById: actorId, linked: { kind: 'certificate', id } })] })
    },

    /** US-CRT-009: re-issue on renewal; flagged certificates go to review. Returns the counts for the toast. */
    /** US-CRT-010: re-issue one Certificate; only flags the original didn't have send it to review. */
    reissueCertificate(baseId: string, input: { marks: Record<string, CertMarks>; delivery: string; policyIds: string[] }, actorId: string, now: Date = new Date()) {
      const s = state
      const certs = s.certificates ?? []
      const c = must(certs.find((x) => x.id === baseId), 'Certificate')
      if ((c.status !== 'Issued' && c.status !== 'Re-issued') || c.replacedById) throw new Error('Only the latest issued Certificate can be re-issued.')
      if (!input.policyIds.length) throw new Error('Include at least one policy.')
      const had = (k: keyof CertMarks) => Object.values(c.marks ?? {}).some((m) => m[k]) || (k === 'ai' ? c.additionalInsured : k === 'wvd' ? c.waiver : c.primaryNonContrib)
      const added = (['ai', 'wvd', 'pnc'] as const).filter((k) => Object.values(input.marks).some((m) => m[k]) && !had(k))
      const review = added.length > 0
      const any = (k: keyof CertMarks) => Object.values(input.marks).some((m) => m[k])
      const at = now.toISOString()
      const nid = `CERT-${String(certs.reduce((m, x) => Math.max(m, Number(x.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0')}`
      const fresh = { ...c, id: nid, policyIds: input.policyIds, marks: input.marks, delivery: input.delivery, additionalInsured: any('ai'), waiver: any('wvd'), primaryNonContrib: any('pnc'), status: review ? ('Needs review' as const) : ('Re-issued' as const), reissueOfId: c.id, replacedById: null, createdOffset: 0, createdById: actorId, submittedById: review ? actorId : null, submittedAt: review ? at : null, issuedById: review ? null : actorId, issuedAt: review ? at : null, issuedOffset: review ? null : 0, history: [{ at, text: `Re-issue of ${c.id}${review ? ` · added ${added.map((k) => ({ ai: 'ADDL INSD', wvd: 'SUBR WVD', pnc: 'P&NC' })[k]).join(', ')}, sent for Principal review` : ` · issued by ${userName(actorId)}`}`, byId: actorId }] }
      commit({ ...s, certificates: [...certs.map((x) => (x.id === baseId ? { ...x, status: 'Replaced' as const, replacedById: nid, history: [...(x.history ?? []), { at, text: `Replaced by ${nid}`, byId: actorId }] } : x)), fresh], activities: [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `${c.id} re-issued as ${nid}${review ? ' (sent for review)' : ''}`, body: null, createdById: actorId, linked: { kind: 'certificate', id: nid } })] })
      return { id: nid, review }
    },
    reissueCertificates(ids: string[], actorId: string, now: Date = new Date()) {
      const s = state
      let certs = s.certificates ?? []
      let reissued = 0
      let review = 0
      const at = now.toISOString()
      for (const id of ids) {
        const c = must(certs.find((x) => x.id === id), 'Certificate')
        if (c.status !== 'Issued' && c.status !== 'Re-issued') continue
        const flagged = c.additionalInsured || c.waiver || c.primaryNonContrib
        const nid = `CERT-${String(certs.reduce((m, x) => Math.max(m, Number(x.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0')}`
        const policyIds = c.policyIds.map((pid) => s.policies.find((p) => p.id === pid)?.replacedByPolicyId ?? pid)
        const fresh = { ...c, id: nid, policyIds, status: flagged ? ('Needs review' as const) : ('Re-issued' as const), reissueOfId: c.id, replacedById: null, createdOffset: 0, createdById: actorId, submittedById: flagged ? actorId : null, submittedAt: flagged ? at : null, issuedById: flagged ? null : actorId, issuedAt: flagged ? null : at, issuedOffset: flagged ? null : 0, history: [{ at, text: `Re-issue of ${c.id}${flagged ? ' · sent for Principal review' : ` · issued by ${userName(actorId)}`}`, byId: actorId }] }
        certs = [...certs.map((x) => (x.id === id ? { ...x, status: 'Replaced' as const, replacedById: nid, history: [...(x.history ?? []), { at, text: `Replaced by ${nid}`, byId: actorId }] } : x)), fresh]
        if (flagged) review++
        else reissued++
      }
      const accountId = (s.certificates ?? []).find((c) => ids.includes(c.id))?.accountId
      commit({ ...s, certificates: certs, activities: accountId ? [...s.activities, activity(s, { accountId, type: 'system', subject: `${reissued} certificate${reissued === 1 ? '' : 's'} re-issued${review ? ` · ${review} sent for Principal review` : ''}`, body: null, createdById: actorId, linked: null })] : s.activities })
      return { reissued, review }
    },
    skipReissue(id: string, reason: string, actorId: string) {
      const s = state
      commit({ ...s, certificates: (s.certificates ?? []).map((x) => (x.id === id ? { ...x, noReissueReason: reason, history: [...(x.history ?? []), { at: new Date().toISOString(), text: `Not re-issued: ${reason}`, byId: actorId }] } : x)) })
    },

    // ---------- Claims (CLM P1) ----------
    submitClaim(id: string, via: NonNullable<Claim['submittedVia']>, actorId: string) {
      const s = state
      const c = must((s.claims ?? []).find((x) => x.id === id), 'Claim')
      if (c.status !== 'Reported') throw new Error('Only a Reported claim can be submitted.')
      const carrier = s.carriers.find((k) => k.id === s.policies.find((p) => p.id === c.policyId)?.carrierId)?.name ?? 'the carrier'
      commit({
        ...s,
        claims: s.claims!.map((x) => (x.id === id ? { ...x, status: 'Submitted to carrier', submittedVia: via, submittedOffset: 0, statusDates: { ...x.statusDates, 'Submitted to carrier': 0 }, events: [...(x.events ?? []), { offset: 0, text: `Submitted to ${carrier} by ${via}`, byId: actorId }] } : x)),
        serviceRequests: s.serviceRequests.map((r) => (r.id === c.serviceRequestId && r.status === 'New' ? { ...r, status: 'In progress' } : r)),
        activities: [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `Claim ${c.id} submitted to ${carrier} by ${via}`, body: null, createdById: actorId, linked: { kind: 'claim', id } })],
      })
    },
    recordClaimNumber(id: string, input: { number: string; adjuster: Claim['adjuster'] }, actorId: string) {
      const s = state
      const c = must((s.claims ?? []).find((x) => x.id === id), 'Claim')
      if (!/^[A-Za-z0-9-]{4,30}$/.test(input.number)) throw new Error('Use 4 to 30 letters, digits, or dashes.')
      if (c.status === 'Reported' || c.status === 'Closed') throw new Error('Submit the claim to the carrier first.')
      const adjuster = input.adjuster?.name ? { ...input.adjuster, assignedOffset: input.adjuster.assignedOffset ?? 0 } : c.adjuster ?? null
      const status = c.status === 'Open' ? 'Open' : adjuster?.name ? 'Open' : 'Claim # assigned'
      const changes = [c.carrierClaimNumber && c.carrierClaimNumber !== input.number ? `Claim # changed from ${c.carrierClaimNumber} to ${input.number}` : !c.carrierClaimNumber ? `Claim # ${input.number} recorded` : null, adjuster?.name && adjuster.name !== c.adjuster?.name ? `Adjuster ${c.adjuster?.name ? `changed from ${c.adjuster.name} to` : 'set to'} ${adjuster.name}` : null].filter(Boolean) as string[]
      commit({
        ...s,
        claims: s.claims!.map((x) => (x.id === id ? { ...x, carrierClaimNumber: input.number, adjuster, status, statusDates: { ...x.statusDates, [status]: x.statusDates?.[status] ?? 0, 'Claim # assigned': x.statusDates?.['Claim # assigned'] ?? 0 }, events: [...(x.events ?? []), ...changes.map((text) => ({ offset: 0, text, byId: actorId }))] } : x)),
        activities: changes.length ? [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `Claim ${c.id}: ${changes.join('; ')}`, body: null, createdById: actorId, linked: { kind: 'claim', id } })] : s.activities,
      })
    },
    closeClaim(id: string, input: { outcome: 'Paid' | 'Denied' | 'Withdrawn'; amount: number | null; note: string | null; denialReason: string | null; closedOffset?: number }, actorId: string) {
      const s = state
      const c = must((s.claims ?? []).find((x) => x.id === id), 'Claim')
      if (c.status !== 'Claim # assigned' && c.status !== 'Open') throw new Error('Record the carrier claim # before closing.')
      const closedOffset = input.closedOffset ?? 0
      if (c.submittedOffset != null && closedOffset < c.submittedOffset) throw new Error('Closed on can’t be before the claim was submitted.')
      commit({
        ...s,
        claims: s.claims!.map((x) => (x.id === id ? { ...x, status: 'Closed', outcome: input.outcome, paidAmount: input.outcome === 'Paid' ? input.amount : null, denialReason: input.outcome === 'Denied' ? input.denialReason : null, closeNote: input.note, closedOffset, statusDates: { ...x.statusDates, Closed: closedOffset }, events: [...(x.events ?? []), { offset: 0, text: `Closed · ${input.outcome}`, byId: actorId }] } : x)),
        activities: [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `Claim ${c.id} closed · ${input.outcome}${input.amount ? ` · $${input.amount.toLocaleString('en-US')}` : ''}`, body: input.note, createdById: actorId, linked: { kind: 'claim', id } })],
      })
    },
    reopenClaim(id: string, reason: string, actorId: string) {
      const s = state
      const c = must((s.claims ?? []).find((x) => x.id === id), 'Claim')
      if (c.status !== 'Closed') throw new Error('Only a closed claim can be reopened.')
      if ((c.closedOffset ?? 0) < -90) throw new Error('Closed more than 90 days ago. Report a new claim instead.')
      if (!reason.trim()) throw new Error('Add a reason.')
      commit({
        ...s,
        claims: s.claims!.map((x) => (x.id === id ? { ...x, status: x.carrierClaimNumber ? 'Open' : 'Reported', outcome: null, closedOffset: null, events: [...(x.events ?? []), { offset: 0, text: `Reopened: ${reason}`, byId: actorId }] } : x)),
        activities: [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `Claim ${c.id} reopened: ${reason}`, body: null, createdById: actorId, linked: { kind: 'claim', id } })],
      })
    },
    withdrawClaim(id: string, reason: string, actorId: string) {
      const s = state
      const c = must((s.claims ?? []).find((x) => x.id === id), 'Claim')
      if (c.status !== 'Reported') throw new Error('Only a claim not yet submitted can be withdrawn here.')
      if (!reason.trim()) throw new Error('Add a reason.')
      commit({
        ...s,
        claims: s.claims!.map((x) => (x.id === id ? { ...x, status: 'Closed', outcome: 'Withdrawn', withdrawReason: reason, closedOffset: 0, statusDates: { ...x.statusDates, Closed: 0 }, events: [...(x.events ?? []), { offset: 0, text: `Withdrawn: ${reason}`, byId: actorId }] } : x)),
        activities: [...s.activities, activity(s, { accountId: c.accountId, type: 'system', subject: `Claim ${c.id} withdrawn: ${reason}`, body: null, createdById: actorId, linked: { kind: 'claim', id } })],
      })
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
      const won = s.terms.filter((t) => t.source === 'fortify-won').length
      const last = s.syncRuns?.[0]
      const run = { id: `sync-${(s.syncRuns?.length ?? 0) + 1}`, at: new Date().toISOString(), status: 'Succeeded' as const, durationSec: 104, counts: { ...(last?.counts ?? {}), 'Renewal outcomes': decided.length, 'Won Terms matched': won }, skipped: 0 }
      commit({
        ...s,
        syncRuns: [run, ...(s.syncRuns ?? [])],
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
        const certId = `CERT-${String(certificates.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0), 122) + 1).padStart(4, '0')}`
        certificates = [...certificates, { id: certId, accountId: account.id, holderId, policyIds: d.policyIds as string[], additionalInsured: !!d.additionalInsured, waiver: !!d.waiver, primaryNonContrib: !!d.primaryNonContrib, operations: String(d.operations ?? ''), status: special ? 'Needs review' : 'Requested', serviceRequestId: id, createdOffset: 0, createdById: actorId, submittedById: special ? actorId : null, submittedAt: special ? now.toISOString() : null, history: [{ at: now.toISOString(), text: `Requested by ${userName(actorId)} (${id})`, byId: actorId }] }]
        linked.certificateId = certId
      }
      if (input.type === 'Claim report') {
        const claimId = `CL-${claims.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, "")) || 0), 2041) + 1}`
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
        serviceRequests: s.serviceRequests.map((x) => (x.id === id ? { ...x, status: to, dueAt, waitingSince, dueOffset: dueAt ? offsetOf(new Date(dueAt)) : x.dueOffset, resolution: to === 'Done' ? meta.resolution! : x.resolution, outcome: meta.outcome ?? x.outcome, doneOffset: to === 'Done' ? 0 : null } : x)),
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
      commit({ ...s, activities: [...s.activities, activity(s, { ...input, loggedAt: new Date().toISOString() })], accounts: s.accounts.map((a) => (a.id === input.accountId ? { ...a, lastActivityOffset: 0 } : a)) })
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
