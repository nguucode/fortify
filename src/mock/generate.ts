import { Faker, en_US, en, base } from '@faker-js/faker'
import type {
  AccountDocument,
  Certificate,
  Claim,
  Holder,
  Activity,
  InsuredItem,
  Lead,
  Opportunity,
  Quote,
  Renewal,
  ServiceRequest,
  SyncRun,
  Task,
  Account,
  Carrier,
  Contact,
  Dataset,
  Line,
  Office,
  Policy,
  Role,
  Term,
  User,
  UsState,
  XDate,
} from '../domain/types.ts'

/** Shared seed list: spec/ia/mock-data.md. Every name here is fictional. */
const OFFICES: Office[] = [
  { id: 'off-hou', name: 'Houston', city: 'Houston', state: 'TX', timeZone: 'America/Chicago' },
  { id: 'off-sat', name: 'San Antonio', city: 'San Antonio', state: 'TX', timeZone: 'America/Chicago' },
  { id: 'off-tpa', name: 'Tampa', city: 'Tampa', state: 'FL', timeZone: 'America/New_York' },
]

const CARRIERS: Carrier[] = [
  { id: 'car-lsm', name: 'Lone Star Mutual', naic: '41820', states: ['TX'], kinds: ['personal', 'commercial'], lines: ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'BOP', 'GL', 'Commercial auto'] },
  { id: 'car-ghi', name: 'Gulf Harbor Insurance', naic: '27365', states: ['TX', 'FL'], kinds: ['personal'], lines: ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat'] },
  { id: 'car-kcc', name: 'Keystone Commercial Casualty', naic: '19044', states: ['TX', 'FL'], kinds: ['commercial'], lines: ['BOP', 'GL', 'Commercial auto', 'Commercial umbrella'] },
  { id: 'car-gsi', name: 'Gulfstream Indemnity', naic: '33910', states: ['FL'], kinds: ['personal'], lines: ['Home', 'Condo'] },
  { id: 'car-pva', name: 'Pecan Valley Auto', naic: '12508', states: ['TX'], kinds: ['personal'], lines: ['Auto'] },
  { id: 'car-bfs', name: 'Bayfront Specialty', naic: '45117', states: ['TX', 'FL'], kinds: ['commercial'], lines: ['GL', 'Commercial umbrella'], note: 'E&S via wholesaler' },
  { id: 'car-mer', name: 'Meridian National', naic: '24786', states: ['TX', 'FL'], kinds: ['personal', 'commercial'], lines: ['Auto', 'Home', 'Umbrella', 'BOP', 'GL', 'Commercial auto', 'Commercial umbrella'] },
  { id: 'car-cwc', name: 'Copperline Workers Comp', naic: '38251', states: ['TX', 'FL'], kinds: ['commercial'], lines: ['WC'] },
  { id: 'car-ssr', name: 'Sunshine State Residual', naic: '10064', states: ['FL'], kinds: ['personal'], lines: ['Home'], note: 'FL insurer of last resort' },
  { id: 'car-tcw', name: 'Texas Coastal Windstorm Pool', naic: '30040', states: ['TX'], kinds: ['personal'], lines: ['Home'], note: 'TX windstorm pool' },
]

const PREFIX: Record<string, string> = {
  'car-lsm': 'LSM', 'car-ghi': 'GHI', 'car-kcc': 'KCC', 'car-gsi': 'GSI', 'car-pva': 'PVA',
  'car-bfs': 'BFS', 'car-mer': 'MER', 'car-cwc': 'CWC', 'car-ssr': 'SSR', 'car-tcw': 'TCW',
}

// [office, role, count]; named seed users come first in their bucket.
const STAFF: [string, Role, number, string[]][] = [
  ['off-hou', 'admin', 1, ['Priya Nair']],
  ['off-hou', 'principal', 1, ['Grant Holloway']],
  ['off-tpa', 'principal', 1, ['Elena Brooks']],
  ['off-hou', 'producer', 4, ['Dana Whitfield', 'Jordan Lee']],
  ['off-sat', 'producer', 2, []],
  ['off-tpa', 'producer', 4, []],
  ['off-hou', 'account-manager', 5, ['Marisol Reyes']],
  ['off-sat', 'account-manager', 3, []],
  ['off-tpa', 'account-manager', 4, []],
]

const PREMIUM: Record<Line, [number, number]> = {
  Auto: [900, 3200], Home: [2000, 6500], Umbrella: [250, 600], Renters: [150, 300], Condo: [800, 2500],
  Flood: [500, 3000], Boat: [300, 1200], BOP: [1500, 9000], GL: [1000, 15000], WC: [2000, 40000],
  'Commercial auto': [3000, 25000], 'Commercial umbrella': [1500, 8000],
}

const CITIES: Record<string, [string, string][]> = {
  'off-hou': [['Houston', '77019'], ['Katy', '77494'], ['Sugar Land', '77478'], ['Galveston', '77550'], ['Pearland', '77584'], ['The Woodlands', '77380']],
  'off-sat': [['San Antonio', '78209'], ['New Braunfels', '78130'], ['Boerne', '78006'], ['Schertz', '78154'], ['Corpus Christi', '78411']],
  'off-tpa': [['Tampa', '33606'], ['St. Petersburg', '33701'], ['Clearwater', '33755'], ['Brandon', '33511'], ['Sarasota', '34236'], ['Lakeland', '33803']],
}
const COASTAL = new Set(['Galveston', 'Corpus Christi', 'St. Petersburg', 'Clearwater', 'Sarasota'])

const BUSINESS_SUFFIX = ['LLC', 'Inc.', 'Co.', 'Group LLC', '& Sons', 'Services LLC']
const BUSINESS_TRADE = ['Roofing', 'Plumbing', 'HVAC', 'Landscaping', 'Dental', 'Bakery', 'Auto Repair', 'Electric', 'Marine Supply', 'Fitness', 'Logistics', 'Pet Grooming', 'Construction', 'Coffee Roasters']

