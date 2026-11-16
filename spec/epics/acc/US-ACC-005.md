---
id: US-ACC-005
title: Household details on the Overview tab
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-ACC-004]
---

## Story

As an Account Manager, I want a Household's Overview to show its address, its Contacts, and a read-only summary of its Insured items (vehicles, drivers, and homes), including the coastal fields for TX and FL, so that I can answer a quick question without opening each Policy.

## Acceptance criteria

- Given a Household, when the details panel renders, then it shows Mailing address, County, Preferred contact method, Account source, Created date, and a "Coastal" flag when the property ZIP is in a coastal area.
- Given the Household has Active Terms, when the "Insured items" section renders, then it groups items synced from the AMS as Vehicles (year, make, model, last 4 of VIN), Drivers (name, age), and Properties (address, year built), each linking to its Policy at `/policies/:id`.
- Given a Florida coastal property, when it renders, then it shows Hurricane deductible (e.g. "2% · $8,400") and Wind mitigation inspection date (MM/DD/YYYY, warning text if older than 5 years); a Texas coastal property shows its WPI-8 number.
- Given I hover an Insured item, when the tooltip appears, then it reads "Synced from AMS. Request a policy change to update it." and no edit control is shown.
- Given I click "Edit details", when the edit flow opens, then only Fortify-owned fields are editable (US-ACC-007).

## UI states

- Empty: a Prospect with no Terms shows "No insured items yet. Items appear once a policy is bound." under Insured items.
- Loading: a 6-line skeleton inside the panel.
- Error: "Couldn't load insured items. Retry." inside the section; the address block still shows.
- No permission: all roles can read; the panel has no edit controls for synced data in any role.
- Overflow: 6 vehicles and 7 drivers collapse to the first 3 of each with "Show all"; long street addresses wrap to two lines.

## Design notes

- Panel is a white card with ring, title "Household details" (16/500) and an "Edit" text action top-right.
- Label/value rows in a two-column definition list, 13px label in text-label, 14px value.
- Insured items section has a muted "Synced from AMS" caption with a sync icon at the right of its title.
- VIN last 4 and WPI-8 numbers in the mono stack.

## FE notes

- `HouseholdDetailsPanel` reads `account` plus `selectInsuredItemsForAccount(accountId)` (Active Terms only), grouped by `item.kind` (vehicle, driver, property).
- Coastal fields come from `property.hurricaneDeductible`, `property.windMitigationDate` (FL) and `property.wpi8Number` (TX).

## Mock data

- Torres Household (Houston TX, coastal, WPI-8 number) with 2 vehicles, 3 drivers, 1 home.
- A Tampa FL Household with a 2% hurricane deductible and a wind mitigation date from 03/2019 (stale).
- A Household with 6 vehicles and 7 drivers for overflow.
