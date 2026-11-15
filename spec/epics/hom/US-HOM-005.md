---
id: US-HOM-005
title: "Producer Today: goal pacing"
epic: HOM
roles: [Producer]
priority: P1
status: Draft
size: M
routes: [/today]
dependsOn: [US-HOM-001, US-FND-005]
---

## Story

As a Producer, I want to see where my written premium stands against my goal and where it should be today, so that I know whether I am ahead or behind before the month ends.

## Acceptance criteria

- Goals are seeded and read-only in v1: the widget is labeled "Set by your Principal" and nothing in Fortify edits them.
- Given I am a Producer with a monthly goal, when Today loads, then the "Goal pacing" widget shows: Goal ($40,000), Currently at ($18,950, 47%), Should be at ($20,000 on day 15 of 30), and Still needed ($21,050).
- Currently at is the accepted Quote premium of my Opportunities of type New business or Cross-sell moved to Won in the period. Remarket Opportunities do not count (they are retention, not new business).
- Given Currently at is below Should be at, then a warning text line reads "Behind pace by $1,050"; at or above, a success text line reads "Ahead of pace by $X".
- A second row shows policy count against the count goal ("Policies: 9 of 20").
- A segmented control switches Month and Year to date; Year to date uses the annual goal and day of year.
- A line "Est. new commission $2,274" shows my own estimated commission for the period (the mock default split: 50% of agency commission on new business); it never shows any other user's commission.

## UI states

- Empty: no goal set shows "No goal set for November. Set by your Principal." and still shows Currently at.
- Loading: card skeleton with the bar and 4 figure blocks.
- Error: "Couldn't load Goal pacing." with Retry.
- No permission: not rendered for other roles; Principal sees goal attainment per Producer in US-HOM-010.
- Overflow: on the last day of the month Should be at equals the goal; above 100% the bar fills and the percent shows ("112%") with no overflow past the card.

## Design notes

- Analytics card per Part B: 13px label, 24px value for Currently at, figures in a 2×2 grid of label/value pairs.
- Progress bar: 8px tall, fill-color track, primary fill for Currently at, a 2px text-strong tick at Should be at with a 12px caption under it.
- Pace line uses warning or success text with an arrow icon; no colored background.

## FE notes

- Query `goals.pacing({ userId: me, period: 'month' | 'ytd' })` returns `goalPremium`, `goalPolicies`, `currentPremium`, `currentPolicies`, `estCommission`.
- Should be at = goalPremium × (day of period ÷ days in period), calendar days, rounded to whole dollars. Unit-test the formula for day 1, mid-month, and last day.
- Commission field comes back only for `userId === me` on the Producer role; the component renders the line only when the field exists (hidden, not masked).

## Mock data

- `goals` collection, seeded per Producer (mock-data.md): one row per Producer per month and year, `{ userId, period, premium, policies }`. Dana Whitfield: November $40,000 / 20 policies; 2026 $460,000 / 230.
- One Producer with no goal for the current month.
