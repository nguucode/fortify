---
id: US-PIP-016
title: Pipeline nudges for stalled Opportunities and expiring Quotes
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P2
status: Draft
size: S
routes: [/pipeline]
dependsOn: [US-PIP-001, US-PIP-002, US-PIP-015, US-SET-006]
---

## Story

As a Producer, I want the Pipeline page to point out Opportunities that have stalled and Quotes about to expire, so that I act before the Account goes cold or a price lapses.

## Acceptance criteria

- Given `/pipeline` has at least one nudge in my scope, then a collapsible callout panel above the board or list titled "Needs attention" with a count badge lists up to three items:
  - "4 Opportunities in Quoting past their stale threshold (14 days)"
  - "3 presented Quotes expire in the next 7 days"
  - "5 open Opportunities are past their target close date"
- Given I click an item, then the board or list applies the matching filter and the filter chip reads, for example, "In stage 14+ days".
- Given I collapse the panel, then it stays collapsed for this browser session; given there are no nudges, the panel does not render.
- Given I am a Principal, then counts cover the agency or the selected Office and Producer filters.

## UI states

- Empty: no nudges, so no panel; no placeholder.
- Loading: the panel renders only after its counts load and reserves no space before that, so the board never waits on it.
- Error: if counts fail, the panel is hidden silently and the board still loads.
- No permission: Admins do not see the panel, since they cannot act on Opportunities; Account Managers see it counted over Remarket Opportunities in their Office only.
- Overflow: counts above 99 show "99+".

## Design notes

- Part B collapsible callout: white, ring, 8px radius; title with a count pill; items with a colored dot (warning for stalled and expiring, danger for past target close), bold first line, muted second line ("Oldest: Torres Roofing LLC, 31 days").

## FE notes

- Selector `selectPipelineNudges(user, filters)` derived from Opportunities and Quotes; collapse state in `sessionStorage` wrapped in try/catch.
- Thresholds: stalled = the stage's "Stale after" days from Settings > Pipeline stages (US-SET-006), default 14; expiring = Valid until within 7 days on a Presented Quote.

## Mock data

- At least 4 Opportunities 14+ days in Quoting, 3 Presented Quotes expiring within 7 days, 5 open Opportunities past target close.
