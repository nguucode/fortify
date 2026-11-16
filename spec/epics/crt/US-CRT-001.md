---
id: US-CRT-001
title: Holders sub-tab on a Business Account
epic: CRT
roles: [Account Manager, Principal, Producer, Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-FND-005, US-FND-007, US-CRT-002, US-SRV-013]
---

## Story

As an Account Manager, I want to see every Holder on a Business Account in one list, with its type and when it last received a Certificate, so that I reuse the right Holder instead of retyping a general contractor's name and address on every request.

## Acceptance criteria

- Given a Business Account, when I open its Service tab, then I see the sub-tabs Requests, Certificates, and Holders (the sub-tab bar is owned by US-SRV-013), and the Holders sub-tab shows a count of active Holders (for example "Holders 3").
- Given a Household Account, when I open its Service tab, then the Certificates and Holders sub-tabs are not rendered at all.
- Given the Holders sub-tab, when it loads, then each row shows Name (with city, state as the muted secondary token), Type (Holder-only or Additional insured), Project, Email, Certificates issued (count), Last issued (MM/DD/YYYY), and Status (Active or Inactive), sorted by Last issued, newest first.
- Given I am an Account Manager in the Account's Office or a Principal, when I click "+ Add holder" or a row's "Edit", then the Holder drawer from US-CRT-002 opens.
- Given I am a Producer or an Admin, when I view the sub-tab, then "+ Add holder" and "Edit" are disabled with the tooltip "Only Account Managers and Principals can manage Holders."
- Given the toggle "Show inactive" is off (default), when the list renders, then Inactive Holders are hidden and the meta line reads "Showing 3 active holders · 1 inactive hidden".
- Given a row, when I click "Issued 4", then the Certificates sub-tab opens filtered to that Holder.

## UI states

- Empty: "No holders yet. Add a holder once and reuse it on every certificate." with a "+ Add holder" button (disabled for read-only roles).
- Loading: 5 skeleton rows at 40px inside the table container; the sub-tab count shows a muted "–".
- Error: inline error panel inside the sub-tab, "Holders couldn't load." with "Try again"; the rest of the Account page stays usable.
- No permission: Producer and Admin see the list read-only (disabled actions with tooltip). An out-of-scope Account never reaches this tab; it shows the access-denied page from US-FND-006.
- Overflow: names truncate with an ellipsis and a full-value tooltip (seed: "Brazos Valley Regional Healthcare Facilities Construction Joint Venture II"); more than 25 Holders paginate at 25 rows.
- Filtered: the search box filters by Name, Project, or Email; with no match, "No holders match "acme"." with "Clear search".

## Design notes

- Sub-tab bar sits under the Account page tab bar, left-aligned, 13/500 labels with counts as neutral pills; active sub-tab underlined in text-strong, not blue.
- Toolbar: search (36px, placeholder "Search holders"), "Show inactive" switch, primary "+ Add holder" at the far right.
- Dense 40px table per Part B. Type renders as text plus a small icon (shield icon for Additional insured), never a colored pill. Inactive rows render text in text-muted with the status "Inactive".
- Empty cells show "—" (for example, a Holder with no email).

## FE notes

- Route `/accounts/:id`, tab `service`, sub-tab state in the query string: `?tab=service&sub=holders`, so a link can deep-open it.
- Components: `AccountHoldersPanel` (mounted by the SRV Service tab, US-SRV-013), `HoldersTable` built on the FND data table (US-FND-007), `HolderDrawer` (US-CRT-002).
- Store selectors: `selectHoldersByAccount(accountId, { includeInactive })`, `selectCertificateCountByHolder(holderId)`. Permission check through the shared `can(user, 'holder', 'edit', account)` helper; Holder create and edit follow the Holder row in roles.md (Account Manager, Principal; Producer and Admin read only).
- Sub-tab visibility keyed on `account.kind === 'Business'`.

## Mock data

- `holders`: about 140 Holders across about 45 Business Accounts; fields `id` (HLD-0001), `accountId`, `name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`, `email`, `phone`, `type`, `projectName`, `projectNumber`, `active`, `createdAt`, `lastIssuedAt`.
- Edge cases: Torres Roofing LLC with the 3 active Holders seeded by SRV ("Westheimer Commons Development LLC", "City of Houston Public Works", "Brazos Builders Inc.") plus 1 Inactive; one Business with 0 Holders; a Holder with no email; the very long Holder name above; the Business with 30 Holders from SRV's seed for pagination and search.
