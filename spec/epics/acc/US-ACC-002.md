---
id: US-ACC-002
title: Create a Household or Business Account
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/accounts]
dependsOn: [US-ACC-001, US-FND-005]
---

## Story

As a Producer, I want to create a Household or a Business Account directly, with a duplicate check, so that a walk-in or referral can be worked without first going through a Lead.

## Acceptance criteria

- Given I click "+ New account" on `/accounts`, when the drawer opens, then I first choose Household or Business, and the form shows the fields for that kind.
- Given a Household, when I fill Account name (prefilled as "<Last name> Household" from the first Contact), primary Contact first and last name, mobile phone, email, mailing address, and Office, then "Create account" is enabled; Business requires Legal name, Entity type, primary Contact, phone, mailing address, and Office.
- Given I am a Producer, when the form shows ownership, then Producer is locked to me and I pick an Account Manager from my Office; an Account Manager picks the Producer and defaults to themselves as Account Manager; a Principal or Admin picks both. Choosing owners here is initial assignment, not reassignment.
- Given the name plus ZIP, the email, or the phone matches an existing Account in the agency, when I leave the field, then a warning callout lists up to 3 matches ("Torres Household · Client · Houston") with "Open" links and a "Create anyway" option.
- Given I submit, when the store saves, then the Account is created with status Prospect, a System Activity "Account created by Dana Whitfield" is logged, and I land on `/accounts/:id` on the Overview tab with a toast "Torres Household created".
- Given a field fails validation, when I submit, then the drawer stays open and each field shows its message, e.g. "Enter a 5-digit ZIP code" or "Enter a phone number like (555) 010-1234".

## UI states

- Empty: not applicable; the drawer always opens on the kind choice.
- Loading: the submit button shows a spinner and "Creating…" while the mock call runs (200–600ms); inputs are disabled.
- Error: a forced error keeps the drawer open with an inline banner "We couldn't create this account. Your entries are kept. Try again."
- No permission: Account is C for every role, so the action is never disabled; an Admin creating an Account must still pick a Producer and an Account Manager.
- Overflow: Account name accepts up to 120 characters with a live counter after 100; a duplicate match list longer than 3 shows "and 4 more" linking to `/accounts?q=<name>`.

## Design notes

- Right-side drawer, 480px, white surface with ring; sections "Account", "Primary contact", "Address", "Ownership". Kind choice as two 8px-radius option cards with Household and Business icons.
- Duplicate warning uses the warning-tint callout panel with a dot per match, bold first line and muted second line.
- Primary "Create account" bottom-right, secondary "Cancel" beside it. Closing with unsaved input asks "Discard this new account?".

## FE notes

- `NewAccountDrawer` opened from `/accounts` (query `?new=account`), also reusable from ⌘K.
- Form state with field-level validation; ZIP must be 5 digits and the state must be TX or FL for the mock (other states show "This agency writes in TX and FL only.").
- Store action `createAccount({ kind, ... })` creates the Account and its first Contact link (relationship Primary), then `logSystemActivity('account.created')`.
- Duplicate check via `findAccountDuplicates({ name, zip, email, phone })` across the agency, not just scope; matches out of scope show name and Office only, with no link.

## Mock data

- Users per Office with Producer and Account Manager roles for the pickers.
- Duplicate fixtures: "Torres Household" (77007), and an email `mike.torres@example.com` shared with Torres Roofing LLC.
