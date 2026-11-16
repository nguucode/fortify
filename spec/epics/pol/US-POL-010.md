---
id: US-POL-010
title: Additional interests on a personal-lines Policy
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/policies/:id]
dependsOn: [US-POL-002, US-POL-003]
---

## Story

As an Account Manager, I want to see the mortgagees, lienholders, and loss payees on a personal-lines Policy, so that I can confirm who receives evidence of insurance when a lender calls.

## Acceptance criteria

- Given the Additional interests tab, then a table lists Type (Mortgagee, Lienholder, Loss payee), Name, Position (1st, 2nd), Loan number, Address, and Applies to (the vehicle or dwelling).
- Given a loan number, then only the last 4 digits show ("••••6612") for every role.
- Given a commercial Policy, then the tab is not shown, and the Overview "Related" card links to the Account's Certificates instead.
- Given a row menu, then the only action is "Request a change to this item", which opens the Policy change flow prefilled with the interest name.

## UI states

- Empty: "No additional interests on this policy." (common for paid-off vehicles).
- Loading: 2 skeleton rows.
- Error: inline error with Retry.
- No permission: none beyond the Policy page; loan numbers masked for all.
- Overflow: lender names over 60 characters truncate with a tooltip; a home with 1st and 2nd mortgagee plus a vehicle lienholder sort by Applies to, then Position.

## Design notes

- Plain 40px data table; Type as text, no status color.

## FE notes

- `AdditionalInterestsTable` reads `store.additionalInterests.listByTerm(currentTermId)`; mask helper `maskLast4`.

## Mock data

- Home with two mortgagees; auto with one lienholder on one of three vehicles; boat with a loss payee; one Policy with none.
