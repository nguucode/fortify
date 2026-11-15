import type {
  Account,
  Activity,
  Dataset,
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
import { daysBetween } from '@/mock/dates'

/**
 * The mutable mock store (US-FND-005). Every action builds the next state and commits it once,
 * so a failure mid-action leaves no partial records and subscribers re-render once.
 * Dates are day offsets from `today`.
 */
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
        stage: 'New',
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

    markLost(opportunityId: string, reason: string, actorId: string) {
      const s = state
      const o = must(s.opportunities.find((x) => x.id === opportunityId), 'Opportunity')
      if (o.stage === 'Won' || o.stage === 'Lost') throw new Error('This Opportunity is closed.')
      commit({
        ...s,
        opportunities: s.opportunities.map((x) => (x.id === o.id ? { ...x, stage: 'Lost', lostReason: reason, stageEnteredOffset: 0, closedOffset: 0 } : x)),
        quotes: s.quotes.map((q) => (q.opportunityId === o.id && ['Requested', 'Quoted', 'Referred', 'Presented'].includes(q.status) ? { ...q, status: 'Not taken' } : q)),
        activities: [...s.activities, activity(s, { accountId: o.accountId, type: 'system', subject: `Opportunity marked Lost: ${reason}`, body: null, createdById: actorId, linked: { kind: 'opportunity', id: o.id } })],
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

    decideRenewal(renewalId: string, decision: NonNullable<Dataset['renewals'][number]['decision']>, actorId: string) {
      const s = state
      const r = must(s.renewals.find((x) => x.id === renewalId), 'Renewal')
      if (r.status !== 'Presented') throw new Error('Record a decision after the renewal is presented.')
      commit({
        ...s,
        renewals: s.renewals.map((x) => (x.id === r.id ? { ...x, status: 'Decided', decision } : x)),
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

    createServiceRequest(input: Pick<ServiceRequest, 'accountId' | 'policyId' | 'type' | 'subject' | 'description' | 'priority' | 'details'>, actorId: string) {
      const s = state
      const account = must(s.accounts.find((a) => a.id === input.accountId), 'Account')
      const max = s.serviceRequests.reduce((m, r) => Math.max(m, Number(r.id.slice(3))), 10482)
      const sr: ServiceRequest = {
        ...input,
        id: `SR-${max + 1}`,
        status: 'New',
        ownerId: account.accountManagerId,
        createdById: actorId,
        createdOffset: 0,
        dueOffset: input.priority === 'High' ? 0 : 1,
        resolution: null,
      }
      commit({
        ...s,
        serviceRequests: [...s.serviceRequests, sr],
        activities: [...s.activities, activity(s, { accountId: account.id, type: 'system', subject: `${userName(actorId)} opened ${sr.id}: ${sr.subject}`, body: null, createdById: actorId, linked: { kind: 'service', id: sr.id } })],
      })
      return sr.id
    },

    setServiceStatus(id: string, to: ServiceStatus, actorId: string, meta: { note?: string; resolution?: string } = {}) {
      const s = state
      const sr = must(s.serviceRequests.find((x) => x.id === id), 'Service Request')
      const check = canServiceTransition(sr.status, to, sr.status === 'Done' ? 0 : 0)
      if (!check.ok) throw new Error(check.reason)
      if (to === 'Done' && !meta.resolution?.trim()) throw new Error('Add a resolution before closing.')
      commit({
        ...s,
        serviceRequests: s.serviceRequests.map((x) => (x.id === id ? { ...x, status: to, resolution: to === 'Done' ? meta.resolution! : x.resolution } : x)),
        activities: [...s.activities, activity(s, { accountId: sr.accountId, type: 'system', subject: `${userName(actorId)} moved ${sr.id} from ${sr.status} to ${to}${meta.note ? `: ${meta.note}` : ''}`, body: null, createdById: actorId, linked: { kind: 'service', id: sr.id } })],
      })
    },

    logActivity(input: Omit<Activity, 'id' | 'occurredOffset'>) {
      const s = state
      commit({ ...s, activities: [...s.activities, activity(s, input)], accounts: s.accounts.map((a) => (a.id === input.accountId ? { ...a, lastActivityOffset: 0 } : a)) })
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
