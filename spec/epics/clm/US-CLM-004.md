---
id: US-CLM-004
title: Record the carrier claim number and adjuster
epic: CLM
roles: [Account Manager, Principal]
priority: P1
status: Done
size: S
routes: [/claims/:id]
dependsOn: [US-CLM-003]
---

## Story

As an Account Manager, I want to record the carrier's claim number and the assigned adjuster when the carrier sends them, so that the Account and my colleagues can reach the right adjuster and quote the right number.

## Acceptance criteria

- Given a Claim in Submitted to carrier, when the user clicks "Add claim #", then a dialog asks for Carrier claim # (required, 4 to 30 letters, digits, or dashes) and offers the optional Adjuster fields: Name, Type (Carrier staff, Independent), Phone, Email, Assigned on.
- Given the user saves a claim number without an adjuster, when it saves, then the Claim moves to Claim # assigned; saving with both a claim number and an adjuster name moves it to Open; adding the adjuster later from "Add adjuster" moves a Claim # assigned Claim to Open.
- Given a claim number already used on another Claim with the same Carrier, when the user leaves the field, then a warning reads "GSI-26-0038812 is already on CL-2041. Check the number." and saving is still allowed.
- Given the Claim reaches Claim # assigned or Open, when the dialog closes, then a toast offers "Mark SR-10490 done" for the linked Claim report request; accepting opens its Done dialog with the Resolution prefilled "Reported to Gulfstream Indemnity, claim # GSI-26-0038812."
- Given recorded values, when the user edits them later (pencil on the Carrier or Adjuster card), then the change saves without changing status and an Activity logs the old and new values.

## UI states

- Empty: before any value, the Carrier card reads "Claim # not assigned yet" and the Adjuster card "No adjuster yet."
- Loading: "Save" shows a spinner.
- Error: "Use 4 to 30 letters, numbers, or dashes."; "Enter a valid phone number, like (555) 010-1234."; save failure keeps the dialog open.
- No permission: Admin sees the actions disabled with "Admins have read-only access to claims."; a Producer sees them disabled with "Only Account Managers and Principals can update claims." (roles.md).
- Overflow: adjuster names up to 80 characters and emails up to 120 characters, truncating on the card with a tooltip.

## Design notes

- Dialog 480px with two groups: "Carrier claim number" and "Adjuster (optional)". Phone input formats as (555) 010-1234 while typing.
- Carrier claim # renders in mono on the header and cards, with a copy icon button labeled "Copy claim number".

## FE notes

- Status is derived on save: `claimNumber && adjuster?.name ? 'Open' : claimNumber ? 'Claim # assigned' : current`. `statusDates` records the first time each status is reached.
- Store actions: `claims.updateTracking(id, { carrierClaimNumber, adjuster })`, `activities.log` with a field diff; duplicate check via `claims.findByCarrierClaimNumber(carrierId, number)`.

## Mock data

- CL-2045 in Submitted to carrier with Gulfstream Indemnity; CL-2041 already holding GSI-26-0038812 for the duplicate warning.
- Adjusters: "Rachel Moore, Coastline Adjusting" (Independent), "Devon Price" (Carrier staff, Lone Star Mutual).
