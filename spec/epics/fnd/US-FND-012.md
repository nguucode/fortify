---
id: US-FND-012
title: Accessibility baseline for the shell and shared components (WCAG 2.2 AA)
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/today, /accounts]
dependsOn: [US-FND-001, US-FND-002, US-FND-007]
---

## Story

As an Account Manager who uses a keyboard and a screen reader, I want the shell and every shared component to meet WCAG 2.2 AA, so that I can do my whole job in Fortify and every Epic inherits that baseline.

## Acceptance criteria

- Given any page, when I press Tab first, then a "Skip to main content" link appears and moves focus to `<main>`; the page has `header`, `nav` (labeled "Main"), and `main` landmarks and exactly one `h1`.
- Given any focusable control, then focus is visible as a 2px primary ring with 2px offset, and it is never hidden under the 58px sticky top bar (2.4.11 Focus Not Obscured), via `scroll-padding-top`.
- Given text and controls, then body text meets 4.5:1 and large text 3:1; form control boundaries, focus rings, and status dots meet 3:1 against their background (1.4.11); status is never conveyed by color alone.
- Given any pointer target, then it is at least 24×24 CSS px or has the spacing exception (2.5.8 Target Size).
- Given a drag interaction anywhere (Board views in other Epics), then a non-drag alternative exists, such as a "Move to" menu (2.5.7 Dragging Movements).
- Given route changes, then the document title updates ("Renewals · Fortify") and focus moves to the new `h1`; dialogs trap focus and return it on close.
- Given `prefers-reduced-motion: reduce`, then rail, menu, and row transitions are disabled.

## UI states

- Empty: empty-state headings are real headings and the action is a real button.
- Loading: skeletons are `aria-hidden`; a polite live region announces "Loading accounts" once and "50 accounts loaded" when done.
- Error: errors are announced in an assertive live region and the Try again button receives focus.
- No permission: disabled actions use `aria-disabled` so the reason tooltip stays reachable by keyboard.
- Overflow: truncated text exposes the full value via tooltip on focus as well as hover.

## Design notes

- Use the accessibility tokens from `spec/ia/rules.md` (amending Part B):
  - `line-control` oklch(14.5% 0 0 / .45), 3.16:1: form control borders only; cards and dividers keep the 10% `--line` hairline.
  - `text-placeholder` oklch(55.6% 0 0), 4.73:1. Placeholders are still hints only; every field has a visible label.
  - `text-warning` oklch(55% .13 57.5), 5.06:1, replacing oklch(59.7% .144 57.5), which was 4.18:1.
- `text-muted` oklch(55.6% 0 0) on white is about 4.7:1 and passes.

## FE notes

- Radix primitives for Dialog, DropdownMenu, Popover, Tooltip, Tabs, Switch, and Select give keyboard and ARIA behavior; do not hand-roll them.
- `<RouteAnnouncer>` in the shell sets title and focus on navigation.
- Define `--line-control`, `--text-placeholder`, and `--text-warning` once in the theme CSS with the rules.md values; no component hard-codes a border or warning color.
- Add `vitest-axe` checks for AppShell, DataTable, FormSheet, and dialogs; run axe in the browser for each P0 route before Done.

## Mock data

- Status values from every lifecycle in `spec/ia/object-model.md` rendered on one test page to check status contrast.
