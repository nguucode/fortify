---
id: US-SRV-015
title: Edit and reassign a Service Request
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P1
status: Draft
size: S
routes: [/service/:id]
dependsOn: [US-SRV-003, US-SRV-005]
---

## Story

As an Account Manager covering for a colleague, I want to edit a request's details and hand it to another Account Manager, so that work moves to whoever is in the office without recreating it.

## Acceptance criteria

- Given an open request, when the user clicks "Edit", then the sheet from US-SRV-005 opens in edit mode with Subject, Description, Requested via, Due, Attachments, and the type's details editable; Type and Account are shown read-only with "Type can't be changed. Create a new request instead."
- Given the Assignee field, when an Account Manager opens it, then it lists the Account Managers in the request's Office; a Principal sees all Account Managers in the agency.
- Given the user changes the assignee and saves, when the save succeeds, then a system Activity reads "Marisol Reyes reassigned SR-10482 to Marcus Hill", and Marcus Hill receives a notification.
- Given the user changes Due by hand, when they save, then a Reason is required (e.g. "Account asked for Friday"), and the indicator from US-SRV-014 uses the new Due.
- Given a Producer, when they open a request they did not create, then "Edit" is disabled with "Only the Account Manager can change this request."; "E own" in roles.md means the requests the Producer created.
- Given a Done request, when the page renders, then "Edit" is disabled with "Reopen the request to edit it."

## UI states

- Empty: not applicable.
- Loading: the edit sheet shows field skeletons while the request loads; "Save changes" shows a spinner.
- Error: save failure keeps the sheet open with "Couldn't save changes. Your edits are kept."; a stale edit (someone else saved first) shows "This request changed since you opened it." with "Reload".
- No permission: Producers can edit only requests they created, and the Assignee field is read-only for them; Admin sees "Edit" disabled with "Admins have read-only access to Service Requests."
- Overflow: assignee list is searchable when it has more than 8 people.

## Design notes

- Same sheet as create, header "Edit SR-10482", primary "Save changes". Changed fields get no special styling; the Activity log records the diff.
- The Due reason field appears inline under Due only after Due changes.

## FE notes

- `NewServiceRequestSheet` with `mode="edit"`; the zod schema adds `dueReason` when `due !== computedDue`.
- Optimistic concurrency via `updatedAt` compare in the mock store.
- Store actions: `serviceRequests.update(id, patch)`, `serviceRequests.reassign(id, userId)`, `activities.log` with a field diff, `notifications.push`.

## Mock data

- Houston Account Managers: Marisol Reyes, Priya Raman, Marcus Hill; San Antonio: Luis Romero, Ana Villarreal; Tampa: Keisha Grant, Owen Brooks.
- SR-10482 assigned to Marisol Reyes; a Done request for the disabled scenario.
