---
id: US-RPT-008
title: X-date report
epic: RPT
roles: [Producer, Principal, Admin]
priority: P2
status: Draft
size: S
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-FND-020, US-XDT-001]
---

## Story

As a Producer, I want to see upcoming X-dates by month and line and how many past X-dates turned into Opportunities and wins, so that I plan my quoting months ahead and know whether X-date work pays off.

## Acceptance criteria

- Given the X-date report, then cards show: X-dates in the next 90 days, Premium in play (sum of current premium on those X-dates), X-date to Opportunity rate (X-dates that passed in the range with an Opportunity created before the date), and X-date to Won rate.
- Given the forecast chart, then bars show upcoming X-dates per month for the next 12 months, split into Personal lines and Commercial lines.
- Given the line table, then each line shows Upcoming, Premium in play, Converted to Opportunity, and Won.
- Given I click a month bar or a line row, then I go to `/x-dates` with the matching filter.

## UI states

- Empty: "No X-dates recorded in this scope. X-dates come from Lost Opportunities and from Account Sales tabs."
- Loading: card, chart, and table skeletons.
- Error: "Couldn't load the X-date report. Retry."
- No permission: Account Managers do not have this report, because X-date follow-up always goes to the Producer (rules.md) and roles.md limits them to Office service reports; Producers see their Book only.
- Overflow: forecast months with more than 99 X-dates keep a full count label; premium in play above $1M abbreviates on cards.
- Filtered: Office, Producer, Lines apply; the date range applies only to the conversion cards, and the forecast always looks forward 12 months, stated in the chart subtitle.

## Design notes

- Same report grammar as US-RPT-003; the forecast uses two bar series distinguished by label and a lighter tint of primary blue for Commercial lines.

## FE notes

- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).
- Component `XDateReport`; selectors over XDT X-dates (date, line, premium, linked Opportunity) and PIP Opportunities (stage Won).

## Mock data

- 250 X-dates spread over the next 12 months and the past 12; about 30% of past X-dates linked to an Opportunity, a third of those Won.
