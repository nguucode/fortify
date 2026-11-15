---
id: US-INB-005
title: Compose and reply by email (simulated)
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/inbox]
dependsOn: [US-INB-002, US-SET-007, US-WRK-002]
---

## Story

As an Account Manager, I want to reply or write a new email from a template with the Account's details filled in, so that routine answers take seconds and land in the Account's Activity.

## Acceptance criteria

- Given I click Reply on an email conversation, then a composer opens under the last message with To prefilled with the sender, Subject "Re: {subject}", and my signature; "+ New email" opens the same composer in a 640px modal with an empty To.
- Fields: From (my address, read-only, "marisol.reyes@example.com"), To and Cc (Contact picker that also accepts typed addresses; each becomes a chip), Subject, Body (plain text), and Attach from Documents (pick from the linked Account's Documents tab; no upload).
- A Template menu lists the email templates from Settings (for example "ID card request received", "Renewal review: let's talk", "Certificate issued"); choosing one fills Subject and Body and resolves merge fields {{contact.firstName}}, {{account.name}}, {{policy.number}}, {{renewal.expirationDate}}, {{user.name}} from the linked records.
- Given a merge field cannot be resolved, then it stays highlighted in the body and Send is blocked with "Fill in {{policy.number}} or remove it."
- Given I click Send, then the message is added to the conversation with "Sent (simulated)", an Activity of type Email is logged on the linked Account, and a toast reads "Email saved to Torres Household. Nothing was delivered: this is a demo." No message leaves the browser.
- Given I close a composer with text in it, then a confirm asks "Discard this draft?"; an unsent reply draft survives switching conversations until reload.

## UI states

- Empty: a template list with no templates shows "No templates yet. Admins add them in Settings."
- Loading: Send shows a spinner and disables the composer for the mock latency.
- Error: a failed send keeps the draft and shows "Couldn't save the email. Try again." above the Send button.
- No permission: every role can email within its scope (sending logs an Activity, which every role can create); Contacts outside my scope don't appear in the picker.
- Overflow: To with 10 or more chips collapses to "Ana Torres, Mike Torres +8"; the body accepts up to 20,000 characters with a counter after 18,000.

## Design notes

- Inline composer: white surface with ring, 8px radius, field rows 36px with 13px labels; Send is the primary button at the bottom right, Template and Attach are outline buttons on the left.
- A muted 13px line above the buttons reads "Demo: emails are saved to Activity, not sent."

## FE notes

- `EmailComposer` used in reply and modal mode; drafts in a session store keyed by conversationId.
- `emails.send(draft)` appends a `messages` row with `simulated: true` and calls the WRK Activity action when the conversation has an Account. A new email to a Contact with no conversation creates one.
- Templates read from the SET Epic's templates store; merge resolution is a pure function with unit tests for resolved, missing, and unknown fields.

## Mock data

- 6 email templates using the five merge fields; one Contact with no email address (the picker shows "No email on file"); the Account with no Contact for the "no To" case.
