---
id: US-FND-013
title: Record page header and tabs pattern
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/accounts/:id, /pipeline/:id, /policies/:id, /renewals/:id, /service/:id]
dependsOn: [US-FND-001, US-FND-017, US-FND-018]
---

## Story

As a Producer moving from a Lead to an Opportunity to a Policy, I want every record page to open with the same header (name, status, owners, actions) and tab bar, so that I always know what I am looking at and where its actions live.

## Acceptance criteria

- Given a record route, then the header shows a breadcrumb back to the list ("Accounts / Torres Household"), the record name as `h1`, a status cell, and a meta line such as "Household · Producer Dana Whitfield · Account Manager Marisol Reyes · Houston TX".
- Given the record has actions, then at most one primary action sits top-right (for example "+ New Opportunity"), up to two secondary outline buttons, and the rest in an overflow menu.
- Given the record type defines `tabs` in `sitemap.yaml` (the Account has Overview, Policies, Renewals, Sales, Service, Activity, Documents), then the tab bar renders them in order, the selected tab is in the URL as `?tab=policies`, and Overview is the default.
- Given a tab has a count (for example 4 Policies), then the tab shows it as a count pill.
- Given a synced record (Policy, Term), then the header shows a muted "Synced from AMS · read-only" label with a sync icon, and edit actions are replaced by "Request a Policy change".
- Given a Claim, which is Fortify's tracking record, then the header shows no synced label; its loss details are read-only and its tracking fields are editable only by Account Managers (Office) and Principals.

## UI states

- Empty: a tab with no content uses the shared empty state, for example "No Renewals for this Account".
- Loading: the header shows a skeleton name and meta line; tabs render immediately from `sitemap.yaml`.
- Error: the header still renders the breadcrumb; the body shows the shared error state with Try again.
- No permission: actions the role cannot take are disabled with a reason tooltip (US-FND-018); out-of-scope records render access-denied (US-FND-006).
- Overflow: names wrap to two lines then truncate with a tooltip; more tabs than fit scroll horizontally.

## Design notes

- Page header per Part B: `h1` 30/600, meta line 14 muted, actions top-right as 32px outline buttons plus one blue primary.
- Tabs: Radix Tabs, 14/500, text-label, active text-strong with a 2px text-strong underline; 1px line below the bar.
- Synced label uses text-muted and a sync icon; never a colored pill.

## FE notes

- `src/patterns/RecordHeader.tsx` with props `{ breadcrumb, title, status, meta, primaryAction, actions, synced }`; `src/patterns/RecordTabs.tsx` reads tab ids from `sitemap.yaml` by item id and syncs `?tab=` with `useSearchParams`.
- Each record route lazy-loads its tab panels.

## Mock data

- Torres Household (7 tabs populated), an Account with no Contact (empty tabs), a 90-character Business name, and a synced Policy.
