---
id: US-PRD-002
title: Spec loader and index for stories, Epics, sitemap, and glossary
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/product]
dependsOn: []
---

## Story

As the designer who owns the spec, I want the app to read `spec/` and `GLOSSARY.md` directly at build time into one typed index, so that the Product menu always shows exactly what is in the repo with no copy to keep in sync.

## Acceptance criteria

- Given the repo, when the app builds, then every `spec/**/*.md` file, `spec/ia/sitemap.yaml`, and `GLOSSARY.md` are loaded with `import.meta.glob(..., { query: '?raw', import: 'default', eager: true })`, ignoring `._*` files.
- Given a story file, then its YAML frontmatter is parsed into `{ id, title, epic, roles, priority, status, size, routes, dependsOn }`, all required (`routes` included, per `spec/ia/rules.md`), and its body is split into the H2 sections Story, Acceptance criteria, UI states, Design notes, FE notes, and Mock data.
- Given an `epic.md`, then `{ code, name, route, summary }` and its body are parsed.
- Given `sitemap.yaml`, then a flat route list is built from sidebar routes, `record` routes, footer `pages`, and `system` routes, each with its label, group, `visibleTo`, and parent item.
- Given the index, then it exposes `stories`, `storyById`, `storiesByEpic`, `storiesByRoute`, `blockedBy(id)` (reverse `dependsOn`), `routes`, `epics`, and `glossaryTerms`, and each story carries its file path, for example `spec/epics/ren/US-REN-004.md`.
- Given the same parsing code, then the validation test (US-PRD-004) imports it, so the app and `npm test` cannot disagree.

## UI states

- Empty: an empty `spec/epics/<code>/` folder yields an Epic with zero stories, not an error.
- Loading: none at runtime.
- Error: a file that fails to parse is collected in `index.errors` with its path and message, and the rest of the index still builds.
- No permission: not applicable.
- Overflow: the index must handle at least 400 stories without a visible delay on first render (target under 50ms to build).

## Design notes

- No UI of its own.

## FE notes

- `src/spec/load.ts` (globs), `src/spec/parse.ts` (frontmatter split on `---`, parsed with `yaml`; sections split on `^## `), `src/spec/schema.ts` (zod), `src/spec/index.ts` (memoized index).
- Markdown stays raw in the index; rendering is US-PRD-003.
- Route params match by pattern: `/accounts/:id` in a story equals the sitemap's `record: /accounts/:id`.

## Mock data

- None; fixtures in `src/spec/__fixtures__/` cover a valid story, a story missing a section, malformed YAML, and a `._US-FND-001.md` file that must be ignored.
