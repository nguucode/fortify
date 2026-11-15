---
id: US-SRV-016
title: Bulk reassign and status change from the Service list
epic: SRV
roles: [Account Manager, Principal]
priority: P2
status: Draft
size: S
routes: [/service]
dependsOn: [US-SRV-002, US-SRV-004, US-SRV-015]
---

## Story

As a Principal, I want to select many requests and reassign them or move them to a new status at once, so that I can rebalance work when an Account Manager is out.

## Acceptance criteria

- Given the list view, when the user selects rows, then a bulk bar shows "12 selected" with "Reassign", "Change status", and "Clear".
- Given "Reassign", when the user picks an Account Manager and confirms, then every selected request in their scope is reassigned, one Activity is logged per request, and the new assignee gets one summary notification ("12 requests were assigned to you").
- Given "Change status", when the user picks In progress, Waiting on carrier, or Waiting on client, then one "Waiting for" note (required for the Waiting statuses) applies to all; Done is not offered and its tooltip reads "Close requests one at a time to record the result."
- Given some selected requests are not allowed (out of scope, or a transition US-SRV-004 rejects), when the bulk action finishes, then a summary reads "10 updated, 2 skipped" with the skipped IDs and reasons.
- Given the header checkbox, when the user ticks it, then it selects the current page (up to 50); "Select all 118" selects across pages, up to 200.

## UI states

- Empty: the bulk bar is hidden with no selection.
- Loading: the bulk bar shows a progress label "Updating 12 requests…" and disables its buttons.
- Error: if the whole call fails, nothing changes and a toast reads "Couldn't update the requests. Try again."
- No permission: Account Managers can reassign only within their Office; Producers and Admin see no checkbox column.
- Overflow: selections over 200 show "Select up to 200 requests at a time."
- Filtered: changing filters clears the selection and says so in the meta line ("Selection cleared").

## Design notes

- Bulk bar replaces the toolbar's secondary buttons in place (same 36px height), with the count on the left in 14/500; no floating bars.
- Summary dialog lists skipped items as rows: ID in mono, reason in muted text.

## FE notes

- Uses the US-FND-007 selection model; actions call `serviceRequests.bulkReassign(ids, userId)` and `serviceRequests.bulkSetStatus(ids, { to, waitingFor })`, each running `canTransition` per row and returning `{ updated, skipped: [{ id, reason }] }`.

## Mock data

- Keisha Grant (Tampa) with 31 open requests for the "out of office" scenario; 2 of them on Accounts outside a Tampa Account Manager's Office to produce skipped rows.
