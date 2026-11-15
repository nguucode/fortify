---
id: US-REN-013
title: Bulk actions on the Renewals worklist
epic: REN
roles: [Account Manager, Principal]
priority: P2
status: Draft
size: S
routes: [/renewals]
dependsOn: [US-REN-001, US-REN-005, US-FND-019, US-WRK-005]
---

## Story

As a Principal, I want to select several Renewals and start review, add a Task, or reassign them at once, so that I can rebalance renewal work when an Account Manager is out.

## Acceptance criteria

- Given I select rows with the checkbox column, then a bulk bar shows "12 selected" with Start review, Add task, and Reassign (Principal only).
- Given I click Start review, then every selected Renewal in Upcoming becomes In review, others are skipped, and a toast reads "Started review on 9 renewals. 3 skipped (already in review)."
- Given I click Reassign and pick an Account Manager, then only Renewals on Accounts in that user's Office are reassigned, and the toast names how many were skipped for Office mismatch.
- Given I click Add task, then one Task per selected Renewal is created with the same title and a due preset relative to each expiration.
- Given more than 50 rows are selected, then the bulk bar shows "Bulk actions are limited to 50 renewals." and disables actions.

## UI states

- Empty: bulk bar hidden with nothing selected.
- Loading: bulk bar buttons show a spinner while the batch runs.
- Error: toast "Couldn't update 2 renewals." with the rest applied, and failed rows stay selected.
- No permission: Account Managers see Reassign disabled with "Only a Principal can reassign."; Producers and Admin see no checkbox column.
- Overflow: selection persists across pages and shows "Select all 152" link.
- Filtered: selection clears when filters change, with a toast "Selection cleared."

## Design notes

- Bulk bar replaces the toolbar row while active (white, ring, 36px buttons), per Part B density.

## FE notes

- Uses the FND table selection API (US-FND-019); store batch actions `renewals.bulkSetStatus`, `renewals.bulkReassign`, `tasks.bulkCreate` (WRK Task creation, US-WRK-005); each logs one Activity per Renewal.

## Mock data

- 12 Upcoming and 3 In review Renewals for one Account Manager in Houston; a second Account Manager in Tampa for the Office mismatch case.
