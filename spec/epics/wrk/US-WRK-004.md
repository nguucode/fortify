---
id: US-WRK-004
title: Tasks list
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/tasks]
dependsOn: [US-FND-001, US-FND-007]
---

## Story

As an Account Manager, I want one list of the Tasks I own, with saved views for my open Tasks, today, and overdue, so that I start each morning knowing exactly what is due and for which Account.

## Acceptance criteria

- Given I open `/tasks`, when it loads, then I see the saved views My open, Due today, and Overdue as tabs, each with a count, with My open selected: my open Tasks sorted by due date, overdue first; a Due filter offers Next 7 days and a custom range.
- Given the table, when it renders, then the columns are a Complete checkbox, Title (with the Account as a muted second token), Due, Type (General, Call, Email, Meeting), Linked to, Assignee, Source (Manual, X-date, Renewal, Service Request, Lead, Claim), and Priority (High, Normal).
- Given the "Assignee" filter, when I am a Producer, then it is fixed to me; an Account Manager can switch to "My office" or any user in their Office; a Principal or Admin can pick any user or "Everyone".
- Given the Status filter, when I choose Done or Canceled, then those Tasks show with their completed or canceled date in place of Due.
- Given a Task row, when I click the title, then the Task drawer opens on the same page (`/tasks?task=:id`) with full details and edit (US-WRK-005); clicking the Account token opens `/accounts/:id?tab=activity`.
- Given the component is embedded on an Account's Activity tab, when it renders in compact mode, then it shows Title, Due, Type, and Assignee only, scoped to that Account.

## UI states

- Empty: no open Tasks shows "You're all caught up. No open tasks." with "+ New task"; empty Overdue shows "Nothing overdue."
- Loading: 10 skeleton rows; saved view counts show "—".
- Error: table error panel with Retry.
- No permission: Task is C E for all roles in scope; Tasks on Accounts outside my scope never appear, even when assigned to me after a reassignment (they show in a muted note "2 tasks are on accounts you no longer have access to. Ask your Principal to reassign them.").
- Overflow: titles up to 140 characters truncate with a tooltip; a user with 180 open Tasks pages at 50.
- Filtered: "No tasks match these filters." with "Clear filters".

## Design notes

- List page per Part B: H1 "Tasks", description "Everything you owe to accounts, by due date.", toolbar with search "Search tasks", Filters, and blue "+ New task"; saved views as an underline tab row between the header and the toolbar.
- Meta line "Showing 23 open tasks · 4 overdue".
- Due cell: "Overdue · 3 days" in danger text with an alert icon; "Today 2:00 PM" in default text; future dates MM/DD/YYYY. Priority High shows a small up-arrow icon and label; Normal shows "—".
- Source is muted text with a small icon (calendar for X-date, refresh for Renewal, shield for Claim).

## FE notes

- Route `/tasks`, `TasksPage` hosting the reusable `TaskList` (`scope`, `compact`, `limit` props); saved view and filters in the URL (`?view=overdue&assignee=me`), plus `?account=:id` for the Account link-through.
- Task entity: `{ id, title, type, accountId, linked?, assigneeId, dueDate, dueTime?, durationMinutes?, priority, status: 'Open'|'Done'|'Canceled', source, description?, createdById, completedAt?, completionNote?, canceledAt?, cancelReason? }`.
- Overdue = `status === 'Open' && due < now` (date-only Tasks are overdue from the next day).

## Mock data

- 600 Tasks: 70% Open, 25% Done, 5% Canceled; sources Manual 50%, X-date 20%, Renewal 15%, Service Request 8%, Lead 5%, Claim 2%; 12% of open Tasks overdue.
- Marisol Reyes (Account Manager) has 23 open Tasks, 4 overdue, 3 due today.
