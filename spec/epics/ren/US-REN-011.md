---
id: US-REN-011
title: Log Activity and create Tasks on a Renewal
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/renewals/:id]
dependsOn: [US-REN-004, US-WRK-001, US-WRK-002, US-WRK-005]
---

## Story

As an Account Manager, I want to log calls and notes and create Tasks from the Renewal page with due dates relative to expiration, so that the renewal work is traceable and nothing slips.

## Acceptance criteria

- Given the Renewal page, when I click "Log activity" and pick Call, Email, Meeting, or Note with a summary, then the Activity is saved on the Account and linked to this Renewal, and appears at the top of the right column.
- Given I click "Add task", then the Task form opens with the Renewal linked and due date presets "30 days before expiration", "15 days before expiration", and "On expiration", resolved to dates (e.g. 12/13/2026).
- Given a Task on the Renewal is completed elsewhere, then it disappears from the open Tasks list and its completion Activity appears in the feed.
- Given the right column, then "View all activity" opens the Account's Activity tab filtered to this Renewal.

## UI states

- Empty: "No activity yet." and "No open tasks."
- Loading: feed skeleton of 3 items.
- Error: toast "Couldn't save the activity." and the composer keeps the text.
- No permission: Admin can log Activity and Tasks (Activity C E for all roles); no restriction beyond scope.
- Overflow: summaries over 3 lines collapse with "Show more"; more than 5 Activities link to the full feed.

## Design notes

- Composer opens inline at the top of the right column, not as a modal; Task form reuses the WRK Task dialog.

## FE notes

- Reuse WRK `ActivityComposer` (US-WRK-002) and `TaskDialog` (US-WRK-005) with `{ accountId, renewalId }` context; due presets computed from `term.expirationDate`.

## Mock data

- The +38% Renewal with 6 Activities and 2 open Tasks; a Renewal with none.
