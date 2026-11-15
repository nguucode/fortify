---
id: US-PRD-005
title: Product overview page
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/product]
dependsOn: [US-PRD-001, US-PRD-002, US-PRD-004]
---

## Story

As a Principal, I want one overview of the backlog's size, priorities, status, and coverage, so that I can see at a glance how much of Fortify is specified and what the demo loop needs.

## Acceptance criteria

- Given `/product`, then the header reads "Product" with the description "Information architecture and user-story backlog, rendered from spec/."
- Given the stats row, then it shows total stories, P0 / P1 / P2 counts, estimated FE sessions (S = 0.5, M = 1, shown as "142.5 sessions"), and coverage gaps (routes with no story), each linking to the filtered backlog or the sitemap.
- Given the Epics table, then each row shows code, name, stories, P0, P1, P2, S, M, and Draft / Ready / In design / In build / Done counts, in README order, linking to `/product/epics/:code`.
- Given the IA links, then cards link to Sitemap, Object model, Roles & permissions, and Glossary with one muted line each.
- Given the Spec health panel (US-PRD-004), then it appears below the stats row.

## UI states

- Empty: with no stories, stats show 0, the Epics table lists Epics with zeros, and coverage gaps equal the number of routes.
- Loading: none.
- Error: index errors show in Spec health; the rest of the page renders.
- No permission: not applicable.
- Overflow: counts over 999 use thousands separators; Epic names truncate in the table.

## Design notes

- Stats as Part B analytics cards without charts: 13px label, 24px value in tabular-nums; a 4-up grid that wraps to 2-up below 1024px.
- Epics table follows the 40px data-table styling; numbers right-aligned; zero cells show "—" muted.

## FE notes

- `src/product/OverviewPage.tsx`; derived counts from the index with `useMemo`; no state.

## Mock data

- None; reads `spec/`.
