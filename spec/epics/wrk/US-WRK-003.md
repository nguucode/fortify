---
id: US-WRK-003
title: Edit a note within 24 hours
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P2
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-WRK-001, US-WRK-002]
---

## Story

As an Account Manager, I want to correct a note I logged within the last 24 hours, so that a typo or a wrong figure doesn't live forever in the history, while older history stays trustworthy.

## Acceptance criteria

- Given a note I logged less than 24 hours ago, when I open its entry menu, then "Edit note" is enabled and opens the text inline in the timeline.
- Given I save the edit, when the store updates, then the entry shows the new text and "Edited" after the time, with a tooltip "Edited 11/15/2026 3:12 PM".
- Given a note older than 24 hours, when I open its entry menu, then "Edit note" is disabled with the tooltip "Notes can be edited for 24 hours after they're logged."
- Given a note logged by someone else, when I open its entry menu, then "Edit note" is disabled with the tooltip "Only the author can edit a note."
- Given any Activity, when I open its entry menu, then there is no delete action; calls, emails, SMS, meetings, and system events are not editable.

## UI states

- Empty: not applicable.
- Loading: "Saving…" on the inline Save button.
- Error: "Couldn't save the edit. Try again." inline; the original text is restored on Cancel.
- No permission: as above, disabled with a reason, never hidden.
- Overflow: the inline editor grows to 12 lines, then scrolls.

## Design notes

- Inline editing inside the entry, recessed background, with "Save" (small blue) and "Cancel" (text) under the field.

## FE notes

- `canEditActivity(user, activity, now)` = `type === 'note' && createdById === user.id && now - createdAt < 24h`; action `editNote(id, body)` sets `editedAt`.

## Mock data

- A note logged 2 hours ago by the current mock user, one logged 30 hours ago, and one logged 1 hour ago by another user.
