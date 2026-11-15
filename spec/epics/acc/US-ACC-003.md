---
id: US-ACC-003
title: Account page header and 7-tab shell with counts
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/accounts/:id]
dependsOn: [US-FND-001, US-FND-005, US-FND-006, US-ACC-001, US-WRK-002, US-WRK-005, US-PIP-003, US-SRV-005]
---

## Story

As an Account Manager, I want every Account to open on a page with a sticky header showing who it is and who owns it, and 7 tabs that each show how many items are open, so that I can see what needs attention before I click anywhere.

## Acceptance criteria

- Given I open `/accounts/:id`, when it loads, then the sticky header shows the Account name, a Household or Business icon, the status (Prospect, Client, or Former client), Producer, Account Manager, Office, linked Accounts, and quick actions, and it stays visible while the tab content scrolls.
- Given the tab bar, when it renders, then it shows Overview, Policies, Renewals, Sales, Service, Activity, and Documents in that order, with counts: Policies = Active Terms; Renewals = Renewals not Done; Sales = open Opportunities (X-dates are not counted); Service = Service Requests not Done; Activity = open Tasks; Documents = total documents; Overview has no count. A zero count is hidden.
- Given I click a tab, when it opens, then the URL becomes `/accounts/:id?tab=sales`, the tab content loads below the header without reloading the header, and a deep link to `?tab=sales` opens that tab directly; an unknown `tab` value falls back to Overview.
- Given the quick actions, when they render, then I see "Log activity", "New task", "New opportunity", and "New service request", plus an overflow menu with Edit details, Reassign, Merge, and Archive; actions my role cannot perform are disabled with a tooltip giving the reason.
- Given the Account is out of my scope, when I open its URL, then I see the FND access-denied page naming the Producer ("This account belongs to Dana Whitfield's Book") with "Request access".
- Given a Business Account, when I open the Service tab, then ACC renders only the tab frame and count; the Certificates and Holders sub-tabs inside it are owned by the Service and Certificates Epics and appear for Businesses only.

## UI states

- Empty: an Account with no Contact shows "No primary contact" in muted text in the header with an "Add contact" link; tabs with nothing open show no count.
- Loading: header skeleton (name bar, 4 meta chips) and tab bar render immediately; counts show a small muted spinner until loaded.
- Error: if the Account fails to load, a full-page error "We couldn't load this account." with Retry; if only counts fail, tabs render without counts and a muted "Counts unavailable" tooltip.
- No permission: tooltips read, for example, "Only a Principal or Admin can reassign an account." (Reassign), "Only an Admin can merge or archive accounts." (Merge, Archive), "Admins have read-only access to opportunities." (New opportunity for Admin), "Account Managers can create cross-sell opportunities on Clients only." (New opportunity for an Account Manager on a Prospect), and "Admins have read-only access to service requests." (New service request for Admin). An Archived Account is visible only to Admins; it shows a neutral banner "Archived on 11/02/2026 by Priya Nair. This account is read-only." and disables every quick action. Other roles opening its URL get the not-found page (US-FND-006).
- Overflow: names up to 120 characters truncate to one line with a tooltip; more than 2 linked Accounts collapse to "Torres Roofing LLC +2"; counts above 99 show "99+".

## Design notes

- Header on the white surface with a bottom hairline, 32px gutters: line 1 is the name at page-title size (30/600) with the kind icon; line 2 is a meta row in 13px: status dot and label · Producer avatar and name · Account Manager avatar and name · Office · "Linked: Torres Roofing LLC" link. Quick actions right-aligned as small outline buttons, with "New opportunity" as the only blue primary.
- Sticky behavior: on scroll past 120px the header compacts to a 56px bar with the name at 16/500 and the status; the tab bar sticks under it.
- Tabs as an underline tab row; counts as neutral pills; the active tab uses the primary blue underline. No icons in tabs.
- The Sample data badge from FND stays in the top bar, not in the header.

## FE notes

- Route `/accounts/:id`, `AccountPage` with `AccountHeader` and `AccountTabs`; tab from `useSearchParams().get('tab')`, validated against the `tabs` list in `sitemap.yaml`.
- Tab panels are lazy components registered by key; ACC provides `overview`, `activity`, `documents`; the `policies`, `renewals`, `sales`, and `service` panels are slots filled by the POL, REN, PIP/XDT, and SRV/CRT Epics; the Sales slot (US-PIP-012) holds Opportunities, Quotes, then the X-dates section (US-XDT-003). Until they exist, a slot renders "Coming soon" in muted text.
- Counts come from one selector `selectAccountTabCounts(accountId)` so every Epic's numbers match.
- Quick actions open drawers owned elsewhere: Log activity (US-WRK-002), New task (US-WRK-005), New opportunity (US-PIP-003), New service request (US-SRV-005). The demo's Service step starts from this header.
- Scope check via `canSeeAccount(user, account)` before rendering; on failure render the FND access-denied page in place.
- Merged Accounts redirect to the surviving Account with a toast "Torres HH (dup) was merged into Torres Household."

## Mock data

- The Torres Household (Client, 4 Policies, 1 open Renewal, 1 open Cross-sell Opportunity, 2 open Service Requests, 3 open Tasks) and Torres Roofing LLC (Business, 12 Locations) for counts on both kinds.
- One Account with no Contact, one Archived Account, one Merged Account, and one Account in another Office for the access-denied case.
