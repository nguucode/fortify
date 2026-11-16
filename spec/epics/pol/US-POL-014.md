---
id: US-POL-014
title: Past Term detail drawer
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P2
status: Done
size: S
routes: [/policies/:id]
dependsOn: [US-POL-005]
---

## Story

As an Account Manager, I want to open a past Term and see its coverages, premium, and Insured items as they were, so that I can explain what changed between Terms.

## Acceptance criteria

- Given I click a row in the Terms tab, then a right drawer opens titled "Term 3 · 03/01/2024–03/01/2025" with Status, Premium, coverage table, and a count of Insured items with a list of names.
- Given the drawer, then a "Compare with current term" link opens the same side-by-side diff used by Renewals (US-REN-006) in read-only mode, when a current Term exists.
- Given I press Escape or click outside, then the drawer closes and focus returns to the clicked row.
- Given the URL, then the open Term is reflected as `?tab=terms&term=:termId` so the drawer survives a reload.

## UI states

- Empty: "No coverage details were synced for this term." for Terms older than the AMS history window.
- Loading: drawer skeleton.
- Error: inline error inside the drawer with Retry.
- No permission: none beyond the Policy page.
- Overflow: 30+ coverages scroll inside the drawer body; header sticky.

## Design notes

- 480px right drawer, white, ring, popover shadow; no form controls.

## FE notes

- `TermDrawer` built on Radix Dialog; reads `store.terms.get(termId)` with coverages and items snapshot.

## Mock data

- Term snapshots for the 18-Term auto Policy; older than 6 Terms have no coverage detail.
