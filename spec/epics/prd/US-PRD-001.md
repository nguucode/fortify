---
id: US-PRD-001
title: Product workspace layout with IA and Backlog navigation
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/product]
dependsOn: [US-FND-001, US-FND-006]
---

## Story

As a Principal reviewing what Fortify will do, I want a Product area with a docs-style navigation tree for the IA and the backlog, so that I can move between the sitemap, the object model, roles, the glossary, and every Epic's stories without leaving the app.

## Acceptance criteria

- Given the sidebar footer, when I click Product, then `/product` opens inside the app shell with a 240px navigation tree on the left and the page content on the right.
- Given the tree, then it has two groups: IA (Overview, Sitemap, Object model, Roles & permissions, Glossary) and Backlog (All stories, Story map, then one row per Epic in README order: FND, PRD, HOM, INB, LEA, ACC, PIP, XDT, POL, REN, SRV, CRT, CLM, WRK, RPT, SET), each Epic row with its code, name, and story count.
- Given any `/product/*` route, then the matching tree row is active with `aria-current="page"`; a story page activates its Epic row.
- Given M1, then every role sees Product; given the build flag `VITE_SHOW_PRODUCT=false`, then the footer item is hidden and every `/product/*` route renders not-found (US-FND-006).
- Given the Product area is read-only, then no control in it edits a spec file; status and content change only in the repo.

## UI states

- Empty: an Epic with 0 stories shows "0" in muted and stays clickable.
- Loading: none; the spec is bundled at build time.
- Error: if the spec index fails to build (US-PRD-002), the content area shows "The spec couldn’t be read." with the first parse error in mono, and the tree still renders the IA group.
- No permission: none in M1; the flag hides the whole area.
- Overflow: Epic names truncate in the tree with a tooltip; the tree scrolls independently of the content.

## Design notes

- Tree on the canvas color with a 1px right line; group labels 12px muted; rows 28px, 13px, 6px radius; active row recessed with 500 weight; counts right-aligned in tabular-nums muted.
- Content uses the standard page header (`h1` 30/600, muted description) and 32px gutters.
- Below 1024px the tree collapses into a "Jump to…" select above the content.

## FE notes

- `src/product/ProductLayout.tsx` as a nested route under the shell with `<ProductTree>` and `<Outlet>`; routes registered only when `import.meta.env.VITE_SHOW_PRODUCT !== 'false'`.
- Tree data comes from the spec index (US-PRD-002): Epics from `epic.md` files, counts from stories.

## Mock data

- None; reads `spec/`. Test with the flag set to `false` and with an Epic that has no stories.
