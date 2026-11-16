---
id: US-PIP-008
title: Compare Quotes side by side and mark them Presented
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/pipeline/:id]
dependsOn: [US-PIP-007]
---

## Story

As a Producer, I want a side-by-side comparison of every carrier's premium per line and to mark the ones I showed the Account as Presented, so that I can recommend the best mix and keep a record of what was offered.

## Acceptance criteria

- Given I click "Compare" in the Quotes section, then a comparison view opens with one row per Opportunity line and one column per Quote in status Quoted, Presented, or Accepted; Requested and Referred Quotes appear as columns reading "Awaiting carrier"; Declined Quotes are hidden behind "Show declined (2)".
- Given a cell, then it shows the quoted premium, or "Not offered", or "—" when the Quote did not include the line; the lowest premium per line carries a "Lowest" text label next to the value.
- Given the totals row, then each column shows the total quoted premium of its offered lines and a coverage note when partial, for example "$3,626 · covers 2 of 3 lines".
- Given column headers, then each shows the carrier, status, Valid until, and a checkbox; Expired Quotes have a disabled checkbox with the tooltip "Quote expired on 11/12/2026. Update Valid until to present it."
- Given I select one or more Quoted columns and click "Mark presented (3)", then a small dialog asks for the Contact presented to (default the Account's primary Contact) and the date (default today); on confirm the Quotes become Presented, the Opportunity moves to Proposed if it was earlier, and an Activity "Presented 3 quotes to Maria Torres" is logged.
- Given a Remarket Opportunity, then the first column is the incumbent baseline described in US-PIP-014.

## UI states

- Empty: fewer than one Quoted Quote shows "Nothing to compare yet. Record a carrier response first." with a link back to the Quotes section.
- Loading: matrix skeleton of 3 rows by 3 columns.
- Error: "Couldn't load quotes to compare." with Retry; a failed "Mark presented" keeps selections and shows a toast.
- No permission: Admins and Account Managers (except on a Remarket in their Office) can open and read the comparison; checkboxes and "Mark presented" are hidden for them and for Producers who are not the Producer.
- Overflow: more than 5 Quote columns scroll horizontally inside the container with the line column sticky on the left; carrier names truncate to the column width with a tooltip; a Business with 7 lines keeps all rows visible without inner vertical scroll.

## Design notes

- Opens as a full-width section that replaces the Quotes table in place (toggle "Table / Compare" in the section header) rather than a modal, so it can be used while on a call.
- Table spec: 40px rows, line names left, premiums right-aligned in tabular figures. "Lowest" uses success text with a small check icon, no cell fill.
- The selection bar appears above the matrix when at least one column is checked: "3 selected · $10,212 total" and the primary "Mark presented".
- Est. commission row at the bottom only for roles allowed by US-PIP-013.

## FE notes

- Component `QuoteCompare` built on a plain table, not the list data table. Derived matrix from `selectQuoteMatrix(opportunityId)`.
- Store action `quotes.markPresented(ids, { contactId, date })` sets status and `presentedAt`, calls the auto stage move to Proposed, and logs one Activity.
- "Lowest" ties: both cells get the label.

## Mock data

- Torres Household with Auto, Home, Umbrella and 5 Quotes: two complete, one with Umbrella "Not offered", one Requested, one Declined.
- One Quote Expired, and a Business Opportunity with 7 Quote columns for horizontal overflow.
