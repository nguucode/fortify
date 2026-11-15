---
id: US-RPT-003
title: Pipeline report
epic: RPT
roles: [Producer, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-FND-020, US-PIP-002]
---

## Story

As a Principal, I want to see open pipeline by stage, close ratio, time to close, and why we lose, by Producer and type, so that I can coach Producers and forecast new business.

## Acceptance criteria

- Given the Pipeline report, then four analytics cards show: Open Opportunities (count now), Open pipeline premium (sum of best quoted premium, else estimated), Close ratio (Won ÷ (Won + Lost) for Opportunities closed in the range, for example "34%"), and Avg days to close (created to Won, for example "27 days"), each with a delta against the previous period.
- Given the stage chart, then horizontal bars show open Opportunities per stage (New, Contacted, Gathering info, Quoting, Proposed) with count and premium labels.
- Given the breakdown table, then a Principal or Admin sees one row per Producer with Open, Open premium, Won, Lost, Close ratio, and Won premium (bound); a Producer sees rows by type (New business, Cross-sell, Remarket) for their own Book.
- Given the Lost reasons panel, then it lists reasons for Opportunities lost in the range, sorted by count, with share ("Price · 12 · 40%").
- Given I click a stage bar or a Producer row, then I go to `/pipeline?view=list` with the matching stage or Producer filter applied.

## UI states

- Empty: "No Opportunities in this range." with "Change the date range" link; cards show 0 and "—" for ratios.
- Loading: 4 card skeletons, a chart skeleton, and 5 table row skeletons.
- Error: "Couldn't load the Pipeline report. Retry."
- No permission: Account Managers do not have this report (US-RPT-001); Producers see only their Book and no Producer column.
- Overflow: 25 Producer rows in the table without pagination; premium cards abbreviate above $1M ("$1.84M") with the exact value in a tooltip; close ratio with 0 closed shows "—" with the tooltip "No closed Opportunities in this range".
- Filtered: Office, Producer, and Lines filters apply to every card, chart, and row; the meta line states them.

## Design notes

- Analytics cards per Part B (white, ring, 13px label, 24px value, delta with arrow in success or danger text). Bars use primary blue at one weight; no multicolor stage palette in charts.
- Breakdown table follows the 40px data table spec, numbers right-aligned in tabular figures.

## FE notes

- Component `PipelineReport`; selectors `selectPipelineMetrics(scope, filters)` and `selectLostReasons(scope, filters)` computed from the store; memoize per filter key.
- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).

## Mock data

- About 50 Won and 30 Lost Opportunities over 12 months with varied lost reasons; at least 8 Producers; one Producer with no closed Opportunities for the "—" ratio.
