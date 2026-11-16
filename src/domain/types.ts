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
  /** States with an active P&C license (Producers). */
  licenses?: UsState[]
  /** HOM-005: goals set by a Principal (read-only in v1). */
  goals?: { monthlyPremium: number; annualPremium: number; monthlyPolicies: number; annualPolicies: number }
  /** HOM-013 / SET: license records with expiration. */
  licenseRecords?: { state: UsState; lineOfAuthority: string; number: string; expirationOffset: number }[]
  active?: boolean
}

/** HOM-014 / SET: an AMS sync run. */
export interface SyncRun {
  id: string
  at: string
  status: 'Succeeded' | 'Partial' | 'Failed'
  durationSec: number
  counts: Record<string, number>
  skipped?: number
  reason?: string
  error?: string
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
  /** Commission rate per line from the carrier schedule (synced from the AMS). */
  commission?: Partial<Record<Line, number>>
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
  /** US-ACC-005/006/007: Fortify-owned details (absent on hand-built fixtures). */
  details?: AccountDetails
  /** US-ACC-017 */
  archived?: { offset: number; byId: string; reason: string; prevStatus: AccountStatus }
  /** US-ACC-018 */
  mergedIntoId?: string
}

export type EntityType = 'LLC' | 'Corporation' | 'Partnership' | 'Sole proprietor' | 'Nonprofit'
export type WcStatus = 'Covered' | 'Exempt' | 'Non-subscriber (TX)'
export type PreferredContact = 'Phone' | 'Email' | 'SMS'
export interface AccountDetails {
  street: string
  county: string
  preferredContact: PreferredContact
  source: string
  // Business facts
  legalName?: string
  dba?: string | null
  entityType?: EntityType
  fein4?: string
  naics?: string
  naicsDescription?: string
  yearsInBusiness?: number
  employees?: number
  revenue?: number
  payroll?: number
  website?: string | null
  wcStatus?: WcStatus
  dwc005Offset?: number | null
}

export type SmsConsent = 'Opted in' | 'Opted out' | 'Unknown'
export interface Contact {
  id: string
  name: string
  email: string
  /** Mobile phone. */
  phone: string
  accountIds: string[]
  /** US-ACC-010/013: relationship per linked Account. */
  relationships?: Record<string, string>
  firstName?: string
  lastName?: string
  suffix?: string | null
  workPhone?: string | null
  dobOffset?: number | null
  preferredContact?: PreferredContact
  smsConsent?: { state: SmsConsent; offset: number | null }
  street?: string | null
}

/** US-ACC-005/006: AMS-synced items insured on a Policy (read-only in Fortify). */
export type InsuredItem =
  | { id: string; policyId: string; accountId: string; kind: 'Vehicle'; year: number; make: string; model: string; vin4: string; garagingZip?: string; use?: string; compDed?: number; collDed?: number; vehicleClass?: string; radius?: string }
  | { id: string; policyId: string; accountId: string; kind: 'Driver'; name: string; age: number; licenseState?: UsState; relationship?: string; rated?: boolean }
  | { id: string; policyId: string; accountId: string; kind: 'Property'; address: string; yearBuilt: number; hurricaneDeductiblePct?: number; hurricaneDeductible?: number; windMitOffset?: number | null; wpi8?: string | null }
  | { id: string; policyId: string; accountId: string; kind: 'Location'; number: number; address: string; occupancy: string; buildingValue: number; bppLimit?: number; deductible?: number }

export type DocumentType = 'Declarations' | 'ID card' | 'Policy form' | 'Application' | 'Signed proposal' | 'Loss run' | 'Photo' | 'Correspondence' | 'Other'
/** US-ACC-009 */
export interface AccountDocument {
  id: string
  accountId: string
  name: string
  type: DocumentType
  source: 'AMS' | 'Uploaded'
  linked: { kind: 'policy' | 'opportunity' | 'service'; id: string; label: string } | null
  addedById: string | null
  addedOffset: number
  size: number
}

export type TermStatus = 'Bound' | 'Active' | 'Renewed' | 'Rewritten' | 'Non-renewed' | 'Canceled' | 'Expired'

