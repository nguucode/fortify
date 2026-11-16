---
id: US-WRK-001
title: Activity timeline component
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/accounts/:id, /contacts/:id]
dependsOn: [US-FND-005]
---

## Story

As an Account Manager, I want one Activity timeline, the same everywhere, that shows calls, emails, SMS, meetings, notes, and system events in date order with filters, so that the history of an Account or any of its records reads the same way on every page.

## Acceptance criteria

- Given a scope (an Account with or without its child records, a Contact, or one linked record such as a Policy, Opportunity, Renewal, or Service Request), when the timeline renders, then it lists matching Activities newest first, grouped under day headers "Today", "Yesterday", then MM/DD/YYYY.
- Given an entry, when it renders, then it shows a type icon, a bold first line (e.g. "Call with Mike Torres · Connected · 12 min", "Email to Ana Torres: Your renewal quote"), a muted second line (logged by, time like "2:45 PM", and a chip for the linked record, e.g. "Renewal · Home 12/04/2026"), and the body clamped to 3 lines with "Show more".
- Given system events (Lead qualified, Opportunity stage changed, Quote presented, Opportunity won, Term bound, Renewal created, Renewal decided, Service Request status changed, Task completed, Account reassigned), when they render, then they use a compact one-line style with a gear icon and no body, and the "Hide system events" toggle removes them.
- Given the type filter chips All, Calls, Emails, SMS, Meetings, Notes, and System, when I choose one or more, then only those types show, and the choice persists per page in the URL (`?types=call,note`).
- Given more than 25 entries, when I reach the end, then "Show older activity" loads the next 25 without losing scroll position.
- Given compact mode (used on Overview tabs), when it renders, then it shows the latest N entries without filters or day headers, with a "View all activity" link.

## UI states

- Empty: "No activity yet." in default mode, plus a scope-specific hint passed in by the host page, e.g. "Log a call, email, or note to start the history."
- Loading: 5 skeleton entries (icon circle, two text bars).
- Error: "Couldn't load activity. Retry." in place of the list; filters stay usable.
- No permission: Activities outside the viewer's scope are never returned; on a Contact page the timeline omits entries from Accounts the viewer can't see and shows "3 entries on accounts outside your access are hidden."
- Overflow: Accounts with 400 or more entries page at 25; long subjects truncate to one line with a tooltip; an email body with a 2,000-character thread clamps to 3 lines.
- Filtered: no entries for the chosen types shows "No calls or notes in this history." with "Clear filters".

## Design notes

- Vertical list on the canvas, no card per entry: a 24px type icon in a recessed circle on a 1px hairline rail, text to the right; 12px gap between entries, 24px before each day header (13px, text-label, 500).
- Icons only, no status color, except call outcome "No answer" in muted text and inbound vs outbound shown as a small arrow next to the icon.
- Linked record chip is a neutral text link with the record's type label, not a colored pill.
- An edited note shows "Edited" in muted text after the time.

## FE notes

- `ActivityTimeline` props: `scope: { accountId?, includeChildren?, contactId?, linked?: { kind, id } }`, `compact?: boolean`, `limit?: number`, `emptyHint?: string`, `hideFilters?: boolean`.
- Selector `selectActivities(scope, user, { types, hideSystem, cursor })` returns pages of 25; scope filtering by `canSeeAccount` per entry.
- Activity entity: `{ id, accountId, type: 'call'|'email'|'sms'|'meeting'|'note'|'system', direction?, subject, body?, occurredAt, durationMinutes?, callOutcome?: 'Connected'|'Left voicemail'|'No answer', contactIds[], linked?, systemEvent?, createdById, editedAt? }`.
- Store mutations elsewhere (Qualify, Won, reassign, Task completion) call `logSystemActivity(code, payload)`; the timeline subscribes to the store so new entries appear without reload.
- Reused by ACC (Account Overview and Activity tabs, Contact page) and by POL, PIP, REN, SRV record pages.

## Mock data

- About 5,000 Activities: 35% calls, 25% emails, 10% SMS, 5% meetings, 15% notes, 10% system events, spread over the last 18 months as day offsets.
- Torres Household has about 140, including every system event code above; one email with a very long body; one Contact-scoped mix across 2 Offices.
