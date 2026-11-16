---
id: US-REN-008
title: Start remarketing with a linked Remarket Opportunity
epic: REN
roles: [Account Manager, Principal]
priority: P0
status: Done
size: S
routes: [/renewals/:id]
dependsOn: [US-REN-004, US-REN-005, US-PIP-003]
---

## Story

As an Account Manager, I want to start remarketing from a Renewal, which creates a Remarket Opportunity for the Producer, so that the Policy is shopped to other Carriers before it expires.

## Acceptance criteria

- Given a Renewal in In review, when I click "Start remarketing", then a dialog shows the Lines (prefilled from the Policy, e.g. Home), the Producer (the Account's Producer, read-only), Needed by (default 15 days before expiration), and an optional note.
- Given I confirm, then an Opportunity of type Remarket is created in stage New, owned by the Account's Producer (who keeps the commission) and editable by me with its Quotes (roles.md, Remarket rule), linked to this Renewal, with the expiring premium and the renewal premium as reference values; the Renewal status becomes Remarketing; no decision is set, because Remarketing is a status and the decision stays open (rules.md).
- Given the Opportunity is created, then a toast reads "Remarket opportunity OPP-2290 created for Dana Whitfield" with a link to `/pipeline/:id`, and the Producer gets a notification "Remarket requested: Torres Household · Home · expires 01/12/2027".
- Given the Renewal already has an open Remarket Opportunity, then the button reads "Open remarket opportunity" and navigates to it instead of creating another.
- Given Needed by is after the expiration date, then the dialog shows "Needed by must be before 01/12/2027." and blocks submit.

## UI states

- Empty: a Policy with one Line always prefills; there is no empty state for Lines.
- Loading: spinner on confirm during the mutation.
- Error: dialog error "Couldn't create the remarket opportunity." and nothing changes on the Renewal.
- No permission: Producer and Admin see the button disabled with "Only the Account Manager or a Principal can start remarketing."
- Overflow: Accounts with an umbrella tied to the Policy offer "Also remarket Umbrella" as an extra Line checkbox.

## Design notes

- "Start remarketing" is a secondary button next to "Mark presented" while In review; the Remarketing step in the stepper turns purple once started.
- Small dialog, 480px; Producer shown as an avatar chip.

## FE notes

- Enhanced by US-FND-008 (P1): the P0 build ships without these; their controls appear once those stories land.
- Store action `renewals.startRemarket(id, { lines, neededBy, note })` creates the Opportunity via the PIP store (US-PIP-003, `opportunities.create({ type: 'Remarket', renewalId, ownerId: account.producerId })`), sets `renewal.remarketOpportunityId`, and logs an Activity on both records.
- Notification pushed through the FND notifications store (US-FND-008).

## Mock data

- In review Renewals for Torres Household (home + umbrella) and a TX BOP; one Renewal that already has an open Remarket Opportunity.
