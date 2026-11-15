---
id: US-FND-009
title: Sample data badge
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/today]
dependsOn: [US-FND-002]
---

## Story

As the person demoing Fortify, I want every screen to carry a visible Sample data badge, so that nobody mistakes the fictional Accounts, Policies, and phone numbers for real agency data, including in screenshots.

## Acceptance criteria

- Given any route, including `/403`, `/404`, and the Product menu, then a "Sample data" badge is visible in the top bar next to the Office control.
- Given I hover or focus the badge, then a tooltip says "All names, policies, and numbers are fictional. Reloading the page resets your changes."
- Given the window is 375px wide, then the badge is still visible (shortened to "Sample" with the full label as its accessible name).
- Given I export a list to CSV (US-FND-019), then the file name starts with `sample-` (for example `sample-accounts-11-15-2026.csv`).
- Given the badge, then it cannot be dismissed or hidden by any setting or flag.

## UI states

- Empty: not applicable.
- Loading: rendered with the shell before any data loads.
- Error: not applicable.
- No permission: visible to every role.
- Overflow: not applicable.

## Design notes

- Sits in Part B's "plan badge" slot: a pill, 20px tall, 12/500, fill background, text-label color, with a small flask icon. Neutral, not warning orange, so it reads as a plan-like label rather than an alert.

## FE notes

- `src/shell/SampleDataBadge.tsx` rendered by `TopBar`; tooltip via Radix Tooltip, also reachable by keyboard focus.
- Export helper reads a single `SAMPLE_PREFIX = 'sample-'` constant.

## Mock data

- None.
