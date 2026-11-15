---
id: US-ACC-012
title: Contact page
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/contacts/:id]
dependsOn: [US-ACC-011, US-ACC-013, US-WRK-001, US-FND-006]
---

## Story

As a Producer, I want a Contact page that shows the Contact's details, consent, every Account they belong to, and their Activity across those Accounts, so that I have the whole relationship with one Contact before I call them.

## Acceptance criteria

- Given I open `/contacts/:id`, when it loads, then the header shows the full name, the primary phone and email as click-to-copy values, preferred contact method, and SMS consent per phone number with its date ("Mobile · Opted in · 03/14/2026").
- Given the Contact links to Accounts, when the "Accounts" section renders, then each Account shows name, kind icon, status, relationship, Primary marker, Producer, and Account Manager, linking to `/accounts/:id`.
- Given the Contact has Activity, when the timeline renders, then it shows Activities where this Contact is a participant across all their Accounts, each labeled with its Account.
- Given the details section, when it renders, then it shows First name, Last name, Suffix, Date of birth (Household Contacts only), Mobile phone, Work phone, Email, Mailing address, and Preferred contact method, with an "Edit" action (US-ACC-013).
- Given the Contact is linked only to Accounts outside my scope, when I open the URL, then I see the access-denied page naming the Account's Producer.

## UI states

- Empty: a Contact with no Activity shows "No activity with Lucas Torres yet."; a Contact with no email shows "—" with an "Add email" link.
- Loading: header skeleton and section skeletons.
- Error: full-page error with Retry if the Contact fails; per-section errors otherwise.
- No permission: if I can see only one of the Contact's 2 Accounts, the other shows as "1 more account outside your access" with no name or link.
- Overflow: long names truncate in the header with a tooltip; 400 Activities page at 25.

## Design notes

- Record page with a non-tabbed layout: header, then two columns (left: Activity timeline; right: Details card and Accounts card).
- Consent uses icon plus label with status color; Opted out also shows the muted line "Do not send SMS".

## FE notes

- Route `/contacts/:id`, `ContactPage`; scope check `canSeeContact(user, contact)` = any linked Account in scope.
- Timeline via `ActivityTimeline` with `scope={{ contactId }}` (US-WRK-001).

## Mock data

- Mike Torres (on Torres Household and Torres Roofing LLC, about 60 Activities), Lucas Torres (Child, no Activity), and a Contact whose Accounts span Houston and Tampa for the partial-access case.
