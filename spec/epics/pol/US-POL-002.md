---
id: US-POL-002
title: Policy page header and Overview
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/policies/:id]
dependsOn: [US-FND-001, US-FND-005, US-FND-006, US-POL-001]
---

## Story

As a Producer, I want a Policy page that shows the current Term at a glance, so that I can answer an Account's coverage question in seconds and know the data matches the AMS.

## Acceptance criteria

- Given I open `/policies/:id`, then the header shows the policy number (mono), Line, Carrier, Named insured, the Account link, current Term status, Effective and Expiration dates (MM/DD/YYYY), annual premium, Agent of record, Producer, and Account Manager.
- Given the page, then tabs Overview, Terms, Insured items, Additional interests, and Claims sit under the header; Additional interests appears only on personal-lines Policies; the tab is reflected in `?tab=`.
- Given the Overview tab, then I see the coverage summary for the current Term (coverage, limit, deductible, premium per coverage) and a "Related" card with links to the open Renewal (if any), the Opportunity that bound the first Term, and open Service Requests on this Policy.
- Given the current Term has the Pending cancellation flag, then a warning banner reads "Pending cancellation · Carrier notice dated 11/02/2026, cancels 12/02/2026 unless resolved." with a link to the related Service Request if one exists.
- Given the current Term status is Bound, then an info banner reads "Bound · Awaiting AMS · Binder BND-22817 expires 12/15/2026." using the Term's binder number and `binderExpiresAt` (30 days after binding).
- Given the Policy belongs to an Account outside my scope, then I see the access-denied page from US-FND-006 naming the Account's Producer, with "Request access".

## UI states

- Empty: a Policy with no coverages synced shows "No coverages synced from the AMS yet." in the coverage table.
- Loading: header skeleton (title bar, 6 meta cells) and a table skeleton in the active tab.
- Error: full-width error panel "Couldn't load this policy." with Retry; a bad id shows the 404 page.
- No permission: access-denied page (out-of-scope Account); all synced fields are read-only for every role.
- Overflow: Named insured and Account names up to 120 characters wrap to two lines in the header then truncate with a tooltip; 30+ coverages scroll inside the table, header row sticky.

## Design notes

- Record page per Part B: canvas background, header block on a white surface with a ring; H1 is the policy number, the Line and Carrier sit as the muted line under it.
- Meta cells in a 6-column grid (label 12px text-label, value 14px text-default); premium in tabular figures.
- Right side of the header: the AMS sync indicator (US-POL-004) and the "Request a change" outline button (US-POL-003). No other actions.
- Banners use the warning or info tint with an icon and text, full width under the header.

## FE notes

- `PolicyPage` with `PolicyHeader`, `PolicyTabs`, `CoverageSummaryTable`, `RelatedCard`; tab state in the query string, default `overview`.
- Reads `store.policies.get(id)`, `store.terms.listByPolicy(id)`, `store.renewals.findByTerm(termId)`, `store.serviceRequests.listByPolicy(id)`.
- Scope check runs before render; out-of-scope returns the FND access-denied component with the owner name.

## Mock data

- One Policy per status: Bound (from the demo Won Opportunity), Active, Pending cancellation, Canceled, Expired.
- Example: Torres Household · Auto · Gulf Harbor Insurance · LSM-PA-4418207 · Active · 03/01/2026–03/01/2027 · $2,184.
- One Policy with 32 coverages, and one with no coverages.
