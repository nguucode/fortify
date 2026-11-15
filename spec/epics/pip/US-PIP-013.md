---
id: US-PIP-013
title: Commission visibility on Opportunities and Quotes
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/pipeline, /pipeline/:id]
dependsOn: [US-PIP-002, US-PIP-004, US-PIP-008, US-PIP-010]
---

## Story

As a Producer, I want to see the estimated commission and my share on my own Opportunities, and only mine, so that I know what a sale is worth to me while commission stays private to the people allowed to see it.

## Acceptance criteria

- Given I am the Producer on an Opportunity, then the Details panel shows "Est. agency commission $412" (best quoted premium, or bound premium after Won, times the carrier's rate per line) and "Your share 50% · $206". The share is the rules.md default: 50% on New business and Cross-sell, 40% on Remarket, which counts as renewal business.
- Given I am a Principal or Admin, then I see the estimated agency commission and the Producer's share, for example "Agency $412 · Dana Whitfield 50% · $206", on the Details panel, in the compare view's Est. commission row, in the Won dialog total, and as an optional "Est. commission" column in the pipeline list.
- Given I am an Account Manager, then no commission label, value, column, filter, sort option, or export field exists anywhere in PIP, including the Account Sales tab.
- Given I am a Producer viewing an Opportunity where I am not the Producer (for example, I am the Account's Account Manager), then commission is hidden exactly as for an Account Manager.
- Given commission is shown, then a tooltip explains "Estimated from the carrier's commission schedule synced from the AMS. Final commission comes from the AMS."

## UI states

- Empty: a carrier with no synced rate for the line shows "—" with the tooltip "No commission rate synced for this line".
- Loading: the commission value shows a short skeleton in place.
- Error: if rates fail to load, show "—" and keep the rest of the page working.
- No permission: hidden entirely, not masked: no "•••", no blank label, no empty column; the field is not rendered in the DOM.
- Overflow: commission up to $999,999 in tabular figures.

## Design notes

- In the Details panel, Est. commission sits under the premium group as a label (13px, text-label) and value (14px, text-default). No color emphasis.
- Producer share shown as "Name share% · $amount".

## FE notes

- One helper `commissionAccess(user, opportunity)` returning `'all' | 'own' | 'none'`: `all` for Principal and Admin, `own` when the user is the Opportunity's Producer, else `none`. Unit-test all four roles and the Producer-as-Account-Manager case.
- Apply it in selectors so values never reach components when access is `none`; column configs for list and compare filter on it; CSV or copy features exclude the field.
- Rates are read-only synced data (`carrier.commissionSchedule[line]` with new and renewal rates). Bound Terms use the synced commission records (Term, producer, new or renewal, rate, producer share, amount) once they exist; open Opportunities use the rules.md default share (50% new, 40% renewal). One Producer per Opportunity, so there are no co-producer splits in v1.

## Mock data

- Commission rates per carrier and line, for example Auto 12%, Home 15%, Umbrella 15%, BOP 15%, GL 12%, WC 8%, Commercial auto 10%.
- A Remarket Opportunity (40% share) next to a New business one (50%); one line with no synced rate.
- An Account where Dana Whitfield is the Account Manager and another Producer owns the Opportunity.
