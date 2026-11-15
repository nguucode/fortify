---
id: US-PRD-014
title: Filter the backlog by role and status
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/product/backlog, /product/backlog/map]
dependsOn: [US-PRD-010, US-FND-004]
---

## Story

As an Account Manager invited to review the backlog, I want to filter stories by the role they serve and by status, so that I review only what affects my work and see what is ready to build.

## Acceptance criteria

- Given the backlog toolbar, then Role (Producer, Account Manager, Principal, Admin) and Status (Draft, Ready, In design, In build, Done) appear as multi-select filters next to Epic and Priority.
- Given Role is Account Manager, then only stories whose `roles` include Account Manager remain, in both Table and Story map views.
- Given the filters, then they are in the URL (`?role=account-manager&status=Ready`) and combine with Epic, Priority, and search (AND across filters, OR within one).
- Given the roles page (US-PRD-008), then each role name links to the backlog with that role filter applied.
- Given "Mine" next to the filters, then it applies the role of the current View as user in one click.

## UI states

- Empty: as in the backlog table.
- Loading: none.
- Error: as in the backlog table.
- No permission: not applicable.
- Overflow: more than 3 active chips collapse to "Role: 2 · Status: 3".
- Filtered: "No stories match these filters" with "Clear filters".

## Design notes

- Same filter popover and chips as the FND table pattern; "Mine" is a 36px outline toggle button.

## FE notes

- Extend `useBacklogFilters()` with `role` and `status`; role values are validated to the four labels (US-PRD-004), so matching is exact.

## Mock data

- None; reads `spec/`.
