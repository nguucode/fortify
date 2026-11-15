---
id: US-INB-006
title: Reply by SMS with a consent guard (simulated)
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/inbox]
dependsOn: [US-INB-003, US-SET-007]
---

## Story

As an Account Manager, I want to text a reply only when the Contact has agreed to texts and at a reasonable hour, so that the agency stays clear of TCPA complaints.

## Acceptance criteria

- Given an SMS conversation, then a composer at the bottom of the pane has a text box, a Template menu (SMS templates from Settings), and a counter ("142 / 160 · 1 segment"; 161 to 306 characters reads "2 segments").
- Given consent is Opted out, then the composer is disabled with the text "Ana Torres replied STOP on 11/03/2026. Texting is off."
- Given consent is No SMS consent recorded, then the first Send asks me to confirm "Ana Torres agreed to receive texts" with a source (Verbal, Written, Web form); confirming records Opted in with today's date and my name, then sends.
- Given the Contact's local time is outside the texting window for the Account's state (TX: 9:00 AM to 9:00 PM, Sundays from noon; FL: 8:00 AM to 8:00 PM; elsewhere the federal TCPA 8:00 AM to 9:00 PM), using the state and ZIP time zone, then Send asks "It's 9:42 PM for Ana Torres. Send anyway?"
- Given I send, then a bubble appears with "Sent (simulated)", an Activity of type SMS is logged on the linked Account, and nothing is delivered.

## UI states

- Empty: the composer placeholder reads "Text Ana Torres".
- Loading: Send shows a spinner for the mock latency.
- Error: a failed send leaves the text in the box and marks the bubble "Not sent. Retry".
- No permission: every role can text within its scope; a conversation outside my scope follows US-INB-001.
- Overflow: messages are capped at 918 characters (6 segments); the counter turns warning at 800.

## Design notes

- Composer docked at the pane bottom, white with a top hairline, textarea grows to 6 lines; Send is the primary button.
- The disabled state keeps the consent bar from US-INB-003 visible above it, so the reason sits in two places.

## FE notes

- `SmsComposer`; segment count uses 160 characters for one GSM-7 segment and 153 for each segment after that (UCS-2 is out of scope).
- Time zone from the Account's state and ZIP: Central for TX, Eastern for FL except the western Panhandle ZIPs (Central).
- `sms.send(...)` and `contacts.recordSmsConsent(...)` are store actions; consent changes also log a system Activity.

## Mock data

- Reuses the consent cases from US-INB-003; one Tampa FL Contact and one Pensacola FL Contact (Central) to test the 8:00 PM FL cutoff, and one Houston TX Contact for the Sunday-before-noon case.
