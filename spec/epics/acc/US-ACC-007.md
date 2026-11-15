---
id: US-ACC-007
title: Edit Account details
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-ACC-005, US-ACC-006, US-SRV-006]
---

## Story

As an Account Manager, I want to edit an Account's Fortify-owned details such as name, address, preferred contact method, and Business facts, so that the record stays current without touching data the AMS owns.

## Acceptance criteria

- Given I choose "Edit details" from the header overflow or the details panel, when the drawer opens, then it shows the same fields as creation for the Account's kind, prefilled, without Producer, Account Manager, or status.
- Given I change the mailing address and save, when the store updates, then the panel shows the new address, a System Activity "Mailing address changed by Marisol Reyes" is logged, and a toast reads "Account updated".
- Given a field mirrors AMS data (named insured on a Policy, Insured items, Locations), when the drawer renders, then it is not present and a note reads "Policy details are synced from the AMS. Request a policy change to update them." with a link that starts a Service Request of type Policy change.
- Given a Business, when the drawer renders, then the Business facts are editable: entity type, FEIN last 4, NAICS, revenue, payroll, employees, and WC status; "Non-subscriber (TX)" is offered only for Texas Businesses and reveals a "DWC Form-005 filed on" date (MM/DD/YYYY, optional, not in the future).
- Given I try to change the kind from Household to Business, when the form renders, then kind is shown read-only; changing kind is not supported.
- Given validation fails, when I save, then the drawer stays open with field messages and nothing is written.

## UI states

- Empty: optional fields left blank save as empty and display "—".
- Loading: "Saving…" on the primary button with inputs disabled.
- Error: a forced error shows "We couldn't save your changes. Try again." and keeps the edits.
- No permission: Account is E for all roles within scope; an Archived Account disables "Edit details" with the tooltip "Archived accounts are read-only."
- Overflow: Account name capped at 120 characters with a counter after 100.

## Design notes

- Reuses the 480px create drawer layout with title "Edit account details" and primary "Save changes"; unchanged form keeps the button disabled.

## FE notes

- `EditAccountDrawer` reuses the `AccountForm` from US-ACC-002 in edit mode; the policy-change link opens the Policy change form (US-SRV-006); `updateAccount(id, patch)` logs one System Activity listing changed fields ("Changed: mailing address, preferred contact").

## Mock data

- Torres Household and Torres Roofing LLC; one Archived Account to show the disabled state.
