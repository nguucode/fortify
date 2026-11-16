---
id: US-PRD-013
title: Story page with metadata, sections, and Copy file path
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/product/stories/:id]
dependsOn: [US-PRD-002, US-PRD-003, US-FND-015]
---

## Story

As a front-end developer about to build a story, I want it on its own page with its metadata, all template sections, its dependencies, and a button to copy its file path, so that I can read it in the app and jump straight to the file in my editor.

## Acceptance criteria

- Given `/product/stories/US-REN-004`, then the page shows a breadcrumb "Backlog / REN / US-REN-004", the title as `h1`, and a metadata list: ID, Epic (link), Roles, Priority, Status, Size, Routes (each linking to its sitemap row), Depends on, and Blocks.
- Given the body, then the six sections render in template order (Story, Acceptance criteria, UI states, Design notes, FE notes, Mock data) through the shared renderer, each with an anchor.
- Given Depends on, then each ID links to its story with its status dot; an ID that does not exist shows "Missing" in danger text.
- Given Blocks, then it lists every story whose `dependsOn` includes this one; with none it shows "—".
- Given I click "Copy file path", then `spec/epics/ren/US-REN-004.md` is copied to the clipboard and the toast "File path copied" appears; if the clipboard is unavailable, the path is selected in a read-only field instead.
- Given Previous and Next at the bottom, then they move to the adjacent story in the same Epic.

## UI states

- Empty: a missing section renders "Not written yet" in muted italics, and the page shows a warning callout "This story is missing: Mock data".
- Loading: none.
- Error: an unknown ID renders not-found inside the Product layout: "No story with ID US-REN-099." with a link to the backlog.
- No permission: not applicable.
- Overflow: titles wrap to 2 lines; 10 or more dependencies wrap into rows.

## Design notes

- Two columns at 1280px and wider: content (max 760px) and a 280px sticky metadata panel on the right (white, ring, 8px radius); below that, metadata moves above the content.
- "Copy file path" is a 32px outline button with a copy icon, top-right of the header.

## FE notes

- `src/product/StoryPage.tsx`; `storyById`, `blockedBy`, and `storiesByEpic` from the index; clipboard via `navigator.clipboard.writeText` with fallback.

## Mock data

- None; reads `spec/`. Check a story with no dependencies, one with a dangling dependency (fixture), and a FND story that blocks many.
