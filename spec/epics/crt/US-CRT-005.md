---
id: US-CRT-005
title: Issue a Certificate from a Certificate request
epic: CRT
roles: [Account Manager, Principal]
priority: P1
status: Done
size: M
routes: [/certificates/:id]
dependsOn: [US-CRT-002, US-CRT-004, US-SRV-008, US-SET-007]
---

## Story

As an Account Manager, I want to open a Certificate created by a Certificate request, confirm the Holder, the Terms, and any additional insured, waiver, or primary and noncontributory marks, then issue it to the Holder, so that a same-day request from a contractor client is done in minutes and anything with E&O exposure goes to a Principal first.

## Acceptance criteria

- Given a Certificate created by a Certificate request (US-SRV-008 calls `certificates.createFromRequest`), when I click "Prepare certificate" on a Requested Certificate, then the Issue form opens prefilled from the request: Holder (existing, or the new holder's values with "Save as a holder on this account" checked), selected Policies, wording flags, Description of operations, Needed by ("Needed by 11/15/2026"), and Delivery.
- Given the Policies section, when it renders, then it lists the Account's Terms in status Bound or Active, one row per Term (line, Carrier, policy number, effective and expiration dates), each with the marks that apply to its line: ADDL INSD (GL, BOP, Commercial auto, Umbrella), SUBR WVD (GL, BOP, Commercial auto, Umbrella, WC), and P&NC (GL, BOP, Umbrella); request-level flags are pre-applied to every eligible selected Term and can be cleared per Term.
- Given the Holder's type is Additional insured, when no Term has ADDL INSD checked, then submitting is blocked with "This holder is an additional insured. Check ADDL INSD on at least one policy, or change the holder type."
- Given no ADDL INSD, SUBR WVD, or P&NC is checked and I am an Account Manager, when I click "Issue certificate", then the Certificate becomes Issued with my name and the time, the mock email goes to the chosen Delivery target, a new Holder from the request is saved if checked, CRT emits `certificate.statusChanged` so SRV moves the request to Done, and the Activity "Certificate CERT-0123 issued to Brazos Builders Inc." is logged on the Account.
- Given I add any ADDL INSD, SUBR WVD, or P&NC while preparing a Requested Certificate as an Account Manager, when I look at the submit button, then it reads "Submit for review"; clicking it sets the status to Needs review and notifies every Principal (US-FND-008). A Certificate that SRV already created in Needs review opens straight in the review flow (US-CRT-007), not this form.
- Given I am a Principal preparing a Certificate with marks, when I look at the submit button, then it reads "Submit for review", as for an Account Manager: a Principal cannot approve their own Certificate, so it goes to Needs review, the other Principals are notified, and the helper reads "Another Principal reviews certificates you prepare."
- Given a selected Term has the Pending cancellation flag, when I select it, then an inline warning reads "Pending cancellation. The holder may receive no notice if it cancels." and I must tick "I understand" before submitting.

## UI states

- Empty: an Account with no Bound or Active Term shows "This account has no active policies to certify." with "Back to certificate", and submit is disabled.
- Loading: skeleton rows for Terms; submit shows a spinner and the form is disabled during the mock call.
- Error: a forced error on submit keeps every input and shows "Couldn't issue the certificate. Nothing was sent." with "Try again".
- No permission: Producer and Admin never see "Prepare certificate" (disabled with tooltip on US-CRT-004). An Account Manager outside the Account's Office gets the access-denied page.
- Overflow: a Business with 12 Locations and 6 Terms scrolls inside the Policies section with a sticky header; Description of operations caps at 500 characters (the same limit as the request form) with a live counter.

## Design notes

- Full-page edit mode on `/certificates/:id` (not a modal): left 60% is the form in four numbered sections (Holder, Policies, Description of operations, Delivery); right 40% is a sticky live thumbnail of the ACORD 25 preview (US-CRT-006) that updates as fields change.
- Holder: combobox of active Holders with type shown, plus "+ New holder" opening the Holder drawer (US-CRT-002).
- Description of operations: textarea plus "Insert standard wording" menu fed by Certificate wording templates (US-SET-007), for example "The certificate holder is an additional insured on general liability where required by written contract, to the extent provided in the attached forms."
- Delivery: radio "Email to holder" or "Email to Account contact", matching the request form; the address is prefilled and editable.
- When review is needed, a warning callout above the button explains why: "Needs Principal review: ADDL INSD on GL, SUBR WVD on WC."

## FE notes

- Component `CertificateIssueForm`, rendered by `CertificatePage` when `?mode=prepare`.
- CRT owns `certificates.createFromRequest(serviceRequestId, { holder, policyIds, wording, descriptionOfOperations, neededBy, delivery })`: it creates the Certificate in Requested, or Needs review when any wording flag is set, and maps request-level flags onto eligible Terms.
- Pure function `needsReview(draft, holder)` returns the list of reasons (marks per Term, or an Additional insured holder); unit-tested, and reused by US-CRT-007, US-CRT-009, and US-CRT-010.
- Line eligibility map `FLAG_ELIGIBILITY = { GL: ['AI','WVD','PNC'], BOP: ['AI','WVD','PNC'], CA: ['AI','WVD'], UMB: ['AI','WVD','PNC'], WC: ['WVD'] }`.
- Store actions: `saveCertificateDraft`, `issueCertificate(id, draft)`, `submitCertificateForReview(id, draft)`; `issueCertificate` emits `certificate.statusChanged` (SRV closes the request on it) and calls `logActivity`.
- Unsaved changes prompt "Discard changes?" on route leave.

## Mock data

- 6 Requested Certificates, each linked to a Certificate request: 5 holder-only in the Houston Office (one of them carries new holder values), and 1 that the preparer escalates by adding a waiver.
- Torres Roofing LLC has GL, Commercial auto, WC, and Umbrella Terms and the Holders seeded by SRV ("Westheimer Commons Development LLC", "City of Houston Public Works", "Brazos Builders Inc."); a TX WC non-subscriber Business has no WC Term so SUBR WVD on WC never appears; one GL Term carries Pending cancellation.
