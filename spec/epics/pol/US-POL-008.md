---
id: US-POL-008
title: Property Insured items with FL hurricane and wind mitigation and TX windstorm pool fields
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/policies/:id]
dependsOn: [US-POL-002, US-POL-003]
---

## Story

As an Account Manager in Tampa or Houston, I want the dwelling and its coastal fields on a home, condo, renters, or dwelling fire Policy, so that I can see the hurricane deductible, wind mitigation status, or windstorm-pool standing without calling the Carrier.

## Acceptance criteria

- Given the Insured items tab on a property Policy, then a Dwelling card shows Address, Year built, Roof year, Construction, Coverage A (dwelling limit), AOP deductible, Flood zone, and Sinkhole coverage (FL only: "Full" or "CGCC only").
- Given a FL property Policy, then a "Florida wind" card shows the hurricane deductible as selected ($500, 2%, 5%, or 10%) with its dollar value computed from Coverage A, e.g. "2% · $8,400 of $420,000".
- Given a FL property Policy with a wind mitigation inspection, then the card shows "Wind mitigation · OIR-B1-1802 · inspected 06/12/2024 · valid until 06/12/2029" and lists features (Roof covering, Roof deck attachment, Roof-to-wall, Secondary water resistance, Opening protection) with their recorded values; within 90 days of expiry the validity shows in warning text.
- Given a FL property Policy with no wind mitigation on file, then the card reads "No wind mitigation inspection on file" in neutral with a hint that it can lower the wind premium.
- Given a TX property Policy in the windstorm-pool area, then a "Texas wind" card shows "In windstorm-pool area: Yes", the WPI-8 number (e.g. WPI-8 No. 0412987), the wind/hail deductible, and a link to the separate windstorm-pool Policy on the same Account when one exists; outside the area it shows "In windstorm-pool area: No" and nothing else.
- Given any row or card menu, then the only action is "Request a change to this item".

## UI states

- Empty: "No property details synced yet." in the Dwelling card.
- Loading: card skeletons in the final layout.
- Error: per-card inline error with Retry.
- No permission: none beyond the Policy page.
- Overflow: renters and condo Policies hide fields that do not apply (no Coverage A on renters; Coverage A shows "Walls-in" value on condo); long addresses wrap to two lines.

## Design notes

- Cards in a two-column grid at 1440px, single column under 1280px. Values 14px, labels 12px text-label.
- Hurricane deductible percentage and dollar value use tabular figures; no status color unless validity is near expiry.

## FE notes

- `PropertyInsuredItems` renders `DwellingCard` plus `FlWindCard` or `TxWindCard` by `policy.state`.
- Fields: `dwelling.{address, yearBuilt, roofYear, construction, coverageA, aopDeductible, floodZone, sinkhole}`, `flWind.{hurricaneDeductible: { type: 'flat' | 'percent', value }, windMitigation: { form: 'OIR-B1-1802', inspectedOn, features }}`, `txWind.{inWindstormPoolArea, wpi8Number, windHailDeductible, poolPolicyId}`.
- `hurricaneDeductibleDollars(type, value, coverageA)` helper with a unit test; wind mitigation validity is inspectedOn + 5 years.

## Mock data

- About 20% of Accounts are coastal: FL ones carry a hurricane deductible and a wind mitigation date; TX ones sit in the windstorm-pool area with a WPI-8 number.
- FL home at 10% hurricane deductible on $650,000 Coverage A; FL home with wind mitigation expiring in 45 days; FL home with none on file; TX home with a separate Policy at the fictional TX windstorm pool; FL condo; renters.
