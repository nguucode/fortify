---
id: US-REN-003
title: Renewal nudges callout on the worklist
epic: REN
roles: [Account Manager, Principal]
priority: P2
status: Done
size: S
routes: [/renewals]
dependsOn: [US-REN-001, US-REN-002]
---

## Story

As an Account Manager, I want a short callout of the Renewals that need me now, so that I see the urgent ones before scanning the whole table.

## Acceptance criteria

- Given open Renewals in my scope, then a collapsible callout above the table titled "Needs attention" shows a count badge and up to 3 items, e.g. "3 renewals expire in the next 30 days with no remarket started" and "2 high-risk renewals are still Upcoming".
- Given I click an item, then the table applies the matching filter and the URL updates.
- Given I collapse the callout, then it stays collapsed for this browser via local storage, wrapped in try/catch.
- Given nothing matches, then the callout does not render.

## UI states

- Empty: callout hidden.
- Loading: callout hidden until the list query resolves.
- Error: callout hidden; the table shows its own error.
- No permission: Producers see only nudges for their Book.
- Overflow: item copy truncates to one line each with a tooltip.

## Design notes

- Part B callout panel: white, ring, 8px radius, colored dot per item (danger for expiring, warning for risk), bold first line, muted second line ("Oldest: Torres Household · Home · 18 days").

## FE notes

- `RenewalNudges` derives items client-side from the list query result; no extra store calls.

## Mock data

- At least 3 Renewals within 30 days in Upcoming or In review with risk High, and 2 High in Upcoming.
