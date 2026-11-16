---
id: US-INB-004
title: Log a call and view call entries
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/inbox]
dependsOn: [US-INB-001, US-WRK-002, US-WRK-005]
---

## Story

As an Account Manager, I want to log a call in a few fields and see past calls with their outcome, so that the next teammate who talks to the Account knows what was said.

## Acceptance criteria

- Given I click "Log a call" in the Inbox toolbar or in a conversation's More menu, then a side panel opens with: Contact (search, required), Account (filled from the Contact; required choice when the Contact belongs to more than one Account), Direction (Inbound, Outbound), Date and time (default now), Duration (mm:ss), Outcome (Connected, Left voicemail, No answer, Wrong number), Notes, and Related record (Policy, Opportunity, Renewal, or Service Request on that Account, optional).
- Given Outcome is Connected, then Notes is required (1 to 2,000 characters); for other outcomes it is optional.
- A "Create follow-up Task" checkbox adds a due date field defaulting to 2 business days out at 5:00 PM.
- Given I save, then a call conversation is created in the Calls tab, an Activity of type Call is logged on the Account, the follow-up Task is created if checked, and a toast reads "Call logged to Torres Household."
- Given I open a call entry, then the reading pane shows direction, outcome, duration ("4m 12s"), who logged it, the notes, and linked records; as the author I can edit the notes for 24 hours after logging; after that, and for everyone else, they are read-only with the tooltip "Only the author can edit notes, for 24 hours."
- There is no click-to-call and no recording; the panel says "Calls are logged by hand in this demo."

## UI states

- Empty: the Calls tab with no calls reads "No calls logged yet." with a "Log a call" button.
- Loading: Save shows a spinner on the button and disables the form.
- Error: a failed save keeps all entered values and shows "Couldn't log the call. Try again." above the buttons.
- No permission: every role can create Activities; Related record lists only records in my scope.
- Overflow: Contact search returns at most 20 results with "Refine your search"; Contacts linked to both a Household and a Business (Mike Torres) show both Accounts as radio options.

## Design notes

- Side panel 440px from the right, 12px radius, popover shadow; form fields 36px; primary "Log call" at the bottom right, "Cancel" outline beside it.
- Call entry in the reading pane uses a definition list (label 13px, value 14px), notes below in 14/21.

## FE notes

- `LogCallPanel` writes through `calls.log(payload)` which creates a `conversations` row (channel call) plus one `messages` row with `{ direction, durationSec, outcome }`, and calls the WRK Activity and Task store actions.
- Validation: duration 0:00 to 9:59:59; date not in the future.

## Mock data

- About 50 seeded call entries covering every outcome; Mike Torres as a Contact on both Torres Household and Torres Roofing LLC; one call logged 23 hours ago (still editable) and one 25 hours ago (read-only).
