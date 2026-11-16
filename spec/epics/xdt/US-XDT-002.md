---
id: US-XDT-002
title: View, add, and edit an X-date
epic: XDT
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/x-dates, /accounts/:id]
dependsOn: [US-FND-005, US-XDT-001]
---

## Story

As an Account Manager rounding an Account, I want to record a line the Account buys elsewhere in a few fields, so that the Producer gets a Task to quote it before it renews at the other agency.

## Acceptance criteria

- Given I click "+ Add X-date", when the drawer opens, then it shows Account (search, required), Line (required), Current carrier (required), Current agency, Policy number, X-date (MM/DD/YYYY, required), Term length (6 or 12 months, default 12), Premium, Interest level (High, Medium, Low, Closed; default Medium), and Notes.
- Given I opened the drawer from an Account page, when it opens, then Account is prefilled and locked; Line options follow the Account kind (Household: Auto, Home, Umbrella, Renters, Condo, Flood, Boat; Business: BOP, GL, WC, Commercial auto).
- Given the Account already has a Policy with the agency on the same line with an active Term, when I pick that line, then a warning reads "Nguyen Household already has Home with the agency (Lone Star Mutual, renews 03/01/2027). Record an X-date only for coverage written elsewhere."
- Given the X-date is more than 30 days in the past, when I save, then a warning asks "This date has passed. Roll it forward to 11/15/2027?" with "Roll forward" and "Save as entered".
- Given I click a row on /x-dates, when the drawer opens in view mode, then it shows every field, the source ("Manual", "Lead L-1042", or "Lost opportunity" linked to /pipeline/:id), the follow-up Task, and the linked Opportunity, with "Edit" and "Start quote" (US-XDT-005).
- Given I save, when the store confirms, then the drawer closes, a toast reads "X-date saved", the row appears in the list and on the Account, and the follow-up rule (US-XDT-004) is evaluated for it.

## UI states

- Empty: view mode with optional fields blank shows "—".
- Loading: drawer skeleton in view mode; Save spinner in edit mode.
- Error: "Couldn't save the X-date. Your entries are kept." with "Try again".
- No permission: an X-date on an Account outside my scope is not listed; the Account search only returns Accounts in scope.
- Overflow: carrier and agency names up to 80 characters; Notes up to 1,000 characters; premium up to $9,999,999.

## Design notes

- Right drawer, 480px, same pattern as other create/edit drawers. View mode lays fields out as key-value rows; a muted header line shows "Home · Okafor Household (Prospect)".
- Current carrier is a combobox over the mock Carrier list that also accepts free text, because the competing carrier may not be one the agency is appointed with.
- Interest level as a 4-option segmented control.

## FE notes

- `XDateDrawer` with `mode: 'view' | 'create' | 'edit'`, opened from `XDateListPage` and from the Account section (US-XDT-003). Drawer state lives in the URL as `?xdate=:id` (`?xdate=new` to create) on /x-dates and /accounts/:id, so a notification or Calendar overlay can deep-link to one X-date.
- Store actions `createXDate(input)`, `updateXDate(id, patch)`. Shape: `{ id, accountId, line, currentCarrier, currentAgency, policyNumber, xDate, termMonths, premium, interestLevel, notes, source: 'Manual' | 'Lead' | 'Lost opportunity', sourceRef, followUpTaskId, opportunityId, createdBy, createdAt }`.
- The same `createXDate` is called by Lead Qualify (US-LEA-007) and Disqualify · Bought elsewhere (US-LEA-008), both with `source = 'Lead'`, and by the Pipeline Lost flow (US-PIP-011) with `source = 'Lost opportunity'`. The source enum above is the stored value; callers map to it.
- Same-line check uses the Account's synced Policies, read-only.

## Mock data

- Nguyen Household (Client) with an active Home Term for the same-line warning; Okafor Household (Prospect) with Auto and Home both elsewhere; a Client with Auto at the agency and Home elsewhere; carriers both from the Carrier list and free text ("Bayou State Insurance Exchange").
