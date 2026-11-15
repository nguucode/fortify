# Business rules and cross-Epic decisions

These rules answer the open questions raised while the backlog was written (wayfinder ticket 27). They take precedence over any assumption written in an individual story. Where a rule rests on an industry source, the source is linked. The rest are product decisions made for this demo.

## Spec conventions

- **Required frontmatter.** `routes` is a required field. It amends decision 07-F2, which left it out.
- **No new route segments.** Sub-views use query parameters:
  - Account and Policy tabs: `?tab=`
  - Reports: `?report=`
  - Task drawer: `?task=`
  - Inbox conversation: `?c=`
  - X-date drawer: `?xdate=`

  The Product menu's Sitemap counts a story under its base route.
- **Shell-wide FND stories** list `/today` as their one representative route.
- **Role label.** Write "Principal".

## Saved views added to sitemap.yaml

| Route | Saved views |
|---|---|
| `/leads` | Open (New + Contacted), Unassigned, Qualified, Disqualified |
| `/service` | My open, Overdue, Waiting on carrier, Waiting on client, Done last 30 days |
| `/claims` | Open, Closed |
| `/tasks` | My open, Due today, Overdue |

Contacts has no saved views. Personal (user-defined) saved views are out of scope.

## Renewals

- **Window.** A Renewal is created before a Term's expiration:
  - Personal lines: 45 days.
  - **FL residential property (home, condo, dwelling): 120 days.** Florida requires 120 days' notice of nonrenewal for residential property ([Fla. Stat. 627.4133](https://m.flsenate.gov/statutes/627.4133)), so the agency must see it no later than the carrier's notice.
  - Small commercial: 60 days.
  - Large commercial (at least $25,000 in annual commercial premium on the Account): 90 days.
- **Risk** is **High** when any of the following holds; otherwise it is **Low**:
  - premium change of +10% or more,
  - a Claim in the expiring Term,
  - a carrier non-renewal notice,
  - a Pending cancellation flag,
  - a Term with the FL insurer of last resort.
- **Remarket is a status, not a decision.** "Start remarketing" sets status Remarketing. Decisions are only Renew as is, Rewrite, or Non-renewed.
  - object-model.md is updated to match.
  - "Due in window" means every Renewal in a status before Decided.
- **Decided → Done** needs an AMS signal. In the demo, Demo controls offers "Sync renewal outcome" and an "AMS sync" state (US-FND-005).

## Retention

