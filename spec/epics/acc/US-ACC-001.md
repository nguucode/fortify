---
id: US-ACC-001
title: Browse Accounts with saved views
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/accounts]
dependsOn: [US-FND-001, US-FND-005, US-FND-007]
---

## Story

As a Producer or Account Manager, I want one list of every Account in my scope with saved views for Prospects, Clients, Former clients, Households, and Businesses, so that I can find the Account I need and see the shape of my Book at a glance.

## Acceptance criteria

- Given I open `/accounts`, when the page loads, then I see the saved views All, Prospects, Clients, Former clients, Households, and Businesses as tabs above the table, with All selected and a count on each tab.
- Given I am a Producer, when the list loads, then it holds only my Book (Accounts where I am the Producer or the Account Manager); an Account Manager sees every Account in their Office; a Principal or Admin sees the whole agency.
- Given the table, when it renders, then the columns are Name (with Household or Business and the primary Contact as a muted second token), Status, Producer, Account Manager, Office, Active policies, Annual premium, Next expiration, and Last activity, and Annual premium is right-aligned with tabular figures.
- Given I type "torres" in the search field, when 300ms pass without typing, then the list narrows to Accounts whose name, Contact name, email, or phone matches, and the meta line reads "Showing 2 of 600 accounts".
- Given I click a row, when the Account page opens at `/accounts/:id`, then pressing Back returns me to the same view, search, filters, sort, and page.
- Given Archived or Merged Accounts exist, when any saved view loads, then they are excluded; only an Admin sees an "Include archived" option under Filters; Archived Accounts are never visible to other roles.

## UI states

- Empty: a view with no Accounts shows "No prospects in your Book yet. Qualified leads become Prospects here." with a "+ New account" button. The All view for a new Producer reads "Your Book is empty. Ask your Principal to assign Accounts, or create one."
- Loading: 10 skeleton rows at 40px under the real header row; tab counts show a muted "—" until loaded.
- Error: inline error panel in place of the table, "We couldn't load accounts. Try again.", with a Retry button (Demo controls can force it).
- No permission: every role can read Accounts within scope, so the screen itself never denies access; Admin sees "+ New account" enabled (Account is C E for all roles).
- Overflow: names longer than the column truncate with an ellipsis and a full-value tooltip (seed includes "The Montgomery-Vanderhoven-Castellanos Household"); premium up to $1,284,500 fits without wrapping; pagination at 50 rows with "1–50 of 600".
- Filtered: when filters or search return nothing, show "No accounts match these filters." with a "Clear filters" text button; active filters appear as removable chips in the toolbar.

## Design notes

- List page per Part B: H1 "Accounts", muted description "Households and Businesses the agency sells to and services.", toolbar with search (placeholder "Search accounts"), Filters, Display options, Export, and the blue primary "+ New account" at the far right.
- Saved views as an underline tab row between the header and the toolbar, each with a neutral count pill.
- Meta line under the toolbar, 13px muted: "Showing 50 of 600 accounts · $4.82M annual premium".
- Status cell is a dot plus label: Prospect (blue), Client (green), Former client (neutral). Never a filled pill.
- Name column shows a 16px Household (home) or Business (building) icon before the name.
- Next expiration shows the earliest Active Term expiration in MM/DD/YYYY; within 30 days it gets warning text and a clock icon. Empty cells show "—".

## FE notes

- Route `/accounts`; `AccountsListPage` built on the FND `DataTable` with saved views from `sitemap.yaml` (`savedViews`).
- View, search, filters, sort, and page live in the URL query (`?view=clients&q=torres&sort=-premium&page=2`) so Back restores them.
- Store selectors: `selectAccountsInScope(user)`, then derived fields `activePolicyCount`, `annualPremium` (sum of Active Term premiums), `nextExpiration`, `lastActivityAt`.
- Filters: Office, Producer, Account Manager, State (TX, FL), Status, Kind; Admin-only "Include archived".
- Export downloads a CSV of the current view (mock, client-side Blob).

## Mock data

- 600 Accounts (480 Households, 120 Businesses) split across Houston, San Antonio, and Tampa; statuses roughly 25% Prospect, 65% Client, 10% Former client.
- Edge cases: the very long Household name, an Account with no Contact (Name's second token reads "No contact"), an Account with no Activity (Last activity "—"), and 3 Archived Accounts plus 1 Merged Account for the Admin filter.
