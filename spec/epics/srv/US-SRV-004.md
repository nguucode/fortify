---
id: US-SRV-004
title: Change a Service Request's status
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P0
status: Done
size: S
routes: [/service, /service/:id]
dependsOn: [US-SRV-003]
---

## Story

As an Account Manager, I want to move a request through New, In progress, Waiting, and Done with the right note at each step, so that anyone covering for me knows what we are waiting for and how the request ended.

## Acceptance criteria

- Given a New request, when the user clicks "Start work", then the status becomes In progress, and if the request has no assignee it is assigned to the current user.
- Given an open request, when the user moves it to Waiting on carrier or Waiting on client, then a popover requires "Waiting for" (3 to 200 characters, e.g. "Endorsement from Lone Star Mutual") and offers "Follow up on" (default 2 business days ahead) that creates a Task for the assignee when set.
- Given an open request, when the user marks it done, then a dialog requires a Resolution (e.g. "Vehicle added effective 11/15/2026; new ID cards emailed"), except where a type adds its own rule: Policy change uses US-SRV-007, a Claim report can close only once its Claim is Submitted to carrier, and a Certificate request closes automatically when its Certificate is Issued.
- Given a Done request, when the user clicks "Reopen" within 30 days of Done, then a reason is required and the status returns to In progress; after 30 days "Reopen" is disabled with "Done more than 30 days ago. Create a new request instead."
- Given any status change, when it saves, then a system Activity is logged on the Account and the request ("Marisol Reyes moved SR-10482 from In progress to Waiting on carrier: Endorsement from Lone Star Mutual"), and the assignee is notified if someone else made the change.
- Given the allowed transitions, when the user opens "Move to…", then New is never offered for a request that has left New.

## UI states

- Empty: not applicable (always acts on an existing request).
- Loading: the confirm button shows a spinner and is disabled while saving; the board card shows its new column immediately (optimistic).
- Error: on failure the card returns to its original column or the header status reverts, and a toast reads "Couldn't update the status. Try again."
- No permission: Admin sees all status controls disabled with "Admins have read-only access to Service Requests." A Producer can change status only on requests they created (roles.md "E own"); otherwise "Only the Account Manager can change this request." A Claim report blocked by its Claim shows "Submit the Claim to the carrier before closing this request." on the disabled "Mark done".
- Overflow: "Waiting for" and Resolution show a live character count after 150 and 1,800 characters (Resolution max 2,000).

## Design notes

- Waiting popover: anchored to the trigger, 360px wide, ring + popover shadow; one textarea (3 rows), one optional date field, "Save" (blue) and "Cancel".
- Done dialog: centered, 480px; title "Mark SR-10482 done"; Resolution textarea; "Mark done" (blue). Types with extra fields swap the body (US-SRV-007).
- In Waiting statuses the request header shows a muted line "Waiting on carrier since 11/12/2026 · Endorsement from Lone Star Mutual".

## FE notes

- Enhanced by US-FND-008 (P1): the P0 build ships without these; their controls appear once those stories land.
- Single transition module `serviceRequestTransitions.ts`: `canTransition(request, to, user)` returns `{ ok }` or `{ ok: false, reason }`; the board drop, "Move to…", and header buttons all call it.
- Allowed: New → In progress, Waiting on carrier, Waiting on client, Done; In progress ↔ Waiting on carrier ↔ Waiting on client; any open status → Done; Done → In progress (Reopen, 30 days).
- Type hooks: `serviceTypeRegistry[type].canClose(request)` and an optional `DoneDialogBody`.
- Certificate auto-close: subscribe to the store event `certificate.issued` (emitted by CRT issuance) and set the linked request to Done with Resolution "Certificate CERT-0412 issued", logged as a system Activity.
- Store actions: `serviceRequests.setStatus(id, { to, waitingFor, followUpOn, resolution, reopenReason })`, `tasks.create`, `activities.log`, `notifications.push`.

## Mock data

- Requests in every status; SR-10477 Done 12 days ago (can reopen) and SR-10301 Done 45 days ago (cannot).
- SR-10491 Claim report whose Claim CL-2042 is still Reported (close blocked).
- One request created by Dana Whitfield (Producer) and one created by Marisol Reyes on Dana's Account, to show both Producer scenarios.
