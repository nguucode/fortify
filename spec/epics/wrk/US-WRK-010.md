---
id: US-WRK-010
title: Bulk update Tasks
epic: WRK
roles: [Account Manager, Principal, Admin, Producer]
priority: P2
status: Draft
size: S
routes: [/tasks]
dependsOn: [US-WRK-004, US-WRK-006]
---

## Story

As an Account Manager covering for a colleague who is out, I want to select several Tasks and reassign, reschedule, or complete them at once, so that a teammate's queue is redistributed in one pass.

## Acceptance criteria

- Given I select one or more rows on `/tasks`, when the bulk bar appears, then it shows the count and actions Complete, Change due date, Reassign, and Cancel.
- Given I choose Change due date, when I pick "Tomorrow", "Next Monday", "+7 days", or a date, then every selected Task moves and each Account logs one System Activity.
- Given I choose Reassign, when I pick a user, then only users who can see every selected Task's Account are offered; if none can, the picker reads "No one can see all 12 accounts. Narrow your selection."
- Given I choose Complete, when I confirm "Complete 12 tasks?", then each Task completes as in US-WRK-006 without outcome notes and logs its Activity.
- Given the action finishes, when the toast appears, then it reads "Moved 12 tasks to 11/18/2026" or the matching message for the action.

## UI states

- Empty: the bulk bar is hidden until a row is selected.
- Loading: "Updating 12 tasks…" in the bulk bar.
- Error: "Updated 8 of 12. 4 were not changed." with "Retry remaining".
- No permission: a Producer sees Complete, Change due date, and Cancel, while Reassign offers only users who can see those Accounts; Done and Canceled rows can't be selected.
- Overflow: selection up to 200 Tasks; counts only in messages.

## Design notes

- Same bulk bar as the Accounts list (recessed, above the table header); Cancel as a danger text button at the end.

## FE notes

- Actions `bulkUpdateTasks(ids, patch)`, `bulkCompleteTasks(ids)`, `bulkCancelTasks(ids, reason)` in chunks of 40 for progress against the mock latency.

## Mock data

- An Account Manager colleague of Marisol Reyes out of office with 31 open Tasks across 19 Accounts in Houston.
