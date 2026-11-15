---
id: US-PIP-011
title: Mark an Opportunity Lost with a reason and X-dates
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P1
status: Draft
size: S
routes: [/pipeline/:id, /pipeline]
dependsOn: [US-PIP-004, US-XDT-002]
---

## Story

As a Producer, I want to close a lost Opportunity with a reason and keep the X-dates I learned, so that the agency can report why it loses and quote again ahead of each X-date.

## Acceptance criteria

- Given an open Opportunity, when I click "Mark as Lost" (header, list overflow menu, or the Board's Lost zone), then a dialog asks for a reason (required): Price, Coverage, Stayed with current carrier, No response, All carriers declined, Not eligible, Duplicate, or Other (note required).
- Given each Opportunity line with an X-date, then the dialog offers "Create X-date: Home, current carrier Meridian National, $2,310, 03/14/2027", checked by default; lines without a date offer an optional date field.
- Given I confirm, then the Opportunity becomes Lost with the reason and date, any recorded acceptance is cleared (Accepted Quotes go back to Presented, per US-PIP-009) and every Quote still Requested, Quoted, Referred, or Presented becomes Not taken, chosen X-dates are created through the XDT store action, and an Activity "Opportunity lost · Price · 1 X-date created" is logged.
- Given a Lost Opportunity within 90 days of its loss, when the Producer or a Principal clicks "Reopen", then it returns to Gathering info, Quotes stay Not taken, created X-dates are kept, and an Activity "Opportunity reopened" is logged.
- Given the reason is Duplicate, then no X-date is offered.

## UI states

- Empty: an Opportunity with no lines with dates shows the X-date section as "No X-dates recorded" with the optional date fields.
- Loading: Confirm shows a spinner; dialog locked.
- Error: "Couldn't mark the Opportunity Lost. Nothing was changed."
- No permission: "Mark as Lost" and "Reopen" are hidden for Admins and for Account Managers on any type other than Remarket, and disabled with a tooltip for other Producers.
- Overflow: a long "Other" note is limited to 500 characters with a counter; up to 7 X-date offers list without scrolling.

## Design notes

- Modal dialog 480px titled "Mark as Lost". Reason as a radio list (not a select) so all options are visible. Primary button "Mark as Lost" uses the danger style.
- X-date offers as checkbox rows with the line in text-strong and carrier, premium, and date muted.

## FE notes

- Component `MarkLostDialog`. Store action `opportunities.markLost(id, { reason, note, xDates })` in one transaction; `opportunities.reopen(id)` checks the 90-day window.
- X-date creation calls the XDT action (US-XDT-002) `createXDate({ accountId, line, currentCarrier, premium, xDate, source: 'Lost opportunity', sourceRef: opportunityId })`; XDT owns its Task timing.

## Mock data

- An open Opportunity with two lines that have X-dates and one without.
- A Lost Opportunity 30 days old (Reopen available) and one 120 days old (Reopen unavailable).
