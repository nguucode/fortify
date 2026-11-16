---
id: US-WRK-006
title: Complete or cancel a Task
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/tasks, /accounts/:id, /calendar]
dependsOn: [US-WRK-004, US-WRK-001]
---

## Story

As an Account Manager, I want to complete a Task with an optional outcome note, or cancel it with a reason, so that the work is closed out and the Account's history shows what was done.

## Acceptance criteria

- Given an open Task, when I check its Complete box in any list, then it is marked Done immediately, a toast reads "Task completed" with "Undo" for 5 seconds, and the Activity is logged on the Account when that window closes, so an undo never has to remove an Activity.
- Given the Task type is Call, Email, or Meeting, when I complete it from the drawer, then I can add an outcome note and, for Call, an outcome (Connected, Left voicemail, No answer); the logged Activity has that type (e.g. a Call Activity "Call with Ana Torres · Left voicemail"); a General Task logs a System Activity "Completed task: Send loss runs to underwriter".
- Given I choose "Cancel task", when the dialog opens, then I pick a reason (No longer needed, Duplicate, Handled elsewhere, Other with text) and the Task becomes Canceled; Tasks are never deleted.
- Given a Task with Source X-date, Renewal, or Claim, when I complete it, then the source record is not changed; the drawer shows a link "Open X-date", "Open renewal", or "Open claim" to continue there.
- Given I complete the last open Task due today, when the list updates, then the Due today saved view shows its empty state and the Account's Activity tab count drops by 1.

## UI states

- Empty: not applicable.
- Loading: the checkbox shows a small spinner during the mock call; the row stays in place until it resolves.
- Error: the checkbox reverts and the row shows "Couldn't complete this task. Try again."
- No permission: anyone in scope can complete or cancel a Task, not only the assignee; completing someone else's Task logs "Completed by Marisol Reyes (assigned to Dana Whitfield)". An Archived Account's Tasks are already canceled and read-only.
- Overflow: outcome note up to 2,000 characters.

## Design notes

- Round 16px complete checkbox at row start (distinct from the 4px-radius selection checkbox), success color with a check icon when done; the row fades out over 200ms after the Undo window.
- Cancel is a row-menu item, never a primary button.

## FE notes

- Actions `completeTask(id, { note?, callOutcome? })` (sets Done, logs Activity with `linked` copied from the Task) and `cancelTask(id, reason)`; the Activity is written only after the 5-second undo window, and undo calls `reopenTask(id)` before anything is logged.

## Mock data

- Open Tasks of every type and source for the demo user; one assigned to another user on the same Account.
