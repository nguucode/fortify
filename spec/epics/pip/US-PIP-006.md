---
id: US-PIP-006
title: Add a Quote with license and appointment warnings
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P0
status: Done
size: M
routes: [/pipeline/:id]
dependsOn: [US-FND-005, US-PIP-004, US-PIP-005]
---

## Story

As a Producer, I want to add a carrier's Quote to an Opportunity and be warned when the agency is not appointed with that carrier in a state where the risk sits or the Producer is not licensed for the line there, so that I do not present an offer I cannot bind.

## Acceptance criteria

- Given I click "+ Add quote", then a dialog opens with: Carrier (required), Lines (checkboxes from the Opportunity's open lines, at least one), Status (Requested or Quoted, default Requested), Quote number (optional), Effective date (default the target effective date), Valid until (default today + 30 days), and, when Status is Quoted, a premium per selected line (required, more than $0) plus Fees and taxes (optional).
- Given the risk states (the Household's state, or every state among a Business's Locations, per rules.md), then carriers appointed in all of them appear first under "Appointed in TX" (or "Appointed in TX and FL"); carriers missing an Appointment in any risk state appear under "Not appointed in every risk state" with a warning icon. A line the carrier does not write is disabled with the reason, for example "Gulf Harbor Insurance writes personal lines only".
- Given I pick a carrier with no Appointment in one of the risk states, then a warning callout per missing state shows, for example, "The agency has no Florida appointment with Lone Star Mutual. You can record the Quote, but it can't be bound until the appointment is in place."
- Given the Opportunity's Producer has no active License for a selected line in any risk state, then a warning callout names the gap for that state, for example "Marcus Bell holds a Texas Personal Lines – Property and Casualty license. Commercial auto needs General Lines – Property and Casualty.", or "Dana Whitfield's Florida 2-20 General Lines license expired on 10/31/2026."
- Given warnings are shown, when I save, then the Quote is saved (warnings never block), its row carries a warning icon with the same text in a tooltip, and the logged Activity reads "Quote added: Lone Star Mutual, Auto, Home (saved with 1 warning)".
- Given the same carrier already has a Quote on this Opportunity that is not Declined, then an info note says "Lone Star Mutual already has a Quoted quote here. Add another quote from this carrier?" and saving creates a second Quote.
- Given I save, then the Quote appears in the Quotes section with its status, and if the stage was before Quoting it advances per US-PIP-005.

## UI states

- Empty: a carrier list with no appointed carriers for the state shows only the "Not appointed" group and the hint "No carriers are appointed in FL for these lines".
- Loading: carrier, appointment, and license data load before the dialog body; show a 4-row skeleton; Save shows a spinner.
- Error: save failure keeps the dialog open with "Couldn't save the Quote. Try again."; if license or appointment data fails to load, show "Couldn't check licenses and appointments" as a neutral note and allow saving.
- No permission: "+ Add quote" is disabled for Admins, Producers who are not the Producer, and Account Managers on any type other than Remarket, with the tooltip "Only the Producer or a Principal can add Quotes"; it is hidden on Won and Lost Opportunities.
- Overflow: carrier names up to 40 characters fit; longer names truncate with a tooltip; up to 7 lines show as a two-column checkbox grid; premiums accept up to $9,999,999.

## Design notes

- Modal dialog 560px. Order: Carrier, Lines, Status and dates, Premiums, then the warnings stack directly above the footer so it is the last thing read before Save. Footer: "Cancel", primary "Add quote".
- Warnings use the warning tint callout with an icon and a bold first line ("Not appointed in Florida", "License gap") and the detail as a muted second line. Two warnings stack, never merge.
- The License and Appointment data are read-only references (Settings > Licenses and Carriers, SET); no link to edit them from here.

## FE notes

- Component `AddQuoteDialog`. Store action `quotes.create(opportunityId, input)`; it stores `warnings: [{ kind: 'appointment' | 'license', message }]` on the Quote.
- Check function `checkQuoteEligibility({ carrier, lines, states, producer })`, run once per risk state, using `carrier.appointments` (by state), `carrier.linesWritten` (personal, commercial, or both), and `producer.licenses` (state, line of authority, expiration). Unit-test each warning.
- Risk states: the Household's state, or the distinct states of a Business's Locations (synced from the AMS), per rules.md.
- Line of authority mapping: TX General Lines – Property and Casualty covers all lines; TX Personal Lines – Property and Casualty covers personal lines only; FL 2-20 covers all; FL 20-44 covers personal lines only.

## Mock data

- The 10 carriers in the mock-data.md seed list, for example Lone Star Mutual (TX only, all lines), Gulf Harbor Insurance (TX and FL, personal only), Keystone Commercial Casualty (commercial only), Gulfstream Indemnity (FL only, home), Meridian National (TX and FL, all lines), plus Sunshine State Residual and Texas Coastal Windstorm Pool.
- A Business with Locations in TX and FL, to show a per-state warning.
- Marcus Bell (San Antonio Producer) with a TX Personal Lines license only, Dana Whitfield with an expired FL 2-20, Elena Brooks (Tampa) fully licensed in FL.
- A FL Household Opportunity owned by a Houston Producer to trigger both warnings.
