---
id: US-CLM-003
title: Submit a Claim to the carrier
epic: CLM
roles: [Account Manager, Principal]
priority: P1
status: Done
size: M
routes: [/claims/:id]
dependsOn: [US-CLM-002, US-SRV-009]
---

## Story

As an Account Manager, I want to hand a reported Claim to the carrier with the ACORD loss notice details in front of me, and record how and when I sent it, so that the first notice is on the carrier's file the same day and the Account knows it is in motion.

## Acceptance criteria

- Given a Claim in Reported, when the user clicks "Submit to carrier", then a dialog shows a read-only preview of the matching ACORD loss notice (ACORD 1, 2, 3, or 4) filled from the loss details, plus the Carrier's claims phone and email.
- Given the preview, when the user clicks "Copy details", then a plain-text summary (named insured, policy number, date of loss, location, description, type-specific fields) is copied for pasting into the carrier portal, and a toast reads "Copied."
- Given the dialog, when the user records the submission, then Submitted via is required (Carrier portal, Email to carrier claims, Phone) and Submitted at defaults to now and cannot be before the Claim was reported.
- Given the user confirms, when it saves, then the Claim moves to Submitted to carrier, the linked Claim report Service Request moves to In progress if it was New, and an Activity "Claim CL-2042 submitted to Gulfstream Indemnity by Carrier portal" is logged on the Account, the Claim, and the request, and a Task "Get claim # from Gulfstream Indemnity for CL-2042" (source Claim) is created automatically for the Claim's Account Manager, due in 2 business days.
- Given a Claim in Reported, when the user picks "Withdraw" from the overflow menu, then a Reason is required and the Claim closes as Closed · Withdrawn without being submitted.

## UI states

- Empty: missing optional fields render "—" in the preview; a Carrier with no claims contact shows "No claims contact on file for this carrier."
- Loading: the preview shows a skeleton while the Term and Carrier load; "Mark submitted" shows a spinner.
- Error: "Submitted time can't be before the claim was reported."; save failure keeps the dialog open with "Couldn't save. Try again."
- No permission: Admin sees "Submit to carrier" and "Withdraw" disabled with "Admins have read-only access to claims."; a Producer sees them disabled with "Only Account Managers and Principals can update claims." (roles.md).
- Overflow: the preview scrolls inside the dialog; descriptions up to 4,000 characters are shown in full there.

## Design notes

- Dialog 720px with two panes: left, the ACORD preview as a recessed well with label/value rows grouped like the form (Policy, Loss, Vehicle or Property, Parties); right, 240px, the Carrier claims contact and the submission fields.
- Title "Submit CL-2042 to Gulfstream Indemnity"; primary "Mark submitted" (blue), secondary "Copy details".
- The preview is a summary, not a facsimile of the ACORD layout; the form name sits as a muted 12px caption ("ACORD 1 · Property Loss Notice").

## FE notes

- `SubmitClaimDialog` with an `acordPreviewMap` per form that maps `lossDetails` and `typeFields` to labeled rows; `copyDetails()` uses the Clipboard API with a textarea fallback.
- No PDF generation and no carrier integration; submission is recorded only.
- Store action: `claims.markSubmitted(id, { via, at })` updates the Claim, sets the linked request to In progress when New, creates the follow-up Task (`tasks.create`, source Claim, due 2 business days), and logs Activities; `claims.withdraw(id, reason)`.

## Mock data

- CL-2042: Property · Hurricane on Okafor Household, Reported 2 hours ago, Carrier Gulfstream Indemnity with claims phone (555) 010-7700 and claims@gulfstream.example.com.
- A Liability Claim on Torres Roofing LLC with Keystone Commercial Casualty, whose Carrier record has no claims contact.
