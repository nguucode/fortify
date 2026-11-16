---
id: US-HOM-014
title: "Admin Today: AMS sync status"
epic: HOM
roles: [Admin]
priority: P1
status: Done
size: S
routes: [/today]
dependsOn: [US-HOM-001, US-FND-005, US-SET-012]
---

## Story

As an Admin, I want to see whether the last AMS sync succeeded and what it skipped, so that I catch Policy data problems before users report stale Policies.

## Acceptance criteria

- Given I am an Admin, when Today loads, then the "AMS sync" widget shows the last run: status (Succeeded, Partial, or Failed with icon and label), finished time ("Today 6:02 AM"), duration ("2m 14s"), and next scheduled run ("12:00 PM").
- It lists records synced per object for the last run: Policies 1,502 · Terms 3,511 · Insured items 4,880 · Additional interests 612 · Commission records 1,498 · Renewal outcomes 12 · Won Terms matched 3. Claims are Fortify's tracking records and are not synced.
- Given I change the AMS sync state or click Sync renewal outcome in Demo controls (US-FND-005), then the widget shows the new last run without a reload.
- Given the last run was Partial, then a warning line reads "14 records skipped" with the top reason ("Policy has no matching Account in Fortify"); given Failed, a danger line shows the error message.
- A compact list shows the previous 5 runs with time and status.
- "View all" goes to /settings/data-sync, where re-running and details live (SET Epic).

## UI states

- Empty: no runs yet shows "No sync has run yet."
- Loading: card skeleton.
- Error: "Couldn't load AMS sync status." with Retry.
- No permission: not rendered for other roles.
- Overflow: record counts in tabular-nums with thousands separators; error messages truncate at 2 lines with "Show more".

## Design notes

- Status uses icon plus label in success, warning, or danger text; never a filled banner.
- Counts as a 2-column definition list, 13px label and 14/500 value.

## FE notes

- Query `sync.runs({ limit: 6 })`; the first run is the last run. Read-only widget; no action buttons.

## Mock data

- 6 runs: last one Partial with 14 skipped records, one Failed 2 days ago with "AMS connection timed out after 30s", the rest Succeeded.
