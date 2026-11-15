---
id: US-SRV-001
title: Service board by status
epic: SRV
roles: [Account Manager, Producer, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/service]
dependsOn: [US-FND-001, US-FND-005]
---

## Story

As an Account Manager, I want my open Service Requests laid out as a board by status, so that I can see at a glance what is new, what I am working, and what is stuck waiting on the carrier or the Account.

## Acceptance criteria

- Given Marisol Reyes (Account Manager, Houston) opens `/service`, when the board loads, then it shows five columns in this order: New, In progress, Waiting on carrier, Waiting on client, Done; each header shows the status label and a count, and the "Assigned to me" filter is on by default.
- Given the scope rules in roles.md, when a Producer opens the board, then it shows only requests on Accounts in their Book; an Account Manager sees their Office; a Principal or Admin sees the agency and gets an Office filter.
- Given the Done column, when the board loads, then it shows only requests marked Done in the last 14 days, and its footer reads "Showing done in the last 14 days · View all in list" linking to `/service?view=list&status=Done`.
- Given a card in In progress, when the user drags it to Waiting on carrier, then the status-change dialog from US-SRV-004 opens; canceling it returns the card to its original column with no change.
- Given a card, when the user activates its overflow menu and picks "Move to…", then the same status change runs without dragging (keyboard alternative to drag).
- Given any card, when the user clicks it or presses Enter on it, then `/service/:id` opens.
- Given the Board / List toggle in the toolbar, when the user switches, then the URL updates to `?view=list` and the choice persists for the session.

## UI states

- Empty: no requests in scope. Board columns render with "0" counts and a single centered message across the board: "No service requests yet." with "+ New request" (hidden for Admin).
- Loading: each column shows 3 skeleton cards at card height; headers show the label with the count replaced by a 16px skeleton.
- Error: inline error panel above the board: "Couldn't load service requests." with a "Try again" button; columns hidden.
- No permission: Admin sees the board read-only. Cards are not draggable, the "Move to…" item is disabled with the tooltip "Admins have read-only access to Service Requests.", and "+ New request" is disabled with the same tooltip.
- Overflow: a column renders the first 50 cards, then a "Show 23 more" button. Subjects truncate to 2 lines with a full-value tooltip; Account names truncate to 1 line ("Bartholomew-Vasquez-Okonkwo Revocable Living Trust Household"). Counts above 999 show "999+".
- Filtered: when filters hide everything, columns show "0" and the board shows "No requests match these filters." with "Clear filters".

## Design notes

- Page header: H1 "Service" (30/600), muted description "Post-sale work for your Accounts: changes, certificates, claims, billing." Primary button top-right of the toolbar: "+ New request" (blue, 36px).
- Toolbar row: search input (36px, placeholder "Search requests, Accounts, policy numbers"), then Filters (Type, Assignee, Office for Principal/Admin, "Assigned to me" toggle), then the Board / List segmented control, then the primary button.
- Meta line under the toolbar, 13px muted: "42 open · 7 overdue · 5 waiting on carrier more than 5 business days" (overdue part from US-SRV-014).
- Columns: canvas background, 280px wide, 12px gap, horizontal scroll on the board area only (not the page). Column header 14/600 with the count as a neutral pill.
- Card: white surface, ring, 8px radius, resting shadow, 12px padding. Line 1: request ID in mono 12px muted ("SR-10482") and the type as icon + 13px label. Line 2: subject 14/500, 2-line clamp. Line 3: Account name 13px, policy number muted. Footer: assignee avatar (20px) and the due indicator (US-SRV-014; until that ships, the due date in MM/DD/YYYY).
- No colored column backgrounds; status color appears only as the small icon in each column header. Drag uses a 150ms lift (transform + popover shadow), no other motion.

## FE notes

- Route `/service` (default `view=board`). Components: `ServicePage`, `ServiceToolbar` (shared with US-SRV-002), `ServiceBoard`, `ServiceColumn`, `ServiceCard`.
- Drag and drop with `@dnd-kit/core` (keyboard sensor on); dropping calls the transition guard from US-SRV-004 before any store mutation.
- State: filters in URL search params (`type`, `assignee`, `office`, `mine=1`, `q`) so List and Board share them.
- Store: `serviceRequests.list({ scope, filters })` from US-FND-005; scope is resolved from the current View as user. Search matches ID, subject, Account name, and policy number.
- The card's due indicator is a slot so US-SRV-014 can replace it without touching the board.

## Mock data

- 300 Service Requests overall; about 120 open (New 18, In progress 52, Waiting on carrier 31, Waiting on client 19) and about 40 Done in the last 14 days.
- Type mix: Policy change 35%, Certificate request 15%, ID card / evidence 15%, Claim report 13%, Billing question 12%, General 6%, Cancellation request 4%.
- Marisol Reyes (Houston) has 23 open requests assigned; one column (In progress, Houston office, filter off) holds 73 to exercise "Show more".
- One request on "Bartholomew-Vasquez-Okonkwo Revocable Living Trust Household" with a 118-character subject.
