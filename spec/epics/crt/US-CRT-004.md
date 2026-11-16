---
id: US-CRT-004
title: Certificate page with status, coverage, and history
epic: CRT
roles: [Account Manager, Principal, Producer, Admin]
priority: P1
status: Done
size: M
routes: [/certificates/:id]
dependsOn: [US-FND-005, US-FND-006]
---

## Story

As an Account Manager, I want one page per Certificate that shows its status, Holder, covered Terms, flags, and full history, with the next action for its status, so that I can move a Certificate request to Issued and later prove exactly what was sent, to whom, and when.

## Acceptance criteria

- Given a Certificate, when I open `/certificates/:id`, then the header shows the ID (CERT-0123), status, Holder name, the Business Account as a link to `/accounts/:id`, and the source Certificate request as a link to `/service/:id` ("From SR-10421").
- Given status Requested, when I am an Account Manager in scope or a Principal, then the primary action is "Prepare certificate", which opens the Issue form (US-CRT-005).
- Given status Needs review, when I am a Principal who did not prepare or request it, then the primary action is "Review" (US-CRT-007); when I am the Account Manager, or the Principal who prepared or requested it, the header shows "Waiting for Principal review since 11/14/2026" and no primary action.
- Given status Issued or Re-issued, when I view the page, then I can "Preview" (US-CRT-006), "Resend" to the Holder's email (mock, logs an Activity "Certificate resent to certs@brazosbuilders.example.com"), "Download PDF" (mock toast "PDF download is simulated in this demo"), and "Re-issue" (US-CRT-010).
- Given the Coverage section, when it renders, then each covered Term shows the line, Carrier, policy number, effective and expiration dates (MM/DD/YYYY), Term status, and AI / WVD / P&NC flags, all read-only because Term data is synced from the AMS.
- Given the History section, when it renders, then it lists every event newest first: Requested by, Submitted for review, Approved or Returned (with the reviewer's note), Issued by and delivery target, Resent, Re-issued as CERT-0140, each with date and time.
- Given a covered Term is Canceled or carries the Pending cancellation flag, when the page renders, then a warning banner reads "Policy KCC-GL-0019387 is pending cancellation. Do not re-issue until it is resolved."

## UI states

- Empty: a Requested Certificate with no Terms chosen yet shows the Coverage section as "No policies selected yet. Prepare the certificate to choose them."
- Loading: header skeleton plus two section skeletons; actions hidden until loaded.
- Error: page-level error panel "This certificate couldn't load." with "Try again"; an unknown ID routes to `/404`.
- No permission: a Certificate on an out-of-scope Account shows the access-denied page naming the Account Manager, with "Request access" (mock). Producer and Admin see the page with only "Preview" and "Download PDF"; other actions are disabled with the tooltip "Only Account Managers and Principals can issue certificates."
- Overflow: Description of operations longer than 6 lines collapses with "Show more"; History with 30+ events shows the latest 10 and "Show all".

## Design notes

- Record page grammar: page title is the Holder name (30/600) with the ID in mono muted beside it; status as dot plus label; secondary actions as small outline buttons top-right, the one primary action in blue at the far right.
- Two-column body on wide screens (2/3 main: Coverage table, Description of operations; 1/3 side: Details card with Requested, Prepared by, Reviewed by, Issued by, Delivery). Stacks to one column under 1024px.
- Coverage is a compact 40px table inside a white card; flags as mono text tags.
- History is a plain vertical list with 13px timestamps in text-muted, no timeline art.

## FE notes

- Route `/certificates/:id`, component `CertificatePage`; subcomponents `CertificateHeader`, `CertificateCoverage`, `CertificateDetails`, `CertificateHistory`.
- Status-to-action map lives in one pure function `certificateActions(certificate, user)` with unit tests covering every status by role.
- Store: `selectCertificate(id)`, `selectTermsByIds`, `selectHolder`, `selectServiceRequest`; actions `resendCertificate(id)` appends a history event and an Account Activity.
- History is derived from `certificate.events[]` (`type`, `at`, `by`, `note`, `target`).

## Mock data

- Certificates in every status: Requested (6), Needs review (7), Issued (53), Re-issued (14), matching the Today widgets (US-HOM-009, US-HOM-012).
- Edge cases: one Issued Certificate whose GL Term is Pending cancellation; one Requested with no Terms; one with 32 history events (resent many times); one on an Account outside a Houston Account Manager's Office for the access-denied state.
