---
id: US-PIP-004
title: Opportunity page with lines, Quotes, and details
epic: PIP
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/pipeline/:id]
dependsOn: [US-FND-001, US-FND-005, US-FND-006]
---

## Story

As a Producer, I want one page per Opportunity that shows its stage, the lines I am selling, every carrier's Quote, and the key numbers, so that I can run the whole sale from one place.

## Acceptance criteria

- Given I open `/pipeline/:id`, then the header shows the Opportunity name (for example "Torres Household · Auto, Home, Umbrella"), a link to the Account, the type, the Producer, the target close date, and a stage bar with New, Contacted, Gathering info, Quoting, Proposed, and a final segment that reads Won or Lost once closed.
- Given the Lines section, then each line shows Line, Current carrier, Current premium, X-date, and line outcome: Open, Accepted (with the accepting carrier), Not taken, or Lost.
- Given the Quotes section, then each Quote shows Carrier, Status (Requested, Quoted, Declined, Referred, Presented, Accepted, Not taken), Lines quoted, Total quoted premium, Valid until, and a warning icon if it was saved with a license or appointment warning; actions "+ Add quote" (US-PIP-006) and "Compare" (US-PIP-008) sit in the section header.
- Given the Details panel, then it shows Type, Source, originating Lead (link to `/leads/:id` if any), Created, Target effective date, Estimated premium, Probability, Best quoted premium, Bound premium (only after Won), linked Renewal (Remarket only, US-PIP-014), and Est. commission only where US-PIP-013 allows.
- Given the Opportunity is Won, then a success banner under the header reads "Won on 11/15/2026 · 2 Terms bound · $3,626 bound premium" with links to each new Policy, each marked "Awaiting AMS" until the next sync matches it by binder number; given it is Lost, a neutral banner reads "Lost on 11/15/2026 · Reason: Price".
- Given the Opportunity is outside my scope, then I see the access-denied page (US-FND-006) naming the Producer and offering "Request access"; given the ID does not exist, I see the not-found page.

## UI states

- Empty: an Opportunity with no Quotes shows, inside the Quotes section, "No quotes yet. Add the first carrier quote." with "+ Add quote" (Producer, Principal).
- Loading: header skeleton (title bar plus stage bar) and two section skeletons; the Details panel shows label skeletons.
- Error: full-page inline error "Couldn't load this Opportunity." with Retry and a "Back to Pipeline" link.
- No permission: out-of-scope records show the access-denied page; Admins, and Account Managers on any type other than Remarket, see the page read-only: Edit, stage changes, "+ Add quote", Won, and Lost are disabled with the tooltip "Only the Producer or a Principal can change this Opportunity".
- Overflow: titles over one line truncate with a tooltip; more than 8 Quotes show the first 8 and "Show 4 more"; premiums are tabular, right-aligned, full dollars; a 7-line commercial Opportunity keeps the Lines table without horizontal scroll at 1280px.

## Design notes

- Record page per Part B: canvas background, header block with H1 (30/600), muted meta line ("Torres Household · New business · Dana Whitfield · Target close 12/05/2026"), and top-right outline actions "Edit", "Mark as Lost", and primary "Mark as Won" (enabled per US-PIP-009 and US-PIP-010).
- Stage bar: a single row of segments, the current stage in text-strong with a filled dot, past stages with a check icon, future stages muted. Not a progress bar with color fills.
- Two-column layout above 1200px: main column (Lines, Quotes, Activity from US-PIP-015) and a 320px Details panel; single column below 1200px with Details first.
- Sections are white cards with a ring; tables use the 40px row spec.

## FE notes

- Route `/pipeline/:id`; component `OpportunityPage` with `OpportunityHeader`, `StageBar`, `LinesTable`, `QuotesTable`, `OpportunityDetails`.
- Data: `getOpportunity(id)` returns the Opportunity with its Quotes and line outcomes; scope check through the shared `canView(user, record)` helper before render.
- The stage bar is interactive per US-PIP-005; this story renders it read-only.
- Bound premium and the Won banner read the Terms created by US-PIP-010 (`termIds` on the Opportunity).

## Mock data

- Torres Household: Auto, Home, Umbrella Opportunity at Proposed with 4 Quotes (Quoted, Presented ×2, Declined).
- Torres Roofing LLC: GL, WC, Commercial auto at Quoting with one Referred Quote.
- An Opportunity with 12 Quotes for overflow, one with no Quotes, one Won, and one Lost with reason Price.
- An Opportunity whose Producer is in another Office, for the access-denied state when viewed as a Houston Producer.
