---
id: US-WRK-002
title: Log an Activity
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/accounts/:id, /contacts/:id, /tasks]
dependsOn: [US-WRK-001]
---

## Story

As a Producer, I want to log a call, email, SMS, meeting, or note against an Account and optionally one of its records in a few seconds, and set a follow-up Task in the same step, so that the history is complete and nothing I promised is forgotten.

## Acceptance criteria

- Given I click "Log activity" on an Account, Contact, or record page, when the drawer opens, then the Account (and the record, if opened from one) is prefilled, and I pick a type: Call, Email, SMS, Meeting, or Note (default Call).
- Given type Call, when the form renders, then it shows Contact (from the Account's Contacts), Direction (Outbound, Inbound), Outcome (Connected, Left voicemail, No answer), Duration in minutes, Date and time (default now), and Notes; Email and SMS show Contact, Direction, Subject (email only), and Body; Meeting shows Contacts, Date and time, Duration, and Notes; Note shows only the text.
- Given "Linked to", when I open it, then it lists the Account's Policies, open and recent Opportunities, Renewals, and Service Requests by label (e.g. "Policy AU-2209341 · Auto"), and linking is optional.
- Given I check "Add follow-up task", when I save, then a Task is created with title "Follow up with Mike Torres", due in 2 business days by default (editable), assigned to me, and linked to the same record.
- Given I save, when the store updates, then the entry appears at the top of every timeline in scope, the drawer closes, and a toast reads "Call logged". There is no undo or delete; a note can be corrected for 24 hours (US-WRK-003).
- Given the Contact's phone number has SMS consent Opted out, when I pick type SMS and that Contact, then a warning reads "Ana Torres opted out of SMS on (555) 010-2231. Log this only if the message was inbound." and Direction locks to Inbound.

## UI states

- Empty: an Account with no Contacts lets me log without a Contact; the Contact field reads "No contacts on this account".
- Loading: "Saving…" on the primary button.
- Error: "We couldn't log this activity. Your notes are kept." with Retry.
- No permission: Activity is C for all roles in scope; on an Archived Account, "Log activity" is hidden; a future date over 1 day ahead is rejected with "Activities record what already happened. Create a task instead."
- Overflow: Notes accept up to 5,000 characters with a counter after 4,500.

## Design notes

- 480px drawer titled "Log activity"; type as a segmented control with icons at the top; fields change below without moving the drawer header.
- Keyboard: ⌘Enter saves; the drawer opens with focus in Notes when the type is Note.

## FE notes

- `LogActivityDrawer` with props `{ accountId, linked?, contactId?, defaultType? }`; action `logActivity(input)` plus optional `createTask` in the same transaction.
- No undo or delete action exists for Activities (roles.md).

## Mock data

- Torres Household Contacts with Ana Torres opted out of SMS; linkable records across Policies, one Renewal, one Opportunity, and two Service Requests.
