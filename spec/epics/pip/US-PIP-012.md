---
id: US-PIP-012
title: Account Sales tab with Opportunities, Quotes, and X-dates
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/accounts/:id]
dependsOn: [US-PIP-003, US-PIP-004, US-ACC-003, US-XDT-003]
---

## Story

As a Producer, I want the Account's Sales tab to show every Opportunity, every Quote, and every X-date for that Account, so that I can see what we have sold, what is in play, and what to quote next without leaving the Account.

## Acceptance criteria

- Given I open the Sales tab on `/accounts/:id`, then I see three sections in order: Opportunities, Quotes, and X-dates; the tab label shows the count of open Opportunities ("Sales 2").
- Given the Opportunities section, then open Opportunities list first (Name, Type, Stage, Lines, Premium, Target close, Producer) and closed ones sit under a collapsed "Closed (5)" group showing Won or Lost, the close date, and bound premium for Won; rows link to `/pipeline/:id`.
- Given the Quotes section, then it lists every Quote across this Account's Opportunities (Carrier, Lines, Status, Total quoted premium, Valid until, Opportunity), filterable by status chips "Open" (Requested, Quoted, Referred, Presented) and "All"; rows open the Quote sheet on its Opportunity page.
- Given the X-dates section, then it lists the Account's X-dates (Line, Current carrier, Premium, X-date, Interest level, Days until) sorted by soonest; the "+ Add X-date" button and row actions use the XDT dialog and behavior.
- Given I am a Producer or Principal, then the Opportunities section header has "+ Add opportunity"; given I am an Account Manager, it reads "+ Cross-sell opportunity" (US-PIP-003); Admin sees no create button.

## UI states

- Empty: each section has its own empty line: "No Opportunities on this Account." (with the create button), "No quotes yet.", and "No X-dates recorded. Add one for each line this Account buys elsewhere." (with "+ Add X-date").
- Loading: three section skeletons with 3 rows each; the tab count shows "—".
- Error: each section fails independently with "Couldn't load Opportunities. Retry." so one failure does not blank the tab.
- No permission: an Account outside my scope never reaches this tab (ACC shows access-denied); Account Managers and Admins see rows read-only; Est. commission is never shown on this tab.
- Overflow: more than 10 rows per section show 10 and "Show all 23", which expands in place; long Opportunity names truncate with a tooltip; X-dates in the past show the date in muted text with "Passed".
- Filtered: the Quotes "Open" chip with no matches shows "No open quotes. Show all."

## Design notes

- Inside the Account page's tab body (ACC owns the header and tab bar). Each section is a white card with a section title (16/500), a count, and a right-aligned secondary action.
- Compact 40px tables; Stage and Quote status cells use dot plus label as in US-PIP-002.
- X-dates under 45 days (personal lines) or 90 days (commercial) show "Days until" in warning text, matching the XDT Task timing.

## FE notes

- Component `AccountSalesTab` registered in the ACC tab config (US-ACC-003) under key `sales`. Sections: `AccountOpportunities`, `AccountQuotes`, `AccountXDates`.
- Data: `selectOpportunitiesByAccount(accountId)`, `selectQuotesByAccount(accountId)`, and XDT's `selectXDatesByAccount(accountId)`. Reuse XDT's X-dates section (US-XDT-003) and its add and edit components; do not reimplement X-date logic here.
- Tab count selector `countOpenOpportunities(accountId)` exported for the ACC tab bar.

## Mock data

- Torres Household: 2 open Opportunities, 3 Won, 2 Lost, 9 Quotes, 3 X-dates (one passed).
- An Account with nothing in any section, and a Business with 23 Quotes for "Show all".
