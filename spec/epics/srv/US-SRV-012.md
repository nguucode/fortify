---
id: US-SRV-012
title: Cancellation request form
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P1
status: Done
size: S
routes: [/service, /accounts/:id]
dependsOn: [US-SRV-005, US-XDT-002]
---

## Story

As an Account Manager, I want a cancellation form that captures the date, the reason, and the signed request, and that gives the Producer a chance to keep the business, so that cancellations are clean with the carrier and lost lines turn into X-dates.

## Acceptance criteria

- Given type Cancellation request, when the details section shows, then the Policy list offers only Active and Pending cancellation Terms, and Requested cancellation date is required (default today); a date more than 30 days in the past shows "Back-dated cancellations need carrier approval."
- Given the form, when the user picks a Reason, then options are Sold the vehicle or property, Replaced with another carrier, Rewrite at this agency, Moving out of state, Cost, No longer needed, Other; Other requires a note.
- Given Reason Replaced with another carrier, when the user fills it, then optional fields New carrier and New expiration date appear, and when both are filled, submitting also creates an X-date on the Account for that line, carrier, and date.
- Given "Signed cancellation request received?", when the answer is No, then the request is created and its Details view shows "Signed request outstanding"; when Yes, an attachment is required.
- Given "Ask the Producer to try to keep this policy" (checked by default unless the Reason is Rewrite at this agency), when the request is created, then a Task "Retention call: Torres Household, LSM-PA-4471029" is created for the Account's Producer, due in 1 business day, and the Producer is notified.
- Given the Policy has Additional interests, when it is selected, then a warning reads "This policy has 1 additional interest (First Coastal Bank). The carrier notifies them; confirm payoff or replacement coverage."
- Given the form, when it renders, then a muted note reads "The term's status changes when the AMS syncs the cancellation."

## UI states

- Empty: an Account with no Active or Pending cancellation Terms disables the type in step 1 with "No active policies to cancel."
- Loading: Additional interest warning and Producer name show skeletons while the Policy loads.
- Error: "Attach the signed cancellation request."; "Enter a reason."; X-date creation failure keeps the request and shows "Request created, but the X-date wasn't saved. Add it from the Sales tab."
- No permission: Admin cannot open the sheet. A Producer creating their own cancellation sees the retention checkbox unchecked and hidden (they are the Producer).
- Overflow: Reason note up to 500 characters; Carrier select is searchable with about 10 Carriers plus "Other carrier" free text.

## Design notes

- Group order: Policy, Requested cancellation date, Reason (+ conditional fields), Signed request, Retention checkbox. The additional-interest warning sits directly under the Policy select.
- Details view shows the cancellation date prominently (14/500) and "Signed request outstanding" as a status cell with the warning icon when applicable.

## FE notes

- Registers `serviceTypeRegistry['Cancellation request']`; `canClose` requires `signedRequestReceived === true`.
- Side effects in one store transaction: `serviceRequests.create`, optional `tasks.create` for the Producer, optional `xDates.create` (XDT store action), `notifications.push`.
- Never writes Term status; the Pending cancellation flag comes only from the synced Term.

## Mock data

- Torres Household auto LSM-PA-4471029 (Producer Dana Whitfield) for the retention Task.
- Okafor Household home with mortgagee First Coastal Bank for the warning.
- SR-10215: Cancellation request open 104 days, waiting on client for the signed request.
