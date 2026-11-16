---
id: US-LEA-001
title: Lead intake list
epic: LEA
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/leads]
dependsOn: [US-FND-001, US-FND-005, US-FND-007]
---

## Story

As a Producer, I want one list of every Lead waiting on me, newest and least-worked first, so that I call every new Lead within minutes and nothing sits untouched.

## Acceptance criteria

- Given I open /leads, when the list loads, then the saved views Open (New + Contacted), Unassigned, Qualified, and Disqualified show as tabs with counts, Open is selected, and its Leads are sorted by Received descending, with columns Name, Status, Source, Lines of interest, Assigned to, Office, Received, Attempts, Last attempt.
- Given I am a Producer, when the list loads, then I see only Leads assigned to me; an Account Manager sees every Lead in their Office; a Principal and an Admin see every Lead in the agency.
- Given a Lead is New and was received more than 1 hour ago with no logged attempt, when it renders, then the Received cell shows a warning icon and the tooltip "No contact attempt in 1 h 25 min".
- Given I am a Principal or an Account Manager, when there are New Leads with no assignee, then a callout above the table reads "8 new leads are unassigned" and lists the three oldest, each with its source and age, and "Assign" opens the assign flow (US-LEA-004).
- Given I type in the search field, when I pause for 250ms, then the list filters by first or last name, business name, phone (digits only), or email, and the meta line updates, for example "Showing 12 of 47 open leads".
- Given I click a row, when the Lead record opens, then the URL is /leads/:id and the browser back button returns to the list with the same filters and scroll position.

## UI states

- Empty: no Leads in scope at all: "No leads yet. New leads from your web form, phone, referrals, Trusted Choice, and purchased lists land here." with "+ Add lead".
- Loading: table skeleton of 10 rows at 40px, toolbar visible and disabled.
- Error: inline error panel in place of the table, "Leads couldn't load." with "Try again"; toolbar stays usable.
- No permission: every role can open /leads and add a Lead, but only within scope. "Import" is hidden for Producers and Account Managers; the bulk-select column is hidden for Producers.
- Overflow: Names truncate with an ellipsis and a full-value tooltip (for example "Gulf Coast Residential & Commercial Roofing Contractors of Greater Houston LLC"); Lines of interest shows two chips, then "+3"; Attempts above 99 shows "99+".
- Filtered: "No leads match these filters." with "Clear filters"; active filters show as removable chips under the toolbar.

## Design notes

- Standard list page: H1 "Leads", muted description "Sales requests not yet qualified. Qualify a lead to create an Account and an Opportunity."
- Saved views as an underline tab row between the header and the toolbar, each with a neutral count pill. Unassigned holds New or Contacted Leads with no assignee, so the callout's "Assign" pairs with it.
- Toolbar: search "Search leads", Filters (Status, Source, Assigned to, Office, Lines of interest, Received date range, Personal / Commercial), Display options, Import (US-LEA-010), primary "+ Add lead".
- Status cell is a dot plus label, never a filled pill: New (blue), Contacted (purple), Qualified (green), Disqualified (neutral, with reason in the tooltip).
- Source cell shows the source and, muted, its detail: "Trusted Choice · Claim-it", "Referral · Lone Star Mortgage", "Purchased list · Q4 Homeowners TX".
- Received shows relative time under 24 hours ("14 min ago"), then MM/DD/YYYY. Attempts is right-aligned tabular-nums.
- Unassigned shows "Unassigned" in muted text, not "—", because it is actionable.
- Checkbox column is shown for roles that can bulk assign (Principal, Admin, Account Manager); Producers do not see it.

## FE notes

- Route /leads, `LeadListPage` built on the shared `DataTable` (US-FND-007). Filters and sort live in the URL query string (`?view=open&source=trusted-choice&sort=-receivedAt`).
- Scope comes from `useCurrentUser()` (View as aware): `leadsInScope(user)` filters by `assigneeId === user.id` for Producer, `officeId === user.officeId` for Account Manager.
- Store selectors: `selectLeads(filters)`, `selectUnassignedNewLeads(scope)`. Ageing is computed client-side from `receivedAt` against `now`, refreshed every 60s.
- Saved views come from sitemap.yaml (`savedViews: [Open, Unassigned, Qualified, Disqualified]`) through the `DataTable` saved-view support; the view id lives in the URL (`?view=unassigned`). There are no personal saved views.
- Pagination 50 rows per page.

## Mock data

- 180 Leads: New 25, Contacted 45, Qualified 70, Disqualified 40. Personal 75%, Commercial 25%.
- Sources: Web form 35%, Phone 20%, Referral 20%, Trusted Choice 15%, Purchased list 10%.
- Edge cases: 8 unassigned New Leads (4 Houston, 2 San Antonio, 2 Tampa); a Trusted Choice Claim-it Lead received 5 minutes ago; a New Lead received 3 hours ago with no attempt; a Lead with 14 attempts; the very long business name above; a Lead with no email.
