---
id: US-PRD-011
title: Story map by Epic and priority
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/product/backlog/map]
dependsOn: [US-PRD-010]
---

## Story

As a Principal, I want a story map with Epics across and priorities down, with the P0 row labeled as the demo loop, so that I can see in one view what the first demo needs from every Epic.

## Acceptance criteria

- Given `/product/backlog/map`, then a grid shows one column per Epic in README order and three rows: "P0 · Demo loop", "P1 · Basic CRM", and "P2 · Nice to have".
- Given a cell, then it lists that Epic's stories at that priority as chips with ID and a truncated title, sorted by ID, and the cell header shows the count and estimated sessions ("4 · 3 sessions").
- Given I click a chip, then its story page opens.
- Given filters set on the Table view (search, Epic, Priority), then the map applies the same filters; filtered-out Epics collapse to a narrow empty column with their code only.
- Given a chip, then its status shows as a dot before the ID, so Done work stands out.

## UI states

- Empty: a cell with no stories shows "—" muted.
- Loading: none.
- Error: as in the Table view.
- No permission: not applicable.
- Overflow: 16 columns at 200px scroll horizontally with the priority labels sticky on the left; a cell with more than 8 chips shows "+5 more", which expands the cell.
- Filtered: the meta line matches the Table view ("Showing 38 of 260 stories").

## Design notes

- Cells on recessed, 8px radius, 6px padding, 8px gaps; chips on base with a ring, 6px radius, 12px text, ID in mono.
- The P0 row label carries a small "Demo loop" pill; no colored row backgrounds.

## FE notes

- `src/product/StoryMapPage.tsx`; groups `index.stories` by `[priority][epic]` after `useBacklogFilters()`; CSS grid with `grid-template-columns: 120px repeat(16, 200px)`.

## Mock data

- None; reads `spec/`.
