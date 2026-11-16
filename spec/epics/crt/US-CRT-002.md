---
id: US-CRT-002
title: Add, edit, and deactivate a Holder
epic: CRT
roles: [Account Manager, Principal]
priority: P1
status: Done
size: S
routes: [/accounts/:id, /certificates/:id]
dependsOn: [US-FND-005]
---

## Story

As an Account Manager, I want to add or correct a Holder in a drawer, from the Holders sub-tab or while issuing a Certificate, so that the Holder's legal name and address are right on this and every later Certificate.

## Acceptance criteria

- Given the Holder drawer in add mode, when I fill Name, Address line 1, City, State, ZIP, and Type and click "Save holder", then the Holder is created on the Account as Active, the drawer closes, a toast reads "Holder added: Westheimer Commons Development LLC", and an Activity "Holder added" is logged on the Account.
- Given Name, Address line 1, City, State, or ZIP is empty, or ZIP is not 5 digits (or ZIP+4), or Email is not a valid address, when I click "Save holder", then the field shows an inline error ("Enter a 5-digit ZIP") and nothing is saved.
- Given another active Holder on the same Account has the same Name and ZIP, when I type them, then a warning reads "A holder with this name and ZIP already exists" with "Use existing", and saving is still allowed.
- Given I edit a Holder that already has Issued Certificates, when I change Name or Address and save, then a notice reads "3 issued certificates show the old address. Re-issue them from the Certificates sub-tab." and the change does not alter those Certificates.
- Given an Active Holder, when I click "Deactivate" and confirm, then its status becomes Inactive, it no longer appears in the Holder picker or in re-issue proposals, and "Reactivate" restores it. There is no delete.
- Given I opened the drawer from the Issue form (US-CRT-005), when I save a new Holder, then it is selected in that form's Holder field.

## UI states

- Empty: add mode opens with all fields blank, Type defaulting to Holder-only, State defaulting to the Account's state.
- Loading: "Save holder" shows a spinner and the fields are disabled during the 200–600ms mock call.
- Error: a forced error keeps the drawer open with a banner "Couldn't save the holder. Your changes are still here." and "Try again".
- No permission: Producer and Admin never reach the drawer; its entry points are disabled (see US-CRT-001). Opening it by deep link as a Producer shows the drawer read-only with the banner "View only."
- Overflow: Name accepts up to 120 characters with a live counter after 100; long names wrap in the drawer header to two lines then truncate.

## Design notes

- Right-side drawer, 480px wide, white surface with ring and popover shadow. Header: "Add holder" or the Holder name; footer: secondary "Cancel", primary "Save holder" at the far right; "Deactivate" as a text danger action at footer left in edit mode.
- Fields in one column: Name, Type (segmented control: Holder-only | Additional insured, with helper text "Additional insured needs Principal review at issue"), Address line 1, Address line 2, City, State (select, US states), ZIP, Email, Phone, Project name, Project or job #.
- Phone formats as (555) 010-1234 on blur.

## FE notes

- Component `HolderDrawer` with `mode: 'add' | 'edit'`, `accountId`, `holderId?`, `onSaved(holder)`; mounted by US-CRT-001 and US-CRT-005.
- Store actions: `createHolder`, `updateHolder`, `setHolderActive(holderId, active)`; each appends an Account Activity of kind `system`.
- Validation with the shared form schema helper; duplicate check is a selector over `holders` by `accountId` + normalized name + ZIP.
- On edit, count affected Certificates with `selectCertificatesByHolder(holderId, { status: ['Issued', 'Re-issued'] })`.

## Mock data

- Uses `holders` and `certificates`. Seeds a duplicate-prone pair on Torres Roofing LLC ("Brazos Builders Inc." and an incoming "Brazos Builders, Inc." in ZIP 77002), and a Holder with 3 Issued Certificates for the address-change notice.
