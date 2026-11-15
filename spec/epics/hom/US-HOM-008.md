---
id: US-HOM-008
title: "Account Manager Today: service queue"
epic: HOM
roles: [Account Manager]
priority: P0
status: Draft
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007]
---

## Story

As an Account Manager, I want my open Service Requests on Today, with the overdue and stalled ones flagged, so that I keep promises to Accounts and chase carriers on time.

## Acceptance criteria

- Given I am an Account Manager, when Today loads, then the "Service queue" widget shows a status strip "New 4 · In progress 9 · Waiting on carrier 6 · Waiting on client 3" for open Service Requests where I am the Account Manager; clicking a status filters the table.
- A segmented control switches "Mine" (default) and "Office".
- The table lists at most 8 open Service Requests sorted by SLA due time, then age: Subject (with type muted under it, "Policy change"), Account, Status (dot plus label), Age ("3d"), Due (MM/DD/YYYY).
- Given a Service Request is due today or earlier, then Due shows in danger text ("Due today", "Overdue 2d"); given it has been Waiting on carrier for more than 5 days, then Status shows a warning icon with the tooltip "Waiting on carrier 7 days. Follow up."
- Given I click a row, then I go to /service/:id; "View all" goes to /service (My open saved view).
- Given I mark a Service Request Done on its record and return to Today, then it leaves the table and the strip count drops.

## UI states

- Empty: "Your service queue is clear." with a "View all Service Requests" link.
- Loading: strip shows 4 skeleton chips; table shows 8 skeleton rows.
- Error: "Couldn't load Service queue." with Retry.
- No permission: not rendered for other roles.
- Overflow: long subjects truncate at one line with a tooltip; strip counts above 99 show "99+".

## Design notes

- Same card grammar as US-HOM-007 so the two Account Manager widgets read as a pair.
- Columns: Subject (flex), Account (200px), Status (152px), Age (56px right), Due (112px).
- Status dots follow US-FND-017: New and In progress blue, Waiting on carrier and Waiting on client orange; always with the text label.

## FE notes

- Enhanced by US-SRV-014 (P1): the P0 build ships without these; their controls appear once those stories land.
- Query `serviceRequests.list({ accountManagerId: me | officeId, status: open, sort: ['dueDate', 'createdAt'], limit: 8 })` and `serviceRequests.statusCounts(...)`.
- Due comes from `slaRules.ts` (rules.md): business hours 8:00–17:00 in the Office's time zone, Monday to Friday, excluding US federal holidays; the clock pauses while Waiting on client, not while Waiting on carrier.
- Waiting days come from `statusChangedAt`.
- Subscribes to `serviceRequest.created` and `serviceRequest.statusChanged`.

## Mock data

- Marisol Reyes has 22 open Service Requests covering every type (Policy change, Certificate request, Claim report, ID card / evidence, Billing question, Cancellation request, General); 3 overdue, 2 Waiting on carrier for more than 5 days.
- One Service Request on the Account with no Contact.
