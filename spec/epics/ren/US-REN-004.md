---
id: US-REN-004
title: Renewal page with expiring and renewal Term summary
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/renewals/:id]
dependsOn: [US-FND-005, US-FND-006, US-REN-001]
---

## Story

As an Account Manager, I want a Renewal page that shows where the Renewal stands and compares the expiring Term with the renewal terms, so that I can prepare the conversation with the Account in one place.

## Acceptance criteria

- Given I open `/renewals/:id`, then the header shows the Account (link), Policy number (link to `/policies/:id`), Line, Carrier, Expiration (MM/DD/YYYY), Days left, Window, Account Manager, Producer, Risk with reasons, and a status stepper Upcoming → In review → Remarketing → Presented → Decided → Done with the current step marked.
- Given the summary section, then two side-by-side cards show Expiring Term (Term number, dates, premium) and Renewal terms (dates, premium, change "+$1,214 · +38%"), or "Awaiting renewal terms from Gulf Harbor Insurance" when not received.
- Given the page, then a right column shows the linked Remarket Opportunity (if any), open Tasks on this Renewal, and the latest 5 Activities.
- Given the Renewal is Done, then a success banner reads "Done · Renewed as is · new term 03/01/2027–03/01/2028" with a link to the new Term, and all actions are hidden.
- Given the Account is outside my scope, then I see the access-denied page naming the Account Manager, with "Request access".

## UI states

- Empty: a Renewal with no Activities shows "No activity yet." in the right column.
- Loading: header and card skeletons in the final layout.
- Error: full-page error "Couldn't load this renewal." with Retry; an unknown id shows the 404 page.
- No permission: access-denied for out-of-scope; Admin and Producer (outside remarketing) see the page read-only with disabled actions and the tooltip "Only the Account Manager or a Principal can change this renewal."
- Overflow: long Account and Carrier names wrap once then truncate; risk reasons over 3 collapse into "+2 more".

## Design notes

- Record page: H1 "Renewal · Torres Household · Home", muted line with policy number and Carrier; the stepper is a compact horizontal row of 6 labeled steps, current step in text-strong with a blue dot, past steps with a check, future in text-muted.
- Primary action slot at top-right belongs to the next step (US-REN-005 and US-REN-007).
- Two summary cards on a 2-column grid; change % uses the shared PremiumChangeCell styling.

## FE notes

- Enhanced by US-REN-002 (P1): the P0 build ships without these; their controls appear once those stories land.
- `RenewalPage` with `RenewalHeader`, `RenewalStepper`, `TermSummaryCards`, `RenewalSideColumn`.
- Reads `store.renewals.get(id)`, `store.terms.get(expiringTermId)`, `renewal.renewalTerms` (synced from the AMS), `store.opportunities.get(remarketOpportunityId)`, `store.tasks.listByRenewal(id)`, `store.activities.listByRenewal(id, { limit: 5 })`.
- Edit permission via `canEditRenewal(user, renewal)`: Account Manager in scope and Principal always; Producer only while status is Remarketing; Admin never.

## Mock data

- The +38% Renewal with renewal terms received; one awaiting terms; one Done with a new Term; one with a linked Remarket Opportunity in Quoting.
