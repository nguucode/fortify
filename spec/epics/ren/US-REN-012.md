---
id: US-REN-012
title: TX and FL notice milestones on the Renewal page
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P2
status: Draft
size: S
routes: [/renewals/:id]
dependsOn: [US-REN-004]
---

## Story

As an Account Manager, I want the Renewal page to show the state notice milestones for this Term, so that I know whether a Carrier non-renewal or renewal premium notice should already have arrived.

## Acceptance criteria

- Given a FL residential property Renewal (created 120 days out, so the first milestone falls on its creation day), then a milestone row shows "Carrier non-renewal notice due by" (120 days before expiration) and "Renewal premium notice due by" (45 days before), with dates.
- Given a FL Policy with the fictional carrier of last resort, then an extra milestone "Clearinghouse review" shows at 60 days before expiration.
- Given a TX residential property or personal auto Renewal, then the row shows "Carrier non-renewal notice due by" at 60 days before expiration (Tex. Ins. Code 551.105 as amended by HB 1900, for policies issued or renewed on or after 01/01/2024).
- Given a milestone date has passed, then it shows a check and muted text; the next one shows in default text with "in 9 days".
- Given a commercial Renewal, then no milestone row renders.

## UI states

- Empty: commercial or out-of-state Policies render no row.
- Loading: renders with the header skeleton.
- Error: hidden on error; the page still works.
- No permission: informational for all roles.
- Overflow: at widths under 1280px milestones stack vertically.

## Design notes

- Thin row under the stepper: small calendar icon, label, date; a muted footnote "Guidance only. Check the Carrier's notice for exact dates."

## FE notes

- `noticeMilestones({ state, line, carrierType, expirationDate })` pure helper returning labeled dates, with unit tests for TX auto, TX home, FL home, and FL carrier of last resort.

## Mock data

- FL home Renewals at 40 and 100 days out; a FL Policy with the carrier of last resort; a TX auto; a TX BOP (no row).
