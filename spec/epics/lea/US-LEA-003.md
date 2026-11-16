---
id: US-LEA-003
title: Lead record view
epic: LEA
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/leads/:id]
dependsOn: [US-FND-001, US-FND-005, US-FND-006, US-LEA-001]
---

## Story

As a Producer, I want to see everything known about a Lead on one page, with Qualify as the obvious next step, so that I can prepare for the call and move the Lead forward without hunting.

## Acceptance criteria

- Given I open /leads/:id for a Lead in my scope, when it loads, then the header shows the Lead name, ID (for example "L-1042"), status, source with detail, Received date and age, and Assigned to, with actions "Qualify" (primary), "Log attempt", and an overflow menu with Edit, Assign, and Disqualify.
- Given the Lead loads, when I read the body, then I see three cards: Contact (phone, email, address, SMS consent), Interest (Personal / Commercial, lines of interest, current carrier, current premium, X-date with "in 52 days"), and Source (source, detail, referred-by link when it is a Contact), plus the attempt timeline from US-LEA-005 below them.
- Given the Lead is Qualified, when it loads, then the actions are replaced by a success banner "Qualified on 11/12/2026 by Dana Whitfield" with links to the Account and the Opportunity, and every field is read-only.
- Given the Lead is Disqualified, when it loads, then a neutral banner shows "Disqualified on 11/03/2026: Not interested" with the note, and the only action is "Reopen" (US-LEA-009).
- Given I am a Producer opening a Lead assigned to someone else, when the route resolves, then I see the access-denied page naming the assignee ("This lead is assigned to Grant Holloway") with "Request access"; an unknown ID shows the not-found page.
- Given I am an Account Manager, when I view a Lead in my Office, then Qualify, Log attempt, Edit, and Disqualify are disabled with the tooltip "Only the assigned Producer or a Principal can work this lead", and Assign stays enabled.

## UI states

- Empty: a card with no values shows "—" per field; a Lead with no attempts shows "No contact attempts yet" in the timeline.
- Loading: header skeleton plus three card skeletons; actions disabled.
- Error: full-width error panel "This lead couldn't load." with "Try again" and a link back to Leads.
- No permission: access-denied page for out-of-scope Leads; disabled actions with reasons as above; Admin sees Qualify disabled with "Qualifying creates an Opportunity. Admins have read-only access to Opportunities.", and Log attempt and Disqualify disabled with "Only the assigned Producer or a Principal can work this lead"; Edit and Assign stay enabled.
- Overflow: long names wrap to two lines in the H1, then truncate with a tooltip; a 2,000-character note collapses after 4 lines with "Show more".

## Design notes

- Record page without tabs: breadcrumb "Leads / L-1042", H1 with the status dot and label beside it, a muted meta line "Trusted Choice · Claim-it · received 11/14/2026 9:12 AM (1 day ago) · Assigned to Dana Whitfield".
- Two-column layout at 1280px and wider: cards in a 2-up grid on the left (8 of 12 columns), the timeline on the right (4 columns); single column below 1024px.
- Cards are white with a ring and 8px radius, 13px labels in text-label, values at 14px; key-value rows at 32px.
- Speed-to-lead: a New Lead older than 1 hour shows a warning callout under the header, "Received 3 h ago and not contacted yet."
- Unassigned Leads show "Unassigned" with an "Assign" link in the meta line.

## FE notes

- Route /leads/:id, `LeadRecordPage`. Data from `selectLead(id)`; resolve the referred-by Contact and, for Qualified Leads, the Account and Opportunity names.
- Route guard: `canView(user, lead)`; otherwise render `AccessDenied` (US-FND-006) with `ownerName`.
- Actions open: `QualifyDialog` (US-LEA-006, US-LEA-007), `LogAttemptPopover` (US-LEA-005), `LeadFormDrawer` (US-LEA-002), `AssignLeadDialog` (US-LEA-004), `DisqualifyDialog` (US-LEA-008).
- Breadcrumb preserves the list's query string.

## Mock data

- One Lead per status, a Qualified Lead linked to a real Account and Opportunity, a Disqualified Lead with a note, a Lead assigned to another Producer (for the access-denied case), and a Lead referred by the Contact Mike Torres.
