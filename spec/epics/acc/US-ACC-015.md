---
id: US-ACC-015
title: Reassign an Account's Producer or Account Manager
epic: ACC
roles: [Principal, Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-WRK-001, US-FND-008]
---

## Story

As a Principal, I want to change the Producer or Account Manager on one Account and choose what happens to their open work, so that coverage continues when someone leaves, changes Office, or is overloaded.

## Acceptance criteria

- Given I am a Principal or Admin, when I choose "Reassign" from the header overflow, then a dialog shows the current Producer and Account Manager with a picker for each; Producer lists active users holding the Producer role, Account Manager lists users with the Account Manager role.
- Given I pick a new Producer, when the dialog updates, then it shows the open work that follows the Producer by default ("3 open opportunities and 2 open tasks move to Dana Whitfield") with a checkbox to keep them with the current owner.
- Given I pick a new Account Manager, when the dialog updates, then it shows "1 open renewal, 2 open service requests, and 3 open tasks move to Marisol Reyes" with the same checkbox.
- Given the new Producer is not licensed in the Account's state for its lines, when I pick them, then a warning reads "Dana Whitfield has no active FL license for Property & Casualty." and I can still confirm.
- Given I confirm, when the store saves, then the header updates, a System Activity "Producer changed from Jordan Lee to Dana Whitfield by Grant Holloway" is logged, the new owner gets a notification, and a toast confirms.
- Given the new owner is in another Office, when I confirm, then the Account's Office does not change automatically; a note reads "The account stays in Tampa. Change the office in Edit details."

## UI states

- Empty: if no other user holds the role, the picker shows "No other producers available."
- Loading: "Reassigning…" on the confirm button.
- Error: "We couldn't reassign this account. Nothing was changed." with Retry.
- No permission: for Producers and Account Managers, "Reassign" is disabled with the tooltip "Only a Principal or Admin can reassign an account."
- Overflow: open work above 20 items shows counts only, never a list.

## Design notes

- Centered dialog 520px, title "Reassign Torres Household"; two rows (Producer, Account Manager) each with a "From → To" layout; the impact summary as a muted 13px paragraph under each row.
- Primary "Reassign" enabled only when at least one picker changed.

## FE notes

- `ReassignAccountDialog`; action `reassignAccount(accountId, { producerId?, accountManagerId?, moveOpenWork: { producer: boolean, accountManager: boolean } })`.
- Producer work = open Opportunities and Tasks assigned to the old Producer on this Account; Account Manager work = open Renewals, Service Requests, and Tasks assigned to the old Account Manager.
- License check reads `user.licenses` against `account.state`; warning only.
- Emits a notification through the FND notifications store (US-FND-008).

## Mock data

- Torres Household with open work for both owners; one Producer with an expired FL license; a Houston user and a Tampa user as candidates.
