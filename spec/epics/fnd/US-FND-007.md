---
id: US-FND-007
title: Data table pattern with saved views, filters, sorting, and pagination
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/accounts]
dependsOn: [US-FND-005, US-FND-016, US-FND-017]
---

## Story

As an Account Manager working a list of 600 Accounts, I want one consistent table with saved views, filters, sorting, and pages, so that every list in Fortify works the same way and I can get to the right rows fast.

## Acceptance criteria

- Given a list route with `savedViews` in `sitemap.yaml`, then the views render as tabs above the toolbar in file order (Accounts: All, Prospects, Clients, Former clients, Households, Businesses), and the first one is selected by default.
- Given the toolbar, when I type in search, then the list filters after 250ms on the module's searchable fields, and the meta line updates, for example "Showing 50 of 212 accounts".
- Given I open Filters and add Office is Houston TX and Status is Client, then the rows update, each filter shows as a removable chip, and "Clear all" removes them.
- Given I click a sortable header, then it cycles ascending, descending, and default order, with `aria-sort` set on that header; only one column sorts at a time.
- Given more than 50 rows, then pagination shows "1–50 of 612" with Previous and Next and a page size of 25, 50, or 100.
- Given any view, search, filter, sort, or page, then it is reflected in the URL (for example `?view=clients&q=torres&office=houston&sort=-premium&page=2`), so reload and Back restore it exactly.

## UI states

- Empty: "No accounts yet" with the module's primary action (from US-FND-016).
- Loading: on first load, 10 skeleton rows; on refetch, existing rows stay and a 2px progress line runs under the header.
- Error: the table body is replaced by the shared error state with Try again; the toolbar stays usable.
- No permission: rows are already scoped by the API; columns a role cannot see (commission) are not rendered at all.
- Overflow: the primary column truncates with an ellipsis and a full-value tooltip; numbers above $1,000,000 render as $1,240,500 with tabular-nums; a 12-column table scrolls horizontally with the primary column sticky.
- Filtered: "No accounts match these filters" with "Clear filters".

## Design notes

- Per Part B: tabs, then the toolbar (36px search with placeholder like "Search accounts", Filters, Display options, Export, primary "+ Add account" at far right), then the 13px muted meta line, then the table.
- White container, 8px top radius, ring; 40px header (14/600) and 40px rows with 1px fill dividers; row hover in recessed; empty cells show "—" muted; status cells use dot + label (US-FND-017).
- Numbers right-aligned, tabular-nums. Primary column: name 14/500 with a muted secondary token.

## FE notes

- `src/patterns/DataTable/` with `<SavedViewTabs>`, `<TableToolbar>`, `<FilterPopover>`, `<DataTable columns rows sort onSort>`, `<Pagination>`; no table library, because the mock API does filter, sort, and paging.
- `useListQuery(entity, defaults)` reads and writes URL search params, applies the Office filter from US-FND-002, and calls `api.list` returning `{ rows, total }`.
- Column definition: `{ id, header, cell, sortable, align, hiddenFor?: Role[] }`.
- Personal saved views are out of scope; only `sitemap.yaml` views exist.

## Mock data

- 600 Accounts across 3 Offices; names over 80 characters; premium values from $480 to $1,240,500; an Office filter that returns 0 rows when combined with Former clients in Tampa FL.
