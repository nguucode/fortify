---
id: US-ACC-006
title: Business details and Locations on the Overview tab
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/accounts/:id]
dependsOn: [US-ACC-004, US-CRT-001]
---

## Story

As a Producer selling commercial lines, I want a Business's Overview to show its legal entity, operations, payroll, revenue, workers' compensation status, and Locations, so that I have the underwriting basics in front of me when I talk to the owner.

## Acceptance criteria

- Given a Business, when the details panel renders, then it shows Legal name, DBA, Entity type (LLC, Corporation, Partnership, Sole proprietor, Nonprofit), FEIN (last 4 only, shown as "Ending 4821"), NAICS code and description, Years in business, Employees, Annual revenue, Annual payroll, and Website.
- Given a Texas Business that does not carry workers' compensation, when the panel renders, then WC status reads "Non-subscriber (TX)" with a warning icon, the DWC Form-005 filing date ("DWC-005 filed 03/12/2026"), and the tooltip "Not covered by workers' compensation by choice. Confirm employer's liability alternatives."; other values are "Covered" or "Exempt".
- Given a Non-subscriber (TX) Business with no DWC Form-005 date on or after February 1 of this year, when today is after April 30, then the filing line reads "DWC-005 not on file for 2026" in warning text; before May 1 it reads "DWC-005 due by 04/30/2026" in muted text.
- Given the Business has Locations synced from the AMS, when the Locations section renders, then it lists each as a 40px row with location number, address, occupancy, and building value, plus a total "12 locations".
- Given a Location row, when I click it, then it opens the Policy that insures it at `/policies/:id`; Locations have no edit control and show "Synced from AMS".
- Given the Business has Holders, when the panel renders, then it shows "8 holders" linking to the Service tab's Holders sub-tab (owned by the Certificates Epic).

## UI states

- Empty: a Prospect Business shows "No locations yet. Locations appear once a policy is bound." and "—" for missing revenue or payroll.
- Loading: skeleton for the definition list and 5 skeleton rows for Locations.
- Error: "Couldn't load locations. Retry." inside the section only.
- No permission: all roles read; FEIN is never shown in full in Fortify.
- Overflow: 12 Locations show the first 5 and "Show all 12" expands in place; revenue up to $48,500,000 renders as "$48.5M" with the full value in a tooltip.

## Design notes

- Same panel grammar as the Household panel, titled "Business details".
- Locations as a compact nested table inside the panel (no checkbox column), right-aligned building values with tabular figures.
- Revenue, payroll, and employees as three inline stat pairs above the definition list.

## FE notes

- `BusinessDetailsPanel` reads Fortify-owned Business fields from `account` and Locations via `selectInsuredItemsForAccount(accountId, { kind: 'location' })`.
- WC fields: `account.wcStatus` ('Covered' | 'Exempt' | 'Non-subscriber (TX)') and `account.dwc005FiledOn`. Texas non-subscribers file DWC Form-005 every year between February 1 and April 30 (TDI, DWC Form-005).
- Format money with a shared `formatMoney(value, { compact })`; FEIN rendered from `account.feinLast4` only.

## Mock data

- Torres Roofing LLC (Houston, 12 Locations, 22 employees, $3.2M revenue, $1.1M payroll).
- A San Antonio Business that is a WC non-subscriber with DWC Form-005 filed 03/12 this year, and a Houston non-subscriber with no filing this year.
- A Prospect Business with no Locations and no revenue.
