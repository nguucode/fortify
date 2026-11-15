---
id: US-HOM-011
title: "Principal Today: retention and at-risk Renewals"
epic: HOM
roles: [Principal]
priority: P1
status: Draft
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-FND-020, US-REN-002]
---

## Story

As a Principal, I want the agency retention rate and the high-risk Renewals with the most premium at stake, so that I can step in before a large Account leaves.

## Acceptance criteria

- Given I am a Principal, when Today loads, then a Retention card shows the policy retention rate for the trailing 12 months ("88.4%"), its change vs the prior 12 months ("▲ 0.6 pts"), and the basis ("1,214 of 1,373 Terms retained").
- Retention follows rules.md: 1 − lost ÷ Terms that reached expiration in the period. Renewed and Rewritten are retained (a rewrite to another carrier through the agency is not lost); Non-renewed, Expired, and Canceled are lost, except a cancel that is then rewritten, which counts as Rewritten. Terms still Active are excluded.
- An "At-risk Renewals" table lists open Renewals with Risk High expiring in the next 60 days, sorted by current premium, descending, at most 8 rows: Account, Account Manager, Producer, Premium (right-aligned), Premium change, Expiration, Status.
- A summary line reads "$312,450 premium at stake across 23 Renewals · 4 with no remarket started"; "no remarket started" counts High-risk Renewals still Upcoming or In review (not yet Remarketing).
- Given I click a row, then I go to /renewals/:id; "View all" goes to /renewals (At risk).
- The top bar Office scopes both the card and the table.

## UI states

- Empty: "No high-risk Renewals in the next 60 days." with the Retention card still shown.
- Loading: card skeleton and 8 skeleton rows.
- Error: card and table error independently, each with Retry.
- No permission: not rendered for other roles.
- Overflow: retention with fewer than 20 Terms in the basis shows the rate with the muted note "Small sample".

## Design notes

- Retention card: analytics card with 24px value and a 12-month 1px line chart of monthly retention on hairline gridlines.
- At-risk table follows the US-HOM-007 column grammar plus Account Manager and Producer columns (140px each, avatar 20px plus name).

## FE notes

- Queries `retention.trailing12({ officeId? })` with `{ rate, priorRate, retained, total, monthly[] }`, and `renewals.list({ risk: 'High', expiresWithinDays: 60, status: open, officeId?, sort: '-premium', limit: 8 })` plus `renewals.atRiskSummary(...)`.
- Reuses the line chart primitive from US-FND-020, as US-HOM-010 does.

## Mock data

- Term outcomes over 24 months so retention resolves to about 88%; 23 High-risk Renewals agency-wide in 60 days including the +38% Renewal; one Large commercial Renewal at $186,000 premium.
