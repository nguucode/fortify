---
id: US-CRT-010
title: Re-issue a single Certificate after a change
epic: CRT
roles: [Account Manager, Principal]
priority: P2
status: Draft
size: S
routes: [/certificates/:id]
dependsOn: [US-CRT-005]
---

## Story

As an Account Manager, I want to re-issue one Certificate with a corrected Holder address, an added Term, or a new flag, so that the Holder gets an accurate certificate without me rebuilding it from scratch.

## Acceptance criteria

- Given an Issued or Re-issued Certificate, when I click "Re-issue", then the Issue form (US-CRT-005) opens prefilled with the current Holder, Terms, flags, description of operations, and delivery, under the title "Re-issue CERT-0123".
- Given the Holder's address changed after issue (US-CRT-002), when the form opens, then a notice reads "Holder address changed on 11/10/2026. The re-issue uses the new address."
- Given I keep the same flags as the original approved Certificate and add none, when I submit, then the new Certificate is Re-issued directly; given I add any ADDL INSD, SUBR WVD, or P&NC that the original did not have, when I submit, then it goes to Needs review.
- Given the re-issue completes, when I view either Certificate, then the new one shows "Re-issue of CERT-0123", the old one shows "Replaced by CERT-0141", and the old one's actions are limited to "Preview".
- Given an old Certificate that is already replaced, when I open it, then "Re-issue" is not offered and a link points to the latest Certificate in the chain.

## UI states

- Empty: not applicable; the form always opens prefilled.
- Loading: same as US-CRT-005.
- Error: "Couldn't re-issue. The original certificate is unchanged." with "Try again".
- No permission: Producer and Admin see "Re-issue" disabled with the tooltip "Only Account Managers and Principals can re-issue certificates."
- Overflow: a chain of 4+ re-issues shows the latest and "3 earlier versions" expandable in History.

## Design notes

- Same full-page edit mode as US-CRT-005, with a muted line under the title "Changes from the original are highlighted"; changed fields get a recessed background and a small "Changed" label.
- The submit button reads "Re-issue certificate" or "Submit for review".

## FE notes

- `CertificatePage` with `?mode=reissue`; the form receives `baseCertificate` and diffs flags with `addedFlags(base, draft)`; review rule is `needsReview()` limited to added flags plus an AI holder newly selected.
- Store action `reissueCertificate(baseId, draft)` creates the new record and sets `replacedBy` on the base; shared with US-CRT-009.

## Mock data

- One Issued Certificate whose Holder address changed after issue; one chain of 4 Certificates (original plus 3 re-issues) for the History overflow.
