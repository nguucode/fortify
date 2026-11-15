---
id: US-PIP-009
title: Accept Quote lines, including partial acceptance
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P0
status: Draft
size: S
routes: [/pipeline/:id]
dependsOn: [US-PIP-008]
---

## Story

As a Producer, I want to record which carrier the Account chose for each line, even when they take Auto from one carrier, Home from another, and pass on Umbrella, so that Won binds exactly what was accepted.

## Acceptance criteria

- Given the comparison view and at least one Presented Quote, when I switch to "Record acceptance", then each line row becomes a single-choice group across the Presented columns plus a "None" option, default None.
- Given I choose a cell, then only Presented, non-expired Quotes that offered that line are selectable; one line can be accepted on exactly one Quote.
- Given I save the acceptance, then each Quote with at least one accepted line becomes Accepted, its accepted lines are marked, and an acceptance summary appears above the matrix: "Accepted: Auto, Gulf Harbor Insurance $1,486 · Home, Lone Star Mutual $2,140 · Umbrella, none".
- Given acceptance is saved, then the primary action "Mark as Won" in the header becomes enabled and an Activity "Maria Torres accepted Auto (Gulf Harbor Insurance) and Home (Lone Star Mutual)" is logged.
- Given the Opportunity is still open, when I change or clear an acceptance, then Quotes with no accepted lines go back to Presented and the summary updates; after Won, acceptance is locked.

## UI states

- Empty: no Presented Quotes shows "Mark at least one Quote as Presented before recording acceptance."
- Loading: Save shows a spinner; choices are disabled while saving.
- Error: "Couldn't save the acceptance. Try again." and the previous choice is restored.
- No permission: "Record acceptance" is hidden for Admins, Producers who are not the Producer, and Account Managers on any type other than Remarket; they see the acceptance summary read-only.
- Overflow: 7 lines by 6 Quotes stays usable with the sticky line column; the summary wraps to two lines and then truncates with "+2 more".

## Design notes

- Radio-like cells: a 16px radio in the cell left of the premium; the selected cell gets a recessed fill and a 1px primary ring. "None" is the last column, narrow.
- Footer bar during edit: "Cancel" and primary "Save acceptance".

## FE notes

- Mode on `QuoteCompare`: `mode = 'compare' | 'accept'`. Store action `quotes.setAcceptedLines(opportunityId, { [line]: quoteId | null })` updates every affected Quote in one mutation.
- Opportunity selector `acceptedLines(opportunity)` feeds US-PIP-010.

## Mock data

- Torres Household at Proposed with three Presented Quotes, so Auto and Home can come from different carriers and Umbrella from none.
- One Presented Quote that is Expired, to show a disabled cell.
