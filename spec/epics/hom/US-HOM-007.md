---
id: US-HOM-007
title: "Account Manager Today: Renewals due in window"
epic: HOM
roles: [Account Manager]
priority: P0
status: Done
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-REN-001]
---

## Story

As an Account Manager, I want the open Renewals I own, ordered by expiration with the premium change and risk visible, so that I review the risky ones first and nothing expires untouched.

## Acceptance criteria

- Given I am an Account Manager, when Today loads, then the "Renewals due" widget lists Renewals due in window (every status before Decided: Upcoming, In review, Remarketing, Presented) where I am the Account Manager, soonest expiration first, at most 8 rows.
- A segmented control switches "Mine" (default) and "Office" (every Renewal in my Office).
- Above the table, three counts read "Next 30 days 12 · 31–60 days 18 · 61–90 days 9 · 91–120 days 4" (the last band holds FL residential property, created 120 days out); clicking one filters the table to that band.
- Each row shows Account (with line and carrier muted, "Home · Gulf Harbor"), Expiration (MM/DD/YYYY plus "in 23 days"), Premium change (right-aligned, "+38.0%" in danger text with an up arrow, "−4.2%" in success text with a down arrow, "0.0%" neutral), Risk (High or Low per rules.md, dot plus label), and Status.
- Given a Renewal expires within 30 days and is still Upcoming, then its Status shows a warning icon with the tooltip "Not started, expires in 18 days".
- Given I click a row, then I go to /renewals/:id; "View all" goes to /renewals (Due in window).

## UI states

- Empty: "No open Renewals in your window." with a "View all Renewals" link.
- Loading: band counts as 3 skeleton chips, table as 8 skeleton rows.
- Error: "Couldn't load Renewals due." with Retry.
- No permission: not rendered for other roles; Principal uses US-HOM-011, Producer sees Renewals only on the Account.
- Overflow: Renewals with no premium change yet (carrier renewal not received) show "—" in muted; Account names truncate with a tooltip.

## Design notes

- Compact table, columns Account (flex), Expiration (132px), Premium change (112px right, tabular-nums), Risk (80px), Status (120px).
- Band counts are text buttons (13px label, 600 value), the selected band underlined in primary; no chart.

## FE notes

- Enhanced by US-REN-002 (P1): the P0 build ships without these; their controls appear once those stories land.
- Query `renewals.list({ accountManagerId: me | officeId, status: open, sort: 'expirationDate', limit: 8 })` plus `renewals.bandCounts(...)`.
- Renewal creation lead times (45 personal, 120 FL residential property, 60 small commercial, 90 large commercial at $25,000 or more in annual commercial premium) are a mock generation rule; the widget does not compute them.
- Subscribes to `renewal.statusChanged`.

## Mock data

- Marisol Reyes (Account Manager persona) owns 43 Renewals due in window, 4 of them FL residential property in the 91–120 day band; the hand-made +38% Renewal is his, High risk, Upcoming, expiring in 18 days.
- At least 2 Renewals with no renewal premium yet, and one Remarketing Renewal linked to a Remarket Opportunity.
