---
id: US-CRT-006
title: Mock ACORD 25 certificate preview
epic: CRT
roles: [Account Manager, Principal, Producer, Admin]
priority: P1
status: Draft
size: M
routes: [/certificates/:id]
dependsOn: [US-CRT-004]
---

## Story

As an Account Manager, I want to see the Certificate laid out like an ACORD 25 before and after issuing, so that I can catch a wrong holder address, a missing waiver box, or an expired Term before the client's general contractor does.

## Acceptance criteria

- Given a Certificate in any status, when I click "Preview", then a full-height preview opens showing the form blocks in order, labeled as on the form: DATE, PRODUCER (the Account's Office name, address, phone), INSURED (the Business legal name and mailing address), INSURER A–F (Carrier name and NAIC #), COVERAGES, DESCRIPTION OF OPERATIONS, CERTIFICATE HOLDER, CANCELLATION, and AUTHORIZED REPRESENTATIVE.
- Given the coverages block, when it renders, then rows appear for Commercial general liability (GL and BOP liability), Automobile liability, Umbrella / excess, and Workers compensation and employers' liability; each covered row shows the insurer letter, ADDL INSD and SUBR WVD marks ("Y" or blank), policy number, effective and expiration dates (MM/DD/YYYY), and limits (for example Each occurrence $1,000,000, General aggregate $2,000,000); uncovered rows stay blank.
- Given P&NC is flagged on a Term, when the preview renders, then the description of operations ends with a line naming primary and noncontributory for that policy, since the form has no P&NC box.
- Given the Certificate is not yet Issued, when the preview renders, then a diagonal "DRAFT · NOT ISSUED" watermark appears; once Issued, the watermark is replaced by the issue date and the issuer's name in the authorized representative block.
- Given any status, when the preview renders, then a fixed footer reads "Sample layout modeled on ACORD 25. Not a certificate of insurance." and the "Sample data" badge is visible.
- Given I am in the Issue form (US-CRT-005), when I change the Holder or a flag, then the thumbnail preview updates within 200ms without a network call.

## UI states

- Empty: a Requested Certificate with no Terms shows the form with empty coverage rows and the watermark.
- Loading: a gray page-shaped skeleton at letter ratio (8.5 × 11).
- Error: "Preview couldn't render." with "Try again"; the Certificate page behind stays usable.
- No permission: read-only roles (Producer, Admin) can preview; out-of-scope Accounts never reach it.
- Overflow: Holder names over 2 lines and descriptions over 8 lines shrink to 9px and then show "See attached description" with an appended second page, which is how real certificates handle overflow.

## Design notes

- The preview is the one place that departs from the dashboard grammar: a white letter-size sheet on the recessed canvas, black hairline grid, 9–10px sans for form labels, 11px for values, uppercase block labels. No ACORD logo or trademark artwork.
- Opens as a large panel (12px radius, popover shadow) over the Certificate page, with top-right actions "Download PDF" (mock) and "Close". Zoom controls 75% / 100% / 125%.
- The thumbnail in the Issue form is the same component scaled to fit 40% width.

## FE notes

- Component `Acord25Preview({ certificate, draft? })`, pure render from data, no store writes; HTML and CSS grid, not canvas, so text is selectable and testable.
- Data assembly in `buildAcord25Model(certificate, terms, carriers, holder, office)`, unit-tested for insurer letter assignment (A–F in order of first appearance, max 6), flag marks, and P&NC wording.
- Limits come from `term.limits`; if absent, the cell shows "—" (see Mock data).
- Print styles: `@media print` renders only the sheet, which serves the mock "Download PDF".

## Mock data

- Needs `term.limits` on commercial Terms: GL (each occurrence, damage to rented premises, med exp, personal and adv injury, general aggregate, products-comp/op agg), Commercial auto (combined single limit), WC (E.L. each accident, disease each employee, disease policy limit). Listed in the rules.md mock data additions.
- Carriers carry a fictional 5-digit `naic` code (rules.md mock data additions). One Certificate spans 4 Carriers to exercise insurer letters A–D; one has a 500-character description plus a P&NC line to exercise overflow.
