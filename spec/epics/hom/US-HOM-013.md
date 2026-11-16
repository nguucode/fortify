---
id: US-HOM-013
title: "Admin Today: users, Licenses, and Offices"
epic: HOM
roles: [Admin]
priority: P1
status: Done
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-SET-010]
---

## Story

As an Admin, I want a snapshot of users by Office and role and the Licenses about to expire, so that nobody sells a line without a current License.

## Acceptance criteria

- Given I am an Admin, when Today loads, then a "Users" card shows the active user count (25) split by Office ("Houston TX 11 · San Antonio TX 8 · Tampa FL 6") and by role (Producer, Account Manager, Principal, Admin), plus inactive users if any.
- A "Licenses expiring" table lists Licenses expiring in the next 60 days or already expired, soonest first: User, State, Line of authority ("General Lines – P&C", "2-20 General Lines", "4-40 Customer Representative"), Expiration (MM/DD/YYYY), Days left (right-aligned).
- Given a License has expired, then Days left reads "Expired 3d ago" in danger text; within 30 days, warning text.
- Given I click an Office count, then I go to /settings/offices; a user count or "View all" goes to /settings/users; a License row or its "View all" goes to /settings/licenses.
- The top bar Office scopes both the card and the table.

## UI states

- Empty: "No Licenses expire in the next 60 days."
- Loading: card skeleton and 5 skeleton rows.
- Error: card and table error independently, each with Retry.
- No permission: not rendered for other roles. Principal can reach the same pages read-only through Settings.
- Overflow: a user with 6 or more Licenses expiring shows one row per License; names truncate with a tooltip.

## Design notes

- Users card: analytics card with 24px total and two 13px breakdown lines; no chart.
- Licenses table: compact, Days left in tabular-nums.

## FE notes

- Queries `users.summary({ officeId? })` and `licenses.list({ expiresWithinDays: 60, includeExpired: true, officeId?, sort: 'expirationDate' })`.
- Settings pages own all edits; this widget only links.

## Mock data

- 25 users with the 11/8/6 Office split; 4 Licenses expiring within 60 days (one TX, three FL including one 4-40) and 1 expired 3 days ago.
