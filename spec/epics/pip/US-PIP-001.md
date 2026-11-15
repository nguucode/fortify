---
id: US-PIP-001
title: Pipeline board by stage
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: M
routes: [/pipeline]
dependsOn: [US-FND-001, US-FND-005, US-FND-007, US-PIP-005]
---

## Story

As a Producer, I want to see my open Opportunities as cards in stage columns and drag them forward, so that I know at a glance where every sale stands and what to push next.

## Acceptance criteria

- Given I open `/pipeline`, when the page loads, then I see the Board view by default with five columns in order: New, Contacted, Gathering info, Quoting, Proposed. Each column header shows the stage name, the card count, and the column premium total (for example "Quoting · 14 · $38,420").
- Given a card, then it shows the Opportunity name, the Account name as a muted second line, the type (New business, Cross-sell, or Remarket), line chips (for example "Auto", "Home"), the premium (best quoted premium if a Quote is Quoted or Presented, otherwise the estimated premium, labeled "est."), the target close date, the Producer's avatar, and days in stage ("9d in stage").
- Given I am the Producer on an Opportunity, when I drag its card to another open stage, then the move follows the stage rules in US-PIP-005: allowed moves save immediately with a toast "Moved to Quoting", and a blocked move snaps the card back and shows the rule as a toast (for example "Add a quoted Quote before moving to Proposed").
- Given I start dragging a card, when the drag begins, then two drop zones appear along the bottom of the board, "Won" and "Lost"; dropping on Won opens the Won dialog (US-PIP-010) and dropping on Lost opens the Lost dialog (US-PIP-011). Cancelling either dialog returns the card to its column.
- Given I click a card (not drag), then I go to `/pipeline/:id`.
- Given the saved-view tabs above the board (My open, Closing this month, Cross-sell, Remarket), when I pick one, then the board shows only matching cards and the URL keeps the view (`/pipeline?view=board&saved=closing-this-month`). Won and Lost Opportunities never appear on the board.
- Given I am a Principal or Admin, then I see every Opportunity in the agency and can filter by Office and Producer from the toolbar; given I am an Account Manager, I see Opportunities on Accounts in my Office.

## UI states

- Empty: no open Opportunities in scope. Columns still render; the board shows one centered message in the first column area: "No open Opportunities. Qualify a Lead or add an Opportunity to start your pipeline." with a "+ Add opportunity" button (Producer, Principal) and a "Go to Leads" link.
- Loading: five column skeletons with three card skeletons each; column totals show "—".
- Error: inline error panel replacing the columns: "Couldn't load the pipeline. Try again." with a Retry button. A failed drag-move reverts the card and shows "Couldn't move the Opportunity. Try again."
- No permission: Admin sees cards but cannot drag them; Account Managers can drag only Remarket cards on Accounts in their Office (roles.md, Remarket rule). On a card the user cannot move, the grab cursor is not shown and hovering shows the tooltip "Only the Producer, a Principal, or the Account Manager on a Remarket can change the stage". Producers see only their scope, so a direct link to someone else's board filter returns their own cards.
- Overflow: a column with more than 25 cards shows the first 25 and a "Show 25 more" row at the bottom; long Opportunity and Account names truncate to one line each with a full-name tooltip; premium totals above $1M abbreviate to "$1.24M" with the exact figure in a tooltip; more than three line chips collapse to "Auto, Home +2".
- Filtered: when a saved view or filter yields no cards, columns render empty with a single message "No Opportunities match this view" and a "Clear filters" link.

## Design notes

- Surface: list page shell per Part B. H1 "Pipeline", muted description "Open Opportunities by stage." Toolbar: search ("Search opportunities"), Filters, a Board / List segmented control, then primary "+ Add opportunity" far right (hidden for Admin; for Account Managers it reads "+ Cross-sell opportunity").
- Meta line under the toolbar in 13px muted: "62 open · $184,300 best quoted · $96,400 weighted · 11 closing this month". Weighted = premium × the Opportunity's `probability`.
- Columns sit on the canvas; cards are white with a ring and 8px radius, 12px padding, 13–14px text. Card width fixed at 272px; the board scrolls horizontally inside its container when it overflows, never the page.
- Stage is encoded by the column, so cards carry no stage color. Type uses a small neutral text token, not a pill. A card with no open Task shows a muted "No next step" line (US-PIP-015).
- Drop zones: white surface, dashed ring is not allowed; use a ring plus a recessed fill and an icon with label ("Won" with a check icon in success text, "Lost" with an x icon in danger text).
- Motion: 150ms transform on drag lift; no entrance animation.

## FE notes

- Route `/pipeline` with `?view=board` (default) and `?saved=` and filter params. Components: `PipelineBoard`, `StageColumn`, `OpportunityCard`, `WonLostDropZones`.
- Drag and drop: use an accessible DnD approach that also supports keyboard moves (focus card, Space to lift, arrows to move, Space to drop) and announces moves through a live region.
- Data: `selectVisibleOpportunities(user, filters)` from the mock store (US-FND-005), excluding stages Won and Lost. Moves call `opportunities.moveStage(id, toStage)`, which applies the US-PIP-005 rules and returns either success or a rule message; optimistic update with rollback on error.
- Saved views share their definitions with the List view (US-PIP-002); keep them in one `pipelineSavedViews` module.

## Mock data

- About 140 of the 220 Opportunities are open, spread roughly New 20, Contacted 25, Gathering info 30, Quoting 40, Proposed 25.
- One column (Quoting) over 25 cards for the agency view, to show "Show 25 more".
- An Opportunity on the very long name Account, one with five lines (overflow chips), and one with no Quote (shows "est." premium).
- A Producer with zero open Opportunities for the Empty state, or use Demo controls "simulate empty data".
