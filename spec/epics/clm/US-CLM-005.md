---
id: US-CLM-005
title: Close or reopen a Claim
epic: CLM
roles: [Account Manager, Principal]
priority: P1
status: Draft
size: S
routes: [/claims/:id]
dependsOn: [US-CLM-004]
---

## Story

As an Account Manager, I want to close a Claim with the carrier's outcome, and reopen it if the carrier does, so that the Account's history shows how each claim ended without Fortify trying to adjust it.

## Acceptance criteria

- Given a Claim in Claim # assigned or Open, when the user clicks "Close claim", then a dialog requires Outcome (Paid, Denied, Withdrawn) and Closed on (default today, not before the submitted date).
- Given Outcome Paid, when the user fills the dialog, then "Amount paid (as reported by the carrier)" is optional in dollars; given Denied, "Denial reason" is optional text; a Note is optional for all outcomes.
- Given the user confirms, when it saves, then the Claim shows "Closed · Paid" with the closed date, the Outcome card appears on the Claim page ("Paid · $6,240.00 · closed 11/14/2026"), and an Activity is logged on the Account and the Claim.
- Given a Claim closed within the last 90 days, when the user clicks "Reopen", then a Reason is required (e.g. "Supplement for hidden damage") and the Claim returns to Open with its claim number and adjuster kept; after 90 days "Reopen" is disabled with "Closed more than 90 days ago. Report a new claim if needed."
- Given the linked Claim report request is still open when the Claim closes, when the dialog closes, then a toast offers "Mark SR-10490 done".

## UI states

- Empty: not applicable.
- Loading: "Close claim" shows a spinner while saving.
- Error: "Closed date can't be before the claim was submitted (10/28/2026)."; amounts accept $0.01 to $9,999,999.99.
- No permission: Admin sees the actions disabled with "Admins have read-only access to claims."; a Producer sees them disabled with "Only Account Managers and Principals can update claims." (roles.md).
- Overflow: Denial reason and Note up to 1,000 characters; amounts in tabular-nums with thousands separators.

## Design notes

- Dialog 480px; Outcome as a 3-option segmented control; conditional fields appear under it.
- Outcome card on the Claim page: white, ring, 8px radius; success check icon for Paid, danger icon for Denied, neutral icon for Withdrawn; text label always beside the icon.
- No reserve, payment schedule, or coverage determination fields anywhere; this is tracking only.

## FE notes

- Store actions: `claims.close(id, { outcome, closedAt, amountPaid, denialReason, note })`, `claims.reopen(id, reason)`; both log Activities. Reopen clears `outcome`, `amountPaid`, and `closedAt`, keeping their previous values in the Activity.
- `amountPaid` is display-only and is not summed into any report.

## Mock data

- CL-2041 Open (to close as Paid $6,240.00); CL-2017 Closed · Paid 20 days ago (can reopen); CL-1988 Closed · Denied 140 days ago (cannot reopen) with denial reason "Wear and tear exclusion."
