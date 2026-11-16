---
id: US-FND-008
title: Notifications panel
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/today]
dependsOn: [US-FND-002, US-FND-005]
---

## Story

As a Producer, I want a notifications panel that tells me when a Lead is assigned to me, a Task is due, or a Renewal turns at risk, so that I act on time-sensitive work without watching every list.

## Acceptance criteria

- Given unread notifications, then the bell shows a count pill (1 to 99, then "99+"), and the button's accessible name is "Notifications, 7 unread".
- Given I open the panel, then I see tabs All and Unread, newest first, grouped Today, Yesterday, and Earlier, each item with an icon, a bold first line, a muted second line, and a relative time ("2h ago", or MM/DD/YYYY after 7 days).
- Given notification types, then the mock produces: Lead assigned to you, Task due today, Task overdue, Renewal at risk (High), Service Request assigned to you, Certificate needs review (Principal only), and X-date follow-up due (Producer only; raised when the follow-up Task is created, 45 days ahead for personal lines and 90 for commercial).
- Given I click an item, then it is marked read, the panel closes, and the linked record opens, for example `/renewals/R-2201`.
- Given I click "Mark all as read", then every item in the current tab is marked read and the count clears.
- Given I switch View as, then the panel shows that user's notifications only.

## UI states

- Empty: "You’re all caught up" with a muted line "New assignments and due Tasks show up here."
- Loading: 4 skeleton items for the first open; later opens show cached items immediately.
- Error: "Notifications couldn’t load." with Try again inside the panel.
- No permission: a notification whose record is now out of scope opens the access-denied page (US-FND-006).
- Overflow: the panel scrolls after 8 items; titles clamp to 2 lines; an unread count over 99 shows "99+".

## Design notes

- Bell is a 32px icon button; the count pill is a neutral-on-blue pill (counts are the one place pills are allowed).
- Panel: 400px Radix Popover, 12px radius, popover shadow, max height 560px.
- Item: 56px, 8px unread blue dot on the left, entity icon at 50% opacity, title 14/500, second line 13 muted; hover recessed.
- Header row: "Notifications" 16/500, tabs, and a text button "Mark all as read".

## FE notes

- `src/shell/Notifications.tsx`; `api.list('notification', { userId })` and `api.mutate('markNotificationsRead', ids)`.
- The generator creates about 40 notifications per preset user with day offsets, so the demo always has items from today.
- Live region announces new count only on change after a mutation, not on every render.

## Mock data

- Per preset user: 7 unread, 30 read, spread over 14 days; one notification pointing to a record outside the user's scope; one with a 120-character title.
