---
id: US-PRD-010
title: Backlog table with search and Epic and Priority filters
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/product/backlog]
dependsOn: [US-PRD-001, US-PRD-002, US-FND-007, US-FND-017]
---

## Story

As a Product Owner planning the next build session, I want every story in one dense table I can search and filter by Epic and priority, so that I can find what to build next and open any story in one click.

## Acceptance criteria

- Given `/product/backlog`, then a 40px table lists every story with columns ID, Story, Epic, Roles, Priority, Status, and Size, sorted by Epic in README order and then by ID.
- Given the toolbar, when I type in search, then rows filter on ID, title, and body text; typing "US-REN-004" shows exactly that story.
- Given the Epic and Priority filters (multi-select), then rows match any selected Epic and any selected priority, chips show the active filters, and the URL holds them (`?epic=REN,SRV&priority=P0`).
- Given the meta line, then it reads "Showing 38 of 260 stories · 29 P0 · 31.5 FE sessions" and updates with filters.
- Given a header click on ID, Epic, Priority, Status, or Size, then the table sorts by it.
- Given a row click or Enter on a focused row, then `/product/stories/:id` opens; a segmented control at the top switches between Table and Story map (`/product/backlog/map`), keeping the filters.

## UI states

- Empty: "No stories yet" with the muted line "Add files under spec/epics/<code>/."
- Loading: none.
- Error: index errors show a callout above the table linking to Spec health on the Overview.
- No permission: not applicable.
- Overflow: titles truncate with a tooltip; roles show up to 2 names then "+2"; 400 rows paginate at 100 per page.
- Filtered: "No stories match these filters" with "Clear filters".

## Design notes

- Uses the FND data-table pattern and toolbar; no create button (read-only).
- ID in mono; Priority and Status as status cells (dot plus label): P0 red, P1 orange, P2 neutral; Draft neutral, Ready blue, In design and In build orange, Done green.

## FE notes

- `src/product/BacklogPage.tsx` with in-memory filter, sort, and paging over `index.stories`, adapting the `DataTable` components from US-FND-007 with a local data source instead of `api.list`.
- Shared `useBacklogFilters()` reads and writes URL params for the table, the story map, and Epic pages.

## Mock data

- None; reads `spec/`. Check with 260 or more stories.
