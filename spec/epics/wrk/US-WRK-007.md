---
id: US-WRK-007
title: Calendar week and day view
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/calendar]
dependsOn: [US-FND-001, US-WRK-004]
---

## Story

As a Producer, I want a week calendar of my Meetings and timed Tasks, with untimed Tasks in an all-day row, so that I can plan Meetings with Contacts and calls around what is already due.

## Acceptance criteria

- Given I open `/calendar`, when it loads, then I see the current week (Sunday to Saturday) from 7:00 AM to 7:00 PM in 30-minute rows, with a Day / Week / Month switch, Today, and previous and next arrows; the current time shows as a 1px line across today.
- Given my open Tasks, when the week renders, then Tasks with a due time render as blocks at that time (Meetings sized by duration, other types as 30-minute blocks), and Tasks with only a due date render as chips in the all-day row of that day.
- Given a block, when I click it, then a popover shows title, Account, Linked to, time, Contacts (Meetings), and actions "Complete", "Edit", and "Open account".
- Given I am an Account Manager, when I open "Calendar for", then I can pick any user in my Office; a Principal or Admin can pick any user; a Producer sees only their own calendar.
- Given Done Tasks in the week, when the week renders, then they show with reduced emphasis and a check icon; Canceled Tasks are not shown.
- Given I switch to Day, when it renders, then the same rules apply for one day with blocks at full width and the date in the URL (`/calendar?view=day&date=2026-11-18`).

## UI states

- Empty: a week with nothing scheduled shows the grid with a muted centered line "Nothing scheduled this week." and "+ New meeting".
- Loading: the grid renders immediately; blocks fade in when loaded (opacity only, 150ms).
- Error: "Couldn't load the calendar. Retry." banner above the grid.
- No permission: Tasks on Accounts outside the viewer's scope are not shown even when viewing a teammate; "Calendar for" is hidden for Producers.
- Overflow: 4 or more overlapping blocks show 3 side by side and "+2" that opens a list popover; more than 3 all-day chips show "+5 more"; a block at 6:30 PM with 90 minutes clips at the grid end with an arrow.

## Design notes

- Full-width grid on a white surface with ring and 8px radius; hour lines in hairline, half-hour lines lighter; 13px time labels in text-muted at left.
- Meeting blocks: info-tint background with info text and a 2px left stripe in primary blue; other Task types: recessed background with default text; overdue untimed chips in danger text with an alert icon.
- Toolbar: H1 "Calendar", then the date range "Nov 15 – 21, 2026" (16/500), arrows, Today, the view switch, "Calendar for" select, and blue "+ New meeting".

## FE notes

- Route `/calendar`, `CalendarPage` with `view` and `date` in the URL; `WeekGrid` and `DayGrid` built on CSS grid, no calendar library.
- Selector `selectCalendarTasks(userId, range, viewer)`; overlap layout computed per day with a simple column-packing pass.
- Popover actions call `completeTask` (US-WRK-006) and open `TaskDrawer` (US-WRK-005).

## Mock data

- The Producer demo user has 6 Meetings and 9 timed Calls this week, one triple overlap on Wednesday at 10:00 AM, and 7 untimed Tasks; dates as offsets from today.
