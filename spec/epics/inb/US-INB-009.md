---
id: US-INB-009
title: Mentions in the Inbox
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/inbox]
dependsOn: [US-INB-001, US-FND-008, US-ACC-008, US-WRK-011]
---

## Story

As a Producer, I want every note where a teammate @mentioned me in one list, so that a hand-off from service doesn't sit unread on an Account I wasn't looking at.

## Acceptance criteria

- Given I open the Mentions tab, then it lists Activity notes that @mention me, newest first: author avatar and name, "mentioned you on Torres Roofing LLC", a two-line excerpt with my name highlighted, and the time.
- Unread mentions show the blue dot; the tab count is my unread mentions.
- Given I click a mention, then it is marked read and I go to the source record's Activity tab with the note scrolled into view (/accounts/:id on the Activity tab, or the Opportunity, Renewal, or Service Request record that holds the note).
- "Mark all as read" marks every mention in the list read after a confirm when there are more than 10.
- A new mention also raises a notification in the Notifications panel (US-FND-008); reading it in either place marks it read in both.

## UI states

- Empty: "No mentions yet. When someone @mentions you in a note, it shows up here."
- Loading: 8 skeleton rows.
- Error: "Couldn't load mentions." with Retry.
- No permission: a mention on a record I can no longer see (Account reassigned out of my Book) shows the excerpt in muted with "You no longer have access to this record" and is not clickable.
- Overflow: excerpts clamp at 2 lines; an author name over 30 characters truncates with a tooltip.
- Filtered: an "Unread only" toggle; with no unread it reads "You're all caught up."

## Design notes

- Uses the conversation list row grammar (64px, two lines) so the tab doesn't feel like a different product; the reading pane is replaced by the record page on click.

## FE notes

- Query `mentions.list({ userId: me, unreadOnly? })` against a new `mentions` collection `{ id, activityId, authorId, mentionedUserId, recordRef, excerpt, createdAt, readAt }`.
- Writing @mentions in notes belongs to the WRK Epic; this story only reads them. `mentions.markRead` also updates the matching notification.

## Mock data

- About 120 mentions; Dana Whitfield has 6, 3 unread, one on an Account that was reassigned away from her.
