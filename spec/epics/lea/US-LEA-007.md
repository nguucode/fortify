---
id: US-LEA-007
title: Qualify step 2, confirm and create the Account and Opportunity
epic: LEA
roles: [Producer, Principal]
priority: P0
status: Draft
size: M
routes: [/leads/:id]
dependsOn: [US-FND-005, US-LEA-006, US-PIP-004, US-WRK-001]
---

## Story

As a Producer, I want to confirm the Account and Opportunity details in one step and land on the new Opportunity, so that the Lead becomes real sales work and I can start quoting right away.

## Acceptance criteria

- Given step 1 chose "Create a new Prospect Account", when step 2 opens, then it shows Account (kind Household or Business from the Lead type, Account name defaulting to "Delgado Household" or the business name, Office, Producer, Account Manager), Primary contact (name, phone, email, address from the Lead), and Opportunity (type New business, lines, target effective date, estimated premium).
- Given step 1 chose an existing Account, when step 2 opens, then the Account section is a read-only summary with its status and owners, and the Opportunity type is Cross-sell for a Client or New business for a Prospect or Former client.
- Given the Lead has a current carrier and an X-date, when step 2 opens, then the target effective date defaults to that X-date, and a checked option reads "Save current coverage as X-dates (Home · Lone Star Mutual · 01/14/2027)" so the date is kept even if the Opportunity is Lost.
- Given I click "Qualify lead", when Lines is empty, Account Manager is missing, or the Account Manager belongs to a different Office than the Account, then inline errors block the submit.
- Given I submit a valid form, when the store confirms, then in one atomic change: the Lead becomes Qualified with links to the Account and Opportunity; the Account (new ones in status Prospect) and its Contact exist; the Opportunity exists in stage New, or Contacted if the Lead was Contacted, owned by the Producer; the Lead's attempts are copied to the Account as Activities; a pending Next follow-up becomes an Open Task (type Call, source Lead) for the Producer on that Account; and an Activity "Qualified from lead L-1042 (Trusted Choice · Claim-it)" is logged.
- Given the change succeeds, when the dialog closes, then I am taken to /pipeline/:id of the new Opportunity with a toast "Lead qualified. Opportunity created." and "Back to lead".
- Given the save fails, when the error returns, then nothing is created, the dialog stays on step 2 with my entries, and shows "Couldn't qualify the lead. Nothing was created."

## UI states

- Empty: not applicable (form prefilled from the Lead).
- Loading: "Qualify lead" shows a spinner; Back and Cancel disabled during the call.
- Error: as above, atomic and retryable.
- No permission: a Principal can change Producer and Account Manager; a Producer sees Producer locked to themself, because a Producer who creates an Account is locked in as its Producer (initial assignment, not reassignment).
- Overflow: Account name up to 120 characters; up to 7 personal or 4 commercial lines as checkboxes in two columns; estimated premium up to $9,999,999.

## Design notes

- Same 720px dialog, step 2 "Confirm". Three stacked sections with 13px labels: Account, Primary contact, Opportunity. Existing-Account mode collapses Account into a summary row with a "Change" link back to step 1.
- Opportunity type is shown as read-only text with a short reason ("Cross-sell, because Torres Roofing LLC is a Client"), not a select.
- Footer: "Back", "Cancel", primary "Qualify lead".

## FE notes

- Enhanced by US-XDT-002 (P1), US-WRK-004 (P1): the P0 build ships without these; their controls appear once those stories land.
- `QualifyDialog` step 2. Store action `qualifyLead({ leadId, targetAccountId?, account?, contact?, opportunity, saveXDates })`, implemented as one store transaction so the forced-error Demo control leaves no partial records.
- New Account: `status = 'Prospect'`, `source = lead.source`, `officeId` (from the Lead's Office), `producerId`, `accountManagerId`. Account Manager defaults to the Producer's usual Account Manager (`user.defaultAccountManagerId`), limited to the same Office.
- The follow-up Task uses the WRK Task shape (US-WRK-004) with `source = 'Lead'`; copied attempts use the Activity shape (US-WRK-001).
- X-dates created here go through `createXDate` (US-XDT-002) with `source = 'Lead'` and the X-date shape from the XDT Epic (`line`, `currentCarrier`, `xDate`, `premium`, `interestLevel = 'High'`).
- Navigation with the router after the promise resolves; the Lead record keeps the links for later.

## Mock data

- A Contacted Lead with 3 attempts, a Next follow-up in 2 days, current carrier and an X-date in 52 days (Personal, Home + Auto), to show X-date saving and the Contacted starting stage.
- Producers with a `defaultAccountManagerId` in the same Office; one Producer whose default Account Manager is in another Office, to trigger the validation.
