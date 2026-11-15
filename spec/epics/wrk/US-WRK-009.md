---
id: US-WRK-009
title: Calendar month view with key-date overlays
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P2
status: Draft
size: M
routes: [/calendar]
dependsOn: [US-WRK-007, US-XDT-002, US-REN-004]
---

## Story

As an Account Manager, I want a month view that can also show Term expirations for open Renewals and X-dates in my scope, so that I see the busy weeks of the month before they arrive.

## Acceptance criteria

- Given I switch to Month, when it renders, then each day cell lists up to 3 items (Meetings first, then timed Tasks, then untimed Tasks) with "+4 more" opening a day popover.
- Given the "Show" menu, when I turn on "Renewal expirations", then each open Renewal in the viewer's scope appears on its Term's expiration date as "Renewal: Torres Household · Home", linking to `/renewals/:id` (US-REN-004).
- Given I turn on "X-dates", when the month renders, then each X-date in scope appears on its date as "X-date: Auto · Gulf Harbor Insurance · $1,860", opening the X-date drawer at `/x-dates?xdate=:id` (US-XDT-002).
- Given overlays are on, when they render, then they are visually distinct from Tasks and cannot be completed or dragged; the toggles persist per user in local storage.
- Given I click a day number, when the view changes, then it opens that day in Day view.

## UI states

- Empty: a month with nothing shows the grid with "Nothing scheduled in November."
- Loading: grid first, items fade in.
- Error: "Couldn't load renewals for this month." under the toolbar if only an overlay fails; Tasks still show.
- No permission: overlays follow scope; a Producer sees Renewal expirations on their Book only (Renewal is R for Producers); Admins see all.
- Overflow: a day with 14 Renewal expirations shows 3 and "+11 more"; the popover lists all with scroll.

## Design notes

- Six-week grid, day cells with the number top-left (13px), today's number in a primary-blue circle; overlay items use a small dot plus text (warning dot for Renewal expirations, purple dot for X-dates), never filled blocks.
- "Show" is an outline button with a checkbox menu.

## FE notes

- `MonthGrid` in `CalendarPage`; overlays from `selectOpenRenewalsByExpiration(range, viewer)` and `selectXDatesInRange(range, viewer)`; toggles in `localStorage` key `fortify.calendar.overlays`, read and written in try/catch.

## Mock data

- About 150 open Renewals and 250 X-dates spread so that one week in the visible month has 14 Renewal expirations on one day.
