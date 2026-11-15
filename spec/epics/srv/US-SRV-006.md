---
id: US-SRV-006
title: Policy change request form
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P0
status: Draft
size: M
routes: [/service, /accounts/:id]
dependsOn: [US-SRV-005]
---

## Story

As an Account Manager, I want a Policy change form that lists the kinds of change an Account asks for, with the fields the carrier will need, so that I can send a complete change to the carrier in one pass and not call the Account back.

## Acceptance criteria

- Given type Policy change and a selected Policy, when the details section shows, then the user adds one or more changes with "+ Add change", each with a kind chosen from the Policy's line: personal auto offers Add vehicle, Remove vehicle, Replace vehicle, Add driver, Remove driver, Address change, Add or change lienholder, Coverage or limit change, Other; home offers Address change, Add or change mortgagee, Coverage or limit change, Other; commercial lines offer Add location, Remove location, Add vehicle, Remove vehicle, Payroll or revenue change, Coverage or limit change, Other.
- Given a kind, when it is chosen, then its fields show: Add vehicle asks Year, Make, Model, VIN (17 characters), Garaging ZIP, Use (Commute, Pleasure, Business), Lienholder (optional); Add driver asks First and last name, Date of birth, License state and number, Relationship to named insured; Remove and Replace pick from the Policy's Insured items; Coverage or limit change shows the current value from the Term read-only beside the requested value.
- Given Requested effective date (required, default today), when it falls outside the current Term, then the error reads "Effective date must fall within the current term (03/01/2026 – 03/01/2027)."; when it is more than 30 days in the past, a warning reads "Back-dated more than 30 days. The carrier may refuse it."
- Given a Texas personal auto Policy, when the requested liability limit is below 30/60/25, then the error reads "Texas minimum liability is 30/60/25."; given a Florida home Policy, the hurricane deductible options are $500, 2%, 5%, and 10% of the dwelling limit.
- Given the user submits, when the request is created, then its subject reads "Policy change · Add vehicle, Add driver" (kinds in order added), and the Details view on `/service/:id` lists each change with its fields and the effective date.
- Given the form, when it renders, then a muted note reads "Fortify doesn't change the policy. The carrier issues the endorsement, and the AMS syncs it."

## UI states

- Empty: before any change is added, the section shows "Add the first change." with the "+ Add change" button; submit is blocked with "Add at least one change."
- Loading: Insured item pickers show a skeleton row while the Term's Insured items load.
- Error: VIN shorter or longer than 17 characters shows "VIN must be 17 characters."; a Remove kind on a Policy with one vehicle shows "This is the only vehicle on the policy. Use Cancellation request to end coverage." Save failures follow US-SRV-005.
- No permission: same as US-SRV-005 (Admin cannot open the sheet). Insured items and Term values are read-only everywhere in this form.
- Overflow: up to 10 changes per request ("You can add up to 10 changes. Create another request for more."); a Business with 12 Locations shows the location picker as a searchable list.

## Design notes

- Each change is a white sub-card (ring, 8px radius) with a header row: kind select on the left, remove (trash icon button with label "Remove change") on the right. Fields in a 2-column grid at 560px.
- Current values from the Term render as read-only text in text-label with a small "From AMS" muted tag, never as disabled inputs.
- The Details view on the request page shows one block per change: kind as 14/500, then a label/value grid.

## FE notes

- Registers `serviceTypeRegistry['Policy change']` with `FormSection`, `formSchema` (zod discriminated union on `kind`), `defaultSubject(changes)`, `DetailsView`, and the `DoneDialogBody` from US-SRV-007.
- Kind lists by line live in `policyChangeKinds.ts`; state rules (TX 30/60/25, FL hurricane deductible options) in `stateRules.ts`, keyed by Policy state and line.
- Reads `policies.get(policyId)` with `currentTerm.insuredItems` and coverages; never writes them.
- Stored shape: `details: { effectiveDate, changes: [{ kind, fields }] }`.

## Mock data

- Torres Household personal auto LSM-PA-4471029 (TX, 2 vehicles, 3 drivers, 30/60/25 limits) and home GSI-HO3-882104 for Okafor Household (FL, coastal, 2% hurricane deductible, dwelling $420,000, mortgagee First Coastal Bank).
- Torres Roofing LLC commercial auto with 1 vehicle (to trigger the only-vehicle error) and a Business with 12 Locations.
- A Term running 03/01/2026 – 03/01/2027 for the effective-date rule.
