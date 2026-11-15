---
id: US-PIP-007
title: Record the carrier response on a Quote
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P0
status: Draft
size: M
routes: [/pipeline/:id]
dependsOn: [US-PIP-006, US-WRK-005]
---

## Story

As a Producer, I want to record what each carrier came back with, a premium per line, a decline, or a referral to underwriting, so that the Opportunity shows which offers are real.

## Acceptance criteria

- Given I click a Quote row, then a side sheet opens showing Carrier, Quote number, Status, Effective date, Valid until, and a per-line table (Line, Quoted premium, Limits and deductibles, Line note), plus Fees and taxes and Total quoted premium.
- Given a Requested Quote, when I choose "Record response", then I can set it to Quoted, Declined, or Referred; given a Referred Quote, I can set it to Quoted or Declined.
- Given I set Quoted, then each line needs a quoted premium of more than $0 or the mark "Not offered" (the carrier quoted the other lines but not this one); at least one line must have a premium. Total quoted premium = sum of line premiums + fees and taxes.
- Given I set Declined, then a reason is required: Outside appetite, Loss history, Coverage not available, Missing information, or Other (note required). The Quote leaves the compare view's default columns (US-PIP-008).
- Given I set Referred, then a referral note and an expected response date are required, and a Task "Follow up with Keystone Commercial Casualty underwriting on Torres Roofing LLC" is created for the Producer, due on that date.
- Given Valid until is in the past, then the Quote shows an "Expired" tag next to its status; it cannot be presented or accepted until I edit Valid until, which logs "Quote validity extended to 12/20/2026".
- Given any response is saved, then an Activity is logged ("Lone Star Mutual quoted Auto $1,486, Home $2,140") and the Opportunity's best quoted premium updates.

## UI states

- Empty: a Requested Quote shows "Waiting on Lone Star Mutual since 11/10/2026 (5 days)" and the "Record response" button.
- Loading: sheet body skeleton; Save shows a spinner.
- Error: save failure keeps the sheet open with "Couldn't save the response. Try again."; field errors inline ("Enter a premium or mark Not offered").
- No permission: read-only sheet for Admins, other Producers, and Account Managers on any type other than Remarket; "Record response" and Edit are hidden and a muted line says "View only".
- Overflow: Limits and deductibles text wraps up to 3 lines then truncates with "Show more"; quoted premium up to $9,999,999 with tabular figures.

## Design notes

- Right side sheet 520px with the status shown as a dot plus label at the top (Requested neutral, Quoted blue, Referred orange, Declined red, Presented purple, Accepted green, Not taken neutral). Status color always comes with the text label.
- "Not offered" is a per-line checkbox that greys the premium input.
- Quoted premium is labeled "Quoted premium" everywhere in PIP so it is never confused with the bound premium captured at Won (US-PIP-010).

## FE notes

- Component `QuoteSheet` with a `RecordResponseForm`. Store action `quotes.recordResponse(id, { status, lines, fees, declineReason, referral })`.
- Allowed transitions encoded in one map: Requested → Quoted | Declined | Referred; Referred → Quoted | Declined; Quoted → Presented (US-PIP-008); Presented → Accepted | Not taken (US-PIP-009, US-PIP-010). Unit-test the map.
- The referral Task uses the shared task-create action from WRK (US-WRK-005); Expired is derived from `validUntil < today`, not stored.

## Mock data

- Quotes in every status; one Referred commercial Quote with an expected response date tomorrow; one Quoted Quote with Valid until 3 days ago (Expired); one Quote with one line "Not offered".
- Decline reasons spread across the five options.
