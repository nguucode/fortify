---
id: US-INB-008
title: Create a Task or Service Request from a message
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/inbox]
dependsOn: [US-INB-007, US-SRV-005, US-SRV-014, US-WRK-005]
---

## Story

As an Account Manager, I want to turn an email or text asking for a change into a Service Request or a Task without retyping it, so that the request is tracked from the moment it arrives.

## Acceptance criteria

- Given a linked conversation, when I choose More → Create Service Request on a message, then a side panel opens with Type (Policy change, Certificate request, Claim report, ID card / evidence, Billing question, Cancellation request, General), Policy (the Account's Policies with an active Term, optional for General and Billing question), Subject (prefilled from the email subject or the first 60 characters of the text), Description (prefilled with the message quoted), Due date (default: the SLA target for the chosen type from rules.md, for example 1 business day for a Policy change), and Assignee (default the Account's Account Manager).
- Given I save it, then the Service Request is created in New status, its chip appears in the conversation header, a system line in the conversation reads "Service Request SR-10512 created by Marisol Reyes", and the toast links to /service/:id.
- Given I choose More → Create Task, then a panel opens with Subject (prefilled), Due (default tomorrow 5:00 PM), Assignee (default me), and Related record; on save the Task chip appears in the header.
- Given the conversation is unmatched, then both actions are disabled with the tooltip "Link this conversation to an Account first."
- A Policy change request never edits the Policy itself; the panel shows the muted line "The carrier makes the change. Fortify tracks the request."

## UI states

- Empty: an Account with no Policy that has an active Term shows "No active Policies on this Account" in the Policy field and allows only General, Billing question, or Certificate request.
- Loading: Save shows a spinner and disables the panel.
- Error: a failed save keeps the values and shows "Couldn't create the Service Request. Try again."
- No permission: Admin sees Create Service Request disabled with "Admins can view Service Requests but not create them." Create Task is allowed for every role.
- Overflow: a quoted message longer than 4,000 characters is trimmed with "[trimmed]" and the full text stays in the conversation.

## Design notes

- Same 440px side panel grammar as US-INB-004; created chips in the header use the neutral chip style with the record icon and ID ("SR-10512").

## FE notes

- Calls the SRV Epic action `serviceRequests.create` and the WRK Epic action `tasks.create`, then `conversations.addRelated(id, { type, recordId })` and a system `messages` row (`kind: 'system'`).
- Due dates come from `slaRules.ts`: business hours 8:00–17:00 in the Office's time zone, Monday to Friday, excluding US federal holidays.

## Mock data

- An inbound email "Please add our new 2025 Ford F-150 to the auto policy" linked to a Household with an active Auto Policy; an inbound text from Torres Roofing LLC asking for a Certificate for a job site; an Account with only expired Terms.
