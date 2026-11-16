---
id: US-SET-002
title: Users list
epic: SET
roles: [Admin, Principal]
priority: P1
status: Done
size: M
routes: [/settings/users]
dependsOn: [US-FND-007, US-SET-001]
---

## Story

As an Admin, I want to see all 25 users with their role, Office, Book size, license health, and status, so that I can spot who needs a role change, who is about to lose a license, and whose Book must move before they leave.

## Acceptance criteria

- Given I open `/settings/users`, when the list loads, then columns are Name (email as the muted secondary token), Role (Producer, Account Manager, Principal, Admin), Office, Title, Book (Account count, right-aligned), Licenses (count, with a warning icon if any expires within 60 days), Status (Active, Invited, Deactivated), and Last active (relative, for example "2h ago").
- Given the list, when it loads, then it is sorted by Name, Deactivated users are hidden by default, and the meta line reads "25 users · 3 offices · 1 invited".
- Given filters, when I filter by Role, Office, or Status, then the list and meta line update; filter state survives a reload through the URL.
- Given I am an Admin, when I click "+ Invite user" or a row's "Edit", then the user drawer opens (US-SET-003); as a Principal both are disabled with "Only Admins can change Settings."
- Given a user's Licenses cell shows a warning, when I click it, then I go to `/settings/licenses` filtered to that user.
- Given a row, when I click the Book count, then I go to `/accounts` filtered to Accounts where that user is Producer or Account Manager.

## UI states

- Empty: cannot occur with seed data; with Demo controls "simulate empty", "No users yet. Invite your first teammate." with "+ Invite user" (Admin only).
- Loading: 10 skeleton rows.
- Error: page error panel "Users couldn't load." with "Try again".
- No permission: Principal read-only (disabled actions with tooltip); Producer and Account Manager get `/403` (US-SET-001).
- Overflow: long names and titles truncate with tooltip; Book counts over 999 show "1,204".
- Filtered: chips with "Clear all"; no match shows "No users match these filters."

## Design notes

- Part B list page: toolbar with search ("Search users"), Filters, Export (mock CSV), primary "+ Invite user".
- Status cell: dot plus label (Active success, Invited info, Deactivated neutral). Role as plain text, not a pill.
- Avatar (24px, initials, full pill) before the name.

## FE notes

- Route `/settings/users?role=producer&office=tampa`; table from US-FND-007.
- Selectors: `selectUsers(filters)`, `selectBookSize(userId)` (count of Accounts where `producerId` or `accountManagerId` equals the user), `selectLicenseHealth(userId, today)`.
- Export calls the shared mock CSV helper; no real download beyond a generated blob.

## Mock data

- 25 users: 1 Admin, 2 Principal, 10 Producers, 12 Account Managers; Houston 11, San Antonio 8, Tampa 6 (the split US-HOM-013 shows).
- Edge cases: 1 Invited user (no Last active, Book 0), 1 Deactivated Account Manager still listed on old Certificates, 1 user with a license expiring in 21 days, 1 user with a very long name ("Maria-Fernanda Castellanos-Villarreal"), 1 Producer with a Book of 94 Accounts.
