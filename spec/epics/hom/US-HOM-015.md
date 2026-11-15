---
id: US-HOM-015
title: Needs-attention callout on Today
epic: HOM
roles: [Producer, Account Manager, Principal, Admin]
priority: P2
status: Draft
size: S
routes: [/today]
dependsOn: [US-HOM-001]
---

## Story

As any Fortify user, I want a short list of things slipping in my scope at the top of Today, so that I see the exceptions before the routine.

## Acceptance criteria

- Given at least one rule matches for my role, when Today loads, then a collapsible callout titled "Needs attention" with a count badge shows above the widgets, with at most 5 items.
- Producer rules: "{n} Quotes presented over 14 days ago with no Activity since"; "{n} X-dates enter their quote window this week".
- Account Manager rules: "{n} Renewals expire within 30 days and are still Upcoming"; "{n} Terms are still Bound with the binder expiring within 7 days".
- Principal rules: "{n} High-risk Renewals are not yet Remarketing"; "{n} Certificates have waited over 1 business day for approval". Admin rules: "Last AMS sync was Partial"; "{n} Licenses expire within 30 days".
- Each item has a bold first line (the rule text) and a muted second line naming up to 2 records ("Torres Household, Alvarez Household +1"); clicking the item opens the list route already filtered to those records.
- Given I collapse the callout, then it stays collapsed on my next visit in this browser.

## UI states

- Empty: no matching rule hides the callout entirely.
- Loading: the callout is not shown until its rules resolve; no skeleton, so the page does not jump.
- Error: the callout is hidden on error; widgets below still render.
- No permission: each role sees only its own rules and only records in its scope.
- Overflow: more than 5 matching rules show the 5 with the highest counts.

## Design notes

- Collapsible callout per Part B: white, ring, 8px radius, title with count badge, items with a colored dot (warning for slipping, danger for expired), bold 14/500 first line, 13px muted second line.

## FE notes

- `attention.rules[role]` evaluated through one query `today.attention({ userId, officeId? })` that returns `[{ ruleId, count, sampleRecords, href }]`.
- Collapsed state in `localStorage` key `fortify.today.attention.collapsed`, read and written inside try/catch.

## Mock data

- Each persona matches 2 rules: Dana Whitfield 2 stale presented Quotes; Marisol Reyes 3 Upcoming Renewals inside 30 days and 1 Bound Term with `binderExpiresAt` in 5 days; Grant Holloway 4 High-risk Renewals not yet Remarketing; Priya Nair the Partial sync.
