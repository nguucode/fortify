---
id: US-CRT-009
title: Re-issue Certificates when a Term renews
epic: CRT
roles: [Account Manager, Principal]
priority: P1
status: Done
size: M
routes: [/accounts/:id, /certificates]
dependsOn: [US-CRT-003, US-CRT-005, US-CRT-008]
---

## Story

As an Account Manager, I want Fortify to propose re-issuing every active Holder's Certificate when the Terms it cites renew, and to re-issue them in one pass, so that a general contractor never holds a certificate showing last year's expiration date.

## Acceptance criteria

- Given an Issued or Re-issued Certificate whose cited Term has a successor Term (Renewed, or Rewritten with a "replaced by" Policy) in status Bound or Active, when the successor's effective date is within 30 days ahead or 30 days past, then the Certificate is "due for re-issue".
- Given a Business Account with Certificates due for re-issue, when I open its Certificates sub-tab, then a callout reads "6 certificates cite policies that renew 03/01/2027" with "Review re-issue"; the `/certificates` page shows the same callout across my scope ("14 certificates due for re-issue across 5 accounts").
- Given I click "Review re-issue", when the dialog opens, then it lists one row per Certificate with Holder, old to new policy number and dates ("KCC-GL-0019387 · 03/01/2026–03/01/2027 → KCC-GL-0019387 · 03/01/2027–03/01/2028"), flags, and a checkbox selected by default; Certificates of Inactive Holders are listed unchecked with "Holder inactive".
- Given I confirm with rows selected, when the re-issue runs, then each unflagged row creates a new Certificate in status Re-issued linked as "Re-issue of CERT-0123", the old Certificate shows "Replaced by CERT-0141", the Holder gets the mock email, and one Activity on the Account reads "Re-issued 5 certificates for the 03/01/2027 renewal".
- Given a selected row has ADDL INSD, SUBR WVD, or P&NC, when the re-issue runs, then its new Certificate goes to Needs review instead (US-CRT-007), and the result toast reads "4 re-issued · 2 sent for Principal review".
- Given I uncheck a row and choose "Don't re-issue" with a reason (Project ended, Holder no longer needs it, Other), when I confirm, then the Certificate stops being proposed, and "Project ended" also offers "Deactivate holder".

## UI states

- Empty: no callout appears when nothing is due; the dialog cannot be opened empty.
- Loading: the dialog shows skeleton rows while successor Terms resolve; the confirm button shows progress "Re-issuing 3 of 6…".
- Error: a forced error mid-run stops the batch and reports "3 re-issued, 3 not sent. Retry the rest?"; completed rows are not duplicated on retry.
- No permission: Producer and Admin see the callout text but "Review re-issue" is disabled with the tooltip "Only Account Managers and Principals can re-issue certificates."
- Overflow: 40+ due Certificates in the agency-wide callout paginate inside the dialog at 25 rows, grouped by Account.

## Design notes

- Collapsible callout panel (Part B) with a count badge, items per Account with a colored dot, bold Account name, muted line "6 certificates · renews 03/01/2027".
- Dialog 720px wide: compact 40px table, checkbox column, old to new values in mono with an arrow, flag tags; footer shows "5 selected · 2 need review" and primary "Re-issue 5".
- The "Don't re-issue" reason uses a small inline select on the row, not a second dialog.

## FE notes

- Selector `selectCertificatesDueForReissue(scope)` joins `certificates` to `terms` through `term.successorTermId` or `policy.replacedByPolicyId`; unit-tested for the 30-day window and Rewritten Policies.
- Store action `reissueCertificates(items[])` runs items sequentially with per-item results, idempotent by `reissueOf`; flagged items go through `submitCertificateForReview`.
- Dismissal stored as `certificate.reissueDismissed = { reason, by, at }`.
- The same dialog component mounts from `/accounts/:id` (scoped to the Account) and `/certificates` (scoped to the user).

## Mock data

- Brazos Valley Mechanical LLC: GL and Commercial auto Terms renewed 12 days ago, with 6 Issued Certificates citing the old Terms (2 flagged, 1 Holder Inactive). Torres Roofing LLC is left out so its seed stays as SRV describes it.
- One Business whose GL Policy was Rewritten to another Carrier, with 2 Certificates due.
- 14 Certificates due agency-wide across 5 Accounts in 2 Offices.
