---
id: US-PIP-010
title: Mark an Opportunity Won and create Bound Terms
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P0
status: Draft
size: M
routes: [/pipeline/:id, /pipeline]
dependsOn: [US-PIP-009, US-FND-005, US-WRK-005]
---

## Story

As a Producer, I want to mark an Opportunity Won and confirm the bound premium for each accepted line, so that the new Policies appear in the Book in Bound status and the Account becomes a Client.

## Acceptance criteria

- Given an open Opportunity with at least one accepted line, when I click "Mark as Won" (header, list overflow menu, or a drop on the Board's Won zone), then a dialog lists each accepted line with: Carrier, Quoted premium (read-only), Bound premium (required, prefilled with the quoted premium), Effective date (prefilled from the Quote), Term length (6 or 12 months; Auto defaults to 6, other lines to 12), Binder number (required, because the next AMS sync matches the Term by it), and Bill method (Direct bill or Agency bill).
- Given I change a bound premium, then the row shows the difference against the quoted premium, for example "+$72 (+3.4%) vs quoted"; a difference over 10% adds an optional "Reason for the difference" note.
- Given no line is accepted, then "Mark as Won" is disabled with the tooltip "Record which lines the Account accepted first"; given an accepted Quote is Expired, then Won is blocked with "Lone Star Mutual quote expired on 11/12/2026. Update the quote before binding."
- Given an accepted Quote carries a license or appointment warning, then the dialog repeats it and requires the checkbox "I confirmed binding authority with the carrier" before Confirm is enabled.
- Given I confirm, then: the Opportunity becomes Won; each accepted line creates a Policy with one Term in status Bound with the bound premium, dates, binder number, and `binderExpiresAt` 30 days after binding; Quotes with accepted lines stay Accepted and every other Quote still Requested, Quoted, Referred, or Presented becomes Not taken; the Account becomes a Client if it was a Prospect; and an Activity "Opportunity won · 2 Terms bound · $3,626 bound premium" is logged.
- Given an Opportunity line was not accepted and has an X-date, then the dialog shows "Home was not accepted. Create an X-date for 03/14/2027?" checked by default; confirming creates the X-date through the XDT store action.
- Given I confirm, then a Task "Confirm the Gulf Harbor Insurance Auto policy is issued in the AMS" is created for the Account Manager, due 5 days before `binderExpiresAt`, and the page shows the Won banner with links to each new Policy (`/policies/:id`).

## UI states

- Empty: not reachable without an accepted line; the disabled button carries the tooltip above.
- Loading: Confirm shows a spinner and the dialog is locked; on success the dialog closes and the page refreshes the Opportunity.
- Error: "Couldn't mark the Opportunity Won. Nothing was bound." The mutation is all or nothing: no Term or X-date is created on failure.
- No permission: "Mark as Won" is hidden for Admins and for Account Managers on any type other than Remarket, and disabled with "Only the Producer or a Principal can mark this Won" for other Producers.
- Overflow: up to 7 accepted lines from up to 7 carriers render as rows grouped by carrier; bound premium accepts up to $9,999,999; the total row reads "Bound premium $41,280 · Quoted $40,950 · +$330 (+0.8%)".

## Design notes

- Modal dialog 720px titled "Mark as Won". Rows grouped by carrier with the carrier name as a group header. Columns: Line, Quoted premium, Bound premium (input, right-aligned), Effective, Term, Binder #, Bill method.
- Quoted and bound premium sit side by side with different labels and never share a column; bound premium input is the only editable money field.
- Below the rows: warnings stack (if any), then the X-date offers for non-accepted lines, then the total row. Footer: "Cancel", primary "Confirm and bind".
- After Won the new Terms are synced records: on the Opportunity they show a muted "Awaiting AMS" marker until the next sync matches them by binder number, and they are never editable in Fortify.

## FE notes

- Enhanced by US-XDT-002 (P1): the P0 build ships without these; their controls appear once those stories land.
- Component `MarkWonDialog`. Store action `opportunities.markWon(id, { lines: [{ line, quoteId, boundPremium, effectiveDate, termMonths, binderNumber, billMethod }], createXDates: [...], acknowledgedWarnings })` performs everything in one store transaction: Opportunity stage, Quote statuses, Policy and Term creation (status Bound, `source: 'fortify-won'`, `binderNumber`, `binderExpiresAt`), Account status, X-dates (XDT `xDates.create`, US-XDT-002), Task (WRK task-create, US-WRK-005), Activity.
- AMS match: the mock sync (US-FND-005) clears "Awaiting AMS" on a `fortify-won` Term whose `binderNumber` matches a synced Term, and replaces its data with the synced record.
- Store `boundPremium` on the Term and keep `quotedPremium` on the Quote line; reports read both (RPT production report).
- Expiration date = effective date + term length; unit-test month-end cases (01/31 + 6 months = 07/31).

## Mock data

- Torres Household with Auto accepted on Gulf Harbor Insurance and Home on Lone Star Mutual, Umbrella not accepted and with an X-date.
- A Prospect Account so Won flips it to Client.
- A Quote with an appointment warning to show the acknowledgment checkbox, and one Expired accepted Quote to show the block.
