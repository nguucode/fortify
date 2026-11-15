---
id: US-PIP-003
title: Create and edit an Opportunity
epic: PIP
roles: [Producer, Account Manager, Principal]
priority: P0
status: Draft
size: M
routes: [/pipeline, /pipeline/:id, /accounts/:id]
dependsOn: [US-FND-005, US-PIP-004]
---

## Story

As a Producer, I want to open an Opportunity for an Account with the lines I am going to quote, so that a sale that did not come through a Lead still gets tracked; as an Account Manager, I want to hand a Cross-sell I spotted during service to the Account's Producer.

## Acceptance criteria

- Given I click "+ Add opportunity" on `/pipeline` or on the Account Sales tab, then a side sheet "New opportunity" opens with fields: Account (search, required; prefilled and locked when opened from an Account), Type, Lines (at least one), Target effective date, Target close date (required, default today + 30 days), Estimated premium (optional, $0 to $9,999,999), Probability (default from the stage's value in Settings > Pipeline stages, editable 0–100%), Producer, Source, and Notes. These are the Opportunity fields in rules.md: `estimatedPremium`, `targetCloseDate`, `source`, `probability`.
- Given the Account is a Prospect, then Type defaults to New business; given it is a Client or Former client, Type defaults to Cross-sell. Remarket is never offered here; it is created from a Renewal (REN).
- Given I add a line, then I pick it from lines that fit the Account kind (Household: Auto, Home, Umbrella, Renters, Condo, Flood, Boat; Business: BOP, GL, WC, Commercial auto) and may enter the current carrier, current premium, and X-date (when that line expires with the current carrier) for it.
- Given the Account already has an open Opportunity covering one of the selected lines, then an inline warning shows "Torres Household · Auto, Home is already open for Auto. Open it instead?" with a link; I can still save.
- Given I save, then the Opportunity is created at stage New, named "<Account> · <lines>" unless I typed a name, an Activity "Opportunity created" is logged on the Account, and I land on `/pipeline/:id`.
- Given I am an Account Manager, then the button reads "+ Cross-sell opportunity", Type is locked to Cross-sell, Producer is locked to the Account's Producer, and on save the Producer gets a notification "Marisol Reyes added a Cross-sell opportunity on Torres Household: Umbrella"; afterwards I can read but not edit it.
- Given I open "Edit" on an open Opportunity I can edit (Producer on own, Principal on any, Account Manager on a Remarket in their Office), then the same sheet opens prefilled; Won and Lost Opportunities are read-only and show no Edit action.
- Given I am a Principal, when I change the Producer and save, then an Activity "Producer changed from Dana Whitfield to Marcus Bell" is logged on the Opportunity and its Account, the same as Account reassignment; for every other role the Producer field is read-only.

## UI states

- Empty: Account search with no match shows "No Accounts match "Torr"" and a link "Add an Account" (ACC flow).
- Loading: Save shows a spinner in the button and disables the form; Account search shows a 3-row skeleton.
- Error: save failure keeps the sheet open with a top banner "Couldn't save the Opportunity. Try again."; field errors appear under fields ("Add at least one line", "Target close date is required").
- No permission: Admin sees no create button anywhere; Edit is disabled with the tooltip "Only the Producer or a Principal can edit this Opportunity" for Producers who are not its Producer and for Account Managers on non-Remarket Opportunities; the Producer field is disabled with "Only a Principal can change the Producer".
- Overflow: very long Account names truncate in the locked Account field with a tooltip; up to 7 lines can be added, the add-line control then disables with "All lines added"; current premium accepts up to $9,999,999.

## Design notes

- Right side sheet, 480px, white surface, popover shadow; sections "Account", "Lines", "Dates and owner", "Notes". Footer: secondary "Cancel", primary "Create opportunity" (or "Save changes").
- Lines render as a compact editable table (Line, Current carrier, Current premium, X-date) with a "+ Add line" text button.
- The duplicate warning uses the warning tint callout with an icon, inside the Lines section.

## FE notes

- Enhanced by US-FND-008 (P1), US-SET-006 (P1): the P0 build ships without these; their controls appear once those stories land.
- Component `OpportunityForm` used in a `Sheet` from `/pipeline`, `/accounts/:id` (Sales tab), and `/pipeline/:id` (Edit).
- Store actions `opportunities.create(input)` and `opportunities.update(id, patch)`; both log an Activity through the shared activity action, and create emits a notification (US-FND-008) when the creator is not the Producer.
- Probability default reads the stage values from the `pipelineSettings` slice owned by Settings (US-SET-006).
- Validation with a schema: at least one line, target close on or after today on create, current premium ≥ 0, lines valid for the Account kind.
- Permission check `can(user, 'edit', opportunity)` drives disabled state and tooltip.

## Mock data

- Prospect Account with no Opportunity; Client Account (Torres Household) with an open Auto Opportunity to trigger the duplicate warning.
- Business Account (Torres Roofing LLC) to verify the commercial line list.
- Marisol Reyes (Account Manager, Houston TX) as the Cross-sell creator; Dana Whitfield as the Producer who receives the notification.
