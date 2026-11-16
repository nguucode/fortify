---
id: US-RPT-002
title: Report filters, date range, and CSV export
epic: RPT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/reports]
dependsOn: [US-RPT-001]
---

## Story

As a Principal, I want every report to share the same date range, Office, Producer, and line filters and to export its table as CSV, so that I can answer "how did Tampa do last quarter" the same way in every report and hand the numbers on.

## Acceptance criteria

- Given any report, then the filter bar offers Date range presets This month, Last month, This quarter, Year to date, Last 12 months (default), and Custom (MM/DD/YYYY to MM/DD/YYYY), plus a "Compare to previous period" toggle (default on) that drives the deltas on analytics cards.
- Given I am a Principal or Admin, then Office (All offices, Houston TX, San Antonio TX, Tampa FL) and Producer filters are available; given I am an Account Manager, Office is a fixed chip "Houston TX"; given I am a Producer, scope is a fixed chip "My Book" and there is no Office or Producer filter.
- Given any report, then a Lines filter offers All lines, Personal lines, and Commercial lines.
- Given I change a filter, then the report recalculates, the URL carries the filters (`/reports?report=production&range=qtd&office=tampa`), and switching to another report keeps the shared filters.
- Given I click "Export CSV", then a file such as `fortify-production-report-2026-11-15.csv` downloads with the current breakdown table, preceded by lines naming the report, scope, and filters; columns hidden for my role (commission) are not in the file.
- Given a Custom range where the end is before the start, then Apply is disabled with "End date must be after the start date".

## UI states

- Empty: a range with no data keeps the filters and shows each report's empty state; Export CSV is disabled with the tooltip "Nothing to export".
- Loading: filter changes show the report skeleton within 600ms; the filter bar stays interactive.
- Error: CSV generation failure shows a toast "Couldn't export. Try again."
- No permission: Office and Producer filters are absent (not disabled) for Producers and Account Managers; a URL with `office=` for an Account Manager's other Office is ignored and replaced by their Office.
- Overflow: the Producer filter lists 25 users with search; the active-filter summary truncates after 3 chips with "+2".
- Filtered: every report shows the active filters as removable chips and a "Reset filters" link.

## Design notes

- Toolbar row per Part B: date range button (36px, white, ring, calendar icon), Office, Producer, Lines as secondary buttons, then "Export CSV" as an outline button at the far right. No primary blue button on report pages.
- Meta line under the toolbar: "Last 12 months vs previous 12 months · Agency · All lines".

## FE notes

- Component `ReportFilterBar`; state in URL search params through one `useReportFilters()` hook that also clamps values to the user's scope.
- `toCsv(rows, columns)` with proper quoting; build the file client-side as a Blob; columns come from the same column config the table renders, already filtered by role.
- Date math on day offsets resolved at load (mock-data.md), so presets stay correct on any demo day.

## Mock data

- Twelve months of history for Opportunities, Terms, Renewals, and Service Requests so every preset and the previous-period comparison have data.
