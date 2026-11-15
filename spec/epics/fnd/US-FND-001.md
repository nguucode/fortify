---
id: US-FND-001
title: App shell with grouped sidebar from sitemap.yaml
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/today]
dependsOn: []
---

## Story

As any Fortify user, I want a persistent sidebar grouped the way the agency works (Customers, Sales, Book, Work, Insights), so that I can reach every module in one click and only see the modules my role can use.

## Acceptance criteria

- Given `spec/ia/sitemap.yaml`, when the app loads, then the sidebar renders Today and Inbox at the top, the groups Customers, Sales, Book, Work, and Insights in file order, and Product and Settings in the footer, with no nav item hard-coded in a component.
- Given an item with `visibleTo`, when the current role is not listed, then the item is not rendered at all (Settings is absent for Producer and Account Manager).
- Given `VITE_SHOW_PRODUCT=false` at build time, when the app loads, then the Product footer item is not rendered.
- Given I am on `/accounts/A-10423`, when the sidebar renders, then Accounts is the active item (match on route prefix), with `aria-current="page"`.
- Given the rail is collapsed (56px), when I hover or focus it for 150ms, then it expands to 240px over the content without shifting the page; when I click the pin button, it stays expanded and the content reflows, and the pin state survives a reload.
- Given the collapsed rail, when I hover or focus an icon, then a tooltip shows the item label (for example "Renewals").
- Given `/` is opened, then the app redirects to `/today`.

## UI states

- Empty: not applicable; the sidebar always has Today.
- Loading: the shell renders immediately; only the content area shows loading (see US-FND-016).
- Error: if `sitemap.yaml` fails to parse, the app shows a full-page error "Navigation could not be loaded" with the parse message in mono; this is a build-time defect caught by tests.
- No permission: hidden nav items, never disabled ones.
- Overflow: on a 768px-tall window, the groups scroll inside the sidebar while the footer (Product, Settings) stays pinned.

## Design notes

- Left nav per IMPECCABLE-PROMPT.md Part B: 56px icon rail expanding to labeled groups; items are 8px-radius rows, 32px tall, 14/500 labels; icons at 50% opacity until hover or active.
- Active row: base surface with ring and text-strong; hover row: recessed. No colored active bar.
- Group labels 12px, text-muted, sentence case ("Customers", not uppercase).
- Content area: canvas background, 32px gutters, left-aligned, no centered max-width.
- Expand/collapse motion 150ms transform only; respects `prefers-reduced-motion` (no animation).

## FE notes

- `src/shell/AppShell.tsx` with `<Sidebar>`, `<TopBar>` (US-FND-002), and `<Outlet>` from React Router.
- `src/shell/nav.ts` imports `/spec/ia/sitemap.yaml?raw`, parses it once with `yaml`, and exposes `navForRole(role)`; the Product menu (PRD) reuses the same parser.
- Role ids in the YAML (`producer`, `account-manager`, `principal`, `admin`) map to the current mock user's role from US-FND-004.
- Icons: one Lucide icon per item id, mapped in `nav-icons.ts`; unknown ids fall back to a neutral dot.
- Pin state in `localStorage` key `fortify.sidebar.pinned`, wrapped in try/catch.

## Mock data

- None beyond the current mock user's role. Test with all four roles to confirm Settings visibility, and with `VITE_SHOW_PRODUCT=false`.
