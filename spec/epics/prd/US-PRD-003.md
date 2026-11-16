---
id: US-PRD-003
title: Markdown renderer for spec documents
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/product/object-model, /product/roles, /product/stories/:id]
dependsOn: [US-PRD-002]
---

## Story

As a Product Owner reading a story or the roles matrix in the app, I want spec markdown rendered with Fortify's own typography, tables, and links, so that it reads like a product page, not a raw file.

## Acceptance criteria

- Given markdown with headings, lists, bold, italics, inline code, fenced code blocks, and GitHub-style tables, then each renders correctly; tables use the 40px data-table styling.
- Given a story ID in text (for example "US-FND-007"), then it becomes a link to `/product/stories/US-FND-007`; an ID that does not exist renders as plain text with a danger underline and the tooltip "No story with this ID".
- Given a relative link to another spec file (for example `../../GLOSSARY.md`), then it maps to the matching Product route (`/product/glossary`; `spec/ia/rules.md` maps to `/product/object-model#business-rules`); links outside `spec/` and the glossary render as plain text.
- Given a route in inline code that exists in `sitemap.yaml` (for example `/renewals`), then it links to that route's row on `/product/sitemap`.
- Given raw HTML in markdown, then it is not rendered (escaped), so spec content cannot inject markup.

## UI states

- Empty: an empty section renders "Not written yet" in muted italics.
- Loading: none.
- Error: a markdown parse failure shows the raw text in a mono block rather than nothing.
- No permission: not applicable.
- Overflow: wide tables scroll horizontally inside their container with the first column sticky; long code lines scroll, never wrap the page.

## Design notes

- Body 14/21; H2 16/22 at 500 with 24px top margin; H3 14/600; lists with 18px indent; inline code in mono 12px on recessed with 4px radius; code blocks on recessed, 8px radius, 12px padding.
- Links in the link color, underline on hover and focus.

## FE notes

- `src/product/Markdown.tsx` using `marked` (GFM tables) to tokens rendered as React elements, with HTML disabled; a post-pass links story IDs (`/\bUS-[A-Z]{3}-\d{3}\b/`) and sitemap routes using the index.

## Mock data

- None; render `spec/ia/roles.md`, `spec/ia/object-model.md`, and a story with a dangling ID reference.
