---
id: US-INB-003
title: SMS conversation view with consent status
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/inbox]
dependsOn: [US-INB-001]
---

## Story

As an Account Manager, I want to read a text conversation with the Contact's SMS consent shown on top, so that I never text someone who opted out.

## Acceptance criteria

- Given I open an SMS conversation, then messages show as a timeline grouped by day ("Today", "Yesterday", "11/03/2026"), inbound on the left and outbound on the right, each with its time and, for outbound, a delivery label ("Sent (simulated)").
- A consent bar under the header shows one of: "Opted in · Verbal on call, 10/02/2026 by Marisol Reyes" (success icon), "Opted out · Replied STOP on 11/03/2026" (danger icon), or "No SMS consent recorded" (warning icon).
- Given an inbound message is exactly STOP, UNSUBSCRIBE, CANCEL, END, or QUIT (any case), then the Contact's consent for that phone becomes Opted out and a system line reads "Ana Torres replied STOP. Texting is off for (555) 010-2290."
- Given an inbound message is START or UNSTOP after an opt-out, then consent becomes Opted in with source "Replied START" and a matching system line.
- Inbound images show as a placeholder tile "Image · 1 attachment" with "File preview isn't available in the demo."
- Header, related record chips, Logged to Activity, and mark-read behavior match US-INB-002.

## UI states

- Empty: not possible; a conversation always has at least one message.
- Loading: header skeleton plus 6 bubble skeletons alternating sides.
- Error: "Couldn't load this conversation." with Retry.
- No permission: same as US-INB-002.
- Overflow: a 1,600-character message wraps inside a bubble capped at 70% of the pane; a phone shared by 2 Contacts shows both names with "Shared number".

## Design notes

- Bubbles: inbound in recessed, outbound in white with a ring; 12px radius; no blue bubbles, because blue is reserved for the primary action.
- Consent bar: 36px, white with ring, icon plus 13px label; consent color only on the icon and label text, never as a filled bar.

## FE notes

- `SmsThread` component; consent read from the Contact's phone record (`phones[].smsConsent: { status: 'opted_in' | 'opted_out' | 'unknown', source, at, byUserId }`).
- STOP and START handling is a mock store rule applied when the seeded inbound messages arrive (US-INB-011) and at seed time.

## Mock data

- One Contact Opted in, one Opted out by STOP on 11/03/2026, one with no consent recorded, one who replied STOP then START, and one phone shared by two Contacts in the same Household.
