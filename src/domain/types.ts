// Vocabulary follows GLOSSARY.md. Dates in the stored dataset are day offsets from today (see mock/dates.ts).

export type Role = 'producer' | 'account-manager' | 'principal' | 'admin'
export type UsState = 'TX' | 'FL'

export interface Office {
  id: string
  name: string
  city: string
  state: UsState
  timeZone: string
}

export interface User {
  id: string
  name: string
  role: Role
  officeId: string
  email: string
}

export type LineKind = 'personal' | 'commercial'
export type Line =
  | 'Auto'
  | 'Home'
  | 'Umbrella'
  | 'Renters'
  | 'Condo'
  | 'Flood'
  | 'Boat'
  | 'BOP'
  | 'GL'
  | 'WC'
  | 'Commercial auto'
  | 'Commercial umbrella'

export interface Carrier {
  id: string
  name: string
  naic: string
  states: UsState[]
  kinds: LineKind[]
  lines: Line[]
  note?: string
}

export type AccountKind = 'Household' | 'Business'
export type AccountStatus = 'Prospect' | 'Client' | 'Former client'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  status: AccountStatus
  officeId: string
  producerId: string
  accountManagerId: string
  state: UsState
  city: string
  zip: string
  coastal: boolean
  primaryContactId: string | null
  linkedAccountIds: string[]
  createdOffset: number
  lastActivityOffset: number | null
  lifecycle: 'active' | 'archived' | 'merged'
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  accountIds: string[]
}

export type TermStatus = 'Bound' | 'Active' | 'Renewed' | 'Rewritten' | 'Non-renewed' | 'Canceled' | 'Expired'

export interface Policy {
  id: string
  accountId: string
  carrierId: string
  line: Line
  policyNumber: string
}

export interface Term {
  id: string
  policyId: string
  effectiveOffset: number
  expirationOffset: number
  premium: number
  status: TermStatus
  pendingCancellation: boolean
}

export type InterestLevel = 'High' | 'Medium' | 'Low' | 'Closed'

export interface XDate {
  id: string
  accountId: string
  line: Line
  currentCarrier: string
  xDateOffset: number
  premium: number | null
  interestLevel: InterestLevel
}

export interface Dataset {
  offices: Office[]
  users: User[]
  carriers: Carrier[]
  accounts: Account[]
  contacts: Contact[]
  policies: Policy[]
  terms: Term[]
  xDates: XDate[]
}
