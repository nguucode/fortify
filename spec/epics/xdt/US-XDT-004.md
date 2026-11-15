---
id: US-XDT-004
title: Follow-up Task created ahead of each X-date
epic: XDT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/x-dates, /accounts/:id]
dependsOn: [US-FND-005, US-FND-008, US-XDT-002, US-WRK-004]
---

## Story

As a Producer, I want Fortify to give me a Task when an X-date enters its quote window, so that I start quoting the competitor's line on time without checking the list every day.

## Acceptance criteria

- Given an X-date with interest level other than Closed and no Opportunity, when today reaches 45 days before the X-date for a personal line or 90 days before for a commercial line, then a Task is created for the Account's Producer: title "Quote ahead of X-date: Home, Okafor Household (01/14/2027)", due on that day, linked to the Account.
- Given an X-date is saved already inside its window, when the rule runs, then the Task is created with today as the due date.
- Given the X-date's date changes and its Task is still Open, when I save, then the Task's due date moves to match; if the new date is outside the window, the Task is canceled with the note "X-date moved to 06/30/2027" and recreated when the window opens.
- Given the interest level is set to Closed, when I save, then an Open follow-up Task is canceled (not deleted) and the drawer shows "Follow-up canceled".
- Given a Task is created, when it saves, then the Producer gets a notification "X-date in 45 days: Home, Okafor Household" and the X-date row shows "Task due 11/30" linking to the Task.

## UI states

- Empty: X-dates outside their window show "Task on 12/01" in muted text (the future creation date), so the rule is visible.
- Loading: not applicable (rule runs in the store).
- Error: if Task creation fails on save, the X-date still saves and the drawer shows "X-date saved, but the follow-up task couldn't be created. Try again." with a retry.
- No permission: the Task is always assigned to the Account's Producer; an Account Manager who records the X-date does not get the Task.
- Overflow: an Account with 6 X-dates in window gets 6 Tasks; the notification groups them as "6 X-dates entered their quote window today".

## Design notes

- No new screen. The Follow-up field in the X-date drawer and the list column show the Task state as icon plus label: "Open · due 11/30", "Done", "Canceled".

## FE notes

- Pure function `xDateFollowUp(xDate, today)` returns `{ action: 'none' | 'create' | 'reschedule' | 'cancel', dueDate }`, unit-tested for both lead times and the boundaries (day 46, 45, 44).
- Run on store load (so the day-offset mock data produces Tasks on any demo day) and after every `createXDate` / `updateXDate`.
- Tasks use the shared Task shape owned by the WRK Epic (US-WRK-004): `{ accountId, assigneeId, title, type: 'Call', priority: 'Normal', source: 'X-date', dueDate, status: 'Open', linked: { kind: 'X-date', id } }`; cancellations use `cancelReason`. Lead times come from one constant `XDATE_LEAD_DAYS = { personal: 45, commercial: 90 }`.

## Mock data

- X-dates at exactly 45, 46, and 90 days out (personal and commercial); one Closed X-date with a previously canceled Task; an Account with 6 X-dates in window.
