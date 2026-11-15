---
id: US-POL-007
title: Personal auto Insured items with TX and FL auto coverages
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/policies/:id]
dependsOn: [US-POL-002, US-POL-003]
---

## Story

As an Account Manager, I want the vehicles, drivers, and state-required auto coverages on a personal auto Policy, including whether PIP and UM/UIM were rejected in writing, so that I can answer ID card and coverage questions and spot gaps before renewal.

## Acceptance criteria

- Given the Insured items tab on a personal auto Policy, then I see two tables: Vehicles (Year, Make, Model, VIN, Garaging ZIP, Use, Comprehensive deductible, Collision deductible) and Drivers (Name, Age, License state, Relationship, Status: Rated or Excluded).
- Given a TX auto Policy, then a "Texas auto" card shows BI/PD limits (e.g. 30/60/25), PIP as "Selected · $2,500" or "Rejected in writing · 03/01/2025", and UM/UIM as "Selected · 30/60" or "Rejected in writing · 03/01/2025".
- Given TX BI/PD limits below 30/60/25, then the card shows a warning "Below the Texas minimum of 30/60/25" (only possible in seeded edge-case data).
- Given a FL auto Policy, then a "Florida auto" card shows PIP $10,000, PDL $10,000, and BI as a limit or "Not carried (optional in FL)".
- Given a driver row, then the driver's license number and full date of birth are never shown; only age and license state appear.
- Given any row's overflow menu, then the only action is "Request a change to this item" (US-POL-003).

## UI states

- Empty: "No vehicles synced" or "No drivers synced" per table, each with a muted hint "Vehicles appear here after the AMS syncs them."
- Loading: card skeleton and 3 skeleton rows per table.
- Error: inline error per table with Retry.
- No permission: none beyond the Policy page; sensitive driver fields are omitted for every role.
- Overflow: a fleet-like household with 9 vehicles and 7 drivers; VIN shows in mono with the full 17 characters, truncating under 1280px to "…4F2219" with a tooltip.

## Design notes

- State card is a white card with ring at the top of the tab: label/value pairs in two columns; "Rejected in writing" shows a neutral document icon plus the date, not a warning, because rejection is a valid choice.
- Tables follow the 40px data table; Excluded drivers show a muted "Excluded" status label.

## FE notes

- `AutoInsuredItems` renders `VehiclesTable`, `DriversTable`, and `StateAutoCard` chosen by `policy.state` ('TX' | 'FL').
- Fields: `vehicle.{year, make, model, vin, garagingZip, use, compDeductible, collDeductible}`, `driver.{name, age, licenseState, relationship, excluded}`, `autoCoverages.{bi, pd, pip: { status: 'selected' | 'rejected_in_writing', limit, rejectedOn }, um: {...}, pdl}`.
- The minimum check is a pure helper `isBelowTxMinimum(bi, pd)` with a unit test.

## Mock data

- TX auto with PIP rejected in writing and UM/UIM selected; TX auto with both selected; FL auto with BI not carried; one seeded TX auto at 25/50/25 for the warning.
- The Torres Household auto Policy with 3 vehicles and 4 drivers, one Excluded.
