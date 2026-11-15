---
id: US-PIP-002
title: Pipeline list with saved views and filters
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/pipeline]
dependsOn: [US-FND-007, US-PIP-001]
---

## Story

As a Principal, I want the pipeline as a sortable, filterable table, including Won and Lost Opportunities, so that I can review the whole agency's sales by stage, Producer, and close date.

## Acceptance criteria

- Given I switch the Board / List control to List, then the URL becomes `/pipeline?view=list` and a data table (US-FND-007) shows columns: Opportunity (name, with the Account as a muted second token), Type, Stage, Lines, Premium (best quoted, else estimated with "est."), Target close, Probability, Producer, Office, Days in stage, and Updated.
- Given the saved views My open, Closing this month, Cross-sell, and Remarket, then they are defined as: My open = open stages where I am the Producer (Producer), on Accounts I manage (Account Manager), or all open in scope (Principal, Admin); Closing this month = open with a target close date in the current calendar month or already past; Cross-sell = open, type Cross-sell; Remarket = open, type Remarket.
- Given the Filters menu, then I can filter by Stage (including Won and Lost), Type, Line, Carrier quoted, Producer, Office, and Target close date range; Producer and Office filters appear only for Principal and Admin. Active filters show as removable chips under the toolbar.
- Given any column header except Lines, when I click it, then the table sorts by it; default sort is Target close ascending, with past-due dates first and the date in danger text.
- Given more than 50 rows, then the table paginates at 50 per page with "1–50 of 212" and next/previous controls; the selected view, filters, sort, and page live in the URL so the view can be shared.
- Given I click a row, then I go to `/pipeline/:id`; the row-end overflow menu offers "Open", "Open Account", and, for the Producer or a Principal on an open Opportunity, "Mark as Won" and "Mark as Lost".

## UI states

- Empty: "No Opportunities yet." with "+ Add opportunity" for Producer and Principal.
- Loading: table header plus 10 skeleton rows; the meta line shows "Loading…".
- Error: table body replaced by "Couldn't load Opportunities." and Retry.
- No permission: Admin rows have no Won/Lost items in the overflow menu, and Account Manager rows have them only on Remarket Opportunities in their Office; Producers only ever see their scope, so no rows outside it are returned.
- Overflow: Opportunity and Account names truncate with ellipsis and a full-value tooltip; Lines shows up to two chips then "+3"; premiums use tabular figures, right-aligned, full dollars ("$12,480"); 2,000+ rows still paginate.
- Filtered: "No Opportunities match these filters." with a "Clear filters" button; the meta line reads "Showing 0 of 212 Opportunities".

## Design notes

- Same page header and toolbar as the Board (US-PIP-001); the segmented control shows List selected.
- 40px rows, 13–14px cells. Stage cell uses a small dot plus label (New and Contacted neutral, Gathering info and Quoting blue, Proposed purple, Won green with a check icon, Lost red with an x icon), never a filled pill.
- Meta line: "Showing 48 of 212 Opportunities · $142,900 best quoted".
- Est. commission column exists only for roles allowed to see it (US-PIP-013); it is not listed in Display options for other roles.

## FE notes

- Same route as the Board; `view=list` switches the body. Use the FND data table with column config, URL-synced state, and the shared `pipelineSavedViews` definitions.
- Selector `selectVisibleOpportunities(user, filters)` with `includeClosed` true when a Stage filter includes Won or Lost.
- Derived fields (best quoted premium, days in stage) computed in selectors, not stored.

## Mock data

- All 220 Opportunities: about 140 open, 50 Won, 30 Lost, across all three types (about 60% New business, 25% Cross-sell, 15% Remarket).
- At least 8 open Opportunities with a past target close date.
- Opportunities across all three Offices and at least 8 Producers.