export function generateDataset(seed = 20261115): Dataset {
  const f = new Faker({ locale: [en_US, en, base] })
  f.seed(seed)
  const pick = <T,>(xs: readonly T[]) => xs[f.number.int({ min: 0, max: xs.length - 1 })]
  const int = (min: number, max: number) => f.number.int({ min, max })
  const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, '0')}`

  // Users
  const users: User[] = []
  for (const [officeId, role, count, named] of STAFF) {
    for (let i = 0; i < count; i++) {
      const name = named[i] ?? f.person.fullName()
      users.push({
        id: id('usr', users.length + 1),
        name,
        role,
        officeId,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      })
    }
  }
  const byOffice = (officeId: string, role: Role) => users.filter((u) => u.officeId === officeId && u.role === role)

  const accounts: Account[] = []
  const contacts: Contact[] = []
  const policies: Policy[] = []
  const terms: Term[] = []
  const xDates: XDate[] = []

  const officeFor = (): Office => {
    const r = f.number.float({ min: 0, max: 1 })
    return r < 0.36 ? OFFICES[0] : r < 0.6 ? OFFICES[1] : OFFICES[2]
  }

  const addContact = (name: string, accountId: string): Contact => {
    const c: Contact = {
      id: id('con', contacts.length + 1),
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      phone: `(555) 010-${String(int(0, 9999)).padStart(4, '0')}`,
      accountIds: [accountId],
    }
    contacts.push(c)
    return c
  }

  const carrierFor = (line: Line, state: UsState, coastal: boolean): Carrier => {
    if (line === 'Home' && coastal && f.datatype.boolean({ probability: 0.25 })) {
      return CARRIERS.find((c) => c.id === (state === 'FL' ? 'car-ssr' : 'car-tcw'))!
    }
    const eligible = CARRIERS.filter((c) => c.lines.includes(line) && c.states.includes(state) && !c.note?.includes('last resort') && !c.note?.includes('windstorm'))
    return pick(eligible)
  }

  const addPolicy = (a: Account, line: Line, mode: 'client' | 'former') => {
    const carrier = carrierFor(line, a.state, a.coastal)
    const p: Policy = {
      id: id('pol', policies.length + 1),
      accountId: a.id,
      carrierId: carrier.id,
      line,
      policyNumber: `${PREFIX[carrier.id]}-${a.state}-${int(1000000, 9999999)}`,
    }
    policies.push(p)
    const [lo, hi] = PREMIUM[line]
    const coastalBump = a.coastal && (line === 'Home' || line === 'Condo') ? 1.6 : 1
    let premium = Math.round((int(lo, hi) * coastalBump) / 10) * 10
    const history = int(1, 3)
    // Current term ends between 1 and 365 days out; former clients' last term ended in the past.
    let expiration = mode === 'client' ? int(1, 365) : -int(30, 400)
    const chain: Term[] = []
    for (let i = 0; i < history; i++) {
      const isCurrent = i === 0
      chain.push({
        id: '',
        policyId: p.id,
        effectiveOffset: expiration - 365,
        expirationOffset: expiration,
        premium,
        status: isCurrent ? (mode === 'client' ? 'Active' : pick(['Expired', 'Canceled', 'Non-renewed'] as const)) : 'Renewed',
        pendingCancellation: false,
      })
      expiration -= 365
      premium = Math.round(premium / (1 + f.number.float({ min: 0, max: 0.12 })) / 10) * 10
    }
    for (const t of chain.reverse()) terms.push({ ...t, id: id('trm', terms.length + 1) })
  }

  const addXDate = (a: Account, line: Line) => {
    const others = CARRIERS.filter((c) => c.lines.includes(line))
    xDates.push({
      id: id('xdt', xDates.length + 1),
      accountId: a.id,
      line,
      currentCarrier: pick(['Captive carrier', ...others.map((c) => c.name)]),
      xDateOffset: int(-20, 330),
      premium: f.datatype.boolean({ probability: 0.7 }) ? Math.round(int(...PREMIUM[line]) / 10) * 10 : null,
      interestLevel: pick(['High', 'Medium', 'Medium', 'Low'] as const),
    })
  }

  const makeAccount = (kind: Account['kind'], name: string, office: Office, opts: Partial<Account> = {}): Account => {
    const [city, zip] = pick(CITIES[office.id])
    const a: Account = {
      id: id('acc', accounts.length + 1),
      name,
      kind,
      status: 'Prospect',
      officeId: office.id,
      producerId: pick(byOffice(office.id, 'producer')).id,
      accountManagerId: pick(byOffice(office.id, 'account-manager')).id,
      state: office.state,
      city,
      zip,
      coastal: COASTAL.has(city),
      primaryContactId: null,
      linkedAccountIds: [],
      createdOffset: -int(30, 2400),
      lastActivityOffset: f.datatype.boolean({ probability: 0.95 }) ? -int(0, 120) : null,
      lifecycle: 'active',
      ...opts,
    }
    accounts.push(a)
    return a
  }

  const PL_LINES: [Line, number][] = [['Auto', 45], ['Home', 35], ['Umbrella', 8], ['Renters', 4], ['Condo', 4], ['Flood', 2], ['Boat', 2]]
  const CL_LINES: Line[] = ['BOP', 'GL', 'WC', 'Commercial auto', 'Commercial umbrella']
  const weightedLine = () => {
    let r = int(1, 100)
    for (const [line, w] of PL_LINES) if ((r -= w) <= 0) return line
    return 'Auto' as Line
  }

  const populate = (a: Account, status: Account['status']) => {
    a.status = status
    if (a.kind === 'Household') {
      const lines = new Set<Line>()
      const n = int(2, 5)
      while (lines.size < n) lines.add(weightedLine())
      if (status !== 'Prospect') for (const l of lines) addPolicy(a, l, status === 'Client' ? 'client' : 'former')
      const gaps = (['Auto', 'Home', 'Umbrella'] as Line[]).filter((l) => !lines.has(l))
      if (status === 'Prospect') addXDate(a, pick([...lines]))
      else if (gaps.length && f.datatype.boolean({ probability: 0.45 })) addXDate(a, pick(gaps))
    } else {
      const lines = f.helpers.arrayElements(CL_LINES, int(2, 5))
      if (status !== 'Prospect') for (const l of lines) addPolicy(a, l, status === 'Client' ? 'client' : 'former')
      if (status === 'Prospect') addXDate(a, lines[0])
    }
  }

  const statusRoll = (): Account['status'] => {
    const r = int(1, 100)
    return r <= 68 ? 'Client' : r <= 92 ? 'Prospect' : 'Former client'
  }

  // Hand-made edge cases first so they keep stable ids.
  const houston = OFFICES[0]
  const dana = users.find((u) => u.name === 'Dana Whitfield')!
  const marisol = users.find((u) => u.name === 'Marisol Reyes')!
  const torresHH = makeAccount('Household', 'Torres Household', houston, { producerId: dana.id, accountManagerId: marisol.id, city: 'Houston', zip: '77019', coastal: false })
  const torresBiz = makeAccount('Business', 'Torres Roofing LLC', houston, { producerId: dana.id, accountManagerId: marisol.id, city: 'Houston', zip: '77019', coastal: false })
  torresHH.linkedAccountIds.push(torresBiz.id)
  torresBiz.linkedAccountIds.push(torresHH.id)
  torresHH.status = 'Client'
  torresBiz.status = 'Client'
  for (const l of ['Auto', 'Home'] as Line[]) addPolicy(torresHH, l, 'client')
  for (const l of ['GL', 'WC', 'Commercial auto', 'Commercial umbrella'] as Line[]) addPolicy(torresBiz, l, 'client')
  addXDate(torresHH, 'Umbrella')
  const mike = addContact('Mike Torres', torresHH.id)
  mike.accountIds.push(torresBiz.id)
  torresHH.primaryContactId = mike.id
  torresBiz.primaryContactId = mike.id
  addContact('Ana Torres', torresHH.id)

  const longName = makeAccount('Household', 'Bartholomew-Vanderslice Family Revocable Living Trust', OFFICES[2])
  populate(longName, 'Client')
  longName.primaryContactId = addContact('Margaret Bartholomew-Vanderslice', longName.id).id
  const noContact = makeAccount('Business', 'Seaside Marine Supply Co.', OFFICES[2])
  populate(noContact, 'Prospect')

  while (accounts.filter((a) => a.kind === 'Household').length < 480) {
    const office = officeFor()
    const last = f.person.lastName()
    const a = makeAccount('Household', `${last} Household`, office)
    populate(a, statusRoll())
    const members = int(1, 4)
    for (let i = 0; i < members; i++) {
      const c = addContact(`${f.person.firstName()} ${last}`, a.id)
      if (i === 0) a.primaryContactId = c.id
    }
  }
  while (accounts.filter((a) => a.kind === 'Business').length < 120) {
    const office = officeFor()
    const a = makeAccount('Business', `${f.person.lastName()} ${pick(BUSINESS_TRADE)} ${pick(BUSINESS_SUFFIX)}`, office)
    populate(a, statusRoll())
    const n = int(1, 3)
    for (let i = 0; i < n; i++) {
      const c = addContact(f.person.fullName(), a.id)
      if (i === 0) a.primaryContactId = c.id
    }
  }

  // Status is derived, never rolled: Client exactly when a Term is live (object-model.md lifecycle).
  const liveAccounts = new Set(
    terms.filter((t) => t.status === 'Active' || t.status === 'Bound').map((t) => policies.find((p) => p.id === t.policyId)!.accountId),
  )
  for (const a of accounts) {
    if (liveAccounts.has(a.id)) a.status = 'Client'
    else if (a.status === 'Client') a.status = 'Former client'
  }

  // Archived and merged Accounts for the Admin-only "Include archived" filter (US-ACC-001).
  const candidates = accounts.filter((a) => a.status !== 'Client' && a.linkedAccountIds.length === 0).slice(-4)
  candidates.forEach((a, i) => (a.lifecycle = i < 3 ? 'archived' : 'merged'))
  noContact.lastActivityOffset = null


  // ---- Selling, retention, service, and work (P0 demo loop) ----
  const leads: Lead[] = []
  const opportunities: Opportunity[] = []
  const quotes: Quote[] = []
  const renewals: Renewal[] = []
  const serviceRequests: ServiceRequest[] = []
  const activities: Activity[] = []
  const tasks: Task[] = []
  const live = accounts.filter((a) => a.lifecycle === 'active')
  const policiesByAccount = new Map<string, Policy[]>()
  for (const p of policies) policiesByAccount.set(p.accountId, [...(policiesByAccount.get(p.accountId) ?? []), p])
  const plLines: Line[] = ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat']
  const clLines: Line[] = ['BOP', 'GL', 'WC', 'Commercial auto', 'Commercial umbrella']
  const carrierFor2 = (line: Line, state: UsState) => CARRIERS.filter((c) => c.lines.includes(line) && c.states.includes(state) && !c.note)

  // Leads: 180, mostly open; qualified ones point at an Account.
  const SOURCES = ['Web form', 'Phone', 'Referral', 'Trusted Choice', 'Purchased list'] as const
  for (let i = 0; i < 180; i++) {
    const office = officeFor()
    const kind = f.datatype.boolean({ probability: 0.8 }) ? 'Household' : 'Business'
    const name = f.person.fullName()
    const roll = int(1, 100)
    const status = roll <= 35 ? 'New' : roll <= 70 ? 'Contacted' : roll <= 85 ? 'Qualified' : 'Disqualified'
    const target = status === 'Qualified' ? pick(live.filter((a) => a.officeId === office.id)) : null
    const [city] = pick(CITIES[office.id])
    leads.push({
      id: id('lea', i + 1),
      name,
      kind,
      businessName: kind === 'Business' ? `${name.split(' ').pop()} ${pick(BUSINESS_TRADE)} ${pick(BUSINESS_SUFFIX)}` : null,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      phone: `(555) 010-${String(int(0, 9999)).padStart(4, '0')}`,
      state: office.state,
      city,
      officeId: office.id,
      source: pick(SOURCES),
      linesOfInterest: f.helpers.arrayElements(kind === 'Household' ? plLines.slice(0, 3) : clLines.slice(0, 4), int(1, 2)),
      currentCarrier: f.datatype.boolean({ probability: 0.5 }) ? pick(CARRIERS).name : null,
      xDateOffset: f.datatype.boolean({ probability: 0.35 }) ? int(20, 300) : null,
      assigneeId: f.datatype.boolean({ probability: 0.85 }) ? pick(byOffice(office.id, 'producer')).id : null,
      status,
      disqualifyReason: status === 'Disqualified' ? pick(['No response', 'Not interested', 'Bought elsewhere', 'Price only']) : null,
      // New Leads are fresh (agencies work them within hours); a few are days old and get the stale warning.
      createdOffset: status === 'New' ? (f.datatype.boolean({ probability: 0.6 }) ? 0 : -int(1, 3)) : -int(0, 40),
      attempts: status === 'New' ? [] : Array.from({ length: int(1, 3) }, () => ({ offset: -int(0, 20), channel: pick(['Call', 'Email', 'SMS'] as const), outcome: pick(['Connected', 'Left voicemail', 'No answer']) })),
      qualifiedAccountId: target?.id ?? null,
      qualifiedOpportunityId: null,
    })
  }
  // Two seeded duplicate scenarios for the Qualify demo: one matches Mike Torres by phone.
  leads[0] = { ...leads[0], name: 'Michael Torres', kind: 'Business', businessName: 'Torres Roofing, L.L.C.', phone: contacts.find((c) => c.name === 'Mike Torres')!.phone, officeId: 'off-hou', state: 'TX', city: 'Houston', status: 'New', assigneeId: dana.id, linesOfInterest: ['BOP'], attempts: [], qualifiedAccountId: null, disqualifyReason: null, createdOffset: 0 }
  leads[1] = { ...leads[1], name: 'Rosa Delgado', kind: 'Household', businessName: null, officeId: 'off-hou', state: 'TX', city: 'Houston', status: 'Contacted', assigneeId: dana.id, linesOfInterest: ['Auto', 'Home'], qualifiedAccountId: null, disqualifyReason: null, attempts: [{ offset: -3, channel: 'Call', outcome: 'Left voicemail' }, { offset: -1, channel: 'Call', outcome: 'Connected' }] }

  // Opportunities: 220 across stages; Quotes about 2 per Opportunity past New.
  const STAGES = ['New', 'Contacted', 'Gathering info', 'Quoting', 'Quoting', 'Quoting', 'Proposed', 'Proposed', 'Won', 'Lost'] as const
  for (let i = 0; i < 220; i++) {
    const a = pick(live)
    const isClient = a.status === 'Client'
    const owned = new Set((policiesByAccount.get(a.id) ?? []).map((p) => p.line))
    const pool = (a.kind === 'Household' ? plLines.slice(0, 3) : clLines).filter((l) => !owned.has(l))
    const lines = f.helpers.arrayElements(pool.length ? pool : a.kind === 'Household' ? ['Umbrella' as Line] : ['Commercial umbrella' as Line], int(1, Math.min(2, Math.max(1, pool.length))))
    const stage = pick(STAGES)
    const o: Opportunity = {
      id: id('opp', i + 1),
      accountId: a.id,
      type: isClient ? (f.datatype.boolean({ probability: 0.25 }) ? 'Remarket' : 'Cross-sell') : 'New business',
      stage,
      stageEnteredOffset: -int(0, 25),
      lines,
      ownerId: a.producerId,
      estimatedPremium: lines.reduce((sum, l) => sum + Math.round(int(...PREMIUM[l]) / 10) * 10, 0),
      targetCloseOffset: stage === 'Won' || stage === 'Lost' ? -int(1, 60) : int(5, 75),
      source: pick(['Referral', 'Web form', 'X-date', 'Renewal', 'Cross-sell review']),
      lostReason: stage === 'Lost' ? pick(['Price', 'Coverage', 'Stayed with incumbent', 'No decision']) : null,
      renewalId: null,
      leadId: null,
      createdOffset: -int(5, 90),
      closedOffset: stage === 'Won' || stage === 'Lost' ? -int(1, 30) : null,
    }
    opportunities.push(o)
    if (['New', 'Contacted', 'Gathering info'].includes(stage)) continue
    const nQuotes = int(2, 4)
    const usedCarriers = new Set<string>()
    for (let k = 0; k < nQuotes; k++) {
      const choices = [...new Set(lines.flatMap((l) => carrierFor2(l, a.state)))].filter((c) => !usedCarriers.has(c.id))
      if (!choices.length) break
      const c = pick(choices)
      usedCarriers.add(c.id)
      const quoted = stage !== 'Quoting' || f.datatype.boolean({ probability: 0.6 })
      const declined = !quoted && f.datatype.boolean({ probability: 0.3 })
      let status: Quote['status'] = declined ? 'Declined' : quoted ? 'Quoted' : 'Requested'
      if (stage === 'Proposed' && status === 'Quoted') status = 'Presented'
      if (stage === 'Won') status = k === 0 ? 'Accepted' : 'Not taken'
      if (stage === 'Lost' && status !== 'Declined') status = 'Not taken'
      quotes.push({
        id: id('quo', quotes.length + 1),
        opportunityId: o.id,
        carrierId: c.id,
        status,
        lines: lines.map((line) => ({ line, premium: status === 'Requested' || status === 'Declined' ? null : Math.round(int(...PREMIUM[line]) / 10) * 10, accepted: status === 'Accepted' })),
        fees: status === 'Requested' ? 0 : pick([0, 25, 50, 75]),
        declineReason: status === 'Declined' ? pick(['Outside appetite', 'Loss history', 'Roof age over 15 years']) : null,
        warnings: [],
        requestedOffset: o.createdOffset + int(1, 5),
        validUntilOffset: status === 'Quoted' || status === 'Presented' ? int(-3, 30) : null,
        presentedOffset: status === 'Presented' ? -int(0, 10) : null,
      })
    }
  }
  // The showcase: Torres Household has an open Umbrella Cross-sell with two Quoted carriers.
  {
    const o: Opportunity = { id: id('opp', opportunities.length + 1), accountId: torresHH.id, type: 'Cross-sell', stage: 'Quoting', stageEnteredOffset: -3, lines: ['Umbrella'], ownerId: dana.id, estimatedPremium: 420, targetCloseOffset: 21, source: 'X-date', lostReason: null, renewalId: null, leadId: null, createdOffset: -12, closedOffset: null }
    opportunities.push(o)
    for (const [cid, prem] of [['car-lsm', 410], ['car-ghi', 455]] as const)
      quotes.push({ id: id('quo', quotes.length + 1), opportunityId: o.id, carrierId: cid, status: 'Quoted', lines: [{ line: 'Umbrella', premium: prem, accepted: false }], fees: 25, declineReason: null, warnings: [], requestedOffset: -8, validUntilOffset: 22, presentedOffset: null })
  }

  // Renewals: every Active Term inside its window gets one (rules.md windows).
  const policyById = new Map(policies.map((p) => [p.id, p]))
  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const commercialPremium = new Map<string, number>()
  for (const t of terms) {
    if (t.status !== 'Active') continue
    const p = policyById.get(t.policyId)!
    if (clLines.includes(p.line)) commercialPremium.set(p.accountId, (commercialPremium.get(p.accountId) ?? 0) + t.premium)
  }
  const RSTAT = ['Upcoming', 'Upcoming', 'In review', 'In review', 'Remarketing', 'Presented', 'Decided'] as const
  for (const t of terms) {
    if (t.status !== 'Active') continue
    const p = policyById.get(t.policyId)!
    const a = accountById.get(p.accountId)!
    if (a.lifecycle !== 'active') continue
    const commercial = clLines.includes(p.line)
    const segment: Renewal['segment'] = commercial
      ? (commercialPremium.get(a.id) ?? 0) >= 25000 ? 'large-commercial' : 'small-commercial'
      : a.state === 'FL' && ['Home', 'Condo'].includes(p.line) ? 'fl-residential-property' : 'personal'
    const window = { personal: 45, 'fl-residential-property': 120, 'small-commercial': 60, 'large-commercial': 90 }[segment]
    if (t.expirationOffset > window) continue
    const status = t.expirationOffset > window - 10 ? 'Upcoming' : pick(RSTAT)
    const change = f.number.float({ min: -0.06, max: 0.22 })
    renewals.push({
      id: id('ren', renewals.length + 1),
      accountId: a.id,
      policyId: p.id,
      termId: t.id,
      status,
      segment,
      ownerId: a.accountManagerId,
      renewalPremium: status === 'Upcoming' && f.datatype.boolean({ probability: 0.5 }) ? null : Math.round((t.premium * (1 + change)) / 10) * 10,
      decision: status === 'Decided' ? pick(['Renew as is', 'Renew as is', 'Rewrite'] as const) : null,
      decisionCarrierId: null,
      remarketOpportunityId: null,
      createdOffset: t.expirationOffset - window,
    })
  }
  // The +38% FL home renewal the stories reference (mock-data.md edge cases).
  const flHome = renewals.find((r) => r.segment === 'fl-residential-property')
  if (flHome) {
    const t = terms.find((x) => x.id === flHome.termId)!
    flHome.renewalPremium = Math.round((t.premium * 1.38) / 10) * 10
    flHome.status = 'In review'
  }

  // Service Requests: 300 across types and statuses, sequential from SR-10183 so new ones start at SR-10483.
  const TYPES = ['Policy change', 'Policy change', 'Policy change', 'Certificate request', 'Claim report', 'ID card / evidence', 'Billing question', 'Cancellation request', 'General'] as const
  const SSTAT = ['New', 'In progress', 'In progress', 'Waiting on carrier', 'Waiting on client', 'Done', 'Done', 'Done'] as const
  const SUBJECT: Record<string, string[]> = {
    'Policy change': ['Add 2024 Ford F-150', 'Remove driver Kyle', 'Change mailing address', 'Add mortgagee', 'Raise liability limits'],
    'Certificate request': ['COI for Lakeside Mall project', 'COI for Harris County job', 'COI with additional insured'],
    'Claim report': ['Hail damage to roof', 'Rear-ended on I-10', 'Water leak in kitchen'],
    'ID card / evidence': ['ID cards for new vehicle', 'Evidence of insurance for lender'],
    'Billing question': ['Why did my premium go up?', 'Update card on file'],
    'Cancellation request': ['Cancel boat policy, sold the boat', 'Cancel renters, moved out'],
    General: ['Question about deductible', 'Review coverage before renewal'],
  }
  const DESC: Record<string, string> = {
    'Policy change': 'Client asked for this change by phone. Confirm the effective date and send the endorsement request to the carrier.',
    'Certificate request': 'Certificate holder details came in by email. Check the contract wording for additional insured and waiver of subrogation.',
    'Claim report': 'Client reported the loss by phone. Get photos and the date of loss, then file the first notice with the carrier.',
    'ID card / evidence': 'Client needs proof of coverage. Pull the current declarations and send the document by email.',
    'Billing question': 'Client called about billing. Pull the carrier invoice and explain the change, or update the payment method.',
    'Cancellation request': 'Client asked to cancel. Get a signed cancellation request and confirm any return premium with the carrier.',
    General: 'Client question that needs a call back. Review the policy before calling.',
  }
  const withPolicies = live.filter((a) => policiesByAccount.has(a.id))
  for (let i = 0; i < 300; i++) {
    const a = pick(withPolicies)
    const type = pick(TYPES)
    const status = pick(SSTAT)
    // Open requests are recent; only Done ones reach back two months, so the board is not a wall of overdue cards.
    const created = status === 'Done' ? -int(0, 60) : -int(0, 8)
    serviceRequests.push({
      id: `SR-${10183 + i}`,
      accountId: a.id,
      policyId: pick(policiesByAccount.get(a.id)!).id,
      type,
      subject: pick(SUBJECT[type]),
      description: DESC[type],
      priority: f.datatype.boolean({ probability: 0.2 }) ? 'High' : 'Normal',
      status,
      ownerId: a.accountManagerId,
      createdById: a.accountManagerId,
      createdOffset: created,
      // Open requests spread from a few days overdue to two weeks out, so red still means something.
      dueOffset: status === 'Done' ? created + int(0, 3) : created + int(3, 16),
      resolution: status === 'Done' ? 'Completed and confirmed with the client.' : null,
      details: {},
    })
  }

  // Activities and Tasks: a light history per Account (kept small to keep the bundle reasonable).
  const ACT = ['call', 'call', 'email', 'note', 'meeting', 'sms'] as const
  for (const a of live) {
    const n = int(1, 6)
    for (let k = 0; k < n; k++) {
      const type = pick(ACT)
      activities.push({
        id: id('act', activities.length + 1),
        accountId: a.id,
        type,
        subject: type === 'call' ? pick(['Call: reviewed coverage', 'Call: left voicemail', 'Call: discussed renewal']) : type === 'email' ? 'Email: sent quote summary' : type === 'meeting' ? 'Meeting: annual review' : type === 'sms' ? 'SMS: reminder sent' : 'Note: prefers email',
        body: null,
        occurredOffset: a.lastActivityOffset !== null ? a.lastActivityOffset - k * int(3, 20) : -int(30, 200),
        createdById: f.datatype.boolean() ? a.producerId : a.accountManagerId,
        linked: null,
      })
    }
  }
  for (let i = 0; i < 600; i++) {
    const a = pick(live)
    const type = pick(['General', 'Call', 'Call', 'Email', 'Meeting'] as const)
    tasks.push({
      id: id('tsk', i + 1),
      accountId: a.id,
      title: type === 'Call' ? `Call ${a.name.replace(' Household', '')} about coverage` : type === 'Email' ? 'Send renewal summary' : type === 'Meeting' ? 'Annual review meeting' : 'Follow up on documents',
      type,
      priority: f.datatype.boolean({ probability: 0.2 }) ? 'High' : 'Normal',
      source: pick(['Manual', 'Manual', 'X-date', 'Renewal', 'Service Request', 'Lead'] as const),
      assigneeId: f.datatype.boolean() ? a.producerId : a.accountManagerId,
      dueOffset: int(-10, 30),
      status: pick(['Open', 'Open', 'Open', 'Done'] as const),
      linked: null,
    })
  }

  const { insuredItems, documents } = enrich(seed, { accounts, contacts, policies, terms, users, tasks, leads })
  enrichPolicies(seed, { accounts, policies, terms, insuredItems })
  const { holders, certificates, claims } = enrichService(seed, { accounts, policies, terms, serviceRequests, users })
  const syncRuns = enrichPeople(seed, users)
  // US-PIP-013: a commission schedule per carrier and line (deterministic, no RNG so nothing else shifts).
  const BASE_RATE: Partial<Record<Line, number>> = { Auto: 0.1, Home: 0.15, Umbrella: 0.15, Renters: 0.15, Condo: 0.15, Flood: 0.15, Boat: 0.12, BOP: 0.15, GL: 0.12, WC: 0.08, 'Commercial auto': 0.1, 'Commercial umbrella': 0.12 }
  const carriers = CARRIERS.map((c, i) => ({ ...c, commission: Object.fromEntries(c.lines.map((l) => [l, Math.round(((BASE_RATE[l] ?? 0.12) + ((i % 3) - 1) * 0.01) * 1000) / 1000])) }))
  return { offices: OFFICES, users, carriers, accounts, contacts, policies, terms, xDates, leads, opportunities, quotes, renewals, serviceRequests, activities, tasks, insuredItems, documents, holders, certificates, claims, syncRuns }
}

/**
 * ACC P1 enrichment (details, contact fields, insured items, documents). Runs on its own seeded Faker after the
 * main pass, so adding it changed none of the records generated before it.
 */
function enrich(seed: number, d: Pick<Dataset, 'accounts' | 'contacts' | 'policies' | 'terms' | 'users' | 'tasks' | 'leads'>) {
  const f = new Faker({ locale: [en_US, en, base] })
  f.seed(seed + 7)
  const int = (a: number, b: number) => f.number.int({ min: a, max: b })
  const pick = <T,>(xs: readonly T[]) => f.helpers.arrayElement(xs)
  const COUNTY: Record<string, string> = { TX: 'Harris County', FL: 'Hillsborough County' }
  const NAICS: [string, string][] = [['238160', 'Roofing contractors'], ['238220', 'Plumbing and HVAC contractors'], ['722511', 'Full-service restaurants'], ['561730', 'Landscaping services'], ['621210', 'Offices of dentists'], ['811111', 'General automotive repair'], ['713940', 'Fitness centers'], ['484110', 'General freight trucking, local']]
  const street = () => `${int(100, 9999)} ${f.location.street()}`
  for (const a of d.accounts) {
    const base = { street: street(), county: a.state === 'FL' ? (a.coastal ? 'Pinellas County' : 'Hillsborough County') : COUNTY[a.state] ?? 'Harris County', preferredContact: pick(['Phone', 'Phone', 'Email', 'SMS'] as const), source: pick(['Referral', 'Web form', 'Phone', 'Walk-in', 'Trusted Choice', 'X-date list']) }
    if (a.kind === 'Household') a.details = base
    else {
      // Match the trade in the name when there is one (Roofing -> roofing contractors), otherwise pick.
      const KEY: [RegExp, number][] = [[/roof/i, 0], [/plumb|hvac/i, 1], [/restaurant|grill|cafe|kitchen/i, 2], [/landscap|lawn/i, 3], [/dental|dentist/i, 4], [/auto|repair/i, 5], [/fitness|gym/i, 6], [/truck|freight|haul/i, 7]]
      const hit = KEY.find(([re]) => re.test(a.name))
      const roll = pick(NAICS)
      const [naics, desc] = hit ? NAICS[hit[1]] : roll
      const employees = int(2, 60)
      a.details = {
        ...base,
        legalName: a.name.replace(/ LLC$| Inc\.?$/, '') + (a.name.endsWith('LLC') ? ', LLC' : a.name.endsWith('Inc.') ? ', Inc.' : ''),
        dba: f.datatype.boolean({ probability: 0.25 }) ? a.name.split(' ')[0] + ' Services' : null,
        entityType: a.name.endsWith('LLC') ? 'LLC' : a.name.endsWith('Inc.') ? 'Corporation' : pick(['LLC', 'Corporation', 'Partnership', 'Sole proprietor'] as const),
        fein4: String(int(1000, 9999)),
        naics,
        naicsDescription: desc,
        yearsInBusiness: int(1, 35),
        employees,
        revenue: Math.round((employees * int(80, 220)) / 10) * 10_000,
        payroll: Math.round((employees * int(32, 70)) / 10) * 10_000,
        website: f.datatype.boolean({ probability: 0.7 }) ? `www.${a.name.toLowerCase().replace(/[^a-z]+/g, '')}.example` : null,
        wcStatus: a.state === 'TX' && f.datatype.boolean({ probability: 0.25 }) ? 'Non-subscriber (TX)' : f.datatype.boolean({ probability: 0.1 }) ? 'Exempt' : 'Covered',
        dwc005Offset: null,
      }
      if (a.details.wcStatus === 'Non-subscriber (TX)') a.details.dwc005Offset = f.datatype.boolean({ probability: 0.6 }) ? -int(200, 300) : -int(400, 500)
    }
  }
  const byId = new Map(d.accounts.map((a) => [a.id, a]))
  for (const c of d.contacts) {
    const parts = c.name.replace(/^(Mr|Mrs|Ms|Dr|Miss)\.? /, '').split(' ')
    c.firstName = parts[0]
    c.lastName = parts.slice(1).join(' ') || parts[0]
    c.suffix = null
    c.workPhone = f.datatype.boolean({ probability: 0.3 }) ? `(555) 020-${String(int(0, 9999)).padStart(4, '0')}` : null
    c.dobOffset = byId.get(c.accountIds[0])?.kind === 'Household' ? -int(22 * 365, 75 * 365) : null
    c.preferredContact = pick(['Phone', 'Email', 'SMS'] as const)
    c.smsConsent = pick([{ state: 'Opted in', offset: -int(30, 900) }, { state: 'Unknown', offset: null }, { state: 'Unknown', offset: null }, { state: 'Opted out', offset: -int(10, 400) }] as const)
    c.street = null
    c.relationships = Object.fromEntries(c.accountIds.map((aid) => {
      const a = byId.get(aid)
      const primary = a?.primaryContactId === c.id
      return [aid, a?.kind === 'Business' ? (primary ? 'Owner' : pick(['Officer', 'Employee', 'Billing contact'])) : primary ? 'Primary' : pick(['Spouse or partner', 'Child', 'Other relative'])]
    }))
  }

  const insuredItems: InsuredItem[] = []
  const documents: AccountDocument[] = []
  const live = new Set(d.terms.filter((t) => t.status === 'Active' || t.status === 'Bound').map((t) => t.policyId))
  const MAKES: [string, string[]][] = [['Ford', ['F-150', 'Explorer', 'Escape']], ['Toyota', ['Camry', 'RAV4', 'Tacoma']], ['Honda', ['Civic', 'CR-V', 'Accord']], ['Chevrolet', ['Silverado', 'Equinox']], ['Tesla', ['Model 3', 'Model Y']]]
  const iid = () => `itm-${String(insuredItems.length + 1).padStart(5, '0')}`
  const did = () => `doc-${String(documents.length + 1).padStart(5, '0')}`
  for (const p of d.policies) {
    const a = byId.get(p.accountId)!
    if (!live.has(p.id)) continue
    if (p.line === 'Auto') {
      for (let k = 0; k < int(1, 3); k++) {
        const [make, models] = pick(MAKES)
        insuredItems.push({ id: iid(), policyId: p.id, accountId: a.id, kind: 'Vehicle', year: int(2012, 2026), make, model: pick(models), vin4: String(int(1000, 9999)) })
      }
      for (let k = 0; k < int(1, 3); k++) insuredItems.push({ id: iid(), policyId: p.id, accountId: a.id, kind: 'Driver', name: `${f.person.firstName()} ${a.name.replace(' Household', '')}`, age: int(17, 78) })
    }
    if (p.line === 'Home' || p.line === 'Condo') {
      const fl = a.state === 'FL' && a.coastal
      const value = int(18, 70) * 10_000
      insuredItems.push({ id: iid(), policyId: p.id, accountId: a.id, kind: 'Property', address: `${a.details!.street}, ${a.city}, ${a.state} ${a.zip}`, yearBuilt: int(1962, 2022), hurricaneDeductiblePct: fl ? 2 : undefined, hurricaneDeductible: fl ? Math.round(value * 0.02) : undefined, windMitOffset: fl ? -int(200, 2600) : null, wpi8: a.state === 'TX' && a.coastal ? `WPI8-${int(100000, 999999)}` : null })
    }
    if (a.kind === 'Business' && (p.line === 'BOP' || p.line === 'GL')) {
      for (let k = 0; k < int(1, 3); k++) insuredItems.push({ id: iid(), policyId: p.id, accountId: a.id, kind: 'Location', number: k + 1, address: `${street()}, ${a.city}, ${a.state}`, occupancy: pick(['Office', 'Warehouse', 'Retail', 'Shop']), buildingValue: int(20, 180) * 10_000 })
    }
    documents.push({ id: did(), accountId: a.id, name: `${p.policyNumber} Declarations.pdf`, type: 'Declarations', source: 'AMS', linked: { kind: 'policy', id: p.id, label: `Policy ${p.policyNumber}` }, addedById: null, addedOffset: -int(5, 300), size: int(120, 900) * 1024 })
    if (p.line === 'Auto') documents.push({ id: did(), accountId: a.id, name: `${p.policyNumber} ID cards.pdf`, type: 'ID card', source: 'AMS', linked: { kind: 'policy', id: p.id, label: `Policy ${p.policyNumber}` }, addedById: null, addedOffset: -int(5, 300), size: int(80, 300) * 1024 })
  }
  for (const a of d.accounts) {
    if (f.datatype.boolean({ probability: 0.35 })) {
      const t = pick(['Application', 'Signed proposal', 'Loss run', 'Photo', 'Correspondence'] as const)
      documents.push({ id: did(), accountId: a.id, name: `${t} - ${a.name}.${t === 'Photo' ? 'jpg' : 'pdf'}`, type: t, source: 'Uploaded', linked: null, addedById: f.datatype.boolean() ? a.producerId : a.accountManagerId, addedOffset: -int(1, 400), size: int(60, 4000) * 1024 })
    }
  }
  // US-LEA-004: Producers hold a license in their Office's state; about a third also hold the other state.
  const officeState: Record<string, UsState> = { 'off-hou': 'TX', 'off-sat': 'TX', 'off-tpa': 'FL' }
  for (const u of d.users) if (u.role === 'producer') {
    const home = officeState[u.officeId] ?? 'TX'
    u.licenses = f.datatype.boolean({ probability: 0.35 }) ? ['TX', 'FL'] : [home]
  }
  // US-LEA-005: SMS consent on web-form and referral leads; some follow-ups scheduled.
  for (const l of d.leads) {
    l.smsConsent = (l.source === 'Web form' || l.source === 'Referral') && f.datatype.boolean({ probability: 0.6 })
    if (l.status === 'Contacted') l.followUpOffset = f.datatype.boolean({ probability: 0.6 }) ? int(-3, 7) : null
  }
  // US-WRK-007: Meetings get a time and length; some Calls get a time; the rest stay all-day.
  for (const t of d.tasks) {
    if (t.status === 'Done') t.doneOffset = Math.min(0, t.dueOffset)
    const timed = t.type === 'Meeting' || (t.type === 'Call' && f.datatype.boolean({ probability: 0.5 }))
    if (!timed) continue
    t.dueTime = `${String(int(8, 17)).padStart(2, '0')}:${pick(['00', '30'])}`
    t.durationMin = t.type === 'Meeting' ? pick([30, 30, 45, 60, 90]) : null
    if (t.type === 'Meeting') {
      const a = byId.get(t.accountId)
      t.contactIds = a?.primaryContactId ? [a.primaryContactId] : []
      t.location = pick(['Agency office', 'Phone', 'Client site', 'Video call'])
    }
  }
  return { insuredItems, documents }
}

/** POL P1 enrichment on its own seed: coverages, dwelling, WC classes, interests, item details, and rewrite chains. */
function enrichPolicies(seed: number, d: { accounts: Account[]; policies: Policy[]; terms: Term[]; insuredItems: InsuredItem[] }) {
  const f = new Faker({ locale: [en_US, en, base] })
  f.seed(seed + 11)
  const int = (a: number, b: number) => f.number.int({ min: a, max: b })
  const pick = <T,>(xs: readonly T[]) => f.helpers.arrayElement(xs)
  const acc = new Map(d.accounts.map((a) => [a.id, a]))
  const LENDERS = ['Lone Star Mortgage', 'Gulf Coast Bank', 'First Harbor Credit Union', 'Sunbelt Auto Finance', 'Bayou Federal Savings']
  for (const p of d.policies) {
    const a = acc.get(p.accountId)
    if (!a) continue
    if (p.line === 'Auto') {
      const tx = a.state === 'TX'
      p.auto = tx
        ? { state: 'TX', bi: pick(['30/60', '50/100', '100/300', '250/500']), pd: pick([25, 50, 100]), pip: f.datatype.boolean({ probability: 0.7 }) ? { selected: true, amount: pick([2500, 5000, 10000]) } : { selected: false, rejectedOffset: -int(100, 900) }, um: f.datatype.boolean({ probability: 0.6 }) ? { selected: true, limits: '30/60' } : { selected: false, rejectedOffset: -int(100, 900) } }
        : { state: 'FL', bi: pick(['10/20', '25/50', '100/300']), pd: 10, pip: { selected: true, amount: 10000 }, pdl: 10000, biCarried: f.datatype.boolean({ probability: 0.8 }) }
      if (f.datatype.boolean({ probability: 0.6 })) p.interests = [{ type: 'Lienholder', name: pick(LENDERS.slice(3)), position: '1st', loan4: String(int(1000, 9999)), address: `${int(100, 999)} Commerce St, ${a.city}, ${a.state}`, appliesTo: 'Vehicle 1' }]
    }
    if (p.line === 'Home' || p.line === 'Condo') {
      const coverageA = int(18, 70) * 10_000
      const fl = a.state === 'FL'
      p.dwelling = {
        roofYear: int(2005, 2025),
        construction: pick(['Frame', 'Masonry', 'Masonry veneer']),
        coverageA,
        aopDeductible: pick([1000, 2500, 5000]),
        floodZone: a.coastal ? pick(['AE', 'VE', 'X']) : pick(['X', 'X', 'AE']),
        sinkhole: fl ? pick(['Full', 'CGCC only'] as const) : undefined,
        hurricanePct: fl ? pick([2, 2, 5, 10] as const) : undefined,
        windMit: fl && f.datatype.boolean({ probability: 0.65 }) ? { inspectedOffset: -int(60, 1800), features: { 'Roof covering': 'FBC equivalent', 'Roof deck attachment': pick(['A', 'B', 'C']), 'Roof-to-wall': pick(['Toe nails', 'Clips', 'Single wraps']), 'Secondary water resistance': pick(['Yes', 'No']), 'Opening protection': pick(['None', 'Basic', 'Hurricane']) } } : null,
        windPool: a.state === 'TX' ? (a.coastal ? { inArea: true, wpi8: `WPI-8 No. ${int(100000, 999999)}`, windHailDeductible: pick(['1%', '2%', '5%']) } : { inArea: false }) : undefined,
      }
      p.interests = f.datatype.boolean({ probability: 0.7 }) ? [{ type: 'Mortgagee', name: pick(LENDERS.slice(0, 3)), position: '1st', loan4: String(int(1000, 9999)), address: `PO Box ${int(1000, 9999)}, Houston, TX`, appliesTo: 'Dwelling' }] : []
    }
    if (p.line === 'WC') {
      const classes = [['8810', 'Clerical office employees'], ['5551', 'Roofing, all kinds'], ['9079', 'Restaurant NOC'], ['0042', 'Landscape gardening'], ['8380', 'Automobile service or repair']] as const
      const n = int(1, 3)
      p.wcClasses = f.helpers.arrayElements([...classes], n).map(([code, description]) => ({ state: a.state, code, description, payroll: int(5, 90) * 10_000, rate: Math.round(f.number.float({ min: 0.2, max: 9 }) * 100) / 100 }))
      p.wcEmployees = a.details?.employees ?? int(3, 40)
    }
  }
  for (const i of d.insuredItems) {
    const a = acc.get(i.accountId)!
    if (i.kind === 'Vehicle') Object.assign(i, { garagingZip: a.zip, use: pick(['Commute', 'Pleasure', 'Business']), compDed: pick([250, 500, 1000]), collDed: pick([500, 1000]), ...(a.kind === 'Business' ? { vehicleClass: pick(['Light truck', 'Medium truck', 'Van']), radius: pick(['Local (≤50 mi)', 'Intermediate (51-200 mi)']) } : {}) })
    if (i.kind === 'Driver') Object.assign(i, { licenseState: a.state, relationship: pick(['Named insured', 'Spouse', 'Child', 'Other']), rated: f.datatype.boolean({ probability: 0.92 }) })
    if (i.kind === 'Location') Object.assign(i, { bppLimit: int(5, 60) * 10_000, deductible: pick([1000, 2500, 5000]) })
  }
  // US-POL-006: a few Home policies were rewritten from another carrier; append the replaced policy and its term.
  const homes = d.policies.filter((p) => p.line === 'Home' && d.terms.some((t) => t.policyId === p.id && t.status === 'Active')).slice(0, 8)
  for (const p of homes) {
    const first = d.terms.filter((t) => t.policyId === p.id).sort((a, b) => a.effectiveOffset - b.effectiveOffset)[0]
    const oldId = `pol-${String(d.policies.length + 1).padStart(4, '0')}`
    const carrier = pick(['car-ghi', 'car-mer', 'car-lsm'])
    d.policies.push({ id: oldId, accountId: p.accountId, carrierId: carrier, line: 'Home', policyNumber: `${carrier === 'car-ghi' ? 'GHI' : carrier === 'car-mer' ? 'MER' : 'LSM'}-HO-${int(1000000, 9999999)}`, replacedByPolicyId: p.id })
    d.terms.push({ id: `trm-${String(d.terms.length + 1).padStart(4, '0')}`, policyId: oldId, effectiveOffset: first.effectiveOffset - 365, expirationOffset: first.effectiveOffset, premium: Math.round(first.premium * 0.9 / 10) * 10, status: 'Rewritten', pendingCancellation: false })
    p.replacesPolicyId = oldId
  }
}

/** CRT/CLM enrichment on its own seed: holders and certificates on Business clients; a Claim for each claim report. */
function enrichService(seed: number, d: { accounts: Account[]; policies: Policy[]; terms: Term[]; serviceRequests: ServiceRequest[]; users: User[] }) {
  const f = new Faker({ locale: [en_US, en, base] })
  f.seed(seed + 17)
  const int = (a: number, b: number) => f.number.int({ min: a, max: b })
  const pick = <T,>(xs: readonly T[]) => f.helpers.arrayElement(xs)
  const holders: Holder[] = []
  const certificates: Certificate[] = []
  const claims: Claim[] = []
  const live = (pid: string) => d.terms.some((t) => t.policyId === pid && (t.status === 'Active' || t.status === 'Bound'))
  const at = (off: number) => { const x = new Date(); x.setDate(x.getDate() + off); x.setHours(int(8, 16), pick([0, 15, 30, 45]), 0, 0); return x.toISOString() }
  const HOLDER_NAMES = ['Westheimer Commons Development LLC', 'Harris County', 'Brazos Property Management', 'City of Houston', 'Lakeside Mall Partners', 'Gulf Coast General Contractors', 'Bayou Lending Group', 'Sunbelt Industrial REIT']
  for (const a of d.accounts) {
    if (a.kind !== 'Business' || a.status !== 'Client') continue
    const pols = d.policies.filter((p) => p.accountId === a.id && live(p.id) && ['GL', 'BOP', 'WC', 'Commercial auto', 'Commercial umbrella'].includes(p.line))
    if (!pols.length || f.datatype.boolean({ probability: 0.35 })) continue
    const n = int(1, 3)
    for (let k = 0; k < n; k++) {
      const hid = `hld-${String(holders.length + 1).padStart(4, '0')}`
      const ai = f.datatype.boolean({ probability: 0.5 })
      holders.push({ id: hid, accountId: a.id, name: pick(HOLDER_NAMES), address: `${int(100, 9999)} ${f.location.street()}`, city: a.city, state: a.state, zip: a.zip, email: `certs@${f.internet.domainWord()}.example`, type: ai ? 'Additional insured' : 'Holder-only', project: f.datatype.boolean({ probability: 0.5 }) ? `Job #${int(1000, 9999)}` : null, status: f.datatype.boolean({ probability: 0.9 }) ? 'Active' : 'Inactive' })
      for (let j = 0; j < int(1, 2); j++) {
        const status = pick(['Issued', 'Issued', 'Issued', 'Requested', 'Needs review'] as const)
        const created = -int(1, 200)
        const policyIds = f.helpers.arrayElements(pols, int(1, Math.min(3, pols.length))).map((p) => p.id)
        const marks = Object.fromEntries(policyIds.map((pid) => [pid, { ai: ai && d.policies.find((p) => p.id === pid)!.line !== 'WC', wvd: f.datatype.boolean({ probability: 0.2 }), pnc: ai && f.datatype.boolean({ probability: 0.3 }) }]))
        // A certificate waits for review only because of a mark; make sure one exists.
        if (status === 'Needs review' && !Object.values(marks).some((m) => m.ai || m.wvd || m.pnc)) marks[policyIds[0]].wvd = true
        const flags = { additionalInsured: Object.values(marks).some((m) => m.ai), waiver: Object.values(marks).some((m) => m.wvd), primaryNonContrib: Object.values(marks).some((m) => m.pnc) }
        const id = `CERT-${String(certificates.length + 100).padStart(4, '0')}`
        const issued = status === 'Issued'
        certificates.push({ id, accountId: a.id, holderId: hid, policyIds, ...flags, marks, operations: `Re: ${f.company.buzzNoun()} work at ${int(100, 9999)} ${f.location.street()}`, status, serviceRequestId: null, createdOffset: created, createdById: a.accountManagerId, preparedById: status === 'Requested' ? null : a.accountManagerId, submittedById: status === 'Needs review' ? a.accountManagerId : null, submittedAt: status === 'Needs review' ? at(-int(0, 2)) : null, issuedById: issued ? a.accountManagerId : null, issuedAt: issued ? at(created + 1) : null, issuedOffset: issued ? created + 1 : null, delivery: issued ? 'Holder email' : null, history: [{ at: at(created), text: 'Requested', byId: a.accountManagerId }, ...(issued ? [{ at: at(created + 1), text: 'Issued', byId: a.accountManagerId }] : [])] })
      }
    }
  }
  // Every seeded Claim report request gets its Claim; status follows the request.
  const STEPS = ['Reported', 'Submitted to carrier', 'Claim # assigned', 'Open', 'Closed'] as const
  for (const r of d.serviceRequests) {
    if (r.type !== 'Claim report') continue
    const pol = d.policies.find((p) => p.id === r.policyId)
    const lossType = pol?.line === 'Auto' || pol?.line === 'Commercial auto' ? 'Auto' : pol?.line === 'WC' ? "Workers' compensation" : pol && ['GL', 'Umbrella', 'Commercial umbrella'].includes(pol.line) ? 'Liability' : 'Property'
    const step = r.status === 'Done' ? 4 : r.status === 'New' ? 0 : int(1, 3)
    const status = STEPS[step]
    const id = `CL-${2000 + claims.length}`
    const prefix = (pol?.policyNumber ?? 'CLM').split('-')[0]
    claims.push({
      id, accountId: r.accountId, policyId: r.policyId, serviceRequestId: r.id, lossType, lossOffset: r.createdOffset - int(0, 5), description: r.subject, status, details: { cause: lossType === 'Property' ? pick(['Wind', 'Hail', 'Water', 'Fire']) : undefined, injuries: 'No' }, createdOffset: r.createdOffset,
      submittedVia: step >= 1 ? pick(['Carrier portal', 'Email to carrier claims', 'Phone'] as const) : null,
      submittedOffset: step >= 1 ? Math.min(0, r.createdOffset + 1) : null,
      carrierClaimNumber: step >= 2 ? `${prefix}-26-${int(1000000, 9999999)}` : null,
      adjuster: step >= 3 ? { name: f.person.fullName(), type: pick(['Carrier staff', 'Independent'] as const), phone: `(555) 030-${String(int(0, 9999)).padStart(4, '0')}`, email: `adjuster${int(10, 99)}@example.com`, assignedOffset: Math.min(0, r.createdOffset + 3) } : null,
      outcome: step === 4 ? pick(['Paid', 'Paid', 'Denied', 'Withdrawn'] as const) : null,
      paidAmount: step === 4 ? int(800, 24000) : null,
      closedOffset: step === 4 ? Math.min(0, r.createdOffset + int(5, 40)) : null,
      statusDates: Object.fromEntries(STEPS.slice(0, step + 1).map((s, i) => [s, Math.min(0, r.createdOffset + i * 2)])),
    })
    r.details = { ...r.details, claimId: id }
  }
  return { holders, certificates, claims }
}

