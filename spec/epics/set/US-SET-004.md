---
id: US-SET-004
title: Offices page with editable details
epic: SET
roles: [Admin, Principal]
priority: P1
status: Draft
size: S
routes: [/settings/offices]
dependsOn: [US-SET-001]
---

## Story

As an Admin, I want to see the three Offices with their address, phone, time zone, and headcount, and correct their details, so that certificates, templates, and business-hour clocks use the right Office information.

## Acceptance criteria

- Given I open `/settings/offices`, when it loads, then I see three rows: Houston TX, San Antonio TX, Tampa FL, each with Address, Phone, Time zone (Central for both TX Offices, Eastern for Tampa), Business hours (for example "Mon–Fri 8:00 AM–5:00 PM"), Users (count), and Accounts (count).
- Given I am an Admin, when I click "Edit" on an Office, then a drawer lets me change Address line 1, Address line 2, City, ZIP, Phone, and Email; Name, State, Time zone, and Business hours are read-only, since business hours are fixed at Mon–Fri 8:00 AM–5:00 PM for the Service SLAs (rules.md).
- Given I save valid changes, when the save completes, then the row updates and a toast reads "Tampa FL office updated"; the new address appears in the producer block of the next Certificate preview.
- Given Phone is not 10 digits or ZIP is not 5 digits, when I save, then the field shows an inline error and nothing is saved.
- Given the page, when any role views it, then there is no "Add office" or "Archive office" action, and the description reads "Fortify supports the agency's three offices."
- Given the Users or Accounts count, when I click it, then I go to `/settings/users` or `/accounts` filtered to that Office.

## UI states

- Empty: cannot occur; with "simulate empty", "No offices configured." with no action.
- Loading: 3 skeleton rows.
- Error: page error panel "Offices couldn't load." with "Try again"; save errors keep the drawer open.
- No permission: Principal sees "Edit" disabled with "Only Admins can change Settings."; Producer and Account Manager get `/403`.
- Overflow: long street addresses truncate in the table with tooltip and wrap in the drawer.

## Design notes

- A compact table, not cards, to keep the Settings density consistent. Counts right-aligned with tabular-nums.
- Drawer 480px; read-only fields render as label plus value text, not disabled inputs.

## FE notes

- Store: `offices` slice; action `updateOffice(id, patch)`. Time zone values `America/Chicago` and `America/New_York` feed `businessHoursSince()` used by CRT and SRV age clocks.
- Counts via `selectUserCountByOffice`, `selectAccountCountByOffice`.

## Mock data

- 3 Offices with fictional street addresses on real ZIPs (77002 Houston, 78205 San Antonio, 33602 Tampa), phones in (555) 010-xxxx, emails `@example.com`.
- Counts: Houston 11 users and about 300 Accounts, San Antonio 8 and about 150, Tampa 6 and about 150.
