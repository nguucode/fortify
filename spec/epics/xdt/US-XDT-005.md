---
id: US-XDT-005
title: Start an Opportunity from an X-date
epic: XDT
roles: [Producer, Account Manager, Principal]
priority: P1
status: Draft
size: M
routes: [/x-dates, /accounts/:id]
dependsOn: [US-XDT-002, US-XDT-004, US-PIP-003, US-PIP-004, US-WRK-006]
---

## Story

As a Producer, I want to turn an X-date into an Opportunity in one step, bundling other lines that expire around the same time, so that I quote the Account before its renewal at the other agency.

## Acceptance criteria

- Given I click "Start quote" on an X-date with no Opportunity, when the dialog opens, then the Opportunity type is derived from the Account (Client: Cross-sell; Prospect or Former client: New business), the line is preselected, and other open X-dates on the same Account within 60 days are offered as extra lines, for example "Also include Auto (Lone Star Mutual, 02/02/2027)".
- Given the dialog opens, when I review it, then the target effective date defaults to the X-date (the earliest X-date when bundling), the estimated premium defaults to the sum of the X-date premiums, and the owner is the Account's Producer.
- Given I confirm, when the store saves, then an Opportunity is created in stage New linked to each included X-date, each X-date shows the Opportunity, their Open follow-up Tasks are completed with the Activity "Opportunity started from X-date", and I go to /pipeline/:id with the toast "Opportunity created".
- Given I am an Account Manager, when the Account is a Client, then I can start a Cross-sell; when it is a Prospect or Former client, "Start quote" is disabled with "Account Managers can create Cross-sell Opportunities only".
- Given I am an Admin, when I view an X-date, then "Start quote" is disabled with "Admins have read-only access to Opportunities".
- Given an X-date already has an Opportunity, when I view it, then "Start quote" is replaced by "Open Opportunity"; if that Opportunity is Lost, "Start quote" is offered again.

## UI states

- Empty: no other X-dates to bundle: the extra-lines group is hidden.
- Loading: confirm button spinner.
- Error: "Couldn't create the Opportunity. Nothing was changed." with "Try again" (atomic).
- No permission: as above for Account Manager and Admin; Producers only on Accounts in their Book.
- Overflow: bundling lists up to 6 lines as checkboxes; estimated premium up to $9,999,999.

## Design notes

- Dialog, 520px, titled "Start quote · Okafor Household". Type as read-only text with its reason. Extra lines as a checkbox list with carrier and date in muted text. Footer "Cancel", primary "Create Opportunity".
- Entry points: the X-date drawer, the row overflow menu on /x-dates, the Account X-dates section, and the Overview nudge.

## FE notes

- `StartQuoteFromXDateDialog`. Store action `createOpportunityFromXDates({ xDateIds, type, lines, targetEffectiveDate, estimatedPremium })`, one transaction that also updates X-dates and completes Tasks.
- Opportunity shape and stages are owned by the PIP Epic (US-PIP-003; the landing page is US-PIP-004); this story only creates it in stage New with `source = 'X-date'`. Completing the follow-up Tasks reuses `completeTask` (US-WRK-006).
- Permission helper `can(user, 'opportunity.create', { account, type })` encodes the Account Manager Cross-sell rule.

## Mock data

- Okafor Household (Prospect) with Home and Auto X-dates 19 days apart; a Client with one Home X-date for the Account Manager Cross-sell path; an X-date linked to a Lost Opportunity.
