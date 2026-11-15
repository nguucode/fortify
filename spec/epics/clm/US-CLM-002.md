---
id: US-CLM-002
title: Claim page
epic: CLM
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/claims/:id]
dependsOn: [US-FND-005, US-FND-006, US-WRK-001, US-WRK-002]
---

## Story

As an Account Manager, I want one page per Claim with the loss details, the carrier's claim number, the adjuster's contact details, and where the claim stands, so that I can update the Account or call the adjuster without opening the carrier portal.

## Acceptance criteria

- Given a Claim in scope, when the user opens `/claims/CL-2041`, then the H1 reads "Auto claim · 10/28/2026" and the header shows the Claim ID, status, Account (linked), Policy (policy number, Carrier, linked to `/policies/:id`), carrier claim # (or "Not assigned yet"), and Days open.
- Given the status, when the page renders, then a step row shows Reported, Submitted to carrier, Claim # assigned, Open, Closed, with completed steps showing their date and the current step in text-strong.
- Given the loss details captured by the Claim report (US-SRV-009), when the page renders, then the Loss details card shows them read-only: Loss type and ACORD form, Date and time of loss, Loss location, Description, Reported by, Police or fire report #, Injuries, Estimated amount, and the type-specific fields.
- Given an adjuster is recorded, when the page renders, then the Adjuster card shows name, type (Carrier staff or Independent), phone, email, and assigned date, with "Log call" opening the Activity log dialog (WRK) prefilled with the adjuster's name; without one, the card reads "No adjuster yet."
- Given the Claim, when the page renders, then the right rail links the Claim report Service Request ("SR-10490 · Done"), the Account, and the Policy, and a muted banner reads "Fortify tracks this claim. The carrier's adjuster handles it."
- Given a Claim on an Account outside the user's scope, when the user opens its URL, then the access-denied page from US-FND-006 shows, naming the Account Manager.

## UI states

- Empty: missing optional loss fields show "—"; an empty timeline shows "No activity yet."
- Loading: header skeleton, step row skeleton, two card skeletons.
- Error: "Couldn't load this claim." with "Try again"; an unknown ID shows the 404 page.
- No permission: out-of-scope Claims show access denied. Actions from US-CLM-003 to US-CLM-005 are disabled with "Admins have read-only access to claims." for Admin and "Only Account Managers and Principals can update claims." for a Producer: tracking fields are editable by Account Managers (Office) and Principals only (roles.md).
- Overflow: Description over 8 lines collapses with "Show more"; the H1 never truncates the date; long adjuster emails truncate with a tooltip.

## Design notes

- Breadcrumb "Claims / CL-2041". Property row under the H1 in 13px, as on the Service Request page (US-SRV-003), for a shared record-page grammar.
- Step row: plain text steps separated by chevrons, 13px; completed steps in text-label with a check icon and date, future steps in text-muted. No progress bar, no colored pills.
- Body: main column with Loss details, Outcome (when Closed, US-CLM-005), Activity; right rail 320px with Carrier (Carrier name, claims phone, claims email, submitted date and method), Adjuster, Linked records.
- Primary action top-right depends on status: "Submit to carrier" (Reported), "Add claim #" (Submitted to carrier), "Add adjuster" (Claim # assigned), "Close claim" (Open), "Reopen" (Closed).

## FE notes

- Route `/claims/:id`. Components: `ClaimPage`, `ClaimHeader`, `ClaimSteps`, `LossDetailsCard`, `AdjusterCard`, `ClaimCarrierCard`.
- Owns the Claim entity: `{ id, accountId, policyId, termId, serviceRequestId, lossType, acordForm, lossDetails, status, statusDates, carrierClaimNumber, submittedAt, submittedVia, adjuster, outcome, amountPaid, closedAt }`, and the store action `claims.createFromReport(serviceRequestId, lossDetails)` called by US-SRV-009, which creates the Claim in Reported and returns its ID.
- `lossDetails` is copied from the Claim report at creation and read-only afterward; status and tracking fields change only through US-CLM-003 to US-CLM-005.
- Activity timeline reuses the WRK component filtered by `claimId`.

## Mock data

- CL-2041: Auto claim for Okafor Household on 10/28/2026, Open, carrier claim # GSI-26-0038812 (Gulfstream Indemnity), independent adjuster "Rachel Moore, Coastline Adjusting", (555) 010-4471, rachel.moore@example.com.
- CL-2042: Property claim (Hurricane) in Reported with no adjuster; CL-2017: Closed · Paid; one Claim with a 3,800-character description.
- One Claim on a Tampa Account to show access denied as Dana Whitfield (Producer, Houston).
