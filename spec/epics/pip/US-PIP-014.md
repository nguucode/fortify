---
id: US-PIP-014
title: Remarket Opportunity with incumbent baseline and Renewal link
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/pipeline/:id]
dependsOn: [US-PIP-008, US-PIP-010, US-REN-008]
---

## Story

As a Producer, I want a Remarket Opportunity to compare every new Quote against the incumbent's renewal offer and stay linked to its Renewal, so that I can show the Account whether moving saves money and the Renewal records the outcome.

## Acceptance criteria

- Given an Opportunity of type Remarket (created from a Renewal by REN), then the header shows "Remarket for Renewal of GSI-HO-204118 · expires 01/10/2027" linking to `/renewals/:id`, and the Details panel shows the incumbent carrier, current Term premium, renewal premium, and change ("$2,310 → $3,188 · +38%").
- Given the comparison view, then the first column is "Incumbent: Gulfstream Indemnity (renewal)" with the renewal premium per line, not selectable for "Mark presented", and every Quote cell shows its difference against it, for example "$2,778 · −$410 (−12.9%)".
- Given I accept the incumbent's renewal instead of a new Quote, then I choose "Renew with incumbent" in Record acceptance; Won then creates no new Policy and logs "Remarket won · renewed with incumbent"; the linked Renewal offers "Record decision: Renew as is" (US-REN-009), and the Account Manager records it.
- Given I accept a Quote from another carrier and mark Won, then US-PIP-010 creates the new Policy with a Bound Term, and the linked Renewal offers "Record decision: Rewrite" prefilled with the carrier and premium (US-REN-007, US-REN-009). PIP never writes the Renewal's decision.
- Given the Remarket Opportunity is marked Lost, then the Renewal shows "Remarket lost · Price" and its decision stays open for the Account Manager in REN.

## UI states

- Empty: a Renewal with no renewal premium yet shows the incumbent column as "Renewal offer pending" and differences as "—".
- Loading: incumbent column skeleton alongside the Quote columns.
- Error: if the linked Renewal fails to load, the header link reads "Renewal unavailable" and the rest of the page works.
- No permission: Account Managers can create and edit the Remarket Opportunity and its Quotes (roles.md, Remarket rule), but cannot change its owner, which stays the Account's Producer. Admin sees it read-only.
- Overflow: policy numbers up to 24 characters in monospace; a +38% increase displays as is, with no cap.

## Design notes

- Incumbent column uses a recessed background and the label "Incumbent" to separate it from offers; differences in success text (cheaper) or danger text (more expensive) with an up or down arrow, never color alone.

## FE notes

- Opportunity carries `renewalId` and `incumbentTermId`; selector `selectIncumbentBaseline(opportunity)` reads the Term (synced, read-only) and the Renewal's renewal premium.
- `opportunities.markWon` and `markLost` do not write to the Renewal. REN reads the Opportunity's stage, `acceptedIncumbent`, and accepted Quote to offer the decision. The Remarket Opportunity itself is created by REN (US-REN-008).
- The "Renew with incumbent" choice is stored as `acceptedIncumbent: true`; it creates no Term because the AMS renews the incumbent Policy.

## Mock data

- The +38% Renewal from mock-data.md with a Remarket Opportunity holding three Quotes, one cheaper and two more expensive than the renewal premium.
- A Remarket whose Renewal has no renewal premium yet.
