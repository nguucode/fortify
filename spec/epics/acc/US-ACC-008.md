---
id: US-ACC-008
title: Account Activity tab with open Tasks
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-WRK-001, US-WRK-002, US-WRK-004]
---

## Story

As an Account Manager, I want the Activity tab to show the Account's open Tasks above its full Activity timeline, so that I see what is owed to this Account and everything that already happened in one place.

## Acceptance criteria

- Given I open the Activity tab, when it loads, then an "Open tasks" section lists the Account's open Tasks sorted by due date, overdue first, using the shared task list in compact mode, and the timeline below shows all Activities on the Account and its child records.
- Given I click "Log activity" or "New task" in the tab toolbar, when the drawer opens, then the Account is prefilled and locked.
- Given the timeline, when I pick a record in the "Linked to" filter (e.g. "Policy HO-4471023" or "Renewal · Auto 12/04/2026"), then only Activities linked to that record show.
- Given I complete a Task in the Open tasks section, when the store updates, then the Task leaves the list, its Activity appears at the top of the timeline, and the Activity tab count drops by 1.
- Given the Account has more than 5 open Tasks, when the section renders, then it shows 5 and "Show all 8 open tasks" links to `/tasks?account=:id`.

## UI states

- Empty: no open Tasks shows the single muted line "No open tasks." with "New task"; no Activity shows "No activity yet. Log a call, email, or note to start the history."
- Loading: 3 task skeleton rows and 5 timeline skeleton entries.
- Error: each section errors independently with Retry.
- No permission: Activity and Task are C E for all roles in scope; an Archived Account hides "Log activity" and "New task" and shows the timeline read-only.
- Overflow: Account with 400 Activities pages 25 at a time with "Show older activity".

## Design notes

- Tab toolbar: timeline type filter chips on the left, "Linked to" select, then outline "New task" and blue "Log activity" on the right.
- Open tasks section is a white card with ring above the timeline; the timeline sits directly on the canvas with its own day headers.

## FE notes

- `AccountActivityTab` composes `TaskList` (US-WRK-004, `scope={{ accountId }}`, `compact`, `limit={5}`) and `ActivityTimeline` (US-WRK-001, `scope={{ accountId, includeChildren: true }}`).
- "Linked to" options come from `selectAccountLinkableRecords(accountId)`.

## Mock data

- Torres Household with about 140 Activities across all types, including System events (reassignment, Term bound, Renewal created) and 8 open Tasks, 2 overdue.
