---
id: US-SRV-002
title: Service list with filters and saved views
epic: SRV
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/service]
dependsOn: [US-FND-007, US-SRV-001]
---

## Story

As an Account Manager, I want a sortable table of Service Requests with filters, so that I can find a specific request, review everything done last month, or work through overdue items in order.

## Acceptance criteria

- Given the user switches to List (`/service?view=list`), when the table loads, then it shows columns ID, Subject (Account name as the muted second line), Type, Status, Policy, Assignee, Office, Created, Due, and Age, sorted by Due ascending.
- Given the saved views "My open", "Overdue", "Waiting on carrier", "Waiting on client", and "Done last 30 days" (sitemap.yaml), when the user picks one, then the filters update to match, the URL reflects them, and the meta line updates (e.g. "Showing 50 of 118 open requests").
- Given the Filters menu, when the user filters by Type, Status, Assignee, Office, Created date range, or Due date range, then results update within one store call and active filters show as removable chips.
- Given a sortable column header (Created, Due, Age, Status, Type), when the user clicks it, then the table sorts by it and a second click reverses the order.
- Given the filters set on the board, when the user switches to List, then the same filters stay applied, and the Done column limit from the board does not apply.
- Given more than 50 rows, when the user pages, then pagination follows US-FND-007 with 50 rows per page.

## UI states

- Empty: "No service requests yet." with "+ New request" (hidden for Admin).
- Loading: 10 skeleton rows at 40px height under a real header row.
- Error: table body replaced by "Couldn't load service requests." with "Try again".
- No permission: Admin sees the table read-only; "+ New request" and the row "Edit" action are disabled with the tooltip "Admins have read-only access to Service Requests."
- Overflow: Subject and Account truncate with an ellipsis and a full-value tooltip; Age above 99 days shows "99+d"; Policy shows the policy number with the line as muted text and "—" when no Policy is linked.
- Filtered: "No requests match these filters." with "Clear filters"; saved view tabs stay visible.

## Design notes

- Same page header and toolbar as US-SRV-001. Saved views sit as the US-FND-007 saved-view tab row under the toolbar, left-aligned; the active one uses the selected state (recessed fill, text-strong), not blue.
- Table per Part B: 40px rows, 14/600 header, 1px fill dividers, checkbox column (used by US-SRV-016), row hover in recessed, text "Edit" action and overflow menu at row end.
- ID in mono 13px. Status cell is an icon + 13px label (New: circle outline; In progress: half circle; Waiting on carrier and Waiting on client: clock; Done: check in success). Age and dates use tabular-nums, right-aligned.

## FE notes

- Same route as the board; `view=list` mounts `ServiceTable` built on the US-FND-007 `DataTable`.
- Saved views come from `savedViews` for Service in sitemap.yaml; each maps to a filter preset in `SERVICE_SAVED_VIEWS` and renders through the US-FND-007 saved-view tabs. Personal saved views are out of scope.
- Age = business days (US federal holidays excluded, from `slaRules.ts`) since `createdAt` for open requests, and time from created to done for Done ones.
- Store: `serviceRequests.list({ scope, filters, sort, page })`.

## Mock data

- Same 300 requests as US-SRV-001; about 180 Done, spread over the last 12 months so "Done last 30 days" returns about 35.
- At least 9 overdue requests in Marisol Reyes's office, and 2 open for more than 99 days (a Cancellation request waiting on a signed form).
- 12 requests with no Policy linked (General and Billing question types).
