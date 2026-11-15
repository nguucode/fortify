---
id: US-SET-009
title: Carriers and appointments (read-only)
epic: SET
roles: [Admin, Principal]
priority: P1
status: Draft
size: M
routes: [/settings/carriers]
dependsOn: [US-FND-007, US-SET-001]
---

## Story

As a Principal, I want to see which Carriers the agency places business with, the lines each writes, and the agency's Appointment status in TX and FL, so that I know where we can quote before a Producer promises a client a market.

## Acceptance criteria

- Given I open `/settings/carriers`, when it loads, then one row per Carrier shows Name, NAIC # (mono), Lines (Personal, Commercial, or Personal and commercial), TX appointment, FL appointment (each as Active, Terminated, or "—" for none), In-force policies (count), and Type (Standard, E&S via wholesaler, Insurer of last resort, Windstorm pool).
- Given a row, when I click it, then a drawer shows the Carrier's Appointments per state with Status, Effective date, Termination date (MM/DD/YYYY or "—"), and appointed lines, plus counts of open Quotes and in-force Policies; nothing in the drawer is editable.
- Given the page, when any role views it, then the description reads "Managed in the AMS and carrier portals. Read only in Fortify." and there is no add, edit, or import action for any role, Admin included.
- Given a Carrier with a Terminated Appointment in a state that still has in-force Policies there, when the list renders, then the row shows a warning icon with the tooltip "Terminated in FL on 06/30/2026 · 41 policies in force", because those Policies cannot renew with it.
- Given filters, when I filter by State, Line, Appointment status, or Type, then the list updates ("Showing 4 of 10 carriers appointed in FL").

## UI states

- Empty: with "simulate empty", "No carriers synced yet. Check Data sync." with a link to `/settings/data-sync`.
- Loading: 10 skeleton rows.
- Error: page error panel "Carriers couldn't load." with "Try again".
- No permission: read-only for Admin and Principal by design; Producer and Account Manager get `/403`.
- Overflow: long Carrier names truncate with tooltip; the drawer lists up to 12 appointed lines with wrap.
- Filtered: chips with "Clear all"; no match shows "No carriers match these filters."

## Design notes

- Part B list page with the "Read only" badge next to the H1 for every role. Toolbar: search ("Search carriers"), Filters, Export (mock CSV); no primary button.
- Appointment cells: dot plus label (Active success, Terminated in text-muted). Type as plain text; Insurer of last resort and Windstorm pool get a small info icon with a tooltip explaining the role.
- Drawer 480px, definition-list layout.

## FE notes

- Store slice `carriers` (`id`, `name`, `naic`, `linesWritten`, `type`, `appointments[]` with `state`, `status`, `effectiveDate`, `terminationDate`, `lines[]`), the same shape PIP's `checkQuoteEligibility` reads (US-PIP-006); read-only selectors only, no actions.
- Keep `selectAppointment(carrierId, state)` in one module shared with PIP so the Settings page and the Quote warning can't disagree.

## Mock data

- The 10 fictional Carriers from the mock-data.md seed list: Lone Star Mutual, Gulf Harbor Insurance, Keystone Commercial Casualty, Gulfstream Indemnity, Pecan Valley Auto, Bayfront Specialty (E&S via wholesaler), Meridian National, Copperline Workers Comp, Sunshine State Residual (FL insurer of last resort), and Texas Coastal Windstorm Pool (TX windstorm pool).
- Mix, per the seed list: 4 personal lines only (Gulf Harbor Insurance, Gulfstream Indemnity, Pecan Valley Auto, Sunshine State Residual), 3 commercial lines only (Keystone Commercial Casualty, Bayfront Specialty, Copperline Workers Comp), 3 both (Lone Star Mutual, Meridian National, Texas Coastal Windstorm Pool); Lone Star Mutual, Pecan Valley Auto, and Texas Coastal Windstorm Pool have no FL Appointment, and Gulfstream Indemnity and Sunshine State Residual no TX Appointment; Gulf Harbor Insurance has a Terminated FL Appointment with 41 in-force FL Policies.
