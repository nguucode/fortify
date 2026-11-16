---
id: US-ACC-004
title: Account Overview tab summary
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-WRK-001]
---

## Story

As a Producer, I want the Overview tab to summarize an Account's coverage, open work, and recent activity, so that I can prepare for a call in under a minute without opening every tab.

## Acceptance criteria

- Given I open the Overview tab, when it loads, then I see four summary cards: Active policies (count and lines, e.g. "4 · Auto, Home, Umbrella, Flood"), Annual premium (sum of Active Term premiums, e.g. "$9,842"), Next expiration (earliest Active Term expiration with its line and carrier), and Open work (open Opportunities, Renewals, Service Requests, and Tasks).
- Given I am a Producer on the Account, when the Annual premium card renders, then it also shows "Your commission: $1,181 (12%)"; an Account Manager sees no commission line at all, and a Principal or Admin sees the agency commission.
- Given open items exist, when the "Needs attention" callout renders, then it lists up to 5 items in priority order: overdue Tasks, Renewals at High risk, Terms with Pending cancellation, Service Requests in status Waiting on client, and X-dates in the next 90 days, each linking to its record or tab.
- Given Contacts are linked, when the Contacts panel renders, then it lists them with relationship, phone, email, and SMS consent, primary first, and a "Manage contacts" link opens US-ACC-010.
- Given Activity exists, when the Recent activity panel renders, then it shows the latest 5 entries using the shared timeline in compact mode and a "View all activity" link to `?tab=activity`.
- Given the Account is a Household or a Business, when the details panel renders, then it shows the kind-specific panel from US-ACC-005 or US-ACC-006.

## UI states

- Empty: a new Prospect shows "No policies with the agency yet" in the Active policies card, "—" for premium and expiration, a callout "No open work. Start an opportunity or log the first call." and empty Contacts "No contacts on this account yet. Add a contact."
- Loading: card skeletons at final size so the layout does not shift; panels load independently.
- Error: each panel fails on its own with "Couldn't load recent activity. Retry." while other panels stay usable.
- No permission: commission lines are omitted entirely for Account Managers and for Producers who are not on the Account; never masked.
- Overflow: more than 5 attention items shows "and 7 more"; 12 Contacts show the first 6 and "Show all 12"; premium up to $1,284,500 fits on one line.

## Design notes

- Two-column layout at 1280px and up: left 2/3 holds the summary cards row, Needs attention callout, and Recent activity; right 1/3 holds Contacts and the kind-specific details panel. Single column below 1024px.
- Summary cards are white with ring, 8px radius, 13px label and 24px value; no charts on this tab.
- Needs attention uses the collapsible callout panel with a count badge; each item has a colored dot (danger for overdue, warning for at risk), a bold first line ("Renewal at high risk: Home · +38%") and a muted second line ("Expires 12/04/2026 · Lone Star Mutual").
- SMS consent shows as a small icon plus label: Opted in (success), Opted out (danger), Unknown (neutral).

## FE notes

- `AccountOverviewTab` composed of `AccountSummaryCards`, `AttentionCallout`, `AccountContactsPanel`, `ActivityTimeline` (compact, limit 5, from US-WRK-001), and `HouseholdDetailsPanel` or `BusinessDetailsPanel`.
- Selectors: `selectAccountSummary(accountId)`, `selectAttentionItems(accountId, today)`, `selectAccountContacts(accountId)`; commission via `canSeeCommission(user, account)`.
- Policy, Term, and commission data are read-only here; no edit affordances on synced values.

## Mock data

- Torres Household: 4 Active Terms, a High-risk Renewal at +38%, one Term with Pending cancellation, one overdue Task, one X-date (boat, 02/10/2027).
- A brand-new Prospect with one Contact and no Activity; the Account with no Contact.
