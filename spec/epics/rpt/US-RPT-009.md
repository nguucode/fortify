---
id: US-RPT-009
title: Commission report from synced AMS data
epic: RPT
roles: [Producer, Principal, Admin]
priority: P2
status: Draft
size: M
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-RPT-004, US-FND-020, US-PIP-013]
---

## Story

As a Producer, I want to see my commission by month, new versus renewal, and by carrier, read from the AMS, so that I can follow my earnings without asking accounting; as a Principal, I want the same for every Producer.

## Acceptance criteria

- Given the Commission report, then cards show Commission (synced, in the range), New business commission, Renewal commission, and Estimated on open pipeline (from US-PIP-013 rules), with "From AMS · synced 11/15/2026 6:00 AM" under the title.
- Given I am a Producer, then every figure is my own producer share only; no other Producer's name, share, or total appears anywhere, including the CSV.
- Given I am a Principal or Admin, then a By Producer table shows Agency commission, New, Renewal, and Producer share per Producer, and a By carrier table shows Commission and effective rate (commission ÷ premium).
- Given the trend chart, then bars show commission per month split into New and Renewal.
- Given I am an Account Manager, then the report is absent from my catalog, and `/reports?report=commission` shows "This report isn't available for your role." with no figures loaded.

## UI states

- Empty: "No commission synced for this range."
- Loading: card, chart, and table skeletons.
- Error: "Couldn't load commission data from the last AMS sync. Retry."
- No permission: Account Managers per the criterion above; data for out-of-scope users is never fetched, not merely hidden.
- Overflow: up to 25 Producers in the table; amounts in full dollars with cents ("$12,480.50") in tables, abbreviated on cards.
- Filtered: Office and Producer (Principal, Admin), Lines, and date range apply everywhere.

## Design notes

- Same report grammar as US-RPT-003. A muted note under the cards: "Read-only. Commission is calculated and reconciled in the AMS."

## FE notes

- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).
- Component `CommissionReport`; reads synced commission records as rules.md defines them (`{ termId, producerId, kind: 'new' | 'renewal', ratePct, producerSharePct, amount, postedAt }`) through a selector that filters by `commissionAccess` scope before returning rows.
- No edit affordances; commission is AMS data per README rules.

## Mock data

- Commission records for every Active Term over 12 months, with the rules.md default producer share (50% new business, 40% renewal), and one carrier with a lower effective rate. Won Terms still Awaiting AMS have no record yet.
