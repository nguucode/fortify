---
id: US-REN-007
title: Record a Renewal decision
epic: REN
roles: [Account Manager, Producer, Principal]
priority: P0
status: Done
size: M
routes: [/renewals/:id]
dependsOn: [US-REN-004, US-REN-005, US-FND-005]
---

## Story

As an Account Manager, I want to record the decision on a Renewal as Renew as is, Rewrite, or Non-renewed, so that the outcome is clear to the team and the Renewal closes when the AMS confirms it.

## Acceptance criteria

- Given a Renewal in In review, Remarketing, or Presented, when I click "Record decision", then a dialog offers Renew as is, Rewrite, and Non-renewed (Remarket starts from US-REN-008), each with a one-line explanation.
- Given I choose Rewrite, then I must pick the new Carrier; if a linked Remarket Opportunity is Won on another carrier's Quote, the Carrier and premium prefill from its accepted Quote, e.g. "Meridian National · $3,410".
- Given I choose Non-renewed, then I must pick a reason (Account's choice, Carrier non-renewal, No longer needs this coverage) and, for Carrier non-renewal, the notice date.
- Given I confirm, then the status becomes Decided, the decision shows in the header ("Decided · Rewrite to Meridian National"), an Activity is logged, and a Task "Confirm renewal outcome in AMS" is created for me due on the expiration date.
- Given the AMS syncs the outcome (in the demo, Demo controls → "Sync renewal outcome"), then the Renewal becomes Done and the expiring Term shows Renewed, Rewritten (with the replacing Policy link), or Non-renewed; if no Term on the Account stays active, the Account becomes Former client.
- Given a Business Renewal decided Renew as is or Rewrite and the Account has Holders with issued Certificates, then a callout reads "Re-issue 4 certificates for the new term" linking to the Account's Certificates.
- Given a Decided Renewal before Done, when I choose "Change decision", then the dialog reopens with the current choice selected, and the change is logged.

## UI states

- Empty: Rewrite with no Remarket Opportunity shows an empty Carrier select with the hint "Pick the Carrier the policy moves to."
- Loading: the confirm button shows a spinner during the mutation.
- Error: dialog-level error "Couldn't save the decision." and the dialog stays open with my input.
- No permission: Producer can record a decision only while the Renewal is in Remarketing; Admin sees "Record decision" disabled with "Admins have read-only access to renewals."
- Overflow: Carrier select searches across 10 Carriers and shows only those appointed in the Policy's state, with the Line; non-appointed ones are listed disabled with "Not appointed in FL".

## Design notes

- "Record decision" is the primary blue button once the Renewal is Presented; before that it sits as a secondary button.
- Dialog 520px: radio cards for the three decisions, conditional fields below the selected card, footer "Cancel" and "Record decision".
- Decided status in the stepper turns green with the decision as the step's caption.

## FE notes

- Enhanced by US-CRT-003 (P1): the P0 build ships without these; their controls appear once those stories land.
- Store actions `renewals.decide(id, { decision, carrierId?, reason?, noticeDate? })` and `renewals.applyAmsOutcome(id)`; the latter updates `term.status`, creates the new Term or Policy (with `replacesPolicyId` for Rewrite), and recomputes `account.status`.
- "Sync renewal outcome" in Demo controls (US-FND-005, per rules.md), enabled on Decided Renewals; Decided → Done happens only through this AMS signal.
- Certificate callout reads `store.certificates.listIssuedByAccount(accountId)` and links to the Certificates sub-tab (US-CRT-003); navigation only, no CRT writes.

## Mock data

- A Presented Renewal for each decision path; a Remarketing Renewal whose Opportunity is Won at Meridian National; an Account whose only active Term is the one being non-renewed (to show Former client); a Business with 4 issued Certificates.
