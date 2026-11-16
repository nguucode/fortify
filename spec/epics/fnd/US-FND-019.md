---
id: US-FND-019
title: Table bulk selection, display options, and CSV export
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/accounts, /tasks]
dependsOn: [US-FND-007, US-FND-018]
---

## Story

As a Principal reassigning a departing Producer's Accounts, I want to select many rows, act on them together, choose which columns I see, and export what I see, so that list work does not take one row at a time.

## Acceptance criteria

- Given a table with bulk actions, when I check rows, then a selection bar replaces the toolbar showing "12 selected", the available bulk actions (for example "Reassign" for Principal and Admin, "Mark done" for Tasks), and "Clear selection".
- Given the header checkbox, then it selects the current page; a link "Select all 212 accounts" then selects every row matching the current filters.
- Given Display options, then I can show or hide columns (the primary column is always shown) and choose Comfortable (40px) or Compact (32px) rows; the choice persists per list.
- Given I click Export, then a CSV of the current view, filters, sort, and visible columns downloads as `sample-accounts-MM-DD-YYYY.csv`, excluding any column my role cannot see.
- Given each row, then a row-end text "Edit" action (where the role can edit) and an overflow menu with the module's row actions are available.

## UI states

- Empty: bulk selection and Export are disabled when there are no rows.
- Loading: a bulk action shows progress in the selection bar ("Reassigning 12 accounts…") and then a toast.
- Error: if a bulk action partly fails, a toast reports "10 reassigned, 2 failed" with "View failed".
- No permission: bulk actions the role lacks are not shown; row Edit is hidden for read-only rows.
- Overflow: "Select all" over 1,000 rows shows the count with a thousands separator.
- Filtered: export and select-all respect the active filters, and the selection bar says "212 accounts matching filters".

## Design notes

- Selection bar: same 36px height as the toolbar, recessed background, count 14/500, actions as outline buttons.
- Checkbox column 40px with 4px-radius checkboxes; Display options is a 280px popover with checkbox rows and a segmented density control.

## FE notes

- Extends `DataTable` with `selectable`, `bulkActions`, and `rowActions`; selection state is ids plus an `allMatching` flag.
- CSV built in the browser with a small `toCsv(rows, columns)` helper (quote fields, escape double quotes) and a Blob download; no library.
- Column visibility and density in `localStorage` per list id.

## Mock data

- 600 Accounts for select-all; a mock reassignment that fails for 2 locked Accounts to show partial failure.
