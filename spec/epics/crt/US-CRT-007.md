---
id: US-CRT-007
title: Principal reviews a Certificate with AI, waiver, or P&NC
epic: CRT
roles: [Principal, Account Manager]
priority: P1
status: Draft
size: M
routes: [/certificates/:id]
dependsOn: [US-FND-008, US-CRT-005, US-CRT-006]
---

## Story

As a Principal, I want to review each Certificate that grants additional insured status, a waiver of subrogation, or primary and noncontributory wording against the Terms it cites, then approve or return it with a note, so that the agency never certifies coverage a Policy does not provide.

## Acceptance criteria

- Given a Certificate in Needs review, when I (Principal) click "Review", then a review panel opens beside the preview listing each reason ("ADDL INSD on KCC-GL-0019387", "SUBR WVD on KCC-WC-0020114", "P&NC on KCC-GL-0019387"), who filed the request or submitted it for review, the submit time, the source request ("From SR-10495"), and the request note.
- Given each reason, when it renders, then it shows whether the cited Term has a matching endorsement on file in the mock data ("Blanket additional insured endorsement on file" or "No endorsement on file") as a read-only hint from synced Term data.
- Given I prepared the Certificate, submitted it for review, or filed its Certificate request, when I (Principal) open the review panel, then "Approve and issue" and "Return" are disabled with "You prepared this certificate. Another Principal must review it." and the panel names the other Principals.
- Given I click "Approve and issue", when I confirm, then the Certificate becomes Issued with me as reviewer and issuer (a request can come straight from SRV in Needs review, filed by a Producer who cannot issue), the Holder email (mock) is sent, the Service Request moves to Done, the submitter gets a notification "CERT-0123 approved and issued", and an Activity is logged.
- Given I click "Return", when I enter a required note (at least 10 characters, for example "WC policy has no blanket waiver. Ask the carrier for an endorsement first.") and confirm, then the Certificate goes back to Requested, the note shows in History and as a banner on the Certificate, and the submitter gets a notification.
- Given a reason cites a Term with "No endorsement on file", when I click "Approve and issue", then the confirm dialog adds "1 flag has no endorsement on file. Approve anyway?" and still allows approval.
- Given I am the Account Manager or Principal who submitted, when I open the Certificate in Needs review, then I see the reasons read-only and a "Withdraw" action that returns it to Requested without a note.

## UI states

- Empty: not applicable; the panel only opens for Needs review Certificates. A Certificate that left Needs review while the panel was open shows "This certificate was already reviewed by Elena Brooks at 2:14 PM." and closes the actions.
- Loading: reasons list skeleton; buttons disabled.
- Error: a forced error on approve or return shows "Couldn't save your review. Nothing changed." with "Try again"; the note is kept.
- No permission: Account Manager sees reasons read-only with "Withdraw" only on Certificates they submitted; Producer and Admin see the status but not the panel's actions, disabled with tooltip "Only a Principal can approve certificates."
- Overflow: a Certificate with 6 reasons lists them all with a scroll inside the panel; long notes wrap.

## Design notes

- Right-side review panel (400px) over the Certificate page, with the ACORD 25 preview (US-CRT-006) filling the remaining width so the reviewer reads the actual output.
- Each reason is a row with a warning dot, a bold first line ("SUBR WVD on KCC-WC-0020114 · Keystone Commercial Casualty") and a muted second line (endorsement hint).
- Footer: secondary "Return" (opens the note field inline), primary "Approve and issue".
- The returned banner on the Certificate page uses the warning tint with the reviewer's name and note.

## FE notes

- Component `CertificateReviewPanel`, opened from `CertificatePage` with `?mode=review`; reasons computed with `needsReview()` from US-CRT-005.
- Store actions: `approveCertificate(id, reviewerId)` (internally calls the issue path), `returnCertificate(id, note)`, `withdrawCertificateReview(id)`; each appends to `certificate.events` and pushes a notification through the FND notifications store.
- Endorsement hint reads `term.endorsements[]` (mock) matched by flag type.
- `canReview(certificate, user)` returns false when the user is the preparer, the submitter, or the requester, so no Principal approves their own Certificate.
- Concurrency check: compare `certificate.status` at open time with the store before writing.

## Mock data

- 7 Certificates in Needs review across 2 Offices (3 in Houston), including SR-10495 / CERT-0412 from SRV: 3 with matching endorsements on file, 3 with one flag lacking an endorsement, 1 with all three flags and 6 reasons.
- `term.endorsements[]` on commercial Terms with types `additionalInsured`, `waiverOfSubrogation`, `primaryNoncontributory`, as listed in the rules.md mock data additions.
- The 2 Principals from mock-data.md: Grant Holloway and Elena Brooks. One Needs review Certificate was submitted by Grant Holloway, so only Elena Brooks can review it.
