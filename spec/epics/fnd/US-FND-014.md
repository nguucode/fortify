---
id: US-FND-014
title: Create and edit form sheet with validation and unsaved-changes guard
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/leads, /accounts]
dependsOn: [US-FND-005, US-FND-015]
---

## Story

As an Account Manager entering a new Lead while the caller is on the phone, I want one consistent form that validates as I go and never loses what I typed, so that creating and editing records is fast and safe in every module.

## Acceptance criteria

- Given I click a create action such as "+ Add lead", then a side sheet opens from the right with the form, focus on the first field, and the page behind still visible.
- Given required fields, then each shows a visible label and "Required"; on blur an invalid field shows an inline message, for example "Enter a 10-digit phone number" or "Enter a date as MM/DD/YYYY".
- Given I click Save with errors, then an error summary at the top lists them as links ("2 fields need attention"), focus moves to the summary, and nothing is saved.
- Given a valid form, when I click Save, then the button shows "Saving…" and is disabled until the mock API resolves; on success the sheet closes, a toast confirms ("Lead added"), and the new row appears in the list.
- Given I changed any field, when I press Esc, click outside, close the sheet, or navigate away, then a dialog asks "Discard changes?" with "Keep editing" (default) and "Discard".
- Given the API rejects the save (Force error), then the sheet stays open with my input intact and an inline error "Couldn’t save. Try again."

## UI states

- Empty: a create form starts blank except defaults (Office = my Office, Producer = me for a Producer).
- Loading: an edit form shows field skeletons until the record loads.
- Error: inline field errors, the error summary, and a save-failure banner inside the sheet.
- No permission: fields the role cannot edit render read-only with a lock icon and tooltip; synced fields are never in an edit form.
- Overflow: long forms scroll inside the sheet with the header and footer (Cancel, Save) sticky.

## Design notes

- Radix Dialog styled as a 480px right sheet, base surface, popover shadow; header 16/500 with a close button; footer with secondary Cancel and primary Save.
- Fields 36px, 8px radius, `line-control` border (US-FND-012), labels 13/500 text-label above the field, help and error text 13 below; errors in danger text with an icon.
- Inputs use US formats with masks: phone (555) 010-1234, currency $1,234, date MM/DD/YYYY with a date picker.

## FE notes

- `src/patterns/FormSheet.tsx` plus `Field`, `TextField`, `PhoneField`, `CurrencyField`, `DateField`, `SelectField`, `ComboboxField`.
- Validation with `zod` schemas per entity (zod is already used for spec validation); `react-hook-form` is not needed for this form size; a small `useForm(schema, initial)` hook tracks values, touched, errors, and `isDirty`.
- Navigation guard via React Router `useBlocker` when `isDirty`.

## Mock data

- A Lead form round trip; a duplicate-email case that returns a field error "A Contact with this email already exists" from the mock API.
