---
id: US-FND-017
title: Status cells and badges for every lifecycle
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/pipeline, /policies, /renewals]
dependsOn: []
---

## Story

As a Principal scanning the Pipeline or the Renewals list, I want each status shown the same way everywhere with a dot and a label, so that I can read state at a glance without a table full of colored pills.

## Acceptance criteria

- Given any status from `spec/ia/object-model.md`, then it renders as a status cell: an 8px dot plus a 13px label with the exact status name (for example "Waiting on carrier", "Pending cancellation", "Not taken").
- Given the tone map, then: in-progress statuses use blue (New, Contacted, Gathering info, Quoting, In progress, In review), success uses green (Qualified, Won, Active, Issued, Done, Accepted, Client), waiting and attention use orange (Waiting on carrier, Waiting on client, Needs review, Referred, Remarketing, Pending cancellation), terminal-negative uses red (Lost, Canceled, Declined, Non-renewed), and closed or neutral use neutral (Disqualified, Expired, Not taken, Former client, Prospect). The remaining statuses map as: blue for open steps (Requested, Quoted, Proposed, Presented, Upcoming, Decided, Bound, Reported, Submitted to carrier, Claim # assigned, Open) and neutral for completed history (Renewed, Rewritten, Re-issued, Closed).
- Given a Renewal risk, then High shows a red warning icon with "High" and Low shows a neutral dot with "Low"; premium change shows "+38%" in danger text with an up arrow, or "−4%" in success text with a down arrow.
- Given a reason exists (Lost, Disqualified, Closed claim), then the cell shows it as a muted suffix ("Lost · Price") with the full reason in a tooltip.
- Given a count, then it uses a pill; pills are never used for statuses.

## UI states

- Empty: a missing status renders "—" in muted.
- Loading: not applicable.
- Error: an unknown status renders as neutral with its raw text and logs a console warning in development.
- No permission: not applicable.
- Overflow: labels never wrap; the suffix truncates first.

## Design notes

- Badge hues from Part B; dots use the hue, labels use text-default so contrast holds; color always paired with the label.

## FE notes

- `src/patterns/StatusCell.tsx` and `src/patterns/status-tones.ts`: one `Record<Entity, Record<Status, Tone>>`, typed against the status unions in `src/types/`.
- Snapshot test renders every status of every lifecycle.

## Mock data

- At least one record in every status of every lifecycle; a Renewal at +38%; a Term flagged Pending cancellation.
