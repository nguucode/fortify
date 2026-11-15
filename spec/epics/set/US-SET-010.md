---
id: US-SET-010
title: Licenses by user and state (read-only)
epic: SET
roles: [Admin, Principal]
priority: P1
status: Draft
size: M
routes: [/settings/licenses]
dependsOn: [US-FND-007, US-SET-001]
---

## Story

As an Admin, I want every user's state Licenses in one list with expiration warnings, so that I catch a Producer whose TX license lapses next month before they sell or get credited on a policy they can't legally write.

## Acceptance criteria

- Given I open `/settings/licenses`, when it loads, then one row per License shows User (Office as the muted secondary token), State, License type, Residency (Resident, Nonresident), License #, Issued, Expires (MM/DD/YYYY), and Status (Active, Expiring soon, Expired).
- Given License types, when they render, then they use the state names: TX "General Lines – Property and Casualty" and "Personal Lines – Property and Casualty"; FL "2-20 General Lines", "20-44 Personal Lines", and "4-40 Customer Representative" (the labels US-HOM-013 and US-PIP-006 use).
- Given a License expires within 60 days, when the list renders, then its Status is Expiring soon with a warning icon and the days left ("Expires in 21 days"); given it is past expiration, Status is Expired in danger text.
- Given the page, when it loads, then a callout above the table reads "4 licenses expire in the next 60 days · 1 expired" listing each with the user's name, and the meta line reads "41 licenses · 25 users".
- Given the page, when any role views it, then the description reads "Licenses are tracked by the agency's licensing process. Read only in Fortify." and there is no add, edit, or renew action.
- Given filters, when I filter by User, Office, State, License type, or Status (or arrive from US-SET-002 with `?user=`), then the list updates and the chip shows the filter.

## UI states

- Empty: a user with no Licenses filtered alone shows "Jordan Lee has no licenses on file." (an Account Manager in training, for example).
- Loading: 10 skeleton rows; the callout shows a skeleton line.
- Error: page error panel "Licenses couldn't load." with "Try again".
- No permission: read-only for Admin and Principal by design; Producer and Account Manager get `/403`.
- Overflow: license numbers up to 12 characters in mono; long user names truncate with tooltip.
- Filtered: chips with "Clear all"; no match shows "No licenses match these filters."

## Design notes

- Part B list page with the "Read only" badge; collapsible callout panel for expirations, items with a warning or danger dot, bold user name, muted line "TX General Lines – P&C · expires 12/06/2026".
- Status: dot plus label, never a filled pill. Expires column right-aligned with tabular-nums.

## FE notes

- Licenses live on `user.licenses[]` (`id`, `state`, `type`, `residency`, `number`, `issuedAt`, `expiresAt`), the shape PIP's eligibility check reads; status is derived by `licenseStatus(expiresAt, today)` (60-day window), unit-tested at the boundaries 0, 60, and 61 days.
- `selectLicenseHealth(userId)` is shared with US-SET-002 and with PIP's Quote warning.

## Mock data

- About 41 Licenses: Houston and San Antonio users hold TX licenses, Tampa users hold FL licenses, and 6 users hold a Nonresident License in the other state.
- Producers hold General Lines (TX) or 2-20 (FL); some Account Managers hold Personal Lines (TX) or 4-40 (FL).
- Edge cases, matching US-HOM-013: 4 expiring in 21, 38, 47, and 55 days (one TX, three FL including one 4-40); 1 expired 3 days ago; 1 Account Manager with no License; Dana Whitfield's FL 2-20 expired on 10/31/2026 as used in US-PIP-006 if that date is still in the past at load.
