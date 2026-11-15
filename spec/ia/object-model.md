# Object model

Business rules and cross-Epic decisions are in [rules.md](rules.md).

Definitions live in [`../../GLOSSARY.md`](../../GLOSSARY.md). This page covers how the objects relate and the lifecycle of each. Each object is labeled **Fortify-owned** (editable) or **Synced from AMS** (read-only).

## Relationships

```
Office 1─* User (holds Licenses)
Office 1─* Account
Account (Household | Business) ─ Producer (User), Account Manager (User)
Account *─* Contact            a Contact can link a Household and a Business
Account 1─* X-date
Account 1─* Opportunity 1─* Quote (per Carrier, premium per line)
Account 1─* Policy 1─* Term    Policy ─ Carrier; Term 1─* Insured item, Additional interest   [Synced]
Term 1─0..1 Renewal ─0..1 Opportunity (type Remarket)
Account 1─* Service Request ─0..1 Policy
  Service Request (Claim report)        → Claim       [tracking only]
  Service Request (Certificate request) → Certificate → Holder (on a Business Account)
Account 1─* Activity, Task    (each may also link to a Policy, Opportunity, Renewal, or Service Request)
Lead ─(Qualify)→ Account (Prospect) + Opportunity (New business)  |  existing Account + Opportunity (Cross-sell)
Carrier 1─* Appointment (state)
```

## Lifecycles

| Object | Statuses |
|---|---|
| Lead | New → Contacted → Qualified \| Disqualified (reason) |
| Account | Prospect → Client → Former client. Becomes Client when its first Term is bound; becomes Former client when no Term is active. |
| Opportunity | New → Contacted → Gathering info → Quoting → Proposed → Won \| Lost (reason). Type: New business, Cross-sell, or Remarket. |
| Quote | Requested → Quoted \| Declined \| Referred → Presented → Accepted \| Not taken. Lines can be accepted separately. When the Opportunity closes, any Quote still Requested, Quoted, Referred, or Presented becomes Not taken. |
| Term | Bound → Active → Renewed \| Rewritten \| Non-renewed \| Canceled \| Expired, plus a Pending cancellation flag |
| Renewal | Upcoming → In review → Remarketing → Presented → Decided → Done. Decision: Renew as is \| Rewrite \| Non-renewed. Remarketing is a status, not a decision. |
| Service Request | New → In progress → Waiting on carrier \| Waiting on client → Done |
| Certificate | Requested → Needs review (when an additional insured, waiver, or primary & noncontributory is requested) → Issued → Re-issued |
| Claim | Reported → Submitted to carrier → Claim # assigned → Open → Closed (paid \| denied \| withdrawn) |
| Task | Open → Done \| Canceled |

## Timing rules

- **Renewal** is created this many days before a Term's expiration:
  - Personal lines: 45 (FL residential property: 120).
  - Small commercial: 60.
  - Large commercial: 90.
  - The cutoff is $25,000 in annual commercial premium on the Account: Accounts at or above it count as large commercial.
- **X-date** creates a Task for the Producer this many days before the date:
  - Personal lines: 45.
  - Commercial: 90.
- **Won Opportunity** creates its Terms in Bound status.
- **Lost Opportunity** with a known expiration creates an X-date.
- **Renewal** shows the premium change in percent, and a risk of High or Low.

## Ownership

- **Opportunity:** the Producer.
- **Renewal and Service Request:** the Account Manager.
- **Lead:** whoever it is assigned to.
