---
id: US-XDT-001
title: Agency-wide X-dates list
epic: XDT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/x-dates]
dependsOn: [US-FND-001, US-FND-005, US-FND-007]
---

## Story

As a Producer, I want a list of the lines my Accounts buy elsewhere, ordered by how soon they expire, so that I start quoting each one inside its window instead of after the Account has already renewed elsewhere.

## Acceptance criteria

- Given I open /x-dates, when it loads, then the saved view "Next 90 days" is selected: X-dates from today through today + 90 with interest level other than Closed, sorted by X-date ascending, with columns Account, Line, Current carrier, Premium, X-date, Days out, Interest, Producer, Follow-up, Opportunity.
- Given I switch to the saved view "All", when it loads, then every X-date in scope shows, including passed and Closed ones, sorted by X-date ascending.
- Given I am a Producer, when the list loads, then I see X-dates on Accounts in my Book; an Account Manager sees their Office; a Principal and an Admin see the agency.
- Given an X-date is inside its quote window (45 days for personal lines, 90 for commercial) and has no Opportunity, when it renders, then Days out shows in warning text with the tooltip "Inside the 45-day quote window, no Opportunity yet", and a callout above the table reads "14 X-dates are in their quote window with no Opportunity" listing the three soonest.
- Given an X-date has a linked Opportunity, when it renders, then the Opportunity column shows its stage, for example "Quoting", linked to /pipeline/:id.
- Given I click a row, when it opens, then the X-date drawer (US-XDT-002) shows the record without leaving the list, and the URL becomes `/x-dates?view=next-90&xdate=:id`.

## UI states

- Empty: "No X-dates yet. Record the lines your Accounts buy elsewhere and Fortify will remind the Producer 45 days ahead (90 for commercial)." with "+ Add X-date".
- Loading: 10 skeleton rows; saved view tabs visible.
- Error: inline panel "X-dates couldn't load." with "Try again".
- No permission: none for viewing; every role can create and edit X-dates within scope.
- Overflow: Account and carrier names truncate with tooltips; premium up to $999,999 right-aligned in tabular-nums; Days out over 365 shows "1 yr+".
- Filtered: "No X-dates match these filters." with "Clear filters".

## Design notes

- H1 "X-dates", description "When coverage your Accounts buy elsewhere ends, so you can quote ahead of them." Saved views as tabs under the header: Next 90 days, All.
- Toolbar: search "Search X-dates" (Account, carrier, policy number), Filters (Line, Personal / Commercial, Interest, Account status Prospect / Client / Former client, Producer, Office, Has Opportunity, Source), Display options, Export, primary "+ Add X-date".
- Meta line: "Showing 38 X-dates in the next 90 days · $96,420 premium written elsewhere".
- Account cell: Account name with a muted status token ("Client" means a coverage gap on an existing Client; "Prospect" means a whole Account to win).
- Days out: "in 37 days", "Today", or "Passed 12 days ago" in muted text. Interest is a dot plus label (High red, Medium orange, Low neutral, Closed inactive).
- Follow-up: "Task due 11/20" linking to the Task, or "—".

## FE notes

- Route /x-dates, `XDateListPage` on `DataTable` (US-FND-007). Saved view id in the URL (`?view=next-90`); the open drawer adds `?xdate=:id`.
- Selectors: `selectXDates(scope, filters)`, `daysOut(xDate, today)`, `quoteWindowDays(line)` returning 45 or 90 by `isCommercialLine(line)`.
- X-dates have no status: state is derived from interest level, the linked Opportunity, and whether the date has passed (rules.md).
- Scope through the Account: `accountsInScope(user)`; Producer is the Account's Producer, not stored on the X-date.
- Premium total in the meta line sums the filtered rows.

## Mock data

- 250 X-dates on about 180 Accounts: 60% on Prospects, 40% coverage gaps on Clients. Offsets from -60 to +365 days; about 40 in the next 90 days.
- Interest: High 25%, Medium 40%, Low 25%, Closed 10%. Sources: Manual 70%, Lead 15%, Lost opportunity 15%. About 20 linked to an open Opportunity.
- Edge cases: an X-date due today; one passed 30 days ago with no Opportunity; a WC X-date at $184,500; an Account with 6 X-dates; a very long carrier name.
