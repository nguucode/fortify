---
id: US-FND-005
title: Mock data store, API latency, and Demo controls
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/today]
dependsOn: []
---

## Story

As the person demoing Fortify, I want realistic agency data behind an API that behaves like a network, plus controls to force latency, errors, and empty data, so that every screen and every UI state can be shown on demand.

## Acceptance criteria

- Given the app loads, then the store is seeded from the committed JSON in `src/mock/data/` with the counts in `spec/ia/mock-data.md` (600 Accounts, about 1,400 Contacts, 180 Leads, 220 Opportunities, and so on), and day offsets resolve against today, so a Renewal stored as `expiresInDays: 30` always expires 30 days from now.
- Given any API call, when latency is on, then it resolves after a random 200 to 600ms; when latency is off, it resolves on the next tick.
- Given a mutation such as Qualify or Mark won, then the store updates in memory, every subscribed screen re-renders, and a page reload resets all data to the seed.
- Given I open Demo controls, then I can toggle Latency (default On), Force error on this route, and Simulate empty data on this route, set the AMS sync state (Fresh, Stale, or Failed; default Fresh), click Sync renewal outcome, and click Reset data.
- Given at least one Renewal is Decided and AMS sync is Fresh or Stale, when I click Sync renewal outcome, then a mock AMS sync run is logged, every Decided Renewal moves to Done with its expiring Term set to the decided outcome (Renewed, Rewritten, or Non-renewed), and every Won Term showing "Awaiting AMS" is matched by binder number; given AMS sync is Failed, the run is logged as Failed and nothing changes. With no Decided Renewal the button is disabled with the tooltip "No Renewal is Decided."
- Given I change the AMS sync state, then every sync indicator and the last-run status update without a reload.
- Given Force error is on for `/renewals`, then every read on that route rejects with "Something went wrong (500)" until I turn it off; other routes are unaffected.
- Given any override is on, then the Demo controls button shows a warning dot and the tooltip lists the active overrides.

## UI states

- Empty: Simulate empty data makes list reads return zero rows and a zero total, so each list shows its empty state.
- Loading: real latency drives every loading state; no fake spinners.
- Error: Force error drives every error state; the error carries a reference id such as `ERR-7F3A`.
- No permission: the mock API enforces scope, so out-of-scope reads return 403 and the UI never filters scope alone.
- Overflow: not applicable.

## Design notes

- Demo controls is a 32px ghost button with a sliders icon; the panel is a 320px popover with three Radix Switch rows (label 14/500, muted one-line description) and a secondary "Reset data" button.
- Description copy: "Latency · Adds 200–600ms to every call", "Force error on this route · Reads on /renewals fail", "Simulate empty data on this route · Lists return no rows", "AMS sync · Fresh, Stale, or Failed" (a Radix Select row), and "Sync renewal outcome · Moves Decided Renewals to Done, as the AMS would" (a secondary button).

## FE notes

- `src/mock/store.ts`: plain module state with `subscribe` and `getSnapshot`, read through `useSyncExternalStore`; no state library.
- `src/mock/api.ts`: `list(entity, query)`, `get(entity, id)`, `search(q)`, and named mutations (`qualifyLead`, `markOpportunityWon`, `createServiceRequest`, ...), each wrapped by `withDemoControls(route)` for latency, forced error, and empty data.
- `scripts/generate-mock.ts` uses `@faker-js/faker` with seed `20261115` and writes JSON; dates are stored as `*InDays` offsets.
- A `useQuery(fn, deps)` hook returns `{ data, status, error, retry }` for every screen.
- Demo control flags, including `amsSyncState: 'fresh' | 'stale' | 'failed'`, live in the session store and reset on reload.
- `api.syncRenewalOutcomes()` is the only path from Decided to Done (rules.md, Renewals); it appends a `syncRuns` row read by the AMS sync status screens.

## Mock data

- All entities in `spec/ia/mock-data.md`, plus the hand-made cases: the Torres Household linked to Torres Roofing LLC through Mike Torres; very long names; an Account with no Contact; a Business with 12 Locations; and a Renewal with a +38% premium increase.
- Carriers are the canonical fictional list in `spec/ia/mock-data.md`: Lone Star Mutual, Gulf Harbor Insurance, Keystone Commercial Casualty, Gulfstream Indemnity, Pecan Valley Auto, Bayfront Specialty, Meridian National, Copperline Workers Comp, Sunshine State Residual (FL insurer of last resort), and Texas Coastal Windstorm Pool, each with a fictional 5-digit `naic`.
- Several Decided Renewals and Won Terms in "Awaiting AMS" so Sync renewal outcome has something to move.
