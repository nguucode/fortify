---
id: US-CLM-001
title: Claims list
epic: CLM
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/claims]
dependsOn: [US-FND-007, US-CLM-002, US-SRV-009]
---

## Story

As an Account Manager, I want an agency-wide list of Claims with their carrier claim numbers, adjusters, and statuses, so that I can answer "where is my claim?" calls fast and see which claims still need a claim number or follow-up.

## Acceptance criteria

- Given the user opens `/claims`, when the table loads, then it shows Claim (ID with the Account as the muted second line), Loss type (with the ACORD form), Date of loss, Policy (policy number and Carrier), Carrier claim #, Adjuster, Status, Days open, and Office, with the saved views Open (default: every status except Closed) and Closed from sitemap.yaml, sorted by Date of loss, newest first.
- Given the scope rules, when a Producer opens the list, then it shows only Claims on Accounts in their Book; an Account Manager sees their Office; a Principal or Admin sees the agency.
- Given the Filters menu, when the user filters by Status, Loss type, Carrier, Office, or Date of loss range, then active filters show as removable chips and the meta line updates ("Showing 24 open claims · 6 without a carrier claim #").
- Given a Closed Claim, when its row renders, then Status shows the outcome ("Closed · Paid", "Closed · Denied", "Closed · Withdrawn").
- Given the primary button "+ Report a claim", when the user clicks it, then the Service Request sheet opens with type Claim report preselected (US-SRV-005 and US-SRV-009); Claims are never created directly on this page.
- Given a row, when the user clicks it, then `/claims/:id` opens.

## UI states

- Empty: "No claims yet. Claims start from a Claim report." with "+ Report a claim".
- Loading: 10 skeleton rows under a real header row.
- Error: "Couldn't load claims." with "Try again".
- No permission: Admin sees the list read-only and "+ Report a claim" disabled with "Admins have read-only access to Service Requests."
- Overflow: Account names and adjuster names truncate with a tooltip; Days open above 999 shows "999+"; Carrier claim # shows "—" when missing.
- Filtered: "No claims match these filters." with "Clear filters"; the Open and Closed saved view tabs stay visible.

## Design notes

- Page header: H1 "Claims", muted description "Claims reported through the agency. The carrier's adjuster handles each claim; Fortify tracks it."
- Saved view tabs Open and Closed (US-FND-007) above the toolbar. Toolbar per Part B: search ("Search claims, carrier claim #, Accounts"), Filters, primary "+ Report a claim" at the far right.
- Table per Part B: 40px rows; Claim ID and Carrier claim # in mono 13px; Status as icon + 13px label (Reported: circle outline; Submitted to carrier: arrow; Claim # assigned: hash; Open: half circle; Closed: check, with the outcome as text); Days open and dates in tabular-nums, right-aligned.

## FE notes

- Route `/claims`. Components: `ClaimsPage`, `ClaimsTable` (built on the US-FND-007 `DataTable`). `ClaimsTable` takes `columns` and `filters` props so POL's Policy page and ACC's Policies tab can reuse it in compact form.
- Days open = calendar days from the Claim report's created date to today, or to the closed date for Closed Claims.
- Search matches Claim ID, carrier claim #, Account name, and policy number.
- Store: `claims.list({ scope, filters, sort, page })`.

## Mock data

- 40 Claims: Reported 3, Submitted to carrier 4, Claim # assigned 5, Open 12, Closed 16 (Paid 11, Denied 3, Withdrawn 2).
- Loss types: Auto 18, Property 14 (3 Florida hurricane, 1 Florida sinkhole), Liability 5, Workers' compensation 3.
- Spread across all 3 Offices; 6 open Claims without a carrier claim #; one Claim on an expired Term; one Account with a very long name.
