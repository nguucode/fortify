---
id: US-SRV-003
title: Service Request page
epic: SRV
roles: [Account Manager, Producer, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/service/:id]
dependsOn: [US-FND-005, US-FND-006, US-SRV-001, US-WRK-001, US-WRK-005]
---

## Story

As an Account Manager, I want one page that shows everything about a Service Request (what was asked, for which Policy, where it stands, and what has happened), so that I can work it without hunting through the Account.

## Acceptance criteria

- Given a request in scope, when the user opens `/service/SR-10482`, then the header shows the subject as H1, the ID, status, type, the Account (linked to `/accounts/:id`), the Policy (policy number, Carrier, line, linked to `/policies/:id`), the assignee, and the due date.
- Given the request's type, when the page renders, then the Details card shows that type's fields read-only, using the renderer registered by the matching form story (US-SRV-006 to US-SRV-012); a General request shows only its description.
- Given the request status, when the page renders, then the primary action is "Start work" for New, "Mark done" for In progress and both Waiting statuses, and "Reopen" for Done; "Move to…" lists the other allowed statuses (rules in US-SRV-004).
- Given the request has a linked Claim or Certificate, when the page renders, then the right rail's Linked records shows it with its status (e.g. "Claim CL-2041 · Submitted to carrier") and links to `/claims/:id` or `/certificates/:id`.
- Given the Activity section, when the page renders, then it shows the Activity timeline filtered to this request (status changes, notes, calls, emails), newest first.
- Given a request on an Account outside the user's scope, when the user opens its URL, then the access-denied page from US-FND-006 shows, naming the Account Manager as owner.

## UI states

- Empty: a request with no description and no attachments shows "No description." and "No attachments." in muted text; an empty timeline shows "No activity yet."
- Loading: header skeleton (title bar, 4 property skeletons) and two card skeletons; the right rail shows 5 skeleton lines.
- Error: "Couldn't load this request." with "Try again" and a link back to Service. An unknown ID shows the 404 page.
- No permission: out-of-scope request shows the access-denied page. Admin sees everything read-only; "Start work", "Mark done", "Move to…", and "Edit" are disabled with the tooltip "Admins have read-only access to Service Requests." A Producer viewing a request they did not create sees the same actions disabled with "Only the Account Manager can change this request."
- Overflow: H1 wraps to 2 lines then truncates with a tooltip; long Account names truncate in the header; a description over 2,000 characters collapses after 8 lines with "Show more"; more than 10 attachments collapse to "Show 4 more".

## Design notes

- Breadcrumb "Service / SR-10482" above the H1. Under the H1, a single property row in 13px: status cell (icon + label), type, Account link, Policy link, assignee avatar + name, due indicator.
- Primary action top-right (blue). Secondary actions as small outline buttons: "Move to…", "Edit", overflow menu (Copy link, Create task).
- Body: two columns, main flexible, right rail 320px. Main: Details card (white, ring, 8px radius; label/value grid with 13px labels in text-label), Description, Attachments (file chips with name and size), Activity.
- Right rail cards: Properties (Status, Type, Assignee, Due, Requested via, Office, Created by, Created), Linked records (Policy, Claim, Certificate), Tasks (open Tasks linked to this request with "+ Add task").
- When the type is Policy change and a carrier result exists, a result card sits at the top of the main column (US-SRV-007).

## FE notes

- Route `/service/:id`. Components: `ServiceRequestPage`, `ServiceRequestHeader`, `ServiceRequestDetails`, `LinkedRecordsCard`.
- Type renderers: `serviceTypeRegistry[type].DetailsView`, filled by each form story; the page falls back to a key/value list if a renderer is missing.
- Activity timeline and Tasks card reuse the WRK components, filtered by `serviceRequestId`.
- Store: `serviceRequests.get(id)`, `activities.list({ serviceRequestId })`, `tasks.list({ serviceRequestId, status: 'Open' })`. Scope check happens in the store and returns a typed `forbidden` result with the owner name for US-FND-006.

## Mock data

- SR-10482: Policy change on Torres Household, policy LSM-PA-4471029 (Lone Star Mutual, personal auto), In progress, assigned to Marisol Reyes, 6 Activities.
- SR-10490: Claim report on Okafor Household linked to Claim CL-2041.
- SR-10495: Certificate request on Torres Roofing LLC linked to Certificate CERT-0412 in Needs review.
- One request with a 2,400-character description and 14 attachments; one General request with no Policy and no description.
- One request on a Tampa Account, to show access denied when viewed as Dana Whitfield (Producer, Houston).
