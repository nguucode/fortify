---
id: US-SET-005
title: Read-only roles and permission matrix
epic: SET
roles: [Admin, Principal]
priority: P1
status: Done
size: S
routes: [/settings/roles]
dependsOn: [US-SET-001, US-FND-004]
---

## Story

As a Principal, I want to see exactly what each of the four roles can see and do, so that I can answer "why can't Maya approve this certificate?" without guessing.

## Acceptance criteria

- Given I open `/settings/roles`, when it loads, then a Scope table shows the four roles (Producer, Account Manager, Principal, Admin) with their scope (Own, Office, Agency, Agency plus Settings) and a one-line description from roles.md.
- Given the Matrix section, when it renders, then it shows one row per object from roles.md (Lead; Account, Contact, X-date; Opportunity, Quote; Renewal; Service Request; Certificate; Activity, Task; Policy, Term, Insured item, Additional interest; Claim; Holder; Reports; Settings) and one column per role, with cells exactly as in roles.md ("C E (own)", "R, C Cross-sell", "—").
- Given a cell, when I hover it, then a tooltip expands the codes ("C = create, E = edit, R = read, — = hidden; applies within the role's scope").
- Given the Rules section, when it renders, then it lists Commission, Reassignment, No hard delete, and No-permission UI as in roles.md.
- Given any role that can open Settings, when the page renders, then there are no edit controls, and the description reads "Roles are fixed in this version. Use View as to preview any role." with a button "View as Producer" that switches role through View as (US-FND-004).
- Given each role column header, when I click "Users", then I go to `/settings/users` filtered to that role, showing the count ("Account Manager · 12 users").

## UI states

- Empty: not applicable; the matrix is static content.
- Loading: one table skeleton per section.
- Error: if roles.md fails to parse at build, the page shows "The role matrix couldn't be read." and the build test fails (see FE notes).
- No permission: Producer and Account Manager get `/403`; Admin and Principal see the same read-only page.
- Overflow: at widths under 1024px the matrix scrolls horizontally inside its container with the Object column sticky.

## Design notes

- Three stacked sections (Scope, Matrix, Rules), each a white card with ring. The matrix is a 40px-row table; cells in 13px mono so codes align; "—" in text-muted.
- No checkmarks or colored cells: the codes are the content.

## FE notes

- Parse the Matrix and Scope tables from `spec/ia/roles.md` at build time into `roles.generated.json` with the same markdown loader the Product menu uses for `/product/roles`; one source, no hand-copied matrix.
- Add a test asserting four role columns and the expected object rows, so a malformed roles.md fails `npm test`.

## Mock data

- None beyond users per role for the column counts (US-SET-002 seed).