export interface Policy {
  id: string
  accountId: string
  carrierId: string
  line: Line
  policyNumber: string
  /** US-POL-006 rewrite chain (one step each way). */
  replacesPolicyId?: string
  replacedByPolicyId?: string
  /** US-POL-007 personal auto state coverages. */
  auto?: { state: UsState; bi: string; pd: number; pip: { selected: boolean; amount?: number; rejectedOffset?: number }; um?: { selected: boolean; limits?: string; rejectedOffset?: number }; pdl?: number; biCarried?: boolean }
  /** US-POL-008 dwelling. */
  dwelling?: { roofYear: number; construction: string; coverageA: number; aopDeductible: number; floodZone: string; sinkhole?: 'Full' | 'CGCC only'; hurricanePct?: 0 | 2 | 5 | 10; hurricaneFlat?: number; windMit?: { inspectedOffset: number; features: Record<string, string> } | null; windPool?: { inArea: boolean; wpi8?: string; windHailDeductible?: string; poolPolicyId?: string } }
  /** US-POL-009 WC classes. */
  wcClasses?: { state: UsState; code: string; description: string; payroll: number; rate: number }[]
  wcEmployees?: number
  /** US-POL-010 personal lines only. */
  interests?: { type: 'Mortgagee' | 'Lienholder' | 'Loss payee'; name: string; position: '1st' | '2nd'; loan4: string; address: string; appliesTo: string }[]
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
  /** XDT P1 (absent on older rows). */
  currentAgency?: string | null
  policyNumber?: string | null
  termMonths?: 6 | 12
  notes?: string | null
  source?: { kind: 'manual' | 'lead' | 'lost-opportunity' | 'cancellation'; id?: string } | null
  opportunityId?: string | null
  followUpTaskId?: string | null
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
  attempts: { offset: number; channel: 'Call' | 'Email' | 'SMS'; outcome: string; note?: string | null; byId?: string; time?: string }[]
  qualifiedAccountId: string | null
  qualifiedOpportunityId: string | null
  /** US-LEA-002/004/005/008 (absent on older rows). */
  street?: string
  zip?: string
  currentPremium?: number | null
  sourceDetail?: string | null
  notes?: string | null
  smsConsent?: boolean
  followUpOffset?: number | null
  events?: { offset: number; text: string; byId: string }[]
  disqualifiedOffset?: number
  disqualifiedById?: string
  disqualifyNote?: string | null
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
  /** US-PIP-014 */
  renewedWithIncumbent?: boolean
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
  /** US-SRV-014: SLA due time (ISO); older rows fall back to dueOffset at 5:00 PM. */
  dueAt?: string
  waitingSince?: string | null
  dueReason?: string | null
  requestedVia?: string | null
  /** US-SRV-007 policy change result. */
  outcome?: { kind: 'Endorsement issued' | 'Carrier declined' | 'Withdrawn by Account'; effectiveOffset?: number; premium?: { kind: 'Additional premium' | 'Return premium' | 'No change'; amount?: number }; reason?: string }
  attachments?: { name: string; size: number }[]
}

/** CRT: a certificate holder on a Business Account. */
export interface Holder {
  id: string
  accountId: string
  name: string
  address: string
  city: string
  state: string
  zip: string
  email: string
  type?: 'Holder-only' | 'Additional insured'
  project?: string | null
  status?: 'Active' | 'Inactive'
}
export type CertMarks = { ai: boolean; wvd: boolean; pnc: boolean }
export type CertificateStatus = 'Requested' | 'Needs review' | 'Issued' | 'Re-issued' | 'Replaced' | 'Withdrawn'
export interface Certificate {
  id: string
  accountId: string
  holderId: string
  policyIds: string[]
  additionalInsured: boolean
  waiver: boolean
  primaryNonContrib: boolean
  operations: string
  status: CertificateStatus
  serviceRequestId: string | null
  createdOffset: number
  createdById: string
  issuedOffset?: number | null
  approvedById?: string | null
  rejectReason?: string | null
  /** CRT P1: per-policy marks, people, delivery, history, re-issue chain. */
  marks?: Record<string, CertMarks>
  preparedById?: string | null
  submittedById?: string | null
  submittedAt?: string | null
  issuedById?: string | null
  issuedAt?: string | null
  delivery?: string | null
  returnNote?: string | null
  reissueOfId?: string | null
  replacedById?: string | null
  noReissueReason?: string | null
  history?: { at: string; text: string; byId: string | null }[]
}
export type ClaimStatus = 'Reported' | 'Submitted to carrier' | 'Claim # assigned' | 'Open' | 'Closed'
export interface Claim {
  id: string
  accountId: string
  policyId: string | null
  serviceRequestId: string | null
  lossType: 'Property' | 'Auto' | 'Liability' | "Workers' compensation"
  lossOffset: number
  lossTime?: string | null
  description: string
  status: ClaimStatus
  carrierClaimNumber?: string | null
  adjuster?: { name: string; type?: 'Carrier staff' | 'Independent'; phone?: string; email?: string; assignedOffset?: number } | null
  outcome?: 'Paid' | 'Denied' | 'Withdrawn' | null
  paidAmount?: number | null
  details: Record<string, unknown>
  createdOffset: number
  events?: { offset: number; text: string; byId: string }[]
  /** CLM P1 */
  submittedVia?: 'Carrier portal' | 'Email to carrier claims' | 'Phone' | null
  submittedOffset?: number | null
  closedOffset?: number | null
  denialReason?: string | null
  closeNote?: string | null
  withdrawReason?: string | null
  statusDates?: Partial<Record<ClaimStatus, number>>
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
  linked: { kind: 'lead' | 'opportunity' | 'renewal' | 'service' | 'policy' | 'xdate' | 'claim' | 'certificate'; id: string } | null
  /** US-WRK-011: users @mentioned in a note. */
  mentions?: string[]
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
  /** Day the Task was completed or canceled. */
  doneOffset?: number | null
  /** Call outcome recorded on completion. */
  outcome?: string
  /** US-WRK-008 Meeting fields. */
  contactIds?: string[]
  location?: string | null
}

export interface Dataset {
  syncRuns?: SyncRun[]
  certificates?: Certificate[]
  holders?: Holder[]
  claims?: Claim[]
  insuredItems?: InsuredItem[]
  documents?: AccountDocument[]
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
