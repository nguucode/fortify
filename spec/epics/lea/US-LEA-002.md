---
id: US-LEA-002
title: Add or edit a Lead
epic: LEA
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/leads, /leads/:id]
dependsOn: [US-FND-005, US-LEA-001]
---

## Story

As an Account Manager taking an inbound call, I want to capture the caller as a Lead in under a minute and hand it to a Producer, so that the sales request is not lost while I get back to service work.

## Acceptance criteria

- Given I click "+ Add lead" on /leads, when the drawer opens, then it shows the fields Type (Personal / Commercial), First name, Last name, Business name (Commercial only), Phone, Email, Street, City, State, ZIP, Lines of interest, Current carrier, Current premium, X-date, Source, Source detail, Notes, Office, and Assigned to.
- Given I save, when Last name (Personal) or Business name (Commercial) is empty, or neither Phone nor Email is given, or no Line of interest is chosen, then the drawer stays open with inline errors such as "Add a phone number or an email" and nothing is saved.
- Given I pick Source, when it is Referral, Trusted Choice, Purchased list, Web form, or Phone, then Source detail asks for, in order: "Referred by" (Contact search or free text, for example "Kim Alvarez, Lone Star Mortgage"); referral type (Consumer Choice, Claim-it, Claim-it Warm Transfer); list name and vendor; form name; caller's number.
- Given I am a Producer, when I create a Lead, then Assigned to is set to me and locked; an Account Manager picks a Producer in their Office or leaves it Unassigned; a Principal or Admin picks any Producer or Unassigned.
- Given I enter a phone or email that matches another open Lead, when the field loses focus, then a warning reads "An open lead already uses this phone: L-1088 Rosa Delgado (assigned to Dana Whitfield)" with a link; I may still save.
- Given I save a valid Lead, when the store confirms, then the drawer closes, a toast reads "Lead L-1181 added", the new Lead appears at the top of the list with status New, and its Received time is now.
- Given I open Edit on a New or Contacted Lead I may edit, when I save, then the record updates and an attempt-timeline entry "Details edited by Dana Whitfield" is added.

## UI states

- Empty: not applicable (form).
- Loading: Save button shows a spinner and the form is read-only for the 200 to 600ms mock latency.
- Error: save fails (Demo controls): the drawer stays open with a top error "Couldn't save the lead. Your entries are kept." and "Try again".
- No permission: Account Managers see no Edit action after creation (tooltip on the record: "Account Managers can add and assign leads, not edit them"); Qualified and Disqualified Leads cannot be edited by anyone.
- Overflow: Business name up to 120 characters, Notes up to 2,000 with a counter; Lines of interest is a multi-select that wraps.

## Design notes

- Right-side drawer, 480px, white surface with ring, sticky footer with "Cancel" and primary "Add lead" (or "Save changes").
- Group fields under 13px section labels: Who, Contact, Interest, Source, Assignment. Commercial reveals Business name above First / Last name, and the named caller becomes the Contact at the Business.
- Lines of interest options switch with Type. Personal: Auto, Home, Umbrella, Renters, Condo, Flood, Boat. Commercial: BOP, GL, WC, Commercial auto.
- State is a select defaulting to the Office's state; choosing a state other than TX or FL shows a muted warning "The agency is licensed in TX and FL only."
- Phone input formats as (555) 010-1234 while typing; Current premium formats as $1,234.

## FE notes

- `LeadFormDrawer` used from `LeadListPage` (create) and `LeadRecordPage` (edit). Form state local, validation with the project's form library; schema shared with US-LEA-010 import.
- Store actions: `createLead(input)`, `updateLead(id, patch)`. New IDs are `L-` plus the next integer. `receivedAt = now`, `status = 'New'`.
- Duplicate hint uses `findOpenLeadsByContact({ phone, email })`, which normalizes phone to digits and email to lowercase.
- Office defaults to the creator's Office; for Principal and Admin it is required.
- Permission helper `can(user, 'lead.edit', lead)` drives the Edit action.

## Mock data

- Users: Producers and Account Managers in each Office, so Assigned to options differ by Office.
- An open Lead "Rosa Delgado" with phone (555) 010-4471 to trigger the duplicate hint.
- Contacts searchable for "Referred by", including Mike Torres.
- Purchased list names: "Q4 Homeowners TX", "New movers Tampa 10/2026".
