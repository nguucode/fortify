---
id: US-FND-017
title: Status cells and badges for every lifecycle
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/pipeline, /policies, /renewals]
dependsOn: []
---

## Story

As a Principal scanning the Pipeline or the Renewals list, I want each status shown the same way everywhere with a dot and a label, so that I can read state at a glance without a table full of colored pills.

## Acceptance criteria

- Given any status from `spec/ia/object-model.md`, then it renders as a status cell: an 8px dot plus a 13px/500 label in the hue's text color with the exact status name (for example "Waiting on carrier", "Pending cancellation", "Not taken").
- Given the tone map (one meaning per hue, DESIGN.md › The One Meaning Per Hue Rule), then: blue is open or in progress with the next move ours (New, Contacted, Gathering info, Quoting, Proposed, Prospect, Requested, Quoted, Presented, In progress, In review, Decided, Bound, Reported, Claim # assigned, Open, Ready, In design, In build); orange is waiting on someone else or needs attention (Waiting on carrier, Waiting on client, Submitted to carrier, Referred, Needs review, Remarketing, Pending cancellation, Partial); green is a good outcome or live and healthy (Qualified, Won, Accepted, Client, Active, Issued, Re-issued, Done, Succeeded); red is a bad outcome, failure or high priority (Lost, Declined, Canceled, Non-renewed, Failed, High); neutral is not started, inactive or settled history (Upcoming, Draft, Disqualified, Not taken, Former client, Expired, Renewed, Rewritten, Replaced, Withdrawn, Closed, Inactive, Retired, Normal). Levels: High red, Medium orange, Low green; interest level (high is good) is High green, Medium orange, Low and Closed neutral.
- Given an unread or notification count (bell, Inbox), then it uses the red alert pill; every other count stays a neutral pill.
- Given a Renewal risk, then High shows a red warning icon with "High" and Low shows a green dot with "Low"; premium change shows "+38%" in danger text with an up arrow, or "−4%" in success text with a down arrow.
- Given a reason exists (Lost, Disqualified, Closed claim), then the cell shows it as a muted suffix ("Lost · Price") with the full reason in a tooltip.
- Given a count, then it uses a pill; pills are never used for statuses.

## UI states

- Empty: a missing status renders "—" in muted.
- Loading: not applicable.
- Error: an unknown status renders as neutral with its raw text and logs a console warning in development.
- No permission: not applicable.
- Overflow: labels never wrap; the suffix truncates first.

## Design notes

- Badge hues from Part B; dots use the hue, labels use the hue's AA text token so contrast holds; color always paired with the label.

## FE notes

- `src/patterns/StatusCell.tsx` and `src/patterns/status-tones.ts`: one `Record<Entity, Record<Status, Tone>>`, typed against the status unions in `src/types/`.
- Snapshot test renders every status of every lifecycle.

## Mock data

- At least one record in every status of every lifecycle; a Renewal at +38%; a Term flagged Pending cancellation.
