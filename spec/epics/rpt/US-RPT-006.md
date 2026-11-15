---
id: US-RPT-006
title: Retention report
epic: RPT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-FND-020, US-POL-001]
---

## Story

As a Principal, I want policy and Account retention over time with what we lost and why, by carrier and line, so that I can see whether the book is holding and where it leaks.

## Acceptance criteria

- Given the Retention report, then cards show: Policy retention = 1 − lost ÷ Terms that reached expiration in the range (for example "88.6%"), Terms expiring (the denominator), Terms lost (Non-renewed, Expired, or Canceled), and Premium lost. Retained means Renewed or Rewritten; a rewrite to another carrier through the agency is retained, and a cancel that is then rewritten counts as Rewritten (rules.md).
- Given the trend chart, then a line shows monthly policy retention for the last 12 months.
- Given the lost breakdown, then a table lists Terms lost by outcome (Non-renewed, Canceled, Expired) with count, premium lost, and share of all lost Terms.
- Given the tabs By carrier and By line, then each row shows Expiring, Retained, Lost, and Retention %.
- Given I click a lost row, then I go to `/policies` with the Expired or Canceled saved view and the matching filter.

## UI states

- Empty: "No Terms expired in this range." with retention cards showing "—".
- Loading: card, chart, and table skeletons.
- Error: "Couldn't load the Retention report. Retry."
- No permission: Account Managers see it scoped to their Office (rules.md); Producers see their own Book.
- Overflow: retention values to one decimal ("88.6%"); a carrier with fewer than 5 expiring Terms shows its % with the muted note "small sample".
- Filtered: Office, Producer, Lines, and date range apply everywhere.

## Design notes

- Retention cards use the delta style in percentage points ("−1.2 pts"), not percent of percent.
- Thin line chart on hairline gridlines with the y-axis starting at 70%, labeled so the truncated axis is explicit.

## FE notes

- Component `RetentionReport`; reads synced Terms (status Renewed, Rewritten, Non-renewed, Canceled, Expired). One pure `policyRetention(terms, range)` helper implements the rules.md formula, unit-tested for the cancel-then-rewrite case. Counted by policy, the way the AMS retention report counts, so Principals can compare the two.
- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).

## Mock data

- 12 months of expired Terms with a retention rate around 85–90%, a Canceled Term that was then rewritten (counts as retained), and one carrier with only 3 expiring Terms.
