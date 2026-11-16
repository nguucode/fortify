---
id: US-PRD-012
title: Epic page
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/product/epics/:code]
dependsOn: [US-PRD-003, US-PRD-010]
---

## Story

As a front-end developer picking up an Epic, I want one page with the Epic's summary, its routes, and all its stories, so that I can understand the scope before opening individual stories.

## Acceptance criteria

- Given `/product/epics/ren`, then the header shows "REN · Renewals" as the title (code in mono), the `summary` as the description, and the Epic's `route` as a link to its sitemap row.
- Given the Epic body in `epic.md`, then it renders through the shared renderer below the header.
- Given the stats line, then it reads "14 stories · 6 P0 · 5 P1 · 3 P2 · 10.5 FE sessions".
- Given the stories table, then it is the backlog table filtered to this Epic (Epic column hidden), with search and Priority filter.
- Given "Routes touched", then it lists every route the Epic's stories use, each with that Epic's story count.
- Given the code in the URL in any case (`/product/epics/REN`), then it resolves to the same Epic.

## UI states

- Empty: "No stories for REN yet." with the file path hint `spec/epics/ren/`.
- Loading: none.
- Error: an unknown code renders the not-found page inside the Product layout: "No Epic with code XYZ."
- No permission: not applicable.
- Overflow: long summaries wrap to 3 lines; "Routes touched" over 12 entries collapses.
- Filtered: as in the backlog table.

## Design notes

- Standard page header; stats as one 13px muted meta line, not cards; the table follows the backlog styling.

## FE notes

- `src/product/EpicPage.tsx` reuses the backlog table component with `epic` fixed; route param lowercased before lookup.

## Mock data

- None; reads `spec/`.
