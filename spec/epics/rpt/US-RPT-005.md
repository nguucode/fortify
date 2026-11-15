---
id: US-RPT-005
title: Renewals report
epic: RPT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-FND-020, US-REN-001, US-REN-002]
---

## Story

As an Account Manager, I want to see the Renewals due in my Office by status, premium change, risk, and decision, so that I can tell whether we are working them early enough and where premium increases are hurting.

## Acceptance criteria

- Given the Renewals report, then cards show: Renewals due (Terms expiring in the range with a Renewal), Done (count and share), At risk (risk High and not Decided or Done, as in REN's At risk view), and Avg premium change ("+9.4%").
- Given the status chart, then bars show the count per status: Upcoming, In review, Remarketing, Presented, Decided, Done.
- Given the premium change chart, then bars show Renewals in buckets: Decrease, 0–5%, 5–10%, 10–20%, Over 20%.
- Given the decisions table, then rows by Account Manager (Account Manager sees their Office's Account Managers; Principal and Admin see all) show Due, Renew as is, Rewrite, Non-renewed, and Still open (with Remarketing as a sub-count of Still open, because Remarketing is a status, not a decision); a Producer sees one row per decision for their own Book.
- Given I click a status bar, bucket, or row, then I go to `/renewals` with the matching filter.

## UI states

- Empty: "No Renewals due in this range."
- Loading: card, two chart, and table skeletons.
- Error: "Couldn't load the Renewals report. Retry."
- No permission: Producers see their Book only and no Account Manager rows.
- Overflow: a +38% change sits in "Over 20%"; the largest increase shows under the chart as "Largest increase: +38% · Home · Gulfstream Indemnity"; counts above 999 use "1,024".
- Filtered: Office (Principal, Admin), Lines, and date range apply everywhere.

## Design notes

- Same report grammar as US-RPT-003. Risk counts carry a dot plus "High" or "Low" label; buckets are neutral bars with the Over 20% bar in danger text label, not a red fill.

## FE notes

- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).
- Component `RenewalsReport`; selectors over REN's Renewal entities (status, decision, premium change %, risk, Account Manager). Read-only; no REN logic duplicated.

## Mock data

- About 150 open Renewals plus 12 months of Done Renewals with decisions; the +38% Renewal from mock-data.md; risk High on about 20%.
