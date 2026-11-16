---
id: US-HOM-006
title: "My day: Tasks due and today's meetings"
epic: HOM
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-WRK-006]
---

## Story

As any Fortify user, I want my overdue and due-today Tasks and today's Meeting Tasks in one side panel, so that I can work them off without opening Tasks or Calendar.

## Acceptance criteria

- Given I open Today, when "My day" loads, then the Tasks section lists my Open Tasks due today or earlier: overdue first (oldest due first), then due today by time, at most 8 rows, with the total in the count pill.
- Each Task row shows a completion checkbox, the subject, the related record muted under it ("Torres Household · Renewal"), and the due label: "Overdue 3d" in danger text or "Due 2:00 PM".
- Given I tick a Task's checkbox, then the Task moves to Done, the row strikes through, and a toast "Task completed. Undo" shows for 5 seconds; Undo reopens the Task. When the Undo window closes, the Activity is logged on its Account ("Task completed: Call about wind mitigation") and the row leaves the list.
- The Meetings section lists my Open Tasks of type Meeting due today, by due time (there is no separate event object), and the Tasks section excludes them, ("10:30 AM · Annual review · Torres Household"); a past event is muted; the next upcoming event shows "Next" as a neutral pill.
- Given I click a Task subject, then I go to its related record; "View all" in each section goes to /tasks (My open) and /calendar (Day view).
- X-date Tasks created by the timing rule (45 or 90 days before the X-date) appear here like any other Task.

## UI states

- Empty: "Nothing due today." in the Tasks section and "No meetings today." in Meetings; both empty show the two lines, not a single combined message.
- Loading: 4 skeleton rows per section.
- Error: each section errors independently with "Couldn't load Tasks." or "Couldn't load meetings." and Retry.
- No permission: all roles can complete their own Tasks; a Task assigned to someone else never appears here.
- Overflow: subjects truncate at one line with a tooltip; more than 8 Tasks shows "+12 more" linking to /tasks.

## Design notes

- Side column card, two sections divided by a 1px hairline, each with a 14/600 section label.
- Checkbox 16px with 4px radius; the done row uses text-muted with a line-through.
- Times use 12-hour US format with AM/PM; overdue uses danger text with no background.

## FE notes

- Queries `tasks.list({ assigneeId: me, status: 'Open', dueBefore: endOfToday, sort: 'due', limit: 8 })` and `tasks.list({ assigneeId: me, type: 'Meeting', dueOn: today, sort: 'dueTime' })`.
- Completion calls the store action `tasks.complete(id)` (WRK Epic), which writes the Activity after the 5-second Undo window; Undo calls `tasks.reopen(id)` and no Activity is written. Optimistic update, rolled back with an error toast if the call fails.

## Mock data

- Every persona has 3 overdue Tasks (one 9 days overdue), 4 due today, and 2 or 3 Meeting Tasks today, one already past.
- One Task linked to an Account whose name is 70 characters long.
