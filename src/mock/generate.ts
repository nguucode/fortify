import { Faker, en_US, en, base } from '@faker-js/faker'
import type {
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

  return { offices: OFFICES, users, carriers: CARRIERS, accounts, contacts, policies, terms, xDates }
}
