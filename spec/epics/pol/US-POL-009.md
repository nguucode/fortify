---
id: US-POL-009
title: Commercial Insured items with locations, vehicles, and WC payroll
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/policies/:id]
dependsOn: [US-POL-002, US-POL-003, US-POL-007]
---

## Story

As an Account Manager for Businesses, I want the locations on a BOP or GL Policy, the vehicles on a Commercial auto Policy, and the class codes and payroll on a WC Policy, so that I can answer audit and certificate questions from one place.

## Acceptance criteria

- Given a BOP or GL Policy, then a Locations table lists #, Address, Occupancy, Building limit, Business personal property limit, and Deductible; FL locations add the hurricane deductible and TX coastal locations add WPI-8 number, using the same field formats as US-POL-008.
- Given a Commercial auto Policy, then Vehicles and Drivers tables render with the same columns as US-POL-007 plus Vehicle class and Radius.
- Given a WC Policy, then a table lists State, Class code, Description, Estimated payroll, and Rate, with a total payroll row and the employee count; the Policy header shows "Auditable · Annual".
- Given a Business with 12 Locations, then all 12 rows render without pagination and the tab label reads "Insured items (12)".
- Given any row menu, then the only action is "Request a change to this item".

## UI states

- Empty: "No locations synced yet." / "No class codes synced yet." per table.
- Loading: skeleton rows per table.
- Error: per-table inline error with Retry.
- No permission: none beyond the Policy page.
- Overflow: payroll up to $14,500,000 right-aligned in tabular figures; long occupancy descriptions truncate with a tooltip.

## Design notes

- Tables only, no cards, because commercial data is row-shaped; totals row on the recessed surface in 600 weight.

## FE notes

- `CommercialInsuredItems` switches on `policy.line` ('BOP' | 'GL' | 'Commercial auto' | 'WC'); reuses `VehiclesTable` and `DriversTable` from US-POL-007 and the wind field formatters from US-POL-008.
- Fields: `location.{number, address, occupancy, buildingLimit, bppLimit, deductible, flWind?, txWind?}`, `wcClass.{state, code, description, payroll, rate}`.

## Mock data

- The Business with 12 Locations (hand-made edge case), split across TX and FL.
- Torres Roofing LLC: GL with 2 locations and Commercial auto with 4 trucks; a FL construction WC Policy with 6 employees.
