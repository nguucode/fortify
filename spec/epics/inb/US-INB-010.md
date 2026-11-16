---
id: US-INB-010
title: Triage conversations by assigning, marking done, and marking unread
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/inbox]
dependsOn: [US-INB-001]
---

## Story

As an Account Manager covering for a teammate, I want to assign, close out, and flag conversations one at a time or in bulk, so that the Office inbox is shared without anything getting lost.

## Acceptance criteria

- Given I select one or more rows with their checkboxes, then a bulk bar shows "3 selected" with Assign, Mark done, and Mark unread; the same actions are in the reading pane header for one conversation. Bulk actions take at most 50 rows.
- Assign lists users who can see the Account: the Account's Producer and Account Manager first, then others in its Office; for an unmatched conversation, users in my Office.
- Given I assign a conversation, then it moves to the assignee's "Assigned to me", becomes unread for them, and, if linked, logs a system Activity "Conversation assigned to Maria Chen by Marisol Reyes".
- Given I mark a conversation done, then it leaves the Open list with a toast "Marked done. Undo" for 5 seconds; a new inbound message on a Done conversation reopens it as Open and unread for the assignee.
- Given I mark a conversation unread, then the blue dot returns for me only.

## UI states

- Empty: after the last Open conversation is marked done, the list shows the empty state from US-INB-001.
- Loading: actions show a spinner in the bulk bar and disable it.
- Error: a failed bulk action reports "Couldn't update 2 of 5 conversations. Retry" and keeps those 2 selected.
- No permission: a Producer can assign only conversations on their own Book, and only to that Account's Account Manager or back to themselves; the other names are disabled with "Only Principals and Admins can assign outside the Account's team." Principal and Admin can assign anyone.
- Overflow: selecting more than 50 shows "Select up to 50 at a time" and disables the actions.

## Design notes

- Bulk bar replaces the toolbar while rows are selected: 36px, recessed, count on the left, actions as outline buttons.
- Assign menu: popover with 32px rows, 20px avatar, name, and role in 13px muted.

## FE notes

- `conversations.assign(ids, userId)`, `conversations.setStatus(ids, 'Done' | 'Open')`, `conversations.markUnread(ids, me)`; optimistic with rollback on failure.
- Reopen-on-inbound is a store rule in the mock message arrival handler (US-INB-011).

## Mock data

- Houston Office with 4 Account Managers so cover-for-each-other assignment is demonstrable; 3 Done conversations, one of which receives a seeded inbound reply.
