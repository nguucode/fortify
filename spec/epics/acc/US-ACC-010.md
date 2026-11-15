---
id: US-ACC-010
title: Manage Contacts on an Account
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/accounts/:id]
dependsOn: [US-ACC-004, US-ACC-013]
---

## Story

As a Producer, I want to add, link, set the primary, and unlink Contacts on an Account, with a relationship for each, so that I know who to call and who can make decisions for the Household or Business.

## Acceptance criteria

- Given I click "Manage contacts" on the Overview Contacts panel, when the drawer opens, then it lists every linked Contact with relationship, phone, email, SMS consent, and a Primary marker.
- Given I click "Add contact", when I type 2 or more characters, then I can search existing Contacts in my scope by name, email, or phone and link one, or choose "Create new contact" (US-ACC-013) with the Account prefilled.
- Given I link a Contact, when I pick the relationship, then a Household offers Primary, Spouse or partner, Child, Other relative, and Other, and a Business offers Owner, Officer, Employee, Billing contact, and Other.
- Given I choose "Make primary" on another Contact, when I confirm, then that Contact becomes primary, the previous primary keeps its relationship, and the header and Overview update.
- Given I unlink a Contact, when I confirm "Remove Ana Torres from Torres Household? The contact stays on its other accounts.", then the link is removed (the Contact record is never deleted) and a System Activity is logged; unlinking the primary requires choosing a new primary first unless it is the only Contact.
- Given a Contact belongs to no other Account, when I open its row menu, then "Remove from account" is disabled with the tooltip "Lucas Torres is on no other account. Every contact must belong to at least one account."
- Given a Contact is linked to another Account, when it renders in the list, then a muted line shows "Also on Torres Roofing LLC" linking to that Account (US-ACC-014).

## UI states

- Empty: "No contacts on this account yet." with "Add contact".
- Loading: 3 skeleton rows in the drawer; search shows a small spinner after 300ms.
- Error: a failed link shows an inline "Couldn't link this contact. Try again." on that row.
- No permission: Contact is C E for all roles in scope; search results outside my scope are not shown; an Archived Account opens the drawer read-only.
- Overflow: 12 Contacts list fully in the drawer with a sticky search; long names and emails truncate with tooltips.

## Design notes

- 480px right drawer titled "Contacts on Torres Household"; each Contact is a 48px row with avatar initials, name, relationship as muted text, and a row menu (Edit contact, Change relationship, Make primary, Remove from account).
- Primary marker is a small neutral pill "Primary".
- Add contact is an inline combobox at the top, not a second drawer.

## FE notes

- `AccountContactsDrawer`; store link entity `accountContacts { accountId, contactId, relationship, isPrimary }`.
- `unlinkContact` refuses when the Contact has no other `accountContacts` row, so no Contact is orphaned outside every scope.
- Actions `linkContact`, `unlinkContact`, `setPrimaryContact`, `updateContactRelationship`, each logging a System Activity on the Account.
- Search via `searchContactsInScope(user, query)`.

## Mock data

- Torres Household: Mike Torres (Primary, also Owner of Torres Roofing LLC), Ana Torres (Spouse or partner), Lucas Torres (Child).
- Torres Roofing LLC: Mike Torres (Owner), Elena Ruiz (Billing contact).
- The Account with no Contact; a Business with 12 Contacts.
