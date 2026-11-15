---
id: US-REN-001
title: Renewals worklist with windows and saved views
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/renewals]
dependsOn: [US-FND-001, US-FND-005, US-FND-007]
---

## Story

As an Account Manager, I want one worklist of the Renewals in my Office, ordered by days to expiration, so that I work every Term before it expires and nothing renews unreviewed.

## Acceptance criteria

- Given I open `/renewals`, then I see saved view tabs Due in window (default), At risk, and Remarketing, each with a count, and a table with columns Account, Policy (number and Line), Carrier, Expiration, Days left, Window, Status, Prior premium, Renewal premium, Change, Risk, and Account Manager.
- Given the Window column, then each Renewal shows its segment and window, matching when the Renewal was created: Personal lines · 45 days, FL residential property · 120 days (home, condo, or dwelling in FL), Small commercial · 60 days, or Large commercial · 90 days (Accounts with at least $25,000 in annual commercial premium).
- Given the views, then Due in window lists every Renewal in a status before Decided (Upcoming, In review, Remarketing, Presented); At risk lists those with Risk High that are not Decided or Done; Remarketing lists those in status Remarketing.
- Given Days left is 15 or less and the status is before Decided, then Days left shows in danger text, e.g. "12 days"; on or after expiration it reads "Expired 2 days ago".
- Given I am an Account Manager, then I see Renewals for Accounts in my Office with a default "Mine" filter on Account Manager; a Producer sees Renewals in their Book; Principal and Admin see the agency.
- Given I click a row, then I go to `/renewals/:id`.

## UI states

- Empty: "No renewals due in this window." with the muted line "Renewals are created 45, 60, 90, or 120 days before a term expires."
- Loading: 10 skeleton rows; view counts shimmer.
- Error: table-area error panel "Couldn't load renewals." with Retry.
- No permission: none for reading; Admin and Producer rows show no inline actions.
- Overflow: about 150 open Renewals paginate at 50; long Account names truncate with tooltips; premiums up to $480,000 right-aligned in tabular figures.
- Filtered: chips for Window (45, 60, 90, 120), Line, Carrier, Status, Risk, Office, Account Manager, Producer; "No renewals match these filters." with Clear filters.

## Design notes

- List page per Part B: H1 "Renewals", description "Terms expiring in the next 45 to 120 days, by segment.", toolbar with search ("Search renewals"), Filters, Display options, Export; no primary button, because Renewals are created by the timing rule.
- Meta line: "Showing 48 of 152 renewals · $1.24M renewal premium".
- Primary column: Account name with the policy number as the muted token below.
- Status as dot + label: Upcoming neutral, In review blue, Remarketing purple, Presented teal, Decided green, Done neutral muted.

## FE notes

- Route `/renewals`, `RenewalsListPage` on `DataTable` and `SavedViewTabs` (US-FND-007); view and filters in the query string.
- `store.renewals.list({ scope, view, filters, search, page })`; `daysLeft` derived from `term.expirationDate` at render.
- Window derives from `renewal.segment` ('personal' | 'fl-residential-property' | 'small-commercial' | 'large-commercial') → 45 / 120 / 60 / 90. The generator sets `fl-residential-property` for FL home, condo, and dwelling Terms, and `large-commercial` when the Account's annual commercial premium is at least $25,000 (rules.md).

## Mock data

- About 150 open Renewals spread across all statuses and segments, expirations 0 to 120 days out, including FL home Renewals between 45 and 120 days out, plus 3 already past expiration without a decision.
- The Renewal with a +38% premium increase; Torres Household home and Torres Roofing LLC GL renewing in the same month.