/** HOM/SET enrichment on its own seed: goals, license records, and AMS sync history. */
function enrichPeople(seed: number, users: User[]): SyncRun[] {
  const f = new Faker({ locale: [en_US, en, base] })
  f.seed(seed + 23)
  const int = (a: number, b: number) => f.number.int({ min: a, max: b })
  for (const u of users) {
    u.active = true
    if (u.role === 'producer') {
      const monthly = int(3, 6) * 10_000
      u.goals = { monthlyPremium: monthly, annualPremium: monthly * 12, monthlyPolicies: int(12, 24), annualPolicies: int(150, 260) }
    }
    const states = u.licenses ?? (u.officeId === 'off-tpa' ? ['FL'] : ['TX'])
    u.licenseRecords = states.map((st) => ({ state: st as UsState, lineOfAuthority: u.role === 'account-manager' ? (st === 'FL' ? '4-40 Customer Representative' : 'General Lines – P&C (CSR)') : st === 'FL' ? '2-20 General Lines' : 'General Lines – P&C', number: `${st}-${int(1000000, 9999999)}`, expirationOffset: int(-10, 720) }))
  }
  const runs: SyncRun[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setHours(i % 2 ? 12 : 6, 2, 0, 0)
    d.setDate(d.getDate() - Math.floor(i / 2))
    const status = i === 2 ? 'Partial' : i === 4 ? 'Failed' : 'Succeeded'
    runs.push({ id: `sync-${i + 1}`, at: d.toISOString(), status, durationSec: int(90, 200), counts: status === 'Failed' ? {} : { Policies: 1502, Terms: 3511, 'Insured items': 4880, 'Additional interests': 612, 'Commission records': 1498, 'Renewal outcomes': int(0, 14), 'Won Terms matched': int(0, 4) }, skipped: status === 'Partial' ? 14 : 0, reason: status === 'Partial' ? 'Policy has no matching Account in Fortify' : undefined, error: status === 'Failed' ? 'AMS API timed out after 120s' : undefined })
  }
  return runs
}
