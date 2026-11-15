---
id: US-ACC-016
title: Move a Book in bulk
epic: ACC
roles: [Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/accounts]
dependsOn: [US-ACC-001, US-ACC-015, US-FND-019, US-FND-008]
---

## Story

As a Principal, I want to move many Accounts, or a user's whole Book, to another Producer or Account Manager in one action, so that a departure (a user can't be deactivated until their Book is moved) or a territory change is handled in minutes instead of one Account at a time.

## Acceptance criteria

- Given I select rows on `/accounts`, when the bulk bar appears, then it offers "Reassign" with the count ("Reassign 48 accounts"); there is also a "Select all 212 matching" link when the current view has more rows than the page.
- Given I filter by Producer "Jordan Lee" and choose "Select all 212 matching", when I open Reassign, then the dialog lets me set a new Producer, a new Account Manager, or both, and summarizes the open work that moves ("212 accounts · 37 open opportunities · 64 open tasks").
- Given I confirm, when the store applies the change, then every selected Account updates, each Account logs its own System Activity, and a single notification goes to each new owner ("Grant Holloway moved 212 accounts to your Book").
- Given some selected Accounts already have the target user in that role, when the summary renders, then it reads "18 accounts already have Marisol Reyes as account manager and will be skipped for that change."
- Given the change finishes, when the toast appears, then it reads "Moved 194 accounts to Dana Whitfield" with "View" opening the list filtered by the new Producer.

## UI states

- Empty: the bulk bar is hidden until at least one row is selected.
- Loading: a progress line "Moving 120 of 194…" in the dialog; the dialog cannot be closed until finished.
- Error: a forced error mid-run reports "Moved 120 of 194. 74 were not changed." with "Retry remaining".
- No permission: Producers and Account Managers never see checkboxes for bulk reassignment; the bulk bar shows only Export for them.
- Overflow: selections up to the full agency (600) are supported; the summary uses counts, never lists.

## Design notes

- Bulk bar slides in above the table header (150ms opacity), recessed background, count on the left, actions on the right.
- Reuses the reassign dialog layout from US-ACC-015 with aggregate counts.

## FE notes

- Extends the `DataTable` bulk selection (US-FND-019) with "select all matching" (selection by filter, not by IDs on the page).
- Action `bulkReassignAccounts(filterOrIds, target, moveOpenWork)` processes in chunks of 40 to show progress against the mock latency.

## Mock data

- Jordan Lee's Book of 212 Accounts in Houston (a departing Producer); 18 already have Marisol Reyes as Account Manager.
