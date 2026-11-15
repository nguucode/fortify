---
id: US-PIP-015
title: Opportunity activity and next step
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/pipeline/:id, /pipeline]
dependsOn: [US-PIP-004, US-WRK-001, US-WRK-002, US-WRK-005]
---

## Story

As a Producer, I want to log calls and notes on an Opportunity and always have one dated next step, so that no sale goes quiet without me noticing.

## Acceptance criteria

- Given the Activity section on `/pipeline/:id`, then it shows Activities linked to this Opportunity newest first (calls, emails, SMS, meetings, notes, and system events such as stage changes and Quotes added), each with type icon, summary, user, and date and time ("11/15/2026 2:40 PM").
- Given I click "Log activity", then I can log a Call, Email, Meeting, or Note with a summary; it links to both the Opportunity and its Account.
- Given the header, then "Next step" shows the soonest open Task linked to this Opportunity ("Call Maria Torres about the Home quote · due 11/18/2026") or "No next step" with a "+ Add next step" link that creates a Task linked to the Opportunity, assigned to the Producer by default.
- Given an open Opportunity has no open Task, then its Board card (US-PIP-001) shows "No next step" in warning text, and the list (US-PIP-002) offers a "No next step" filter.
- Given the next step Task is overdue, then it shows the due date in danger text with "Overdue".

## UI states

- Empty: "No activity yet. Log a call or note." with "Log activity".
- Loading: 5 timeline row skeletons.
- Error: "Couldn't load activity. Retry." inside the section only.
- No permission: Admins can read; Account Managers can log Activities and add Tasks (Activity and Task are C E for all roles); the 24-hour note edit rule from roles.md applies.
- Overflow: more than 20 Activities show 20 and "Load older"; long summaries clamp to 2 lines with "Show more".

## Design notes

- Timeline as a compact list in a white card: 16px type icon at 50% opacity, summary in text-default, user and time muted on the right. System events use the muted text style so human Activities stand out.
- "Next step" sits in the header meta area with a calendar icon.

## FE notes

- Reuse WRK's activity timeline (US-WRK-001), log-activity (US-WRK-002), and task-create (US-WRK-005) components, passing `{ accountId, opportunityId }`; this story only wires them in and adds the next-step selector `selectNextStep(opportunityId)`.
- Board and list read a derived `hasOpenTask` flag from the selector, not a stored field.

## Mock data

- An Opportunity with 30 Activities (Load older), one with none, one with an overdue next step, and about 15% of open Opportunities with no open Task.
