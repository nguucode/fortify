---
id: US-XDT-006
title: Roll forward passed X-dates
epic: XDT
roles: [Producer, Account Manager, Principal, Admin]
priority: P2
status: Done
size: S
routes: [/x-dates]
dependsOn: [US-XDT-001, US-XDT-004]
---

## Story

As a Producer, I want to push X-dates that passed without a sale to the next renewal in one click, so that the competitor's line comes back to me next term instead of going stale.

## Acceptance criteria

- Given an X-date has passed and has no open Opportunity, when I choose "Roll forward" in its drawer or row menu, then its date moves forward by its term length (12 months, or 6 for a 6-month auto term), for example 10/01/2026 to 10/01/2027, and the toast reads "Rolled forward to 10/01/2027".
- Given I filter "All" to Passed X-dates, when I select up to 50 rows and choose "Roll forward", then each moves by its own term length, repeated until the date is in the future, and the toast reads "18 X-dates rolled forward".
- Given an X-date rolls forward, when it saves, then its history line reads "Rolled forward from 10/01/2026 by Dana Whitfield" and the follow-up rule (US-XDT-004) is re-evaluated.
- Given an X-date is Closed, when I view it, then Roll forward is offered only after the interest level is changed back from Closed.

## UI states

- Empty: no passed X-dates: the Passed filter shows "Nothing passed. Every X-date is current."
- Loading: bulk action shows a spinner on the action bar.
- Error: bulk fails: "Couldn't roll forward. Nothing was changed."
- No permission: only X-dates in scope can be selected.
- Overflow: selection over 50 shows "Select up to 50 X-dates at a time".
- Filtered: the Passed filter is a chip under the toolbar ("X-date: Passed").

## Design notes

- Passed rows show Days out as "Passed 12 days ago" in muted text with an inline text action "Roll forward".
- Bulk action bar "18 selected · Roll forward · Clear".

## FE notes

- Pure function `rollForward(xDate, termMonths, today)` that loops until the date is after today; unit-test leap years (02/29) by clamping to 02/28.
- Store action `rollForwardXDates(ids)`, atomic.

## Mock data

- About 25 passed X-dates, including one 14 months past (needs two rolls), a 6-month auto term, and an X-date on 02/29/2024.
