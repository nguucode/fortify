---
id: US-HOM-010
title: "Principal Today: agency pipeline and Producer leaderboard"
epic: HOM
roles: [Principal]
priority: P1
status: Done
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-FND-020]
---

## Story

As a Principal, I want agency pipeline totals and each Producer's results against goal, so that I can see who needs help and where new business will land this month.

## Acceptance criteria

- Given I am a Principal, when Today loads, then three analytics cards show: Open pipeline (estimated premium and count, "$1.24M · 214"), Won this month (premium, with delta vs the same day last month, "▲ 12.4%"), and Close ratio, last 90 days (Won ÷ (Won + Lost), "31%").
- The Won this month card has a 1px line chart of cumulative Won premium by day for this month against last month.
- A leaderboard table lists every Producer in scope: Producer, Office, Won this month, Goal attainment ("47%"), Open pipeline, Close ratio, Est. commission; sorted by Won this month, descending.
- Given the top bar Office is "San Antonio TX", then cards and leaderboard include only that Office's Producers and Opportunities.
- Given I click a Producer row, then I go to /pipeline filtered to that Producer; "View all" goes to /reports.
- Est. commission shows for every Producer because the Principal sees all commission.

## UI states

- Empty: an Office with no Producers shows "No Producers in this Office." in the leaderboard and $0 cards.
- Loading: 3 card skeletons and 6 skeleton rows.
- Error: "Couldn't load Agency pipeline." with Retry.
- No permission: not rendered for other roles. For Admin the same data is reachable through /reports; it is not on Admin Today.
- Overflow: premiums above $999,999 abbreviate in cards ("$1.24M") and stay full in the table; a Producer with no goal shows "—" in Goal attainment.

## Design notes

- Analytics cards per Part B: 13px label with overflow menu (menu holds "Open report"), 24px value, delta in success or danger text with arrow, chart stroke 1px primary on hairline gridlines, last month as a 1px text-muted dashed line.
- Leaderboard: compact table, numbers right-aligned in tabular-nums, no rank medals or colors.

## FE notes

- Queries `pipeline.agencySummary({ officeId? })`, `pipeline.wonByDay({ officeId?, months: [current, previous] })`, `producers.leaderboard({ officeId?, period: 'month' })`.
- Chart: the line chart primitive from US-FND-020 (Recharts), shared with US-HOM-011.
- Close ratio counts Opportunities closed in the last 90 days.

## Mock data

- 10 Producers across 3 Offices, one with no November goal, one with 0 Won this month.
- Won premium by day for October and November so the delta is non-trivial.
