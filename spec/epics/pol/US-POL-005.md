---
id: US-POL-005
title: Term history on the Policy page
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/policies/:id]
dependsOn: [US-POL-002]
---

## Story

As an Account Manager, I want to see every Term of a Policy with its dates, premium, and outcome, so that I can explain premium history at renewal.

## Acceptance criteria

- Given the Terms tab, then a table lists Terms newest first with columns Term (e.g. "Term 4"), Effective, Expiration, Premium, Change vs prior (%), Status, and Source.
- Given a Term's status, then it shows one of Bound, Active, Renewed, Rewritten, Non-renewed, Canceled, or Expired, and a Pending cancellation flag appears as an extra warning label on the Term that carries it.
- Given a Term was created by a Won Opportunity, then Source shows "New business · OPP-2231" linking to `/pipeline/:id`; given it followed a Renewal, then Source links to `/renewals/:id`.
- Given premium change vs prior Term is +15% or more, then the % shows in danger text with an up arrow; −5% or less shows success text with a down arrow; first Terms show "—".
- Given I click a row, then the past Term detail drawer opens (US-POL-014).

## UI states

- Empty: impossible for a synced Policy; if no Terms return, show "No terms synced yet."
- Loading: 4 skeleton rows.
- Error: inline "Couldn't load terms." with Retry inside the tab.
- No permission: none beyond the Policy page scope check.
- Overflow: a Policy with 18 Terms (an 18-year auto Policy) paginates at 10 with "Show all".

## Design notes

- Dense 40px table; Change % right-aligned tabular figures; status as dot + label.
- Current Term row gets a small "Current" neutral pill next to the Term label (count/badge use is allowed for this marker).

## FE notes

- `TermsTable` reads `store.terms.listByPolicy(policyId)`; change % computed in the selector from prior Term premium.
- Source links resolved via `term.sourceOpportunityId` and `term.renewalId`.

## Mock data

- A Policy with 18 Terms; one with a single Bound Term from the demo; one Term with the Pending cancellation flag; one Rewritten Term (see US-POL-006).
