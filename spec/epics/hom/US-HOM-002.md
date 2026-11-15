---
id: US-HOM-002
title: "Producer Today: new Leads assigned to me"
epic: HOM
roles: [Producer]
priority: P0
status: Draft
size: S
routes: [/today]
dependsOn: [US-HOM-001, US-FND-007, US-LEA-007]
---

## Story

As a Producer, I want the open Leads assigned to me on Today, oldest untouched first, so that I contact new Leads before they go cold and can start the demo loop from home.

## Acceptance criteria

- Given I am a Producer, when Today loads, then the "New leads" widget lists my Leads with status New or Contacted: New first, then Contacted, each group oldest received first, at most 6 rows, with the total in the count pill.
- Each row shows the Lead name with lines of interest muted under it ("Auto, Home"), Source (Referral, Web form, Phone, Walk-in, X-date list), Status as a dot plus label, and Age right-aligned ("45m", "3h", "2d").
- Given a Lead has been New for more than 2 hours, then its Age shows in warning text with a clock icon and the tooltip "No contact attempt for 2h+".
- Given I click a row, then I go to /leads/:id; "View all" goes to /leads with the Open saved view (New + Contacted), which for a Producer holds only Leads assigned to them.
- Given I Qualify or Disqualify a Lead on its record and come back to Today, then the Lead is gone and the count pill drops by one.

## UI states

- Empty: "No open Leads. New Leads assigned to you show up here." with a "View all Leads" link.
- Loading: 6 skeleton rows at 40px.
- Error: "Couldn't load New leads." with Retry.
- No permission: not rendered for Account Manager, Principal, or Admin (their Today layouts do not include it).
- Overflow: Lead names truncate with an ellipsis and a full-name tooltip; more than 4 lines of interest show "Auto, Home +3"; counts above 999 show "999+".

## Design notes

- Card per US-HOM-001, compact table with columns Name (flex), Source (120px), Status (120px), Age (64px, tabular-nums, right).
- Status uses dot plus 13px label (New = blue dot, Contacted = neutral dot); never a filled pill.
- No row actions; the whole row is the target, hover in recessed.

## FE notes

- Enhanced by US-LEA-008 (P1): the P0 build ships without these; their controls appear once those stories land.
- Query `leads.list({ assigneeId: me, status: ['New', 'Contacted'], sort: 'statusThenReceivedAt', limit: 6 })` with `total` for the pill.
- Age is computed client-side from `receivedAt`; recompute every 60 seconds while the page is open.
- Subscribes to the `lead.qualified` and `lead.disqualified` store events.

## Mock data

- Dana Whitfield (Producer persona) has 9 open Leads: 4 New (one received 15 minutes ago, one 5 hours ago), 5 Contacted.
- One Lead with a 60-character name and 6 lines of interest; one Lead from source X-date list.
