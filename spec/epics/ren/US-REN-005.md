---
id: US-REN-005
title: Move a Renewal through review and presentation
epic: REN
roles: [Account Manager, Producer, Principal]
priority: P0
status: Draft
size: S
routes: [/renewals/:id, /renewals]
dependsOn: [US-REN-004]
---

## Story

As an Account Manager, I want to start the review and mark when I presented the renewal to the Account, so that the team can see where each Renewal stands.

## Acceptance criteria

- Given a Renewal in Upcoming, when I click "Start review", then the status becomes In review, an Activity "Renewal review started by Marisol Reyes" is logged, and the stepper advances.
- Given a Renewal in In review or Remarketing, when I click "Mark presented" and pick the date (default today), the Contact presented to, and the channel (Call, Email, Meeting), then the status becomes Presented and an Activity is logged with those details.
- Given I am a Principal, when I choose "Reassign" and pick another Account Manager in the Account's Office, then the Renewal owner changes and an Activity logs the change; Account Managers see the action disabled with the tooltip "Only a Principal can reassign."
- Given I am the Producer and the Renewal is in Remarketing, then "Mark presented" is enabled for me; outside Remarketing it is disabled with the tooltip "Producers can update a renewal only while it is remarketing."
- Given the worklist row menu, then "Start review" is available inline for Upcoming rows so I can start several without opening each.
- Given I click "Mark presented" without picking a Contact, then the dialog shows "Choose who you presented to." and does not submit.

## UI states

- Empty: an Account with no Contact shows "This account has no contacts. Add one on the Account page." in the Contact picker and disables submit.
- Loading: the action button shows a spinner while the store mutation runs (200 to 600ms).
- Error: toast "Couldn't update the renewal. Try again." and the status stays unchanged.
- No permission: disabled actions with reason tooltips for Producer (outside remarketing) and Admin.
- Overflow: Contact picker searches when the Account has more than 8 Contacts.

## Design notes

- "Start review" and "Mark presented" occupy the primary blue button slot when they are the next step; other actions sit in an overflow menu.
- Mark presented is a small dialog: date picker, Contact select, channel segmented control, optional note (500 characters).

## FE notes

- Store actions `renewals.setStatus(id, status, meta)` and `renewals.reassign(id, userId)`; both append an Activity via `activities.log`.
- Allowed transitions enforced in one `nextStatuses(renewal)` helper with a unit test: Upcoming → In review; In review → Remarketing (US-REN-008) or Presented; Remarketing → Presented; Presented → Decided (US-REN-007).

## Mock data

- Renewals in each pre-decision status; the Account with no Contact (hand-made edge case) has an open Renewal.
