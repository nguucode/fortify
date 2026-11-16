---
id: US-SET-012
title: AMS data sync status and log
epic: SET
roles: [Admin, Principal]
priority: P1
status: Done
size: M
routes: [/settings/data-sync]
dependsOn: [US-FND-007, US-SET-001, US-FND-008]
---

## Story

As an Admin, I want to see when Fortify last pulled policies from the AMS, what changed, and which records failed, so that when an Account Manager says "the new Term isn't showing" I can tell whether it is a sync problem or a data problem.

## Acceptance criteria

- Given I open `/settings/data-sync`, when it loads, then a status card shows overall status (Healthy, Degraded, Failed), Last successful sync (MM/DD/YYYY h:mm AM/PM, for example "11/15/2026 6:02 AM"), Next scheduled sync ("12:00 PM · every 6 hours"), and the source "AMS (simulated)".
- Given the Synced records section, when it renders, then it shows one row per synced object, Policies, Terms, Insured items, Additional interests, Commission, Carriers, with Records (count, for example "Terms 3,511"), Changed in last sync, and Errors in last sync.
- Given the Sync log, when it renders, then runs from the last 30 days show Started, Duration ("2m 14s"), Result (Succeeded, Partial, Failed, the same labels as US-HOM-014), Records changed, and Errors, newest first; clicking a run opens a drawer listing its errors, for example "Policy HLX-204417 skipped: Policy has no matching Account in Fortify".
- Given I am an Admin, when I click "Sync now", then the button shows "Syncing…" with a progress bar for about 3 seconds, a new run appears at the top of the log as Succeeded with "12 records changed", and Last successful sync updates; while a sync runs, "Sync now" is disabled.
- Given Demo controls "force an error" is on for this route, when I click "Sync now", then the run ends as Failed, the status card turns Failed with "AMS connection timed out after 30s", and a notification goes to Admins (US-FND-008).
- Given the page, when any role views it, then the description reads "Fortify reads policies, terms, and commission from the AMS. It never writes them back. Claims are tracked in Fortify."

## UI states

- Empty: with "simulate empty", "No sync has run yet." with "Sync now" (Admin only).
- Loading: status card and table skeletons.
- Error: page error panel "Sync status couldn't load." with "Try again".
- No permission: Principal sees everything with "Sync now" disabled and the tooltip "Only Admins can change Settings."; Producer and Account Manager get `/403`.
- Overflow: error messages truncate in the log with full text in the drawer; runs with 200+ errors show the first 50 and "Download full list" (mock CSV); the log paginates at 50 runs.
- Filtered: the log filters by Result; "No runs with this result in the last 30 days." when empty.

## Design notes

- Top: analytics-style status card (white, ring) with the status dot and label (success, warning, danger), last and next sync, and "Sync now" as the page's primary button top-right.
- Synced records: compact table, counts right-aligned with tabular-nums; nonzero errors in danger text with an icon.
- Sync log: Part B data table; Result as dot plus label.

## FE notes

- Store slice `syncRuns`: `id`, `startedAt`, `durationSec`, `result`, `changed`, `errors[]` (`entity`, `ref`, `message`); action `runSync()` simulates progress with timers and then appends a run. It does not mutate synced entities; it only bumps `updatedAt` on 12 random Terms so "Changed" is believable.
- Overall status is derived: Failed if the last run failed, Degraded if any of the last 3 runs was Partial, else Healthy.
- HOM's Admin Today reads `selectSyncStatus()` from this slice.

## Mock data

- 120 runs over 30 days at 12:00 AM, 6:00 AM, 12:00 PM, and 6:00 PM, matching US-HOM-014: the latest run (6:02 AM today) Partial with 14 skipped records (top reason "Policy has no matching Account in Fortify"), one Failed 2 days ago with "AMS connection timed out after 30s", a few other Partial runs (unknown carrier code, Term missing effective date, Insured item with invalid VIN), the rest Succeeded. The log paginates at 50.
- Record counts: Policies 1,502 · Terms 3,511 · Insured items 4,880 · Additional interests 612 · Carriers 10.
