---
id: US-POL-003
title: Request a change from a Policy
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/policies/:id]
dependsOn: [US-POL-002, US-SRV-005, US-SRV-006]
---

## Story

As an Account Manager, I want a "Request a change" action on the Policy page and on each Insured item, so that every change to synced data goes through a Policy change Service Request instead of an edit.

## Acceptance criteria

- Given I am on `/policies/:id`, when I click "Request a change", then the Service Request create flow (SRV Epic) opens with type Policy change, the Account and this Policy preselected, and the current Term's policy number shown.
- Given I open the row menu on an Insured item or an Additional interest, when I choose "Request a change to this item", then the same flow opens with the item prefilled in the description, e.g. "Change to vehicle 2021 Toyota Camry (VIN ending 4F2219)".
- Given the Service Request is created, then I return to the Policy page, a toast reads "Policy change SR-10496 created" with a link to `/service/:id`, and the Overview "Related" card lists it under open Service Requests.
- Given I am an Admin, then the button is disabled with the tooltip "Admins can view Service Requests but not create them."
- Given the current Term is Canceled or Expired, then the button is disabled with the tooltip "This policy has no active term. Start a new Opportunity instead."

## UI states

- Empty: not applicable; the action always renders in the header.
- Loading: button shows a spinner and is inert while the create flow loads.
- Error: if creating the Service Request fails, the SRV flow shows its error and the Policy page is unchanged.
- No permission: Admin disabled state with tooltip, as above.
- Overflow: the prefilled description truncates the item label at 80 characters.

## Design notes

- Outline 36px button "Request a change" with a pencil-slash or arrow icon at the right of the Policy header; never primary blue, because the page has no primary action.
- Row menu item sits in the Insured items and Additional interests row overflow menu; no inline edit affordances anywhere.

## FE notes

- `RequestChangeButton` calls the SRV create entry (US-SRV-005, `openServiceRequestCreate({ type: 'Policy change', accountId, policyId, description })`), which opens the Policy change form (US-SRV-006); this story only owns the entry point and the return toast, the form itself lives in SRV.
- Reuse the same component from US-POL-007, US-POL-008, US-POL-009, and US-POL-010 row menus.

## Mock data

- An Active Policy, a Canceled one, and an Expired one to show enabled and disabled states.
- The store returns the new Service Request id (e.g. SR-10496) so the toast link resolves.
