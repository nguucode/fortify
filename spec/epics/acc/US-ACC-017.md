---
id: US-ACC-017
title: Archive and restore an Account
epic: ACC
roles: [Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id, /accounts]
dependsOn: [US-ACC-003, US-ACC-001]
---

## Story

As an Admin, I want to archive an Account created by mistake or no longer worked, and restore it if needed, so that lists stay clean without ever hard-deleting history.

## Acceptance criteria

- Given I am an Admin, when I choose "Archive" from the header overflow, then a dialog asks for a reason (Created in error, Duplicate, No longer pursuing, Other with text) and explains "Archived accounts are hidden from lists and become read-only. Nothing is deleted."
- Given the Account has an Active Term, any open Opportunity, or any open Service Request, when I open Archive, then the action is blocked with the reason, for example "Torres Household has 4 active policies. Accounts with active policies can't be archived." or "Okafor Household has 1 open opportunity. Close it as Won or Lost before archiving."
- Given the Account has open Tasks, when the dialog renders, then it states "2 open tasks will be canceled (reason: Account archived)." before I confirm.
- Given I confirm, when the store saves, then the Account leaves every saved view, the Account page shows the archived banner with date, user, and reason, and a System Activity is logged.
- Given an Archived Account, when I choose "Restore" from the banner, then it returns to its previous status and lists, and a System Activity "Restored by Priya Nair" is logged; canceled Tasks stay canceled.

## UI states

- Empty: not applicable.
- Loading: "Archiving…" on the confirm button.
- Error: "We couldn't archive this account. Nothing was changed."
- No permission: for every role but Admin, "Archive" is disabled with the tooltip "Only an Admin can merge or archive accounts."; Archived Accounts are visible only to Admins; non-Admins who open an Archived Account's URL get the not-found page.
- Overflow: the "Other" reason accepts up to 200 characters.

## Design notes

- Danger-styled confirm button "Archive account" in a 480px dialog; the banner on the Account page uses the neutral fill background with an archive icon, not danger color.

## FE notes

- Actions `archiveAccount(id, reason)` and `restoreAccount(id)`; `account.archivedAt`, `archivedById`, `archiveReason`, `statusBeforeArchive`.
- List selectors exclude `archivedAt != null` unless the Admin "Include archived" filter is on (US-ACC-001).

## Mock data

- 3 Archived Accounts (reasons: Duplicate, Created in error, No longer pursuing); a Prospect with one open Opportunity (archive blocked), and a Former client with 2 open Tasks and no open Opportunity for the cascade message.
