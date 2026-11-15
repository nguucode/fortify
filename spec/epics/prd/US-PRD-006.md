---
id: US-PRD-006
title: Sitemap page with per-route story coverage
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/product/sitemap]
dependsOn: [US-PRD-001, US-PRD-002]
---

## Story

As a Product Owner, I want the sitemap rendered from `sitemap.yaml` with the number of stories on every route, so that I can see the whole navigation and spot routes no story covers yet.

## Acceptance criteria

- Given `/product/sitemap`, then it renders sections in file order: Top bar, Sidebar (Today, Inbox, then the groups Customers, Sales, Book, Work, Insights), Footer, and System.
- Given a sidebar item, then its row shows the label, the route in mono, `visibleTo` roles (or "All roles"), and muted tokens for `views`, `savedViews`, and `tabs`; its `record` route and footer `pages` render as indented child rows.
- Given a route, then the row shows its story count as a pill; clicking the row expands an inline list of those stories (ID, title, priority, status), each linking to its story page.
- Given a route with zero stories, then the row shows a warning icon and "No stories" in warning text (a coverage gap), and the page header meta line says "4 routes without stories".
- Given the toggle "Show gaps only", then only zero-story routes and their parents remain; the toggle state is in the URL (`?gaps=1`).
- Given top-bar items, which have no route, then they list their `shortcut` and `demo` flags and show "Shell" linking to `/product/epics/fnd` instead of a count; they never count as coverage gaps.
- Given a story that names a query-parameter sub-view (`?tab=`, `?report=`, `?task=`, `?c=`, `?xdate=`), then it counts under its base route; Account tabs show as tokens without counts of their own. Shell-wide FND stories count once, under `/today`.

## UI states

- Empty: if every route has stories and "Show gaps only" is on, show "Every route has at least one story."
- Loading: none.
- Error: if `sitemap.yaml` fails to parse, show the parse error in mono and nothing else.
- No permission: not applicable.
- Overflow: Settings has 9 pages; child lists over 8 rows collapse behind "Show all 9".
- Filtered: the gaps-only view shows "Showing 4 of 42 routes".

## Design notes

- One white table container with 40px rows; tree indentation 20px per level with a muted chevron; group rows 13/600 text-label on recessed.
- Story count pill uses fill; gap rows use the warning icon plus text, never a filled warning row.
- Each route row has an anchor id (`#route-accounts-id`) so other pages can deep-link.

## FE notes

- `src/product/SitemapPage.tsx` walks the parsed YAML, not the flat list, to keep grouping; counts from `storiesByRoute`.
- Expanded rows tracked in local state; `?gaps=1` via `useSearchParams`; `#route-…` scrolls into view on load.

## Mock data

- None; reads `spec/`. Check `/403`, `/404`, `/product/epics/:code`, and `/settings/data-sync` all appear.
