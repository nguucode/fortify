---
id: US-REN-002
title: Triage renewals by premium change and risk
epic: REN
roles: [Account Manager, Principal]
priority: P1
status: Done
size: S
routes: [/renewals]
dependsOn: [US-REN-001]
---

## Story

As an Account Manager, I want the worklist to show the premium change and a High or Low risk with its reasons, so that I spend my time on the Renewals likely to be lost.

## Acceptance criteria

- Given a Renewal with renewal terms received, then Change shows the dollar and percent change, e.g. "+$1,214 · +38%"; +10% or more is danger text with an up arrow, −5% or less is success text with a down arrow, anything between is default text.
- Given renewal terms have not arrived from the Carrier, then Renewal premium and Change show "Awaiting terms" in muted text, and Risk shows the risk computed from the other reasons only.
- Given the Risk column, then High shows a red dot with "High" and Low a neutral dot with "Low", and hovering shows the reasons, e.g. "Premium +38% · 1 claim this term · Carrier of last resort (FL)".
- Given the At risk view, then rows sort by Change descending, then Days left ascending; the column headers stay sortable.
- Given I filter "Change ≥ 20%", then only Renewals at or above +20% remain and the meta line updates.

## UI states

- Empty: At risk view with no High renewals: "No high-risk renewals right now." in muted text.
- Loading: as US-REN-001.
- Error: as US-REN-001.
- No permission: Producers see the same columns read-only.
- Overflow: changes over +100% show "+112%" without clipping; reason tooltips wrap at 280px.
- Filtered: Change threshold chip ("Change ≥ 20%") plus the US-REN-001 chips.

## Design notes

- Risk never relies on color alone: dot plus label; reasons in a tooltip with one reason per line.
- Change column right-aligned tabular figures, arrow icon before the %.

## FE notes

- `renewal.risk` ('High' | 'Low') and `renewal.riskReasons[]` come precomputed from the mock generator using: premium change ≥ +10%, a Claim on the expiring Term, a Carrier non-renewal notice, the Pending cancellation flag, or a Term with the FL insurer of last resort (Sunshine State Residual); any one makes it High, otherwise Low (rules.md).
- `PremiumChangeCell` and `RiskCell` are shared with US-REN-004 and US-REN-010.

## Mock data

- About 30% of open Renewals High; the +38% Renewal; 15 Renewals awaiting terms; 5 decreases; one +112% commercial auto.
