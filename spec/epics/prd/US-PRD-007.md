---
id: US-PRD-007
title: Object model page
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/product/object-model]
dependsOn: [US-PRD-001, US-PRD-003, US-FND-017]
---

## Story

As a front-end developer starting a new Epic, I want the object model rendered in the app with links to glossary definitions, so that I use the right objects, relationships, and statuses without opening the repo.

## Acceptance criteria

- Given `/product/object-model`, then `spec/ia/object-model.md` renders through the shared renderer (US-PRD-003): Relationships (the diagram as a mono code block), Lifecycles (table), Timing rules, and Ownership.
- Given the Lifecycles table, then each status sequence also renders its statuses as status cells (US-FND-017), so the page shows the same dots and labels the app uses.
- Given a glossary term in the page (Account, Household, Term, Renewal, and so on), then its first occurrence per section links to `/product/glossary#<term>`.
- Given `spec/ia/rules.md`, then it renders below the object model as a "Business rules" section with the anchor `#business-rules`, because it overrides story assumptions and the sitemap gives it no Product route of its own.
- Given the page, then an "On this page" list at the top right links to each H2, including Business rules.
- Given the page header, then the description reads "Objects, relationships, and lifecycles. Fortify-owned objects are editable; synced objects are read-only."

## UI states

- Empty: not applicable; the file is required by validation.
- Loading: none.
- Error: a renderer failure shows the raw markdown in mono.
- No permission: not applicable.
- Overflow: the relationships block scrolls horizontally below 1024px.

## Design notes

- Content column max 880px for reading, left-aligned; the "On this page" list is a sticky 200px column on wide screens and hidden below 1280px.

## FE notes

- `src/product/ObjectModelPage.tsx`; term linking uses `glossaryTerms` from the index with whole-word, case-sensitive matching on the term names.

## Mock data

- None; reads `spec/ia/object-model.md`, `spec/ia/rules.md`, and `GLOSSARY.md`.
