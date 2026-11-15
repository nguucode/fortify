---
id: US-FND-020
title: Chart primitives (Recharts)
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/today]
dependsOn: [US-FND-012, US-FND-016]
---

## Story

As a Principal reading retention on Today or a trend in Reports, I want every chart in Fortify drawn the same quiet way, so that I read the numbers, not the styling, and no Epic builds its own chart.

## Acceptance criteria

- Given a story that needs a chart (Today on US-HOM-010 and US-HOM-011, and Reports), then it uses one of the FND primitives, `LineChart`, `BarChart`, or `Sparkline`, which wrap Recharts; no screen imports Recharts directly.
- Given any primitive, then axis ticks, tooltips, and value labels use tabular numbers and US formats ($1,234, $1.24M on axes, 88.4%, MM/DD/YYYY), the first series is the primary blue as a 1px line or solid bar, and gridlines are horizontal hairlines in `--line`; there are no area fills, gradients, or 3D effects.
- Given a second series (for example last month on US-HOM-010), then it draws as a 1px `text-muted` dashed line, and the legend names each series in text, so color is never the only cue.
- Given I hover or focus a data point, then a tooltip shows the label and value; the chart is reachable by keyboard and arrow keys move between points.
- Given a screen reader, then each chart has `role="img"` with a one-sentence summary ("Won premium this month, $84,210, up 12.4% from last month") and a visually hidden data table with the same values.
- Given `prefers-reduced-motion: reduce`, then charts render without animation.

## UI states

- Empty: a chart with no data shows the shared empty state in its frame ("No data for this period"), never an empty axis.
- Loading: a skeleton block at the chart's final height (US-FND-016), so nothing shifts.
- Error: the shared error state with Try again inside the chart frame.
- No permission: not applicable; the screen decides whether a chart renders, and commission series are not rendered for roles that cannot see commission.
- Overflow: long category labels truncate with a tooltip; axis values abbreviate ($1.24M) while tooltips show the full value ($1,240,500); more than 12 x-axis ticks thin to every other label.

## Design notes

- Follow the dataviz rules in `spec/ia/rules.md`: tabular numbers, the primary blue series, and hairline gridlines. Axis labels 12px `text-muted`; no axis lines, only the baseline.
- Chart frame sits inside the Part B analytics card; heights 160px (card), 240px (report), 32px (sparkline, no axes or tooltip).
- Tooltip uses the popover surface, ring, 8px radius, 13px text.

## FE notes

- `src/patterns/charts/` with `LineChart`, `BarChart`, `Sparkline`, a shared `chartTheme.ts` (colors read from CSS tokens), and `formatters.ts` (currency, percent, date) reused by tables.
- Add `recharts` as the one charting dependency; wrap `ResponsiveContainer` so charts resize with their card.
- Props: `{ data, x, series: [{ key, label, tone: 'primary' | 'comparison' }], valueFormat, summary }`; `summary` is required and feeds the accessible name.
- `isAnimationActive` is false under reduced motion.

## Mock data

- None of its own; test with the retention series from US-HOM-011, the won-by-day series from US-HOM-010, a single-point series, and an empty series.
