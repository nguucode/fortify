---
id: US-WRK-011
title: Mention a teammate in a note
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-WRK-002, US-FND-008]
---

## Story

As an Account Manager, I want to @mention a teammate in a note I log on an Account, so that the Producer sees the hand-off without me sending a separate message.

## Acceptance criteria

- Given I am writing a note in the Log Activity composer, when I type "@", then a picker lists only users who can see this Account under roles.md scope, filtered as I type, showing avatar, name, role, and Office.
- Given I pick "Dana Whitfield", when the note is saved, then the text shows "@Dana Whitfield" as a token linked to that user, and the Activity stores `mentions: [userId]`.
- Given a saved note mentions Dana Whitfield, then Dana gets an unread item in Inbox › Mentions (US-INB-009) and a notification of type Mention (US-FND-008). The author is never notified of their own mention.
- Given I type "@" and the person I want cannot see the Account, then they are not offered, and the picker's footer reads "Only people who can see this account can be mentioned."
- Given I edit my note within 24 hours and remove a mention, then the mention is withdrawn: it disappears from that user's Mentions list. Adding a mention during an edit notifies the new user once.

## UI states

- Empty: if no teammate can see the Account, the picker shows "No one else can see this account."
- Loading: the picker shows three skeleton rows while the user list loads.
- Error: "Couldn't load teammates. Type the note without a mention or try again." The note text is kept.
- No permission: Admin can log notes and mention as usual. Nobody can mention a user who is outside the Account's scope.
- Overflow: long names truncate in the picker with a tooltip. A note can mention at most 5 users; after that the picker shows "Up to 5 mentions per note."

## Design notes

- The picker is a popover anchored to the caret: 280px wide, at most 6 rows at 36px each. The highlighted row is in recessed fill, and arrow keys plus Enter select.
- In the saved note, the mention token is link-colored text with medium weight, with no pill or background, in keeping with the restrained color strategy.

## FE notes

- This extends the `ActivityComposer` from US-WRK-002 with a `MentionInput`: a textarea with a "@" trigger and a Radix Popover listbox, accessible through `aria-activedescendant`.
- The candidate list comes from the `selectUsersWithAccess(accountId)` selector, which applies roles.md scope.
- On save, `activities.create` and `activities.updateNote` accept `mentions: string[]`. The store emits `mention.created` and `mention.withdrawn`, which Inbox (US-INB-009) and Notifications (US-FND-008) consume.

## Mock data

- Seeded notes with mentions, for example Marisol Reyes mentioning Dana Whitfield on Torres Roofing LLC ("@Dana Whitfield client wants umbrella quote before 12/01").
- One Account in Tampa where a Houston user would be out of scope, to exercise the filtered picker.
