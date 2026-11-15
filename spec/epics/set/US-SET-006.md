---
id: US-SET-006
title: Pipeline stages, reasons, and timing rules
epic: SET
roles: [Admin, Principal]
priority: P1
status: Draft
size: M
routes: [/settings/pipeline]
dependsOn: [US-SET-001, US-SRV-014]
---

## Story

As an Admin, I want to tune each Opportunity stage's win probability and stale threshold and maintain the Lost and Disqualified reason lists, while the stages themselves stay fixed, so that forecasts and reasons fit how this agency sells without breaking the lifecycle every screen relies on.

## Acceptance criteria

- Given I open `/settings/pipeline`, when it loads, then the Opportunity stages table lists New, Contacted, Gathering info, Quoting, Proposed, Won, Lost in fixed order with columns Win probability (%), Stale after (days), and Open Opportunities (count); stage names and order have no edit control.
- Given I am an Admin, when I change a Win probability (0–100, whole numbers) or Stale after (1–90 days) and click "Save changes", then the values persist for the session, a toast reads "Pipeline settings saved", and the Pipeline board's forecast uses the new probabilities; Won is locked at 100 and Lost at 0.
- Given a probability lower than the stage before it, when I save, then a warning reads "Proposed (40%) is lower than Quoting (50%). Save anyway?" and saving is allowed.
- Given the Lost reasons list (seed: Price, Coverage, Carrier appetite, Stayed with current agent, No response, Bought direct), when I add, rename, or retire a reason, then retired reasons disappear from the Lost dialog but stay on existing Opportunities with "(retired)"; a reason in use cannot be deleted, only retired.
- Given the Disqualified reasons list for Leads (seed: Duplicate, Out of state, Not reachable, Line not written, Spam), when I edit it, then the same add, rename, retire rules apply.
- Given the Timing rules card, when it renders, then it shows read-only: Renewal created 45 days (Personal lines), 120 days (FL residential property), 60 days (Small commercial), 90 days (Large commercial, $25,000 or more in annual commercial premium on the Account) before expiration, and X-date Task created 45 days (Personal lines) or 90 days (Commercial) before the date, with the note "Set by the agency's renewal policy. Contact support to change."
- Given the Service SLAs card, when it renders, then it shows read-only the target per Service Request type from rules.md (for example "Certificate, holder-only · 4 business hours"), with the note "Business hours: 8:00 AM–5:00 PM in the Office's time zone, Monday to Friday, excluding US federal holidays. The clock pauses while a request is Waiting on client."

## UI states

- Empty: a reason list emptied of active reasons shows "Add at least one reason. The Lost dialog needs one." and Save is disabled.
- Loading: table and list skeletons.
- Error: save error shows "Couldn't save pipeline settings. Your changes are still here." with "Try again".
- No permission: Principal sees values as text with disabled inputs and the tooltip "Only Admins can change Settings."; Producer and Account Manager get `/403`.
- Overflow: reason names cap at 40 characters; 20+ reasons scroll within the card.

## Design notes

- Four cards stacked: Opportunity stages (table with inline 36px numeric inputs, right-aligned, tabular-nums), Reasons (two side-by-side lists on wide screens, each with "+ Add reason" and a row overflow menu: Rename, Retire), Timing rules and Service SLAs (read-only definition lists).
- A sticky save bar appears at the bottom only when there are unsaved changes: "3 unsaved changes" with "Discard" and primary "Save changes".
- Stage names render with the same status dot colors used on the Pipeline board, so the link between the two is visible.

## FE notes

- Store slice `pipelineSettings: { stages: [{ key, probability, staleDays }], lostReasons: [{ id, label, retired }], disqualifyReasons: [...] }`; actions `updatePipelineSettings`, `addReason`, `renameReason`, `retireReason`.
- Stage keys are a TypeScript union from object-model.md; Settings never adds or reorders keys.
- Timing rules read from the same constants module the Renewal and X-date generators use, and the Service SLAs card reads `slaRules.ts` (US-SRV-014), so neither card can drift from behavior.

## Mock data

- Default probabilities: New 10, Contacted 20, Gathering info 30, Quoting 50, Proposed 70, Won 100, Lost 0; Stale after 14 days for all open stages.
- Reasons as seeded above, with "Bought direct" used on 6 Lost Opportunities to exercise retire-in-use.
