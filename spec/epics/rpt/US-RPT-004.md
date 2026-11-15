---
id: US-RPT-004
title: Production report with quoted and bound premium
epic: RPT
roles: [Producer, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-FND-020, US-PIP-010, US-PIP-013, US-POL-001]
---

## Story

As a Producer, I want to see the new business I wrote, by month, line, and carrier, with bound premium next to what was quoted, so that I know my production and how close my quotes land to what binds.

## Acceptance criteria

- Given the Production report, then cards show: Bound premium (sum of bound premium on Terms created by Won Opportunities in the range), Terms bound (count), Avg premium per Term, and Quoted to bound variance ((bound − quoted) ÷ quoted on the same lines, for example "+2.1%"), each with a previous-period delta.
- Given the trend chart, then a line chart shows bound premium per month for the range, split into Personal lines and Commercial lines.
- Given the breakdowns, then tabs By line, By carrier, By type (New business, Cross-sell, Remarket), and, for Principal and Admin, By Producer show Terms bound, Quoted premium, Bound premium, and Variance per row.
- Given I am allowed to see commission (US-PIP-013 rules), then an Est. commission column appears; a Producer sees only their own share; for others the column does not exist.
- Given I click a row, then I go to `/policies` filtered to the matching Recent production Terms.

## UI states

- Empty: "No new business bound in this range."; cards show $0 and "—" for variance.
- Loading: card, chart, and table skeletons.
- Error: "Couldn't load the Production report. Retry."
- No permission: Account Managers do not have this report; the commission column is absent for anyone without access.
- Overflow: bound premium above $1M abbreviates on cards with exact tooltips; tables show full dollars; 10 carriers and 11 lines fit without pagination.
- Filtered: Office, Producer, and Lines filters apply to cards, chart, and tables.

## Design notes

- Line chart per Part B: 1px primary blue line for Personal lines and a 1px neutral line for Commercial lines on hairline gridlines, with a legend that uses the label text, not color alone. No area fills.
- "Quoted premium" and "Bound premium" columns always appear in that order with those exact labels.

## FE notes

- Component `ProductionReport`; source is Terms with `source: 'fortify-won'` joined to their Opportunity and accepted Quote line for the quoted premium (US-PIP-010).
- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).
- Commission column from the shared `commissionAccess` helper (US-PIP-013), using the Producer's share from rules.md (50% new business); CSV export uses the same filtered column config.

## Mock data

- About 90 Terms bound from Won Opportunities over 12 months, both PL and CL, across all carriers; bound premium differs from quoted by −5% to +12%, with a few exactly equal.
