---
id: US-CRT-003
title: Certificates sub-tab on a Business Account
epic: CRT
roles: [Account Manager, Principal, Producer, Admin]
priority: P1
status: Draft
size: S
routes: [/accounts/:id]
dependsOn: [US-FND-005, US-FND-007, US-CRT-004, US-SRV-013]
---

## Story

As an Account Manager, I want every Certificate for a Business Account listed under its Service tab, with status, Holder, and the Terms it covers, so that when the client calls asking "did the GC get our certificate?" I can answer in one look.

## Acceptance criteria

- Given a Business Account, when I open Service, then Certificates, then the list shows one row per Certificate: ID (CERT-0123, mono), Holder, Policies (line abbreviations such as "GL · Auto · WC"), Flags (AI, WVD, P&NC as short text tags), Status, Issued (MM/DD/YYYY or "—"), and Issued by.
- Given the sub-tab count, when Certificates are open, then the count equals Certificates in Requested or Needs review (for example "Certificates 2").
- Given a row, when I click it, then I go to `/certificates/:id` (US-CRT-004).
- Given a Certificate is Issued and one of its Terms expires within 30 days, when the list renders, then the row shows a muted warning "Term expires 03/01/2027" under the Policies cell.
- Given I came from a Holder's "Issued 4" link, when the list opens, then it is filtered to that Holder, with a removable filter chip "Holder: Brazos Builders Inc.".
- Given this sub-tab is read-only by design, when any role views it, then there is no create button here; a callout reads "Certificates start from a Certificate request." with a link "New service request" handled by SRV.

## UI states

- Empty: "No certificates for this account yet. They're created from a Certificate request." with the "New service request" link (hidden for Admin, who has Service Request R only).
- Loading: skeleton rows at 40px; counts show "–".
- Error: inline panel "Certificates couldn't load." with "Try again".
- No permission: all four roles in scope can read. An out-of-scope Account shows the access-denied page (US-FND-006).
- Overflow: Holder names truncate with tooltip; a Certificate covering 5 Policies shows "GL · Auto · WC +2" with a tooltip listing all; 60+ Certificates paginate at 25.
- Filtered: status filter (All, Requested, Needs review, Issued, Re-issued) and Holder filter; no match shows "No certificates match these filters." with "Clear filters".

## Design notes

- Same sub-tab bar and toolbar grammar as US-CRT-001. Status cell is dot plus 13px label: Requested (neutral), Needs review (warning), Issued (success), Re-issued (info). No filled pills.
- Flags render as small neutral text tags in mono caps (AI, WVD, P&NC), so a reviewer can scan risk without color.
- Meta line under the toolbar: "12 certificates · 2 open · last issued 11/12/2026".

## FE notes

- Route `/accounts/:id?tab=service&sub=certificates&holder=HLD-0007`; filter state lives in the query string.
- Components: `AccountCertificatesPanel` (mounted by the SRV Service tab, US-SRV-013), `CertificatesTable` (shared column definitions with US-CRT-008, with the Account column hidden), `CertificateStatus`, `CertificateFlags`.
- Selectors: `selectCertificatesByAccount(accountId, filters)`, `selectTermsByIds(termIds)` for line labels and expiration warnings.

## Mock data

- `certificates` (80 total) with fields `id`, `accountId`, `serviceRequestId`, `holderId`, `status`, `termIds`, `flags` per Term `{ additionalInsured, waiverOfSubrogation, primaryNoncontributory }`, `descriptionOfOperations`, `requestedAt`, `requestedBy`, `submittedForReviewAt`, `reviewedBy`, `reviewedAt`, `reviewNote`, `issuedAt`, `issuedBy`, `delivery`, `reissueOf`, `replacedBy`.
- Torres Roofing LLC carries 6 Certificates (matching SRV's seed): 1 Requested, 1 Needs review, 3 Issued, 1 Re-issued; one Issued Certificate covers a GL Term expiring in 21 days.
