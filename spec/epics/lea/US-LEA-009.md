---
id: US-LEA-009
title: Reopen a Disqualified Lead
epic: LEA
roles: [Producer, Principal]
priority: P2
status: Done
size: S
routes: [/leads/:id]
dependsOn: [US-LEA-003, US-LEA-008]
---

## Story

As a Producer, I want to reopen a Disqualified Lead when the Lead calls back, so that I keep the earlier attempts and source instead of creating a second Lead.

## Acceptance criteria

- Given I open a Disqualified Lead I may work, when I click "Reopen", then a confirm reads "Reopen this lead? It returns to Contacted and keeps its history." and on confirm the status becomes Contacted.
- Given the Lead was reopened, when the timeline renders, then it shows "Reopened by Dana Whitfield · previously Disqualified: No response (10/02/2026)".
- Given the Lead was disqualified as Duplicate lead, when I view it, then Reopen is disabled with "Merged into L-1093" and a link to the surviving Lead.
- Given a Qualified Lead, when I view it, then no Reopen action exists; further sales go through the Account's Opportunities.

## UI states

- Empty: not applicable.
- Loading: confirm button spinner.
- Error: "Couldn't reopen. Try again."
- No permission: Account Managers and Admins see Reopen disabled with "Only the assigned Producer or a Principal can work this lead"; Producers only on Leads assigned to them.
- Overflow: not applicable.

## Design notes

- Action sits in the Disqualified banner on the record (US-LEA-003) as a small outline button. Small confirm dialog, 400px.

## FE notes

- Store action `reopenLead(id)`: sets `status = 'Contacted'`, clears the active reason but appends the old one to the timeline.

## Mock data

- A Disqualified Lead (No response) with 4 attempts; a Disqualified Lead (Duplicate lead) pointing at a survivor.
