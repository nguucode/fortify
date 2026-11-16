---
id: US-CRT-008
title: Agency-wide Certificates list with Needs review queue
epic: CRT
roles: [Account Manager, Principal, Producer, Admin]
priority: P1
status: Done
size: M
routes: [/certificates]
dependsOn: [US-FND-007, US-CRT-004]
---

## Story

As a Principal, I want one list of every Certificate in my scope, with a Needs review saved view as my approval queue, so that nothing with AI or waiver wording sits unapproved while a client waits to get onto a job site.

## Acceptance criteria

- Given I open `/certificates`, when the list loads, then it shows saved views All and Needs review, and columns ID, Holder (Business Account as the muted secondary token), Policies, Flags, Status, Requested (MM/DD/YYYY), Age (business hours since requested, for example "6h"), Account Manager, and Issued.
- Given my role, when the list loads, then scope applies: a Producer sees Certificates on their Book, an Account Manager sees their Office, a Principal and an Admin see the agency.
- Given the Needs review view, when it loads, then rows are sorted oldest submitted first and a row older than 4 business hours shows its Age in warning text with a clock icon, and older than 1 business day in danger text, matching the Today widget (US-HOM-012).
- Given the Needs review view has items and I am a Principal, when I click a row, then the Certificate opens with the review panel open (`?mode=review`, US-CRT-007), read-only when I prepared, submitted, or requested it.
- Given filters, when I filter by Status, Office, Account Manager, Flag (AI, WVD, P&NC), or Issued date range, then the list and the meta line update ("Showing 14 of 80 certificates · 7 need review").
- Given the list has no create button, when any role views it, then a muted note in the page description reads "Certificates start from a Certificate request in Service."

## UI states

- Empty: All view with no data shows "No certificates yet. They're created from a Certificate request." with a link to `/service`; the Needs review view empty shows "Nothing to review. You're caught up."
- Loading: 10 skeleton rows; saved-view counts show "–".
- Error: page-level error panel "Certificates couldn't load." with "Try again".
- No permission: all four roles can read within scope; row actions other than "Open" do not exist here.
- Overflow: Holder names truncate with tooltip; 80+ rows paginate at 50; Age over 99 hours shows "4d".
- Filtered: filter chips under the toolbar with "Clear all"; no match shows "No certificates match these filters."

## Design notes

- List page grammar from Part B: H1 "Certificates", one-line muted description, saved-view tabs with count pills (Needs review count uses the neutral pill, not red), toolbar with search ("Search holders or accounts"), Filters, Display options, Export.
- Collapsible callout above the table for Principals when Needs review is not empty: "7 certificates need review · oldest 2d", items with a warning dot, Holder name bold, Account muted.
- Same status and flag rendering as US-CRT-003.

## FE notes

- Route `/certificates?view=needs-review&office=houston`; saved view and filters in the query string via the FND data table (US-FND-007).
- Reuse `CertificatesTable` column definitions from US-CRT-003 with Account and Account Manager columns on.
- Scope through the shared `selectInScope('certificate', user)` selector; Age computed by `businessHoursSince(date, office.timezone)` with unit tests (8 AM to 5 PM, Monday to Friday).
- The sidebar Certificates item can show the Needs review count badge for Principals, read from the same selector.

## Mock data

- 80 Certificates spread across the 3 Offices (Houston 40, San Antonio 20, Tampa 20); 7 in Needs review with ages 1h, 2h, 3h, 5h, 9h, 1d, and 2d.
- Edge cases: the long Holder name from US-CRT-001; one Certificate on an Account whose Account Manager is Deactivated (column shows the name with "(inactive)").
