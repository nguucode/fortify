---
id: US-LEA-006
title: Qualify step 1, duplicate check against Accounts and Contacts
epic: LEA
roles: [Producer, Principal]
priority: P0
status: Draft
size: M
routes: [/leads/:id]
dependsOn: [US-FND-005, US-LEA-003]
---

## Story

As a Producer qualifying a Lead, I want Fortify to find any existing Account or Contact this Lead already matches before anything is created, so that I add a Cross-sell to the Account we already have instead of creating a duplicate Prospect.

## Acceptance criteria

- Given I click "Qualify" on a New or Contacted Lead, when the dialog opens on step 1 "Check for duplicates", then the check runs automatically against all Accounts, Contacts, and other open Leads, showing "Checking 600 accounts and 1,400 contacts…".
- Given the check finishes, when matches exist, then up to 5 are listed, Strong first: Strong when email (case-insensitive) or phone (digits only) is identical; Possible when last name plus ZIP, normalized business name plus ZIP, or normalized street address match. Each row shows Account name, Household / Business, status (Prospect, Client, Former client), Office, Producer, the matched Contact, and chips naming what matched ("Phone", "Name + ZIP").
- Given there is at least one Strong match, when step 1 loads, then the top match is preselected; choosing "Create a new Prospect Account" instead requires ticking "I've checked: this is a different Account".
- Given I select a matching Account, when the selection changes, then an outcome line states what will happen: a Client gets "Adds a Cross-sell Opportunity to Torres Roofing LLC"; a Prospect or Former client gets "Adds a New business Opportunity to Nguyen Household"; no match gets "Creates the Prospect Account Delgado Household with a New business Opportunity".
- Given a match is outside my scope, when it is listed, then it shows name, Office, and Producer only, cannot be selected, and offers "Hand off to Dana Whitfield", which reassigns the Lead (US-LEA-004) and closes the dialog.
- Given the selected Account already has an open Opportunity covering one of the Lead's lines, when I select it, then a warning reads "Torres Roofing LLC already has an open Commercial auto Opportunity (Quoting, Dana Whitfield)" with "Open it" and "Continue anyway".
- Given another open Lead shares the phone or email, when results show, then it appears under "Other open leads" with "Disqualify this lead as Duplicate lead" as a shortcut (US-LEA-008).

## UI states

- Empty: no matches: success-tinted line "No existing account or contact matches this lead." and "Create a new Prospect Account" preselected.
- Loading: the checking message with a progress spinner for the mock latency; "Continue" disabled.
- Error: "The duplicate check couldn't run." with "Try again"; Continue stays disabled, so no Account is created without a check.
- No permission: Account Managers and Admins never reach this dialog (Qualify is disabled on the record, see US-LEA-003); out-of-scope matches are restricted as above.
- Overflow: more than 5 matches shows "Showing 5 of 9 matches. Refine the lead's details to narrow them." Long Account names truncate with tooltips.

## Design notes

- Modal dialog, 720px, with a two-step header "1 Check for duplicates · 2 Confirm". Footer: "Cancel", primary "Continue".
- Results are a radio list of 56px rows (two lines: bold Account name with kind and status; muted Office, Producer, matched Contact). Match chips are neutral pills; the Strong / Possible label is a dot plus text (orange for Strong, neutral for Possible), not a color fill.
- "Create a new Prospect Account" is always the last radio option, separated by a hairline.
- The outcome line sits above the footer in 13px text, so the consequence is read before Continue.

## FE notes

- `QualifyDialog` step 1, `useDuplicateCheck(lead)`. Pure function `findMatches(lead, { accounts, contacts, leads })` in `src/domain/leads/duplicates.ts` with unit tests for each rule.
- Normalization: phone to digits, email lowercase and trimmed, business name lowercase with punctuation and the suffixes LLC, L.L.C., Inc, Co, Corp, Ltd removed, street address with "Street/St", "Avenue/Ave" folded.
- A Contact match resolves to every Account the Contact belongs to, so one Contact can yield two rows (Household and Business). For a Commercial Lead, the Business row ranks first.
- Result state passes `{ targetAccountId | null, opportunityType }` to step 2 (US-LEA-007). Opportunity type: Client, Cross-sell; Prospect or Former client, New business; none, New business on a new Account.

## Mock data

- A Commercial Lead "Mike Torres, Torres Roofing LLC" for Commercial auto whose phone matches the Contact Mike Torres, who links Torres Household and Torres Roofing LLC (Client).
- A Lead matching a Prospect by last name and ZIP only (Possible), a Lead matching a Former client by email, a Lead matching an Account in another Producer's Book, a Lead with no matches, and two open Leads sharing one phone from a purchased list.
- Torres Roofing LLC has an open Commercial auto Opportunity at Quoting for the overlap warning.
