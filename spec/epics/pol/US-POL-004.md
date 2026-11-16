---
id: US-POL-004
title: AMS sync indicator and read-only affordances
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/policies, /policies/:id, /accounts/:id]
dependsOn: [US-FND-005, US-POL-002]
---

## Story

As a Producer, I want every synced Policy screen to tell me when it last synced from the AMS and that it cannot be edited here, so that I trust the numbers and know where changes go.

## Acceptance criteria

- Given a synced screen (Policies list, Policy page, Account Policies tab), then a sync indicator shows "Synced from AMS · 12 min ago" with a green dot and a tooltip "Last sync 11/15/2026 9:42 AM. Policy, Term, Insured item, and Additional interest data are read-only in Fortify."
- Given the last sync is older than 24 hours, then the indicator turns warning, reads "Last synced 2 days ago", and the tooltip adds "Data may be out of date."
- Given the mock sync status is failed, then the indicator turns danger, reads "AMS sync failed", and the Policy page shows a banner "We couldn't reach the AMS. You're seeing data from 11/13/2026 4:10 PM."
- Given I hover any synced field label on the Policy page, then a lock icon appears with the tooltip "Synced from AMS. Request a change to update it."
- Given Demo controls, when I pick a sync state (Fresh, Stale, Failed), then every indicator on screen updates without a reload.

## UI states

- Empty: a Policy never synced (only possible for a just-Bound demo Term) shows "Awaiting AMS" in neutral until a sync matches it by binder number.
- Loading: indicator shows "Checking sync…" with a muted spinner for the request duration.
- Error: the Failed state above.
- No permission: none; all roles see the indicator.
- Overflow: at widths under 1280px the indicator collapses to the dot plus "12 min ago", full text in the tooltip.

## Design notes

- Small inline status, 13px text-muted with a status dot, not a pill; sits right-aligned in the page header next to secondary actions.
- Lock icons appear on hover only, at 50% opacity, to keep density.

## FE notes

- `AmsSyncIndicator` reads `store.sync.status()` returning `{ state: 'fresh' | 'stale' | 'failed' | 'pending', lastSyncedAt }`; relative time updates every 60s.
- The "AMS sync" state in Demo controls (US-FND-005, per rules.md) sets the mock sync state.
- `SyncedField` wrapper renders the hover lock and tooltip; used by POL tabs.

## Mock data

- `sync.lastSyncedAt` as a minute offset from now (default 12 minutes ago); stale preset 2 days; failed preset with last good sync 2 days ago.
