---
id: US-SET-003
title: Invite, edit, and deactivate a user
epic: SET
roles: [Admin]
priority: P1
status: Draft
size: M
routes: [/settings/users]
dependsOn: [US-SET-002, US-ACC-016]
---

## Story

As an Admin, I want to invite a new user, change a user's role or Office, and deactivate someone who leaves, with Fortify stopping me if their Book still needs to move, so that access matches who actually works here and no Account is left without an owner.

## Acceptance criteria

- Given I click "+ Invite user", when I enter First name, Last name, Email, Role, Office, and optional Title and Phone and click "Send invite", then the user appears with status Invited, a toast reads "Invite sent to jordan.lee@example.com (simulated)", and the drawer closes.
- Given Email is missing, invalid, or already used by another user, when I submit, then an inline error shows ("This email is already in use by Priya Natarajan") and nothing is saved.
- Given I edit an Active user's Role from Producer to Account Manager, when the user has open Opportunities, then a warning reads "Kevin Ruiz owns 14 open Opportunities. Account Managers can't edit Opportunities; reassign them first or Kevin can only view them." and I can still save.
- Given I change a user's Office, when I save, then a notice reads "Their Accounts stay in Houston. Move the Book separately if needed." because Accounts belong to an Office independently.
- Given I click "Deactivate" on a user whose Book has Accounts or who holds open Leads or Tasks, when the dialog opens, then it blocks deactivation with "Move 38 Accounts, 4 Leads, and 12 open Tasks first" and a "Move Book" link that opens the bulk Book move (US-ACC-016, P1) on `/accounts` filtered to that Book; given the Book and queues are empty, when I confirm, then the status becomes Deactivated and the user can no longer be chosen as Producer or Account Manager.
- Given I try to change my own Role or deactivate myself, when I open my own drawer, then those controls are disabled with "You can't change your own role or status."
- Given a Deactivated user, when I click "Reactivate", then the status returns to Active. There is no delete.

## UI states

- Empty: invite mode opens blank, Role defaulting to Account Manager, Office defaulting to the Admin's Office.
- Loading: "Send invite" and "Save" show a spinner; fields disabled during the mock call.
- Error: a forced error keeps the drawer open with "Couldn't save. Your changes are still here." and "Try again".
- No permission: only Admin reaches the drawer; Principal sees disabled entry points (US-SET-002).
- Overflow: names up to 60 characters per field; the drawer header truncates with tooltip.

## Design notes

- Right-side drawer, 480px, same grammar as other Fortify drawers: header with avatar and name, one-column fields, footer "Cancel" and primary "Save" ("Send invite" in invite mode), "Deactivate" as a danger text action bottom-left.
- Role is a radio list with one muted line per role describing scope ("Office: every Account in their Office"), sourced from roles.md.
- The deactivation blocker is a dialog with a warning icon and counts as a short list, not a paragraph.

## FE notes

- Component `UserDrawer` with `mode: 'invite' | 'edit'`; store actions `inviteUser`, `updateUser`, `setUserStatus(userId, 'Active' | 'Deactivated')`.
- Blocker counts from `selectBookSize`, `selectOpenLeadsByAssignee`, `selectOpenTasksByAssignee`, `selectOpenOpportunitiesByProducer`.
- If the edited user is the current View as user, the session role updates immediately and the route guard re-runs (US-SET-001).

## Mock data

- One Producer with 14 open Opportunities (role-change warning); one Account Manager with an empty Book and no open Tasks (clean deactivation); one Producer with 38 Accounts, 4 Leads, 12 open Tasks (blocked deactivation).
