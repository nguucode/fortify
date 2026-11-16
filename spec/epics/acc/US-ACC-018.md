---
id: US-ACC-018
title: Merge duplicate Accounts
epic: ACC
roles: [Admin]
priority: P1
status: Done
size: M
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-ACC-017]
---

## Story

As an Admin, I want to merge a duplicate Account into the one we keep, choosing which values survive, so that a Household or Business that came in twice (a Lead qualified as a new Prospect, plus an existing Client) ends up with one history.

## Acceptance criteria

- Given I choose "Merge" from the header overflow, when the dialog opens, then I search for the other Account by name, email, or phone, and only Accounts of the same kind (Household with Household, Business with Business) are offered.
- Given I pick the duplicate, when the comparison renders, then it shows both Accounts side by side, field by field (name, mailing address, phone, email, preferred contact, Business facts), and I choose the surviving value per field with radio buttons; the Account with Active Terms is preselected as the survivor.
- Given both Accounts have Active Terms, when I pick them, then merge is blocked: "Both accounts have active policies. Merge the records in the AMS first; Fortify will follow the next sync."
- Given I confirm, when the store merges, then all Fortify-owned records on the duplicate move to the survivor (Contacts, Opportunities, Quotes, X-dates, Service Requests, Activities, Tasks, uploaded Documents), Contacts that exist on both are deduplicated, and the duplicate becomes Merged with a pointer to the survivor.
- Given the merge completes, when the survivor page loads, then a System Activity "Merged Torres HH (dup) into this account by Priya Nair · 2 contacts, 14 activities, 1 opportunity moved" is logged, and opening the duplicate's URL redirects here with a toast.
- Given the Producers or Account Managers differ, when the comparison renders, then the survivor keeps its own owners and the summary states "Open work from Jordan Lee moves to Dana Whitfield."

## UI states

- Empty: search with no same-kind match shows "No other households match. Merging needs two accounts of the same kind."
- Loading: comparison skeleton; "Merging…" on confirm.
- Error: "We couldn't merge these accounts. Nothing was changed."
- No permission: for every role but Admin, "Merge" is disabled with the tooltip "Only an Admin can merge or archive accounts."
- Overflow: long values in the comparison wrap within their column; record counts in the summary, not lists.

## Design notes

- Large dialog, 800px, two columns headed by each Account's name, status, and Office; one row per field with a radio on each side; identical values show once with a muted "Same".
- Confirm step repeats the summary with a danger-styled "Merge accounts" button; merging cannot be undone, and the dialog says so.

## FE notes

- `MergeAccountsDialog`; action `mergeAccounts(survivorId, duplicateId, fieldChoices)` re-points `accountId` on every Fortify-owned entity, dedupes `accountContacts` by `contactId`, sets `duplicate.mergedIntoId` and `duplicate.archivedAt`.
- Policies, Terms, and Insured items are never re-pointed in Fortify (AMS-owned); that is why merging two Accounts that both have Active Terms is blocked.

## Mock data

- "Torres HH (dup)" (Prospect from a Lead, 1 Opportunity, 14 Activities, Ana Torres duplicated) to merge into Torres Household; a Business pair where both have Active Terms for the blocked case.
