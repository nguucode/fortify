---
id: US-REN-009
title: Remarket progress on the Renewal page
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/renewals/:id]
dependsOn: [US-REN-007, US-REN-008, US-PIP-014]
---

## Story

As an Account Manager, I want to follow the linked Remarket Opportunity from the Renewal page, so that I know when quotes are in and which decision to record.

## Acceptance criteria

- Given a Renewal with a linked Remarket Opportunity, then a Remarket card shows the Opportunity stage (New → Contacted → Gathering info → Quoting → Proposed → Won | Lost), the Producer, and Quotes as "3 quoted · 1 declined · 1 requested".
- Given at least one Quote is Quoted, then the card shows the best Quote against the renewal premium, e.g. "Best: Meridian National $3,410 · −$1,050 vs renewal".
- Given the Opportunity is Won on another carrier's Quote, then the card shows "Won · Meridian National" and a primary "Record decision: Rewrite" that opens US-REN-007 prefilled; given it is Won with "Renew with incumbent" (US-PIP-014), the shortcut reads "Record decision: Renew as is".
- Given the Opportunity is Lost, then the card shows the Lost reason and a "Record decision: Renew as is" shortcut.
- Given I click the card title, then I go to `/pipeline/:id`.

## UI states

- Empty: no linked Opportunity: card hidden.
- Loading: card skeleton.
- Error: card shows "Couldn't load the remarket opportunity." with Retry.
- No permission: the decision shortcuts follow US-REN-007 permissions; the card itself has no edit controls, and Account Managers edit the Remarket Opportunity on its own page (roles.md, Remarket rule).
- Overflow: up to 8 Quotes summarized in one line; Carrier names in the best-Quote line truncate with a tooltip.

## Design notes

- White card with ring in the right column, title "Remarket · OPP-2290", stage as dot + label, numbers in tabular figures; savings in success text, increases in danger text, both with arrows.

## FE notes

- `RemarketCard` reads `store.opportunities.get(renewal.remarketOpportunityId)` (including `acceptedIncumbent`, US-PIP-014) and `store.quotes.listByOpportunity(id)`; best Quote = lowest total premium among Quoted or Presented.

## Mock data

- Remarket Opportunities in Quoting (3 Quotes), Won (Meridian National), and Lost (reason "Stayed with current carrier").
