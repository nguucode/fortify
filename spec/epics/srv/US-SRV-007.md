---
id: US-SRV-007
title: Record the carrier result when closing a Policy change
epic: SRV
roles: [Account Manager, Principal]
priority: P1
status: Draft
size: S
routes: [/service/:id]
dependsOn: [US-SRV-004, US-SRV-006]
---

## Story

As an Account Manager, I want to record what the carrier did with a Policy change when I close it, so that the Account's history shows the endorsement, its effective date, and the premium impact even before the AMS sync arrives.

## Acceptance criteria

- Given a Policy change in an open status, when the user clicks "Mark done", then the dialog asks for Outcome (Endorsement issued, Carrier declined, Withdrawn by Account), and the remaining fields depend on it.
- Given Outcome Endorsement issued, when the user fills the dialog, then Endorsement effective date (default the requested effective date) and Premium change are required: Additional premium, Return premium, or No change, with an amount in dollars for the first two (e.g. "+$214.00" or "−$86.50"); attaching the endorsement document is optional.
- Given Outcome Carrier declined or Withdrawn by Account, when the user fills the dialog, then only a Reason is required.
- Given the user confirms, when the request moves to Done, then a result card appears at the top of `/service/:id` ("Endorsement issued · effective 11/15/2026 · Additional premium $214.00") and an Activity is logged on the Account and the Policy.
- Given Outcome Endorsement issued and the changes include Add vehicle or Replace vehicle, when the dialog closes, then a toast offers "Create ID card request" which opens the US-SRV-005 sheet with type ID card / evidence, the same Policy, and the new vehicle preselected.
- Given the result card, when it renders, then it carries the note "The policy updates in Fortify when the AMS syncs the endorsement."

## UI states

- Empty: not applicable (the dialog always has a request).
- Loading: "Mark done" shows a spinner while saving.
- Error: "Enter the premium change amount." when Additional or Return premium has no amount; "Effective date must fall within the current term (…)" reused from US-SRV-006; save failure keeps the dialog open with "Couldn't save. Try again."
- No permission: a Producer can create Policy changes but cannot close them: "Mark done" is disabled with "Only the Account Manager can close a Policy change." Admin is read-only.
- Overflow: amounts up to $999,999.99 with tabular-nums; Reason up to 500 characters.

## Design notes

- Dialog 480px. Outcome as a 3-option segmented radio group. Premium change as a select plus an amount input with a "$" prefix; Return premium shows the amount with a leading minus in the summary.
- Result card: white, ring, 8px radius, a success check icon for Endorsement issued, a neutral icon for Declined and Withdrawn; amounts right-aligned in tabular-nums; never a filled colored pill.

## FE notes

- `PolicyChangeDoneDialog` is registered as `serviceTypeRegistry['Policy change'].DoneDialogBody`; `canClose` requires an outcome.
- Stored on the request as `result: { outcome, effectiveDate, premiumChange: { kind, amount }, reason, attachmentIds }`; Policy and Term data stay untouched.
- The "Create ID card request" toast passes `{ type: 'ID card / evidence', accountId, policyId, preselectInsuredItemIds }` to the sheet.
- Store actions: `serviceRequests.setStatus` with `result`, `activities.log` (both Account and Policy links).

## Mock data

- SR-10482 (Add vehicle on LSM-PA-4471029) ready to close with Additional premium $214.00.
- A Done Policy change with Return premium $86.50 (Remove driver) and one with Carrier declined ("Carrier won't add a driver with 2 at-fault claims in 3 years").
