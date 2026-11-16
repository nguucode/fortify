---
id: US-HOM-003
title: "Producer Today: my pipeline by stage"
epic: HOM
roles: [Producer]
priority: P0
status: Done
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-PIP-003, US-PIP-010]
---

## Story

As a Producer, I want my open Opportunities summarized by stage with the ones closing this month listed, so that I know which Quotes to push today.

## Acceptance criteria

- Given I am a Producer, when Today loads, then the "My pipeline" widget shows a stage strip for New, Contacted, Gathering info, Quoting, and Proposed, each with a count and estimated premium (for example "Quoting · 7 · $41,280").
- The widget header shows three figures: open Opportunities count, total estimated premium, and "Won this month" premium (sum of accepted Quote lines on Opportunities moved to Won since the 1st).
- Below the strip, a "Closing this month" table lists my open Opportunities with a target close date in the current month, sorted by close date: Account (with type New business, Cross-sell, or Remarket muted under it), Lines, Stage, Est. premium (right-aligned), Close date (MM/DD/YYYY). At most 8 rows.
- Given a target close date is before today, then the date shows in danger text with the label "Past due".
- Given I click a stage in the strip, then I go to /pipeline with the My open saved view filtered to that stage; a table row goes to /pipeline/:id; "View all" goes to /pipeline (My open).
- Given I mark an Opportunity Won on its record and return to Today, then it leaves the strip and the table, and Won this month rises by its accepted premium.

## UI states

- Empty: no open Opportunities shows "No open Opportunities. Qualify a Lead to start one." with a link to /leads; an empty month shows the strip and "Nothing closing this month." under it.
- Loading: strip shows 5 skeleton blocks; table shows 5 skeleton rows.
- Error: "Couldn't load My pipeline." with Retry.
- No permission: not rendered for other roles; Principal uses US-HOM-010.
- Overflow: premiums of $1,000,000 and up show as "$1.24M" in the strip and in full in the table; Account names truncate with a tooltip; 5 or more lines show "BOP, GL, WC +2".

## Design notes

- Stage strip: 5 equal cells inside the card, separated by 1px fill dividers; each cell has the stage label (13px text-label), count (24px, 600), and premium (13px muted). The active hover cell is recessed. No funnel graphic.
- Header figures are 13px label plus 16/600 value, inline right of the title.
- Table per US-FND-007 compact variant. Stage is a dot plus label.

## FE notes

- Queries: `opportunities.summaryByStage({ ownerId: me, status: open })`, `opportunities.list({ ownerId: me, status: open, targetCloseMonth: current, sort: 'targetCloseDate', limit: 8 })`, `opportunities.wonPremium({ ownerId: me, period: 'month' })`.
- Opportunity field names follow rules.md and the PIP Epic (`type`, `stage`, `lines`, `estimatedPremium`, `targetCloseDate`, `source`, `probability`, `wonAt`).
- Subscribes to `opportunity.stageChanged` and `opportunity.won`.

## Mock data

- Dana Whitfield has 23 open Opportunities across all 5 stages, 6 closing this month, 2 of them past due, and 3 Won this month totaling $18,950.
- One Remarket Opportunity linked to a Renewal; one Business Opportunity at $1,240,000 to test number formatting.
