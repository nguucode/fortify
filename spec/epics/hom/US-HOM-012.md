---
id: US-HOM-012
title: "Principal Today: Certificate approvals"
epic: HOM
roles: [Principal]
priority: P1
status: Done
size: S
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-CRT-007]
---

## Story

As a Principal, I want the Certificates waiting for my approval of additional insured, waiver, or primary & noncontributory wording, so that I clear them the same day and keep the E&O exposure in check.

## Acceptance criteria

- Given I am a Principal, when Today loads, then the "Certificate approvals" widget lists Certificates in Needs review, oldest first, at most 6 rows, with the total in the count pill.
- Each row shows the Holder, the Business Account muted under it, Prepared by (the preparer's name), the requested provisions ("Additional insured · Waiver of subrogation · Primary & noncontributory"), and Age.
- Given a Certificate has waited more than 4 business hours, then Age shows in warning text; more than 1 business day, danger text.
- Given I click a row, then I go to /certificates/:id, where approval happens (CRT Epic); "View all" goes to /certificates (Needs review).
- Given I prepared a Certificate myself, then its row shows "Needs another Principal" in muted text, because a Principal cannot approve their own Certificate; the other Principal sees it as a normal row.
- The top bar Office scopes the list.

## UI states

- Empty: "No Certificates waiting for approval."
- Loading: 6 skeleton rows.
- Error: "Couldn't load Certificate approvals." with Retry.
- No permission: not rendered for other roles; Account Managers see the same items read-only in US-HOM-009.
- Overflow: Holder names truncate with a tooltip.

## Design notes

- Same row grammar as US-HOM-009 so the request and the approval read the same way.

## FE notes

- Query `certificates.list({ status: 'Needs review', officeId?, sort: 'requestedAt', limit: 6 })`; business-hours age as in US-HOM-009.
- Subscribes to `certificate.statusChanged` so an approval on the record removes the row.

## Mock data

- 7 Needs review Certificates agency-wide, one waiting 2 business days, one on a Business with 12 Locations.
