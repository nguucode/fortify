---
id: US-INB-002
title: Email conversation view
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/inbox]
dependsOn: [US-INB-001]
---

## Story

As an Account Manager, I want to read an email conversation with its Account, related records, and attachments in context, so that I can answer without opening the Account in another tab.

## Acceptance criteria

- Given I open an email conversation, then the reading pane header shows the subject, participants, the linked Account as a link to /accounts/:id, and chips for related records (Policy number, Service Request, Renewal, Opportunity) that link to their record pages.
- Messages show oldest to newest; when there are more than 3, the older ones collapse to one line each ("Ana Torres · 11/02/2026 · Thanks, we got the ID cards…") and expand on click. Quoted text is hidden behind "Show quoted text".
- Each message shows sender, To and Cc, time, direction (inbound or outbound), and attachments as rows with file name and size ("ID-cards-2026.pdf · 184 KB"); opening an attachment shows "File preview isn't available in the demo."
- Given the conversation is linked to an Account, then each message shows "Logged to Activity" with a link to the Account's Activity tab; given it is unmatched, the header shows the "Unmatched" banner from US-INB-007.
- Given I open an unread conversation, then it is marked read for me only, and the unread counts in the list and tabs drop by one.
- The header actions are Reply (US-INB-005), Mark done and Assign (US-INB-010), and a More menu with Mark unread, Create Task, and Create Service Request (US-INB-008).

## UI states

- Empty: a conversation with no messages cannot exist; a deleted attachment reference shows "Attachment unavailable" in muted.
- Loading: header skeleton plus 3 message skeletons.
- Error: "Couldn't load this conversation." with Retry inside the pane; the list stays usable.
- No permission: Create Service Request follows the role rules in US-INB-008; out-of-scope conversations follow US-INB-001.
- Overflow: 20 or more participants show the first 3 and "+17"; a 40-message thread collapses all but the last 3; long unbroken strings wrap.

## Design notes

- Message blocks: white surface separated by 1px hairlines, no bubble styling for email; sender 14/600, metadata 13px muted, body 14/21 at a max line length of 72ch.
- Header actions as small outline buttons; Reply is the only blue button in the pane.

## FE notes

- `EmailThread` component; body is plain text from the mock rendered with line breaks, never as HTML.
- `conversations.markRead(id, me)` on open, debounced 500ms so quickly arrowing through rows with J and K doesn't mark everything read.

## Mock data

- One thread with 12 messages and 3 attachments; one with 24 Cc addresses; one inbound email from the Torres Roofing LLC office manager linked to a Certificate request.
