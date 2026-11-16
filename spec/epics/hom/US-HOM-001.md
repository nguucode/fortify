---
id: US-HOM-001
title: Today page frame with role-based layout
epic: HOM
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/today]
dependsOn: [US-FND-001, US-FND-002, US-FND-004, US-FND-005]
---

## Story

As any Fortify user, I want Today to open on the work my role owns, so that I start the day without hunting through modules.

## Acceptance criteria

- Given I click Today in the sidebar, when /today loads, then the page title reads "Today", the muted line under it reads "{Weekday}, {Month D, YYYY} · {Office}" (for example "Sunday, November 15, 2026 · Houston TX"), and the Sample data badge shows.
- Given View as is Producer, when the page renders, then it shows, in order: New leads (US-HOM-002), My pipeline (US-HOM-003), Upcoming X-dates (US-HOM-004) in the main column, and Goal pacing (US-HOM-005) and My day (US-HOM-006) in the side column.
- Given View as is Account Manager, then it shows Renewals due (US-HOM-007), Service queue (US-HOM-008), and Certificates waiting (US-HOM-009) in the main column and My day (US-HOM-006) in the side column; given Principal, then Agency pipeline (US-HOM-010), Retention and at-risk Renewals (US-HOM-011), Certificate approvals (US-HOM-012), and My day; given Admin, then Users and Licenses (US-HOM-013), AMS sync (US-HOM-014), and My day.
- Given I switch View as to another role, when the switch completes, then the layout swaps without a full page reload, every widget refetches for the new user, and the page scrolls to the top.
- Given I am Principal or Admin and the top bar Office is set to "Tampa FL", when Today renders, then every widget is scoped to Tampa FL and the muted line reads "· Tampa FL"; given "All offices", then widgets show the whole Agency. Given I am Producer or Account Manager, the Office in the top bar is my own and read-only, and widgets use my scope from roles.md (Own or Office).
- Given one widget's request fails, when the others succeed, then only that widget shows its error card with a Retry button and the rest of the page stays usable.

## UI states

- Empty: the page is never empty; each widget owns its own empty state (see the widget stories).
- Loading: the page header renders at once; each widget shows a skeleton at its final height (5 skeleton rows for list widgets) so nothing shifts when data arrives.
- Error: with Demo controls "Force error" on /today, every widget shows "Couldn't load {widget title}." with a Retry button; the page header and the shell keep working.
- No permission: every role can open /today. Widgets that belong to other roles are not rendered at all (never disabled or blurred).
- Overflow: below 1024px wide the two columns stack into one, main widgets first; a 40-character Office name truncates in the muted line with a full-value tooltip.

## Design notes

- Page header per Part B: H1 "Today" 30/600, muted 14px date-and-office line, no page actions.
- Grid: 32px gutters, two columns at ≥1280px (main 8/12, side 4/12, 24px gap); one column below 1024px.
- Widget card: white surface, ring (0 0 0 1px var(--line)), 8px radius, resting shadow. Header row 48px: section title 16/500, count pill (neutral, only when the count is above 0), and a "View all" text link in link color at the right. Body uses the compact 40px table rows from US-FND-007 without a toolbar.
- No greeting copy, no illustrations, no entrance animation. Widget order is fixed per role; no drag-to-rearrange.

## FE notes

- Route `/today` renders `TodayPage`. It reads `currentUser` (role, officeId) from the session store set by View as (US-FND-004) and the selected office from the top bar store (US-FND-002).
- `src/features/today/layouts.ts`: `Record<Role, { main: WidgetId[]; side: WidgetId[] }>`; the page maps ids to components. No per-user layout persistence.
- `TodayWidget` shell props: `title`, `count?`, `viewAllHref?`, `query` (from the US-FND-005 mock API hook), `empty` (message and optional link). It renders the loading, error, and empty states so each widget only renders its rows.
- Query keys include `userId` and `officeId` so a View as or Office change refetches. Widgets subscribe to store mutations (Qualify, Won, Renewal decided, Service Request done) so counts update when the user returns to Today.

## Mock data

- One View as persona per role, from the canonical seed list in `spec/ia/mock-data.md` (US-FND-004): Producer Dana Whitfield, Houston TX; Account Manager Marisol Reyes, Houston TX; Principal Grant Holloway, agency-wide; Admin Priya Nair.
- One user with a very long name and an Office with a long display name to exercise truncation.
