---
id: US-LEA-005
title: Log contact attempts on a Lead
epic: LEA
roles: [Producer, Principal]
priority: P1
status: Draft
size: S
routes: [/leads/:id]
dependsOn: [US-LEA-003]
---

## Story

As a Producer, I want to log each call, voicemail, email, or text I make to a Lead and set my next follow-up, so that I know how hard a Lead has been worked before I qualify or disqualify it.

## Acceptance criteria

- Given I click "Log attempt" on a New or Contacted Lead, when the popover opens, then I choose Channel (Call, Email, SMS) and Outcome (Reached, Left voicemail, No answer, Wrong number, Sent), add an optional note, and an optional Next follow-up date and time.
- Given I save the first attempt on a New Lead, when the store confirms, then the status changes to Contacted and the timeline shows the attempt at the top, for example "Call · Left voicemail · 11/15/2026 10:04 AM · Dana Whitfield".
- Given the Lead has no SMS consent, when I pick SMS, then the option is disabled with the tooltip "No SMS consent recorded for this lead".
- Given I set a Next follow-up, when I return to /leads, then the Lead's Last attempt column shows the attempt and the row shows "Follow up 11/18" in muted text; a follow-up in the past shows in warning text.
- Given I log Wrong number, when it saves, then a prompt suggests "Update the phone number or disqualify as Bad contact data" with both actions.

## UI states

- Empty: timeline reads "No contact attempts yet. Call new leads within minutes, while they are still shopping." with "Log attempt".
- Loading: save button spinner; the popover stays open until confirmed.
- Error: "Couldn't log the attempt." inline, entries kept.
- No permission: Account Managers and Admins see the timeline read-only (logging attempts belongs to the assigned Producer or a Principal); Log attempt is disabled with the reason; closed Leads hide the action.
- Overflow: timeline shows the latest 20 attempts with "Show all 34"; notes truncate at 3 lines.

## Design notes

- Anchored popover (360px) from the Log attempt button, not a modal. Channel and Outcome as segmented controls; Next follow-up as a date-time field with quick picks "Tomorrow 9 AM", "In 3 days".
- Timeline is a vertical list with a 16px channel icon, a bold first line (channel and outcome), and a muted second line (time and user), plus the note. System entries (assigned, edited, status changed) use a neutral dot and muted text.

## FE notes

- `LogAttemptPopover`, `LeadTimeline`. Store action `logLeadAttempt(leadId, { channel, outcome, note, nextFollowUpAt })` updates `attempts[]`, `lastAttemptAt`, `nextFollowUpAt`, and sets `status = 'Contacted'` when it was New.
- Attempts live on the Lead, because a Lead has no Account yet; Qualify (US-LEA-007) copies them to the new Account as Activities.
- Follow-ups are a field on the Lead, not Tasks, since every Task needs an Account. At Qualify, a pending follow-up becomes a Task with source Lead (US-LEA-007).

## Mock data

- Leads with 0, 1, 3, and 14 attempts across all channels and outcomes; one Lead without SMS consent; one with a past-due follow-up.
