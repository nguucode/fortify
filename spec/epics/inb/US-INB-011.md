---
id: US-INB-011
title: Unread badge and simulated new messages
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P2
status: Done
size: S
routes: [/inbox]
dependsOn: [US-INB-001, US-FND-001, US-FND-008]
---

## Story

As an Account Manager, I want the sidebar to show how many conversations are waiting for me and new messages to appear while I work, so that I notice an urgent text without refreshing.

## Acceptance criteria

- Given I have unread conversations assigned to me, then the Inbox item in the sidebar shows a count pill ("7"; "99+" above 99); with none, no pill.
- After the app loads, three seeded inbound messages arrive for the current View as user at about 30 seconds, 2 minutes, and 5 minutes; each prepends its conversation to the list with a 2-second recessed highlight and raises a notification "New text from Ana Torres".
- Given the new message arrives while I'm reading that conversation, then it appends to the open thread and is marked read at once; the pill doesn't change.
- Given an arriving message is STOP or START, then the consent rule from US-INB-003 applies; given it lands on a Done conversation, the reopen rule from US-INB-010 applies.
- Given I switch View as, then the timers restart for the new user.

## UI states

- Empty: no seeded arrivals for a user with an empty Inbox; the pill stays hidden.
- Loading: the pill is hidden until the first unread count resolves.
- Error: a failed count query hides the pill; it never shows a stale number.
- No permission: the pill counts only conversations in my scope that are assigned to me.
- Overflow: counts above 99 show "99+".

## Design notes

- Pill per Part B (count pills are the one place pills are used): neutral fill, 12px text, right-aligned in the nav row; in the collapsed 56px rail it becomes an 8px primary dot on the icon.
- No sound, no toast stack; the notification goes to the bell only.

## FE notes

- `inbox.unreadCount(me)` drives the sidebar item through a badge slot that US-FND-001 exposes for nav items.
- Arrival timers live in the mock layer (`mock/scenarios/inboundArrivals.ts`) and respect the Demo controls latency toggle; they stop when the tab is hidden and resume on return.

## Mock data

- 3 scripted arrivals per persona, including one STOP on the Account Manager persona and one reply on a Done conversation.
