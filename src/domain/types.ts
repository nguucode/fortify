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
  /** 'fortify-won' Terms show "Awaiting AMS" until a sync matches the binder number (rules.md). */
  source?: 'ams' | 'fortify-won'
  binderNumber?: string
  binderExpiresOffset?: number
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



// ---- Selling, retention, service, and work (P0 demo loop). Dates are day offsets from today. ----

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Disqualified'
export type LeadSource = 'Web form' | 'Phone' | 'Referral' | 'Trusted Choice' | 'Purchased list'

export interface Lead {
  id: string
  name: string
  kind: AccountKind
  businessName: string | null
  email: string
  phone: string
  state: UsState
  city: string
  officeId: string
  source: LeadSource
  linesOfInterest: Line[]
  currentCarrier: string | null
  xDateOffset: number | null
  assigneeId: string | null
  status: LeadStatus
  disqualifyReason: string | null
  createdOffset: number
  attempts: { offset: number; channel: 'Call' | 'Email' | 'SMS'; outcome: string }[]
  qualifiedAccountId: string | null
  qualifiedOpportunityId: string | null
}

export type OpportunityType = 'New business' | 'Cross-sell' | 'Remarket'
export type OpportunityStage = 'New' | 'Contacted' | 'Gathering info' | 'Quoting' | 'Proposed' | 'Won' | 'Lost'

export interface Opportunity {
  id: string
  accountId: string
  type: OpportunityType
  stage: OpportunityStage
  stageEnteredOffset: number
  lines: Line[]
  ownerId: string
  estimatedPremium: number
  targetCloseOffset: number
  source: string
  lostReason: string | null
  renewalId: string | null
  leadId: string | null
  createdOffset: number
  closedOffset: number | null
  /** US-PIP-003 fields; absent on seeded rows. */
  name?: string
  probability?: number
  notes?: string | null
  lineDetails?: Partial<Record<Line, { currentCarrier?: string; currentPremium?: number; xDateOffset?: number }>>
}

export type QuoteStatus = 'Requested' | 'Quoted' | 'Declined' | 'Referred' | 'Presented' | 'Accepted' | 'Not taken'

export interface QuoteLine {
  line: Line
  premium: number | null
  accepted: boolean
}

export interface Quote {
  id: string
  opportunityId: string
  carrierId: string
  status: QuoteStatus
  lines: QuoteLine[]
  fees: number
  declineReason: string | null
  warnings: { kind: 'appointment' | 'license'; message: string }[]
  requestedOffset: number
  validUntilOffset: number | null
  presentedOffset: number | null
}

export type RenewalStatus = 'Upcoming' | 'In review' | 'Remarketing' | 'Presented' | 'Decided' | 'Done'
export type RenewalDecision = 'Renew as is' | 'Rewrite' | 'Non-renewed'
export type RenewalSegment = 'personal' | 'fl-residential-property' | 'small-commercial' | 'large-commercial'

export interface Renewal {
  id: string
  accountId: string
  policyId: string
  termId: string
  status: RenewalStatus
  segment: RenewalSegment
  ownerId: string
  renewalPremium: number | null
  decision: RenewalDecision | null
  decisionCarrierId: string | null
  remarketOpportunityId: string | null
  createdOffset: number
}

export type ServiceType = 'Policy change' | 'Certificate request' | 'Claim report' | 'ID card / evidence' | 'Billing question' | 'Cancellation request' | 'General'
export type ServiceStatus = 'New' | 'In progress' | 'Waiting on carrier' | 'Waiting on client' | 'Done'

export interface ServiceRequest {
  id: string
  accountId: string
  policyId: string | null
  type: ServiceType
  subject: string
  description: string
  priority: 'Normal' | 'High'
  status: ServiceStatus
  ownerId: string
  createdById: string
  createdOffset: number
  dueOffset: number
  resolution: string | null
  details: Record<string, unknown>
}

export type ActivityType = 'call' | 'email' | 'sms' | 'meeting' | 'note' | 'system'

export interface Activity {
  id: string
  accountId: string
  type: ActivityType
  subject: string
  body: string | null
  occurredOffset: number
  createdById: string
  linked: { kind: 'lead' | 'opportunity' | 'renewal' | 'service' | 'policy'; id: string } | null
}

export type TaskType = 'General' | 'Call' | 'Email' | 'Meeting'
export type TaskSource = 'Manual' | 'X-date' | 'Renewal' | 'Service Request' | 'Lead' | 'Claim'

export interface Task {
  id: string
  accountId: string
  title: string
  type: TaskType
  priority: 'Normal' | 'High'
  source: TaskSource
  assigneeId: string
  dueOffset: number
  status: 'Open' | 'Done' | 'Canceled'
  linked: Activity['linked']
  /** US-WRK-005 fields; absent on seeded rows. */
  dueTime?: string | null
  durationMin?: number | null
  description?: string | null
  closeNote?: string | null
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
  leads: Lead[]
  opportunities: Opportunity[]
  quotes: Quote[]
  renewals: Renewal[]
  serviceRequests: ServiceRequest[]
  activities: Activity[]
  tasks: Task[]
}
