---
id: US-RPT-001
title: Reports home with a role-scoped catalog
epic: RPT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/reports]
dependsOn: [US-FND-001, US-FND-004, US-FND-005]
---

## Story

As any user, I want Reports to list only the reports my role may see, already scoped to my Book, my Office, or the agency, so that I open the right numbers without wondering whose data they are.

## Acceptance criteria

- Given I open `/reports`, then a left report list (240px) shows the reports available to my role, grouped Sales (Pipeline, Production, X-dates), Retention (Renewals, Retention), Service (Service), and Commission (Commission), and the selected report renders to its right.
- Given my role, then the catalog is: Producer: Pipeline, Production, X-dates, Renewals, Retention, Commission, all limited to My Book; Account Manager: Renewals, Retention, and Service for my Office; Principal and Admin: all seven reports for the agency.
- Given I open `/reports` without a report, then my default opens: Producer Pipeline, Account Manager Renewals, Principal Pipeline, Admin Production; the URL becomes `/reports?report=pipeline`.
- Given each report header, then a scope line states whose data it is: "My Book · Dana Whitfield", "Office · Houston TX", or "Agency · 3 offices", plus "Data as of 11/15/2026 6:00 AM (AMS sync)" for reports that use synced Policy or commission data.
- Given I open `/reports?report=service` as a Producer (a report not in my catalog), then the report area shows "This report isn't available for your role." with a link to my default report, and the report is not in the list.
- Given I switch role with View as (US-FND-004), then the catalog, default, and scope update without a page reload.

## UI states

- Empty: a role with an empty Book still sees its catalog; each report handles its own empty state.
- Loading: the list renders at once (static config); the report area shows card and chart skeletons.
- Error: an unknown `report` key shows "Report not found." with a link to the default report.
- No permission: hidden reports are absent from the list; direct links show the inline message above, not the global access-denied page, since `/reports` itself is allowed.
- Overflow: the list fits 7 reports with no scroll; scope lines with long names truncate with a tooltip.

## Design notes

- Page H1 "Reports", muted description "Numbers for your Book, Office, or agency. Figures are mock data." Sample data badge from the shell.
- Report list items are 8px-radius nav rows, active row in recessed fill with text-strong; group labels in 12px muted text, sentence case.
- Report area: header (16/500 title, scope line in 13px muted), filter bar (US-RPT-002), analytics cards row, then charts and the breakdown table.

## FE notes

- Route `/reports` with the `report` query param; sitemap has no report sub-routes.
- Config `reportCatalog = [{ key, title, group, roles, scope }]` and `getReportScope(user)` returning `{ kind: 'own' | 'office' | 'agency', userId?, officeId? }`. Each report component receives the scope and never queries outside it.
- Lazy-load each report component so the home stays light.

## Mock data

- Users for each role: Dana Whitfield (Producer, Houston TX), Marisol Reyes (Account Manager, Houston TX), Grant Holloway (Principal), Priya Nair (Admin), per the mock-data.md seed list.
- A last AMS sync timestamp in the mock store.
