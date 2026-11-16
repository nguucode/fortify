---
id: US-LEA-004
title: Assign and reassign Leads
epic: LEA
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/leads, /leads/:id]
dependsOn: [US-FND-007, US-FND-008, US-LEA-001, US-LEA-003]
---

## Story

As a Principal, I want to assign new Leads to the right Producer one at a time or in bulk, so that every Lead has an owner within minutes and work is spread fairly across the three Offices.

## Acceptance criteria

- Given I choose Assign on a Lead, when the dialog opens, then it lists eligible Producers with their Office, open Lead count, and whether they hold an active License for the Lead's state, for example "Dana Whitfield · Houston · 12 open leads · TX licensed".
- Given I pick a Producer with no active License in the Lead's state, when I confirm, then a warning "Dana Whitfield has no active FL license. They can work the lead but not quote it." is shown and I must click "Assign anyway".
- Given I am a Principal, Admin, or Account Manager on /leads, when I select up to 50 rows and choose "Assign", then one Producer is applied to all of them and a toast reads "12 leads assigned to Dana Whitfield".
- Given I am a Producer on my own Lead, when I choose "Hand off", then I can pick another Producer and an optional note; after saving, the Lead leaves my list and I lose access to it.
- Given a Lead is assigned or reassigned, when the store confirms, then the timeline logs "Assigned to Dana Whitfield by Grant Holloway" and the new assignee gets a notification "New lead: Rosa Delgado (Web form, Home + Auto)".
- Given I am an Account Manager, when I open the Producer picker, then I see only Producers in my Office.

## UI states

- Empty: no eligible Producer (an Office with none): "No Producers in San Antonio. Ask a Principal to assign this lead."
- Loading: picker rows skeleton while open-lead counts compute.
- Error: assignment fails: dialog stays open with "Couldn't assign. Try again."; in bulk, nothing is changed (all or nothing).
- No permission: Producers see "Hand off" only on Leads assigned to them, and no bulk select; Qualified and Disqualified Leads cannot be reassigned (menu item disabled, "Closed leads keep their assignee").
- Overflow: the picker scrolls after 8 rows and has a search field; bulk selection over 50 shows "Select up to 50 leads at a time".

## Design notes

- Small dialog, 440px: searchable Producer list as 40px rows (avatar, name, muted Office and open-lead count, License status as an icon plus label). Note field for hand-offs.
- Bulk action bar appears above the table when rows are selected: "12 selected · Assign · Clear".
- The License warning uses the warning tint inline in the dialog, never a blocking modal.

## FE notes

- `AssignLeadDialog` (single, hand-off) and the `DataTable` bulk action (US-FND-007).
- Store action `assignLeads(ids, assigneeId, note?)`, atomic. It writes a timeline entry per Lead and pushes a notification (US-FND-008) to the assignee.
- License check: `hasActiveLicense(user, lead.state)` against the user's mock Licenses.
- Eligible assignees: users with role Producer, plus Principals (who also sell). Account Managers are never assignees.

## Mock data

- At least one Producer per Office; one Producer with only a TX License (to trigger the FL warning); one with an expired License; 8 unassigned New Leads.
