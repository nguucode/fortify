# Fortify

The CRM a US independent P&C insurance agency uses to sell, service, and retain personal and commercial lines. It sits beside the agency's management system (AMS), which remains the system of record for policies and commission.

## Customers

**Account**:
The customer unit the agency sells to and services. It is either a Household or a Business, and carries a status of Prospect, Client, or Former client.
_Avoid_: Customer, Client (as an object name), Insured, Applicant

**Household**:
An Account for personal lines: the people, vehicles, and homes insured together.
_Avoid_: Family, personal account

**Business**:
An Account for commercial lines: a legal entity with locations, payroll, and revenue.
_Avoid_: Company, commercial account, organization

**Prospect**:
An Account status meaning no policy has been bound with the agency yet.
_Avoid_: Lead (a Lead is not yet an Account)

**Lead**:
An unqualified inquiry in the intake inbox: a name, contact details, source, and lines of interest. Qualifying it either creates a Prospect Account with a New business Opportunity, or attaches a Cross-sell Opportunity to a matching existing Account.
_Avoid_: Prospect, inquiry, referral (a referral is one Lead source)

**X-date**:
The expiration date of a line the Account buys elsewhere, recorded with the line, current carrier, premium, and interest level, so the agency can quote ahead of it. It covers both Prospects and coverage gaps on Clients.
_Avoid_: Expiration date (reserved for the agency's own Terms), Smart-Cycle

**Producer**:
The licensed salesperson responsible for an Account and credited with its commission inside the agency.
_Avoid_: Agent of record (reserved for the carrier relationship), sales rep

**Account Manager**:
The person responsible for servicing an Account: Renewals, Service Requests, and day-to-day requests.
_Avoid_: CSR (CSR is a job title, not the role on an Account), service rep

**Office**:
One of the agency's physical locations. Each user and each Account belongs to exactly one Office.
_Avoid_: Branch, location (reserved for a Business's insured locations)

**Book**:
The set of Accounts on which a user is the Producer or the Account Manager.
_Avoid_: Portfolio, my customers

**Agent of record**:
The agency the carrier recognizes on a Policy. It is shown read-only and changed only by a broker-of-record letter.
_Avoid_: Producer, owner

**Client**:
An Account status meaning at least one policy term is active with the agency.
_Avoid_: Insured, customer

**Former client**:
An Account status meaning the Account once had a policy with the agency and now has none active.
_Avoid_: Lost customer, inactive

**Contact**:
A single person. A Contact can be a member of a Household, a person at a Business, or both, which links the two Accounts.
_Avoid_: Person, member, user

**Named insured**:
The role a person or entity holds on a policy as the party covered. It is a role on a policy, not a kind of record.
_Avoid_: Insured (as an object)

## Selling

**Opportunity**:
One sales effort for an Account covering one or more lines, of type New business, Cross-sell, or Remarket.
_Avoid_: Deal, lead, submission (for the opportunity itself)

**Quote**:
One carrier's offer on an Opportunity, with a premium per line. Its lines can be accepted separately.
_Avoid_: Proposal, indication (an indication is a non-binding estimate)

**Not taken**:
A Quote status for an offer the Account did not accept.
_Avoid_: Declined (declined means the carrier refused to quote)

## Policies

**Policy**:
The stable identity of coverage with one carrier for one line, keyed by policy number. Its data is synced from the AMS and read-only in Fortify.
_Avoid_: Contract, coverage (for the whole policy)

**Term**:
One coverage period of a Policy, with its own effective date, expiration date, premium, and status.
_Avoid_: Policy period, version

**Binder**:
The temporary proof of coverage between binding and issuance. A Term in status Bound is covered by a binder.
_Avoid_: Temporary policy

**Insured item**:
A risk on a Policy synced from the AMS: a vehicle, driver, or property for a Household, or a location for a Business. It can be changed only through a Policy change.
_Avoid_: Asset, risk unit

**Additional interest**:
A party with a financial interest in a personal-lines Policy, such as a mortgagee, lienholder, or loss payee. It is synced from the AMS and read-only.
_Avoid_: Holder (reserved for certificates)

**Rewrite**:
Replacing a Policy with a new Policy, usually at another carrier, instead of renewing it. The old Policy links to the new one as "replaced by".
_Avoid_: Switch, migration

## Retention

**Renewal**:
A work item created ahead of a Term's expiration to review the Term and decide its outcome: renew as is, remarket, rewrite, or non-renew.
_Avoid_: Renewal opportunity (a Remarket Opportunity is separate)

**Remarket**:
Shopping an existing Policy to other carriers at renewal. It runs as an Opportunity of type Remarket linked to its Renewal.
_Avoid_: Requote, reshop

## Service

**Service Request**:
A unit of post-sale work for an Account. Its type is one of: Policy change, Certificate request, Claim report, ID card / evidence, Billing question, Cancellation request, or General.
_Avoid_: Ticket, case, suspense

**Policy change**:
A Service Request asking the carrier to amend a Policy mid-term. The carrier's result is an endorsement.
_Avoid_: Endorsement (for the request itself)

**Claim**:
The agency's tracking record for a loss after it has been reported to the carrier: the carrier's claim number, the adjuster, and the status. The carrier handles the claim itself.
_Avoid_: Loss, case

**Certificate**:
An issued certificate of insurance (ACORD 25) naming a holder, and noting whether the holder is an additional insured or has a waiver of subrogation.
_Avoid_: COI form, proof

**Holder**:
A party on a Business Account that receives Certificates, reused across issuances, as either holder-only or additional insured.
_Avoid_: Certificate holder contact, recipient

## Work

**Conversation**:
A thread of messages (email, SMS, or call log) with one counterparty, linked to an Account or left unmatched in the Office queue.
_Avoid_: Thread, ticket, chat


**Activity**:
A logged record of something that happened on an Account: a call, email, SMS, meeting, note, or system event.
_Avoid_: Log note, history entry

**Task**:
Something a user must do by a due date. Completing it logs an Activity.
_Avoid_: Suspense, reminder, to-do

## Market

**Carrier**:
An insurance company the agency places business with, along with the states and lines it is appointed for.
_Avoid_: Company, insurer, market (for the record itself)

**License**:
A user's state-issued authority to sell a line of authority in one state, with an expiration date.
_Avoid_: Certification, appointment

**Appointment**:
A carrier's registration of the agency to sell its products in a state.
_Avoid_: Contract, license

## Systems

**AMS**:
The agency management system that is the system of record for policies, transactions, and commission. Fortify reads from it and does not replace it.
_Avoid_: Back office, policy system
