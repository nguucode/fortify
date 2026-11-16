---
id: US-PRD-004
title: Spec validation in npm test and spec health on the Overview
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/product]
dependsOn: [US-PRD-002]
---

## Story

As the designer who owns the spec, I want `npm test` to fail on a broken story file and the Overview to show the same problems, so that the backlog the team builds from is always consistent.

## Acceptance criteria

- Given `npm test`, then it fails with a message per problem in the form `spec/epics/ren/US-REN-004.md: dependsOn US-REN-019 does not exist` when any of these occur: a duplicate ID; a missing required frontmatter field (`routes` included); a `dependsOn` to a missing ID; a missing required H2 section; an `epic` that does not match its folder; a route not in `sitemap.yaml`.
- Given `npm test`, then it also fails when: the file name differs from `id`; IDs in an Epic are not numbered from 001 without gaps; `priority` is not P0, P1, or P2; `status` is not Draft, Ready, In design, In build, or Done; `size` is not S or M; or US-FND-001 to US-FND-008 do not have their reserved titles from `spec/README.md`.
- Given `roles`, then each value must be one of Producer, Account Manager, Principal, or Admin; "Principal / Sales Manager" or "Sales Manager" fails with "Write Principal" (rules.md).
- Given the Overview (US-PRD-005), then a "Spec health" panel shows "All checks pass" or the count and list of problems, each linking to its story.
- Given `._*` files from the exFAT drive, then validation ignores them.

## UI states

- Empty: with no stories, validation passes and the panel says "No stories yet".
- Loading: none.
- Error: problems are shown as a list, never as a crash of the Product area.
- No permission: not applicable.
- Overflow: more than 10 problems collapse behind "Show all 27 problems".

## Design notes

- Spec health uses the Part B callout panel: white, ring, 8px radius, a title with a count badge, items with a danger dot, a bold first line (file path in mono) and a muted second line (the problem).

## FE notes

- `src/spec/validate.ts` returns `Problem[]` (`{ path, rule, message }`) from the index; `src/spec/validate.test.ts` asserts it is empty and prints every problem.
- The same function feeds the Overview panel.

## Mock data

- Fixtures with each failure kind, one per rule, so each rule has a failing test.
