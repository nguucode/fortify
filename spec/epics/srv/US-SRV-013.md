---
id: US-SRV-013
title: Account page Service tab
epic: SRV
roles: [Account Manager, Producer, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/accounts/:id]
dependsOn: [US-FND-007, US-SRV-005, US-ACC-003]
---

## Story

As an Account Manager on an Account page, I want the Account's Service Requests in one tab with a quick way to add one, so that during a call I can see what is already open before I create anything new.

## Acceptance criteria

- Given an Account page, when the user opens the Service tab (`/accounts/:id?tab=service`), then the Requests sub-tab shows a table with ID, Subject, Type, Status, Policy, Assignee, Due, and Updated, filtered to Open by default with an Open / Done / All toggle.
- Given a Business Account, when the Service tab shows, then the sub-tabs are Requests, Certificates, and Holders; Certificates and Holders render CRT components, and a Household shows Requests only with no sub-tab bar.
- Given the tab bar, when the Account page loads, then the Service tab's count is the number of open requests (all statuses except Done), and shows no count when it is 0.
- Given "+ New request" in the tab, when the user clicks it, then the US-SRV-005 sheet opens with the Account locked; after creation the new row appears at the top and the count increases by 1.
- Given a row, when the user clicks it, then `/service/:id` opens; the browser Back button returns to the Account's Service tab.

## UI states

- Empty: "No open requests for Torres Household." with "+ New request"; under Done: "No completed requests yet."
- Loading: 5 skeleton rows; the tab count shows a skeleton until loaded.
- Error: "Couldn't load requests for this Account." with "Try again"; the rest of the Account page stays usable.
- No permission: Admin sees the table read-only, with "+ New request" disabled and the tooltip "Admins have read-only access to Service Requests." Account access itself is handled by the Account page (ACC).
- Overflow: Accounts with more than 25 requests paginate at 25; subjects truncate with a tooltip.
- Filtered: switching to Done with none shows "No completed requests yet." and keeps the toggle visible.

## Design notes

- Inside the Account page tab panel. A compact toolbar row: the Open / Done / All segmented control left, "+ New request" (blue, 36px) right. No search box; the volume per Account is small.
- Sub-tabs (Business only) as an underline tab row below the main tab bar, 13/500 labels.
- Same table grammar as US-SRV-002 without the Account and Office columns.

## FE notes

- Component `AccountServiceTab` mounted by the ACC Account page in its Service slot; `AccountServiceTab.openCount(accountId)` is the selector ACC uses for the tab count.
- Sub-tab routing via `?tab=service&sub=requests|certificates|holders`; `certificates` and `holders` mount `AccountCertificatesPanel` and `AccountHoldersPanel` from CRT.
- Store: `serviceRequests.list({ accountId, status })`.

## Mock data

- Torres Household: 3 open, 11 Done. Torres Roofing LLC: 2 open (one Certificate request), 8 Done, 3 Holders, 6 Certificates.
- Quintero Household (Prospect): no requests.
- One Business with 31 requests for pagination.
