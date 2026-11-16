---
id: US-FND-011
title: Responsive layout (desktop-first, tablet usable, mobile read-only)
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/today, /accounts, /accounts/:id]
dependsOn: [US-FND-001, US-FND-007]
---

## Story

As a Producer at a Household's kitchen table with a tablet, or checking a phone between meetings, I want Fortify to stay usable on smaller screens, so that I can look up an Account and its Policies anywhere, even if full editing waits for a larger screen.

## Acceptance criteria

- Given a width of 1280px or more, then the full desktop layout applies (rail plus content, 32px gutters).
- Given a width from 768 to 1279px, then the sidebar is collapsed to the rail by default and opens as an overlay; gutters shrink to 16px; tables scroll horizontally with the primary column sticky; all create and edit flows work, and side sheets go full width below 1024px.
- Given a width below 768px, then the app is read-only: the rail becomes a top-left menu button opening a full-height drawer, create and edit actions are hidden, Board views (Pipeline, Service) fall back to List, and a dismissible banner says "Editing is available on tablet and desktop."
- Given a width below 768px, then list tables become stacked rows: primary column, status, and one key value per row, 56px tall, still opening the record on tap.
- Given any width, then no page scrolls horizontally except inside a table container, and text reflows at 320px CSS width and 400% zoom (WCAG 1.4.10 Reflow).

## UI states

- Empty: same copy as desktop; the primary action is hidden on mobile.
- Loading: same skeletons, stacked on mobile.
- Error: same error state; Try again stays available on mobile.
- No permission: unchanged across widths.
- Overflow: record tabs scroll horizontally with fade edges below 768px.

## Design notes

- Breakpoints: `md` 768, `lg` 1024, `xl` 1280. Desktop is the design reference; tablet and mobile are adaptations, not separate designs.
- Touch targets at least 24×24 CSS px everywhere and 44px rows in the mobile drawer.
- Top bar on mobile: menu button, wordmark, Sample badge, search icon, avatar; View as and Demo controls move into the avatar menu.

## FE notes

- Tailwind v4 breakpoints only; a `useViewport()` hook exposes `isReadOnly` (below 768) for components that must hide actions, rather than CSS-only hiding, so hidden actions are not focusable.
- `DataTable` gains a `mobileFields` prop for the stacked layout.
- Test at 375×812, 768×1024, and 1440×900.

## Mock data

- An Account with a very long name and 12 Locations to test stacked rows and tab overflow.
