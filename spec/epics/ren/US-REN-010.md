---
id: US-REN-010
title: Account Renewals tab
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-REN-001, US-REN-002, US-ACC-003]
---

## Story

As a Producer, I want the Account page's Renewals tab to show open and past Renewals for the Account, so that I know what is coming up and how past renewals were decided before I call.

## Acceptance criteria

- Given the Renewals tab of `/accounts/:id`, then open Renewals list first with columns Policy (Line and number), Expiration, Days left, Status, Change, Risk, and Account Manager.
- Given past Renewals exist, then a "Past renewals" group lists them with Expiration, Decision (Renew as is, Rewrite, Non-renewed), and Change, newest first.
- Given I click a row, then I go to `/renewals/:id`.
- Given the Account has Terms expiring beyond their Renewal window, then a muted footer reads "Next renewal opens 11/28/2026 for Auto (45-day window)."

## UI states

- Empty: "No renewals yet. Renewals open 45 to 120 days before a term expires." for Prospects and new Clients.
- Loading: 3 skeleton rows; the Account header stays.
- Error: inline error panel in the tab with Retry.
- No permission: the Account page handles scope; the tab has no actions.
- Overflow: a Business with 14 Policies shows all open Renewals without pagination; past group paginates at 10.

## Design notes

- Same table styling as the worklist; Change and Risk reuse the shared cells from US-REN-002.

## FE notes

- `AccountRenewalsTab` mounted by the ACC Account page (US-ACC-003) for `?tab=renewals`; the tab count is Renewals not Done (rules.md); reads `store.renewals.listByAccount(accountId)` and `store.terms.listByAccount(accountId)` for the next-window footer.

## Mock data

- Torres Household with one open and three past Renewals (one Rewrite); a Prospect with none; a Business with 5 open Renewals in the same month.
