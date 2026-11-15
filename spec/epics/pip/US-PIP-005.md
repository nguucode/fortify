---
id: US-PIP-005
title: Move an Opportunity through stages
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P0
status: Draft
size: S
routes: [/pipeline/:id]
dependsOn: [US-PIP-004]
---

## Story

As a Producer, I want to move an Opportunity forward or back through its stages with simple rules, so that the pipeline stays honest without me filling out forms.

## Acceptance criteria

- Given an open Opportunity I can edit, when I click a stage segment on the stage bar, then the stage changes to it, days in stage resets to 0, probability resets to the new stage's default from Settings > Pipeline stages, and an Activity "Stage changed from Contacted to Gathering info" is logged on the Opportunity and its Account.
- Given I try to move to Quoting, when the Opportunity has no lines, then the move is blocked with "Add a line before quoting".
- Given I try to move to Proposed, when no Quote is Quoted or Presented, then the move is blocked with "Add a quoted Quote before moving to Proposed".
- Given I add the first Quote while the stage is New, Contacted, or Gathering info, then the stage moves to Quoting automatically and a toast says "Stage moved to Quoting".
- Given I click the Won or Lost segment, then the Won dialog (US-PIP-010) or Lost dialog (US-PIP-011) opens; Won and Lost are never set directly.
- Given the Opportunity is Won or Lost, then the stage bar is not interactive.

## UI states

- Empty: not applicable; every Opportunity has a stage.
- Loading: the clicked segment shows a small spinner and the bar is disabled until the move saves.
- Error: the stage reverts and a toast says "Couldn't change the stage. Try again."
- No permission: for Admins, Producers who are not the Opportunity's Producer, and Account Managers on any type other than Remarket, segments are not clickable and show the tooltip "Only the Producer, a Principal, or the Account Manager on a Remarket can change the stage".
- Overflow: at widths below 900px the bar shows the current stage with previous and next arrows instead of all segments.

## Design notes

- Segments are buttons with hover in recessed fill. A blocked move gets no shake or other decorative motion; the rule appears in a toast anchored bottom-right.
- Stage names are fixed by object-model.md; Settings > Pipeline stages (SET) may rename display labels later, so read labels from config.

## FE notes

- One rule function `checkStageMove(opportunity, toStage)` returning `{ ok } | { ok: false, message }`, shared by the stage bar and Board drag (US-PIP-001) and unit-tested for each rule.
- Store action `opportunities.moveStage(id, toStage)` updates `stage` and `stageEnteredAt`, and logs the Activity.
- `quotes.create` calls the auto-advance rule.

## Mock data

- One Opportunity at Contacted with no lines (blocked move to Quoting).
- One at Quoting with only Requested Quotes (blocked move to Proposed).
- One at Gathering info with no Quotes, to show auto-advance on first Quote.
