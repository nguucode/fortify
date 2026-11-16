---
id: US-HOM-009
title: "Account Manager Today: Certificates waiting"
epic: HOM
roles: [Account Manager]
priority: P1
status: Done
size: S
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-CRT-008]
---

## Story

As an Account Manager, I want the Certificate requests I can issue and the ones waiting on approval in one place, so that Businesses get their Certificates the same day.

## Acceptance criteria

- Given I am an Account Manager, when Today loads, then the "Certificates waiting" widget has two tabs: "To issue" (status Requested, holder-only, on Business Accounts in my Office) and "In review" (status Needs review).
- Each row shows the Holder, the Business Account muted under it, Requested (age, "4h"), and the requested provisions as text ("Holder only", or "Additional insured · Waiver of subrogation · Primary & noncontributory").
- Given a row in "In review", then it shows "Waiting on {Principal name}" and I cannot approve it here or on the record (a Principal approves additional insured, waiver, and primary & noncontributory).
- Given a holder-only request is older than its 4-business-hour SLA, then its age shows in warning text.
- Given I click a row, then I go to /certificates/:id; "View all" goes to /certificates (Needs review on the In review tab, All on the To issue tab).

## UI states

- Empty: "No Certificate requests waiting." per tab.
- Loading: 5 skeleton rows.
- Error: "Couldn't load Certificates waiting." with Retry.
- No permission: not rendered for Producer (Certificate read-only) or Admin.
- Overflow: Holder names up to 120 characters truncate with a tooltip.

## Design notes

- Tabs are the small underline tab style inside the card header, each with a count pill.
- Provisions are plain 13px text separated by " · ", not chips.

## FE notes

- Query `certificates.list({ officeId: myOffice, status: 'Requested' | 'Needs review', sort: 'requestedAt', limit: 6 })`.
- Business hours: 8 AM to 5 PM Monday to Friday in the Office's time zone (Central for Houston and San Antonio, Eastern for Tampa), excluding US federal holidays, from `slaRules.ts`.

## Mock data

- Houston Office has 5 Requested holder-only Certificates and 3 Needs review (one requesting all three provisions), one requested 2 days ago.
