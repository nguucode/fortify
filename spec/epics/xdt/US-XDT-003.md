---
id: US-XDT-003
title: X-dates section on the Account page
epic: XDT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/accounts/:id]
dependsOn: [US-XDT-002, US-ACC-003, US-ACC-004]
---

## Story

As a Producer looking at an Account, I want to see which lines it buys elsewhere and when they expire, next to its Opportunities, so that I can round the Account at the right moment.

## Acceptance criteria

- Given I open the Sales tab of an Account in my scope, when it loads, then an "X-dates" section lists that Account's X-dates sorted by X-date ascending, with Line, Current carrier, Premium, X-date, Days out, Interest, and Opportunity.
- Given the Account is a Client, when the section renders, then its description reads "Coverage this Account buys elsewhere"; for a Prospect or Former client it reads "Current coverage to quote ahead of".
- Given I click "+ Add X-date" in the section, when the drawer opens, then the Account is prefilled and locked (US-XDT-002).
- Given an X-date has passed or is Closed, when the section renders, then it is grouped under a collapsed "Past and closed (3)" row.
- Given the Account Overview loads, when the Account has an X-date inside its quote window with no Opportunity, then the Overview shows a one-line nudge "Home elsewhere expires in 32 days · Start quote".

## UI states

- Empty: "No X-dates. Record lines this Account buys elsewhere so you can quote ahead of them." with "+ Add X-date".
- Loading: three skeleton rows inside the section only; the rest of the tab is unaffected.
- Error: section-level error "X-dates couldn't load." with "Try again".
- No permission: out-of-scope Accounts never render (the Account page shows access denied); within scope everyone can add and edit.
- Overflow: more than 8 X-dates shows the first 8 with "View all 11 on X-dates", linking to /x-dates filtered to this Account.

## Design notes

- Compact table (40px rows) inside a section card, titled 16/500 "X-dates" with a count pill, placed as the third section of the Sales tab, after Opportunities and Quotes (US-PIP-012). X-dates are not counted in the Sales tab count.
- Overview nudge uses the callout pattern with a single item.

## FE notes

- `AccountXDatesSection` is mounted by the Sales tab (US-PIP-012, which owns the tab), and `AccountXDateNudge` by the Overview tab (US-ACC-004); both components are owned by this story, the tab shell by US-ACC-003.
- Selector `selectXDatesByAccount(accountId)`; link to `/x-dates?view=all&account=<id>`.

## Mock data

- The Account with 6 X-dates (2 past or Closed); Torres Household (Client) with Home elsewhere expiring in 32 days; an Account with none.
