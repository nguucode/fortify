---
id: US-POL-012
title: Account Policies tab
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/accounts/:id]
dependsOn: [US-FND-005, US-FND-007, US-POL-002, US-POL-004, US-ACC-003]
---

## Story

As a Producer, I want the Account page's Policies tab to show every Policy the Account holds with the agency, so that after a Won Opportunity I see the new Bound Terms next to the rest of the Account's lines.

## Acceptance criteria

- Given I open the Policies tab of `/accounts/:id`, then active Policies list first (Bound, Active, Pending cancellation) with columns Line, Policy number, Carrier, Effective, Expiration, Premium, and Status, and a summary line "4 active policies · $9,812 total premium".
- Given the Account has Policies whose current Term is Canceled, Expired, Non-renewed, or Rewritten, then they sit in a collapsed "Past policies (3)" group below.
- Given an Opportunity on this Account was just marked Won, when I open the tab, then the new Policies show status Bound, an "Awaiting AMS" marker until the next sync matches them by binder number, and a "New" marker for the session.
- Given a Business that is a TX WC non-subscriber, then a note above the table reads "Workers' comp: Non-subscriber (TX) · DWC Form-005 filed 03/12/2026"; given a FL Business with no WC Policy, then no such note shows.
- Given a Policy has an open Renewal, then its row shows "Renewal · 42 days" linking to `/renewals/:id`.
- Given I click a row, then I go to `/policies/:id`.

## UI states

- Empty: Prospect Account with no Policies: "No policies yet. Policies appear here when an Opportunity is Won." with a link to the Account's Sales tab.
- Loading: 4 skeleton rows under the tab header; the Account header stays rendered.
- Error: inline error panel in the tab with Retry; other tabs still work.
- No permission: the Account page itself handles out-of-scope access (ACC Epic); the tab has no actions to disable.
- Overflow: a Business with 14 Policies scrolls inside the page, not the tab; Carrier names truncate with tooltips.

## Design notes

- Tab content on a white table container with ring; the AMS sync indicator sits top-right of the tab header.
- Line column leads with the line icon; Status as dot + label; "New" uses a small neutral pill.
- Past policies group header is a 40px recessed row with a chevron.

## FE notes

- Enhanced by US-ACC-006 (P1): the P0 build ships without these; their controls appear once those stories land.
- `AccountPoliciesTab` is mounted by the ACC Account page (US-ACC-003) for `?tab=policies`; the tab count is Active Terms (rules.md); it reads `store.policies.listByAccount(accountId)` and `store.renewals.listOpenByAccount(accountId)`.
- WC status is a Fortify-owned Business field on the Account, owned and edited by ACC (US-ACC-006, rules.md); this tab only displays it. Values follow ACC: Covered, Exempt, or Non-subscriber (TX) with the DWC Form-005 filing date.
- "New" marker driven by `term.boundInSession` set by the PIP Won action.

## Mock data

- Torres Household (auto, home, umbrella) and Torres Roofing LLC (GL, Commercial auto, TX WC non-subscriber).
- A Prospect with no Policies; a Former client with only past Policies; a Business with 14 Policies.
