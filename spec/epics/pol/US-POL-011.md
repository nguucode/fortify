---
id: US-POL-011
title: Claims on the Policy page
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/policies/:id]
dependsOn: [US-POL-002, US-SRV-009, US-CLM-002]
---

## Story

As a Producer, I want to see the Claims reported on a Policy, so that I understand the claim history before a renewal or remarket conversation.

## Acceptance criteria

- Given the Claims tab, then a table lists Claim # (carrier claim number), Date of loss, Description, Status (Reported, Submitted to carrier, Claim # assigned, Open, Closed), Outcome (paid, denied, withdrawn), and Adjuster.
- Given I click a row, then I go to `/claims/:id` (US-CLM-002).
- Given the tab header, then a "Report a claim" outline button opens the Service Request create flow with type Claim report and this Policy preselected; it is disabled for Admin with the tooltip "Admins can view Service Requests but not create them."
- Given open Claims exist, then the tab label shows a count "Claims (2)".

## UI states

- Empty: "No claims reported on this policy."
- Loading: 3 skeleton rows.
- Error: inline error with Retry.
- No permission: Admin's disabled button; otherwise as the Policy page.
- Overflow: descriptions truncate at one line with a tooltip; Claim # in mono.

## Design notes

- Status as dot + label per Part B; Closed claims sort below open ones and show in text-muted.

## FE notes

- `PolicyClaimsTable` reads `store.claims.listByPolicy(policyId)`; the create entry reuses the SRV `openServiceRequestCreate` with `type: 'Claim report'`, which opens the Claim report form (US-SRV-009). Claims are Fortify's tracking records (rules.md); this tab only reads them.

## Mock data

- A FL home with a hurricane Claim (Open) and a closed water Claim (paid); a TX auto with one withdrawn Claim; most Policies with none.
