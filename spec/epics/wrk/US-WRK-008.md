---
id: US-WRK-008
title: Schedule a Meeting from the Calendar
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/calendar]
dependsOn: [US-WRK-005, US-WRK-007]
---

## Story

As a Producer, I want to click an open slot on my calendar to schedule a Meeting with an Account's Contacts, so that booking a policy review takes one click and one short form.

## Acceptance criteria

- Given the week or day view, when I click an empty 30-minute slot, then the Task drawer opens with Type Meeting, the slot's date and start time, and a 30-minute duration prefilled; dragging across slots before releasing sets the duration (e.g. 10:00 to 11:30 AM sets 90 minutes).
- Given the Meeting form, when I pick an Account, then a Contacts field lists that Account's Contacts and a Location field accepts free text such as "Agency office, Houston" or "Phone"; title defaults to "Meeting with <primary Contact>".
- Given I save, when the store updates, then the block appears on the calendar at that time and the Meeting appears in the Account's open Tasks.
- Given the new Meeting overlaps another of my timed Tasks, when I save, then a warning reads "This overlaps Call Ana Torres at 10:00 AM." and I can still save.
- Given I complete the Meeting after it happens, when I complete it (US-WRK-006), then a Meeting Activity is logged with its Contacts and duration.

## UI states

- Empty: an Account without Contacts shows "No contacts on this account" in the Contacts field; the Meeting still saves.
- Loading: "Saving…" on the primary button; the tentative block shows dashed in the grid until saved.
- Error: the tentative block disappears and the drawer shows "We couldn't schedule this meeting. Try again."
- No permission: Task is C for all roles in scope; when viewing a teammate's calendar, a new Meeting is assigned to that teammate by default with a note "Scheduling for Dana Whitfield".
- Overflow: Meetings up to 8 hours; longer durations are rejected with "Meetings can be up to 8 hours."

## Design notes

- The tentative block uses the Meeting style with a dashed ring while the drawer is open; the drawer is the same 480px Task drawer with Meeting fields visible.

## FE notes

- Slot click and drag handled in `WeekGrid`/`DayGrid` via pointer events snapped to 30 minutes; opens `TaskDrawer` with `{ type: 'meeting', dueDate, dueTime, durationMinutes, assigneeId }`.
- Meeting extends the Task entity with `contactIds[]` and `meetingLocation`; there is no separate Event object.

## Mock data

- Free slots on the demo week; one existing Call at 10:00 AM Wednesday for the overlap warning.
