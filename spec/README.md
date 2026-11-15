# Fortify spec

This folder is the single source of truth for Fortify's information architecture and user-story backlog. The in-app **Product** menu (`/product`) renders it, and `npm test` validates it.

Fortify is a front-end-only CRM, running on mock data, for a US independent P&C insurance agency: 25 users in 3 offices (Houston TX, San Antonio TX, Tampa FL), selling personal and commercial lines. It sits beside the agency's AMS, which stays the system of record for policies and commission. Vocabulary is defined in [`../GLOSSARY.md`](../GLOSSARY.md); use those terms exactly and avoid the listed synonyms.

## Layout

```
spec/
  README.md                 conventions (this file)
  ia/sitemap.yaml           nav structure, routes, visibility; drives the real sidebar and the Product menu
  ia/roles.md               roles, scopes, permission matrix
  ia/object-model.md        objects, relationships, lifecycles
  ia/mock-data.md           mock data shape and the demo controls
  build-order.md            P0 build waves derived from dependsOn
  ia/rules.md               business rules and cross-Epic decisions (wins over story assumptions)
  epics/<code>/epic.md      one per Epic
  epics/<code>/US-<CODE>-NNN.md   one per user story
```

## Epics

| Code | Epic |
|---|---|
| FND | Foundation: app shell, nav, View as, ⌘K, notifications, access-denied and 404, mock data layer, shared patterns |
| PRD | Product menu: IA and backlog viewer |
| HOM | Today, shaped by role |
| INB | Inbox and communications |
| LEA | Leads |
| ACC | Accounts and Contacts, including the 7-tab Account page |
| PIP | Pipeline: Opportunities and Quotes |
| XDT | X-dates |
| POL | Policies (read-only) |
| REN | Renewals |
| SRV | Service Requests |
| CRT | Certificates and Holders |
| CLM | Claims |
| WRK | Tasks, Calendar, Activity |
| RPT | Reports |
| SET | Settings |

## Reserved Foundation IDs

Other Epics may list these in `dependsOn` before the FND stories are written. The FND Epic must use exactly these IDs and titles for its first eight stories:

| ID | Title |
|---|---|
| US-FND-001 | App shell with grouped sidebar from sitemap.yaml |
| US-FND-002 | Top bar with office, global search entry, and avatar |
| US-FND-003 | Command palette (⌘K) global search |
| US-FND-004 | View as role switcher (demo) |
| US-FND-005 | Mock data store, API latency, and Demo controls |
| US-FND-006 | Access-denied and not-found pages |
| US-FND-007 | Data table pattern with saved views, filters, sorting, and pagination |
| US-FND-008 | Notifications panel |

## Story file

The file name is the ID: `US-<CODE>-NNN.md`. NNN is numbered from 001 within each Epic, with no gaps.

```markdown
---
id: US-REN-004
title: Triage renewals by premium change
epic: REN
roles: [Account Manager, Principal]
priority: P1            # P0 | P1 | P2
status: Draft           # Draft | Ready | In design | In build | Done
size: S                 # S (about half an FE session) | M (about one session). Split anything larger.
routes: [/renewals]     # must exist in ia/sitemap.yaml
dependsOn: [US-FND-007, US-REN-001]
---

## Story

As an Account Manager, I want to …, so that ….

## Acceptance criteria

- Given …, when …, then ….
- (3 to 7 criteria)

## UI states

- Empty: …
- Loading: …
- Error: …
- No permission: …
- Overflow: … (long names, many rows, large numbers)
- Filtered: … (list screens only)

## Design notes

- Surface, layout, primary element, components, density. Follow the pinned visual world in IMPECCABLE-PROMPT.md, Part B.

## FE notes

- Route, components, state, which mock entities and store actions are used.

## Mock data

- Entities and the edge cases this story needs.
```

## Rules

- **One story is one screen-level behavior.** A list, a record view, and a create/edit flow are separate stories. UI states live inside each story, never as separate stories.
- **Priority:**
  - P0 is the end-to-end demo loop: Lead → Qualify → Opportunity → Quote → Won → Policy → Renewal → Service, plus the shell and the Product menu.
  - P1 completes the basic CRM.
  - P2 is nice to have.
- **Priority and dependencies.** A P0 story's `dependsOn` lists only P0 stories. When a P0 story would use a P1 or P2 capability, its FE notes say "Enhanced by <ID>": the P0 build ships without that capability, and its controls appear once that story lands.
- **Permissions** follow `ia/roles.md`. Every story names its roles and includes a "No permission" state where one can occur.
- **Data ownership.** Policy, Term, Insured item, Additional interest, and commission are synced from the AMS and read-only. Terms created by a Won Opportunity show "Awaiting AMS" until the next sync. A Claim is Fortify's tracking record. Stories never edit them; changes go through a Service Request of type Policy change.
- **Role label.** Write "Principal" in stories and in the UI.
- **Content.** Write in US English, with US formats: $1,234, MM/DD/YYYY, (555) 010-1234. Use fictional carriers only.