- **Formula.** Retention is counted by policy: 1 − lost ÷ Terms that reached expiration in the period.
  - Retained: Renewed or Rewritten. A rewrite to another carrier through the agency is not lost business ([Kite Technology on Applied Epic retention](https://www.kitetechgroup.com/mastering-applied-epic-retention-report-essential-for-insurance-agencies/)).
  - Lost: Non-renewed, Expired, or Canceled. A cancel that is then rewritten counts as Rewritten.
- **Account Managers** also get the Retention report, scoped to their Office.

## Service SLAs

SLAs are counted in business hours (8:00–17:00, the Office's time zone, Monday to Friday, excluding US federal holidays). The clock pauses while a request is Waiting on client, but not while it is Waiting on carrier.

| Type | Target |
|---|---|
| Claim report: submit to carrier | 4 business hours |
| ID card / evidence | 4 business hours |
| Certificate, holder-only | 4 business hours (same day) |
| Certificate with additional insured, waiver, or P&NC | 1 business day |
| Policy change | 1 business day |
| Cancellation request | 1 business day |
| Billing question | 2 business days |
| General | 3 business days |

There is no published industry standard. Vendors cite 2 to 24 hours for certificates and about 24 hours for endorsements ([ResourcePro](https://www.resourcepro.com/resources/simplify-certificate-of-insurance-management-and-issuance/), [InsuranceNewsNet](https://insurancenewsnet.com/innarticle/the-48-hour-service-rule-driving-commercial-account-retention)). The SLAs are hardcoded in `slaRules.ts`, and Settings shows them read-only on the Pipeline page.

## Claims

- **Ownership.** A Claim is Fortify's tracking record. Its loss details lock at creation. Its tracking fields (carrier claim #, adjuster, status, outcome) are editable by Account Managers (Office) and Principals. Producers and Admins can only read them.
- **Follow-up.** Submitting a Claim report automatically creates a Task. The record then shows a nudge in these cases:
  - no carrier claim # 2 business days after submission,
  - a check-in due every 7 business days while the Claim is Open,
  - a check-in due every 14 business days while it waits on client documents.

  Source: [practitioner guidance](https://blog.covu.com/?p=1908). A Claim can be reopened within 90 days of closing.

## Pipeline and Quotes

- **Opportunity fields:** `estimatedPremium`, `targetCloseDate`, `source`, and `probability` (default per stage, editable in Settings).
- **Closing Quotes.** At Won or Lost, every Quote still Requested, Quoted, Referred, or Presented becomes Not taken. object-model.md allows these transitions.
- **Won Terms** have `source: fortify-won` and show "Awaiting AMS" until the next sync matches them by binder number. A Bound Term carries `binderExpiresAt`, 30 days after binding.
- **Changing an Opportunity's Producer** is limited to Principals and logs an Activity, the same as Account reassignment.
- **License and appointment checks** run for every state where the quoted lines have a risk: the Household's state, or each state among a Business's Locations.
- **Reopening a Lost Opportunity** is allowed within 90 days (US-PIP-011).

## Commission

- **Data.** Commission is synced from the AMS as commission records: Term, producer, new or renewal, rate, producer share, amount.
- **Mock default split:** the Producer gets 50% of agency commission on new business and 40% on renewal. Most agencies pay a higher share on new business ([industry overview](https://www.smartchoiceagents.com/tips/insurance-agency-producer-commission-structure)).
- **Visibility** follows roles.md.

## Leads and X-dates

- **Office.** A Lead has an Office, which drives the Account Manager's scope.
- **Duplicate matches:**
  - A match on a **Client** adds a Cross-sell Opportunity.
  - A match on a **Prospect or Former client** adds a New business Opportunity to that Account. No new Account is created.
- **Admin cannot Qualify** a Lead or start a quote, because Admin only reads Opportunities. The action is disabled with a tooltip.
- **Account Managers and Leads.** Within their Office, they can see, add, and assign Leads. Qualifying, disqualifying, and logging attempts belong to the Producer or a Principal.
- **Contact attempts** before Qualify are stored on the Lead. Qualify copies them to the Account as Activities.
- **X-dates** have no status. Their state comes from:
  - the interest level (High, Medium, Low, Closed),
  - a linked Opportunity,
  - whether the date has passed.
- **X-date follow-up Tasks** always go to the Account's Producer, 45 days ahead for personal lines and 90 for commercial.

## Accounts and Contacts

- **Initial assignment.** Choosing the Producer and Account Manager when creating an Account is initial assignment, not reassignment. A Producer creating an Account is locked in as its Producer.
- **Business facts** are Fortify-owned fields on the Account: entity type, FEIN last 4, NAICS, revenue, payroll, employees, and WC status (including "Non-subscriber (TX)", with the DWC Form-005 filing date). Locations come from the AMS.
- **Archive** is blocked while the Account has an Active Term or any open Opportunity. Archived Accounts are visible only to Admins, through "Include archived".
- **Merge** is allowed only between Accounts of the same kind. It is blocked if both Accounts have Active Terms, and it cannot be undone.
- **Unlinking a Contact** from its only Account is blocked.
- **Tab counts:**

  | Tab | Counts |
  |---|---|
  | Policies | Active Terms |
  | Renewals | Renewals not Done |
  | Sales | open Opportunities |
  | Service | open Service Requests |
  | Activity | open Tasks |
  | Documents | all documents |

## Work

- **Meetings.** There is no Event object. A meeting is a Task of type Meeting.
- **Task fields:** type (General, Call, Email, Meeting), priority (Normal, High), source (Manual, X-date, Renewal, Service Request, Lead, Claim), optional due time, and a completion note or cancel reason.
- **Every Task needs an Account.**
- **Completing a Task** offers a 5-second Undo. The Activity is written after the Undo window closes.
- **Notes** can be edited only by their author, within 24 hours of creation.

## Certificates

- **Principal review.** AI, waiver, and P&NC all go to Principal review. A Principal cannot approve their own Certificate: another Principal must review it.
- **Account Manager's Today** shows "To issue" (holder-only) and a read-only "In review" list.
- **Return.** A Principal sends a Certificate back to Requested with a required note.
- **Re-issue** creates a new Certificate with status Re-issued. The old one shows "Replaced by".
- **Flags.** The request's flags apply to every eligible Term, and the preparer can clear them per Term.
- **Holders.** Account Managers and Principals can create and edit Holders. Producers and Admins can only read them.

## Inbox

- **New glossary term: Conversation.** A thread of messages with one counterparty, linked to an Account or unmatched.
- **Mock entities:** about 350 Conversations, 1,200 messages, and 120 mentions.
- **SMS consent** is stored per phone number on a Contact.
- **Unmatched Conversations** go to the Office queue (Account Manager and above). Producers see only those assigned to them.
- **Re-linking** a Conversation keeps the old Activities and logs a "moved" Activity on both Accounts.
- **No INB story is P0.** The demo's Service step starts from the Account page.

## Today, Settings, and Foundation

- **Office control** in the top bar is a static label for Producers and Account Managers, and a filter (All offices or one Office) for Principals and Admins.
- **Notifications** use the seven types defined in US-FND-008.
- **Goals** are seeded and read-only in v1, labeled "Set by your Principal". There is no Settings page for them.
- **Settings pages:**
  - **Pipeline stages:** probability, stale days, and Lost and Disqualified reasons are editable. Stage names, stage order, and timing rules are read-only.
  - **Templates:** the 16-template catalog from SET is confirmed.
  - **Offices:** fixed at three.
- **Deactivating a user** is blocked until their Book is moved. Bulk Book move (US-ACC-016) is promoted to P1.
- **Charts:** Recharts, wrapped in FND chart primitives (US-FND-020, P1). Every chart follows the dataviz rules: tabular numbers, the primary blue series, and hairline gridlines.

## Accessibility tokens (amending IMPECCABLE-PROMPT.md, Part B)

| Token | Value | Contrast | Note |
|---|---|---|---|
| `line-control` | oklch(14.5% 0 0 / .45) | 3.16:1 | Form control borders only |
| `text-placeholder` | oklch(55.6% 0 0) | 4.73:1 | |
| `text-warning` | oklch(55% .13 57.5) | 5.06:1 | Replaces 59.7% .144, which was 4.18:1 |

## Mock data additions

- Holders: about 140, across about 45 Businesses.
- Terms carry `limits`, `endorsements[]`, and `binderExpiresAt` (Bound Terms only).
- Carriers carry a fictional 5-digit `naic`.
- A commercial Umbrella line is added.
- Commission records exist for every Active Term.
- Goals: seeded per Producer.
- Inbox: the entities listed under Inbox.
