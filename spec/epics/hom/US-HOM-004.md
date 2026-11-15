---
id: US-HOM-004
title: "Producer Today: upcoming X-dates"
epic: HOM
roles: [Producer]
priority: P1
status: Draft
size: S
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-XDT-004]
---

## Story

As a Producer, I want the X-dates in my Book coming up in the next 90 days, so that I quote them before the line renews elsewhere.

## Acceptance criteria

- Given I am a Producer, when Today loads, then the "Upcoming X-dates" widget lists X-dates on my Book dated today through today + 90 days, excluding interest level Closed, soonest first, at most 6 rows, with the total in the count pill.
- Each row shows Account (with Prospect or Client muted under it), Line, Current carrier, Premium (right-aligned), X-date (MM/DD/YYYY plus "in 23 days"), and Interest (High, Medium, Low as dot plus label).
- Given an X-date is inside its quote window (45 days for personal lines, 90 days for commercial), then the row shows an info dot with the tooltip "Quote window open. A Task was created on {MM/DD/YYYY}."
- Given I click a row, then I go to /accounts/:id on the Sales tab; "View all" goes to /x-dates (Next 90 days).

## UI states

- Empty: "No X-dates in the next 90 days." with a "View all X-dates" link.
- Loading: 6 skeleton rows.
- Error: "Couldn't load Upcoming X-dates." with Retry.
- No permission: not rendered for other roles.
- Overflow: carrier names truncate at the column width with a tooltip; missing premium shows "—" in muted.

## Design notes

- Compact table, columns Account (flex), Line (96px), Current carrier (140px), Premium (96px right), X-date (120px), Interest (88px).
- "in 23 days" is 13px muted on the same line as the date.

## FE notes

- Query `xDates.list({ bookOf: me, from: today, to: today + 90, sort: 'date', limit: 6 })`; quote window from `line.kind` (personal 45, commercial 90) per object-model.md timing rules; `taskCreatedAt` comes from the X-date record.

## Mock data

- Dana Whitfield has 14 X-dates in 90 days: 9 Prospect, 5 Client coverage gaps (for example Auto with the agency, Home elsewhere), 4 inside the quote window, 1 with no premium recorded.
