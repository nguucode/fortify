---
id: US-INB-001
title: Inbox layout and conversation list
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/inbox]
dependsOn: [US-FND-001, US-FND-005, US-FND-006]
---

## Story

As an Account Manager, I want one list of the email, SMS, and call conversations in my scope, newest first with unread ones marked, so that I answer Accounts from one place instead of three tools.

## Acceptance criteria

- Given I open /inbox, then the page shows a conversation list on the left and a reading pane on the right; channel tabs above the list read All, Email, SMS, Calls, Mentions, each with an unread count.
- A scope control offers "Assigned to me" (default for every role), "My Book" (Producer), "My Office" and "Unmatched" (Account Manager, Principal, Admin), and "All" (Principal and Admin, scoped by the top bar Office). A status control switches Open (default) and Done.
- Each row shows the channel icon, the Contact name (or the raw address or phone, "(555) 010-4417", when unmatched), the linked Account muted, a one-line subject or snippet, and the time ("9:42 AM" today, "Yesterday", or MM/DD/YYYY). Unread rows show a blue dot and 600-weight name.
- Rows are sorted by last message time, newest first; 50 load at a time with a "Load 50 more" button at the end.
- The search box ("Search messages") matches Contact name, email, phone, subject, and message body within the current scope.
- Given I select a row, then the URL becomes /inbox?c={conversationId}, the reading pane opens it, and reload or Back restores the same selection; J and K move to the next and previous conversation.

## UI states

- Empty: "No open conversations assigned to you." with a "Show Done" link; an empty Unmatched view reads "Every conversation is linked to an Account." The reading pane with nothing selected reads "Select a conversation."
- Loading: 10 skeleton rows at 64px; the reading pane shows a skeleton header.
- Error: "Couldn't load the Inbox." with Retry in the list; the reading pane hides.
- No permission: a ?c= link to a conversation outside my scope shows the access-denied panel from US-FND-006 inside the reading pane, naming the Account's Account Manager, with "Request access" (mock).
- Overflow: Contact names and subjects truncate at one line with a tooltip; unread counts above 99 show "99+".
- Filtered: a search with no hits reads "No conversations match "{query}"." with a "Clear search" link; the meta line under the toolbar reads "Showing 50 of 312 conversations".

## Design notes

- Full-height layout under the top bar: list pane 400px fixed, reading pane fills the rest, divided by a 1px hairline; no page H1, the channel tabs act as the header.
- Toolbar per Part B above the list: search input (36px) and the scope and status controls as 36px outline buttons with menus; the primary "+ New email" button sits at the top right of the reading pane (US-INB-005).
- Rows are 64px (two lines), hover recessed, selected row in recessed with a 2px primary inset bar on the left. Channel icons at 16px in text-label.

## FE notes

- Route `/inbox` renders `InboxPage` with `ConversationList` and `ReadingPane`; selection lives in the `c` query parameter (the sitemap defines no separate conversation route).
- Query `conversations.list({ scope, channel, status, q, officeId?, cursor, limit: 50 })` against new mock entities `conversations` and `messages`; unread is per user (`unreadBy: userId[]`).
- Keyboard handlers are inactive while focus is in a text field.

## Mock data

- `conversations` (about 350) and `messages` (about 1,200) collections, per rules.md (Inbox): email 55%, SMS 30%, call 15%; 12% unmatched.
- Marisol Reyes has 18 open conversations assigned, 7 unread; one Contact name 70 characters long; one unmatched conversation from (555) 010-4417.
