---
id: US-ACC-011
title: Browse Contacts
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/contacts]
dependsOn: [US-FND-001, US-FND-007]
---

## Story

As an Account Manager, I want a list of every Contact in my scope with the Accounts each one belongs to, so that I can find a Contact when I only know their name or phone number.

## Acceptance criteria

- Given I open `/contacts`, when it loads, then the table shows Name, Accounts (the linked Account names with relationship), Mobile phone, Email, SMS consent, Office, and Last activity.
- Given I am a Producer, when the list loads, then it holds only Contacts linked to Accounts in my Book; an Account Manager sees Contacts on Accounts in their Office; Principal and Admin see all.
- Given I search "(555) 010-2231" or "ana.torres", when results return, then phone matching ignores formatting and email matching is case-insensitive.
- Given a Contact belongs to 2 Accounts, when the row renders, then both appear ("Torres Household · Spouse or partner", "Torres Roofing LLC · Owner"), each a link to `/accounts/:id`.
- Given I click the Contact name, when the page opens, then I land on `/contacts/:id`.

## UI states

- Empty: "No contacts yet. Contacts are added from an account." with a link to `/accounts`.
- Loading: 10 skeleton rows.
- Error: table error panel with Retry.
- No permission: all roles read within scope; there is no "+ New contact" on this page because every Contact must belong to an Account (create from the Account, US-ACC-010).
- Overflow: Contacts on 4 or more Accounts show 2 and "+2"; about 1,400 rows page at 50.
- Filtered: filters for Office, SMS consent, Account kind; "No contacts match these filters." with "Clear filters".

## Design notes

- List page per Part B: H1 "Contacts", description "People at the Households and Businesses the agency serves.", search placeholder "Search contacts by name, phone, or email".
- Meta line "Showing 50 of 1,412 contacts".
- Phone in tabular figures; email in default text (not mono, as it is not a technical context).

## FE notes

- Route `/contacts`, `ContactsListPage` on `DataTable`; selector `selectContactsInScope(user)` joined with `accountContacts`.
- Phone search normalizes digits on both sides.

## Mock data

- About 1,400 Contacts; 40 linked to both a Household and a Business; 15 with SMS consent Opted out; one Contact with a 60-character name.
