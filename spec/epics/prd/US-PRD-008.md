---
id: US-PRD-008
title: Roles and permissions page
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/product/roles]
dependsOn: [US-PRD-001, US-PRD-003, US-FND-004]
---

## Story

As a Principal, I want the role scopes and the permission matrix rendered in the app, so that I can check who can create, edit, or read each object while reviewing a story.

## Acceptance criteria

- Given `/product/roles`, then `spec/ia/roles.md` renders through the shared renderer: Scope, Matrix, and Rules.
- Given the Matrix table, then the header row and the Object column stay sticky while scrolling, and the legend "C = create, E = edit, R = read, — = hidden" sits above it.
- Given I choose a role in "Highlight role" (Producer, Account Manager, Principal, Admin), then that column is highlighted and the others are dimmed; the choice is in the URL (`?role=producer`).
- Given a role chosen in View as, then "Highlight role" defaults to it.
- Given each role name in the Scope table, then it links to the backlog filtered to that role when US-PRD-014 is built; until then it is plain text.

## UI states

- Empty: not applicable.
- Loading: none.
- Error: a renderer failure shows the raw markdown in mono.
- No permission: not applicable.
- Overflow: below 1024px the matrix scrolls horizontally with the Object column sticky.

## Design notes

- Highlighted column: recessed background on the cells and text-strong; dimmed columns at text-muted. Cell values are centered and in mono so C, E, R, and — line up.
- "Highlight role" is a 32px segmented control above the matrix.

## FE notes

- `src/product/RolesPage.tsx`; the renderer accepts a `tableProps` hook for the matrix table to add sticky and highlight classes by column index.

## Mock data

- None; reads `spec/ia/roles.md`.
