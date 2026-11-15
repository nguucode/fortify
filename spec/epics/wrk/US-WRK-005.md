---
id: US-WRK-005
title: Create and edit a Task
epic: WRK
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/tasks, /accounts/:id]
dependsOn: []
---

## Story

As a Producer, I want to create a Task on an Account, optionally linked to one of its records, with a due date, an assignee, and a type, and edit it later, so that every commitment has an owner and a date.

## Acceptance criteria

- Given I click "+ New task" on `/tasks` or "New task" on an Account page, when the drawer opens, then it shows Title (required), Account (required; prefilled and locked when opened from an Account), Linked to (optional), Type (General, Call, Email, Meeting), Due date (required, default tomorrow), Due time (optional; required for Meeting), Duration (Meeting only, default 30 min), Assignee (default me), Priority (Normal, High), and Description.
- Given the Assignee picker, when it opens, then it lists only users who can see the chosen Account under roles.md scope (its Producer, its Account Manager, users in its Office with the Account Manager role, and Principals); others are not offered.
- Given I save a Task assigned to someone else, when the store updates, then the assignee gets a notification "Dana Whitfield assigned you: Call Ana Torres about flood quote · Due 11/18/2026".
- Given I open an existing Task from the list or the Account, when I change the due date, assignee, or priority and save, then the change is applied and a System Activity "Task due date changed to 11/20/2026" is logged on the Account.
- Given a Task created by the system (Source X-date, Renewal, Service Request, Lead, or Claim), when I edit it, then Title and Source stay read-only and I can change due date, assignee, and priority.
- Given a Done or Canceled Task, when I open it, then the drawer is read-only and shows the completion note or cancel reason.

## UI states

- Empty: an Account picker search with no match shows "No accounts in your access match."
- Loading: "Saving…" on the primary button.
- Error: "We couldn't save this task. Try again." with entries kept; a due date in the past shows the warning "This due date is in the past. The task will show as overdue." but still saves.
- No permission: Task is C E for all roles in scope; Archived Accounts are not offered in the Account picker.
- Overflow: Title up to 140 characters, Description up to 2,000.

## Design notes

- 480px drawer, title "New task" or the Task title in edit mode; date and time pickers side by side; a "More" disclosure hides Priority and Description in create mode to keep it short.
- ⌘Enter saves.

## FE notes

- Enhanced by US-WRK-004 (P1), US-FND-008 (P1): the P0 build ships without these; their controls appear once those stories land.
- `TaskDrawer` with modes `create` and `edit`, opened via `?task=new` or `?task=:id` on `/tasks` and via the Account header quick action.
- Actions `createTask`, `updateTask`; assignee candidates from `selectUsersWhoCanSeeAccount(accountId)`.
- Notifications through the FND notifications store (US-FND-008); a Task notification opens `/tasks?task=:id`.

## Mock data

- System Tasks from X-dates ("X-date in 45 days: Auto · Gulf Harbor Insurance · $1,860") and Renewals ("Review renewal: Home · Lone Star Mutual · +38%").
