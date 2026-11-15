---
id: US-ACC-013
title: Create and edit a Contact
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: S
routes: [/accounts/:id, /contacts/:id]
dependsOn: [US-FND-005]
---

## Story

As an Account Manager, I want one Contact form to create a Contact on an Account or edit an existing Contact, with a duplicate check, so that each Contact exists once even when they belong to a Household and a Business.

## Acceptance criteria

- Given I choose "Create new contact" from an Account, when the drawer opens, then it shows First name, Last name, Suffix, Relationship (required, options by Account kind), Mobile phone, Work phone, Email, Date of birth (Households only), Preferred contact method (Phone, Email, SMS), and SMS consent for each phone number entered (Opted in, Opted out, Unknown; default Unknown).
- Given first name, last name, and at least one of phone or email, when I save, then the Contact is created and linked to the Account with the chosen relationship, and a System Activity is logged on the Account.
- Given the email or mobile phone matches an existing Contact, when I leave the field, then a callout reads "Mike Torres already uses this email (Torres Roofing LLC · Owner)." with "Link existing contact instead".
- Given I edit a Contact from `/contacts/:id`, when I save, then the change applies on every Account the Contact belongs to, and the timeline logs "Contact details updated" on each.
- Given I set a number's SMS consent to Opted out, when I save, then that number's consent date is set to today and SMS actions to that number show disabled elsewhere with the tooltip "Ana Torres opted out of SMS on (555) 010-2231."

## UI states

- Empty: not applicable.
- Loading: "Saving…" on the primary button.
- Error: "We couldn't save this contact. Try again." with entries kept.
- No permission: Contact is C E for all roles in scope; editing a Contact I can see through only one Account still edits the shared record, and the drawer notes "Changes apply on 2 accounts."
- Overflow: names up to 60 characters each; validation messages such as "Enter an email like name@example.com".

## Design notes

- 480px drawer, titled "New contact on Torres Household" or "Edit Mike Torres"; sections "Name", "Reach", "Consent".

## FE notes

- `ContactFormDrawer` with modes `create` (requires `accountId`) and `edit` (requires `contactId`); actions `createContact`, `updateContact`; dedupe via `findContactDuplicates({ email, mobile })`. SMS consent is stored per phone number: `phones[{ number, kind, smsConsent, smsConsentAt }]`.

## Mock data

- Duplicate fixtures `mike.torres@example.com` and (555) 010-4410; a Contact on 2 Accounts for the shared-edit note.
