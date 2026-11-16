---
id: US-SRV-010
title: ID card / evidence request form
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P1
status: Done
size: S
routes: [/service, /accounts/:id]
dependsOn: [US-SRV-005]
---

## Story

As an Account Manager, I want a quick form for auto ID cards and evidence of property insurance, so that same-day requests from Accounts, lenders, and dealers are logged with who gets what and how.

## Acceptance criteria

- Given type ID card / evidence, when the details section shows, then Document is one of Auto ID card, Evidence of property insurance (ACORD 27 for personal lines, ACORD 28 for commercial), Lender evidence, Declarations page copy; the options shown match the selected Policy's line.
- Given Document Auto ID card, when the section shows, then Vehicles is a multi-select of the Policy's vehicles with "All vehicles" selected by default.
- Given the Send to field, when the user picks, then options are a Contact on the Account (shows their email), an Additional interest on the Policy (read-only list, e.g. "First Coastal Bank · Mortgagee · Loan #0047712"), or Other (Name and Email); Delivery is Email, Text message link (Auto ID card only), or Mail.
- Given the user marks the request done, when the dialog opens, then at least one attachment is required: "Attach the ID card or evidence before marking done."
- Given the request was opened from the US-SRV-007 toast, when the sheet shows, then the new vehicle is preselected and the subject reads "ID card / evidence · Auto ID card · 2024 Toyota RAV4".

## UI states

- Empty: a Policy with no Additional interests hides that option and shows "No additional interests on this policy." in muted text; an Account with no Contact leaves Other as the only Send to option.
- Loading: vehicle and Additional interest lists show skeleton rows.
- Error: "Choose who receives it."; "Enter a valid email."
- No permission: Admin cannot open the sheet. Additional interests are synced and cannot be added here; the helper reads "To add a mortgagee or lienholder, create a Policy change."
- Overflow: a commercial auto Policy with 25 vehicles shows a searchable multi-select with a "25 selected" summary.

## Design notes

- Compact section: Document select, Vehicles (when shown), Send to (radio group with the nested fields inline), Delivery (segmented control).
- Details view shows "Auto ID card · 2 vehicles → Maria Torres (maria.torres@example.com) by Email".

## FE notes

- Registers `serviceTypeRegistry['ID card / evidence']`; `canClose` checks `attachments.length > 0`.
- Fortify doesn't generate documents; the Account Manager downloads them from the carrier portal and attaches them on close (mock attachment).
- Reads `policies.get(policyId).currentTerm.insuredItems` and `additionalInterests`, read-only.

## Mock data

- Torres Household auto with 2 vehicles (2021 Ford F-150, 2024 Toyota RAV4) and lienholder "Bayou Auto Credit".
- Okafor Household home with mortgagee "First Coastal Bank, Loan #0047712".
- Torres Roofing LLC commercial auto with 25 vehicles; Quintero Household with no Contact.
