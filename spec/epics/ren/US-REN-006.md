---
id: US-REN-006
title: Compare the expiring Term with the renewal terms
epic: REN
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/renewals/:id]
dependsOn: [US-REN-004]
---

## Story

As an Account Manager, I want a side-by-side compare of the expiring Term and the renewal terms that marks what was added, removed, or changed, so that I can explain a premium increase line by line.

## Acceptance criteria

- Given renewal terms have arrived, when I open the Compare tab on the Renewal page, then a table shows each coverage and Insured item in rows with columns Item, Expiring, Renewal, and Change.
- Given a row, then Added rows show a plus icon and "Added" label, Removed rows a minus icon and "Removed", Changed rows a dot and "Changed" with both values, e.g. "AOP deductible · $1,000 → $2,500"; unchanged rows are hidden behind a "Show 24 unchanged" toggle.
- Given a FL home, then the hurricane deductible, wind mitigation credit, and sinkhole coverage are compared; given a TX home, then the wind/hail deductible and windstorm-pool area are compared; given a TX auto, then PIP and UM/UIM rejected-in-writing status are compared.
- Given the premium row, then it shows the per-coverage premium change and the total "+$1,214 · +38%".
- Given renewal terms have not arrived, then the tab shows "Compare is available once Gulf Harbor Insurance sends renewal terms." and the tab label shows a muted clock icon.

## UI states

- Empty: no differences: "Renewal terms match the expiring term except premium."
- Loading: table skeleton with 8 rows.
- Error: inline error with Retry inside the tab.
- No permission: read-only for every role; no actions on this tab.
- Overflow: a 12-location BOP compares per location with location group headers; values wrap to two lines.

## Design notes

- Added, Removed, and Changed use success, danger, and warning text with an icon and a label, never color alone; changed value shows old struck in text-muted, then an arrow, then the new value.
- Dense 40px rows; group headers on the recessed surface.

## FE notes

- `TermCompareTable` with a pure `diffTerms(expiring, renewal)` returning `{ key, label, kind: 'added' | 'removed' | 'changed' | 'same', before, after }`; unit-tested, and reused read-only by the POL past Term drawer.
- Reads both Term snapshots from the store; no writes.

## Mock data

- The +38% FL home: roof-age surcharge added, AOP deductible $1,000 → $2,500, hurricane deductible 2% → 5%, wind mitigation credit removed.
- A TX auto renewal with a driver added and UM/UIM unchanged; a 12-location BOP with one location removed.
