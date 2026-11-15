---
id: US-SET-008
title: Create and edit a template with merge fields and preview
epic: SET
roles: [Admin, Principal]
priority: P1
status: Draft
size: M
routes: [/settings/templates]
dependsOn: [US-SET-007]
---

## Story

As an Admin, I want to write a template with merge fields and see it filled with a real sample Account before saving, so that a renewal email never goes out reading "Dear {{contact.firstName}}".

## Acceptance criteria

- Given the editor, when I open it, then I can set Name, Channel (Email, SMS, Certificate wording), Category, Subject (Email only), and Body; Used in is read-only and shows where the template is offered.
- Given the Body, when I click "Insert field", then a menu lists the allowed merge fields grouped by object, for example `{{account.name}}`, `{{contact.firstName}}`, `{{policy.number}}`, `{{term.expirationDate}}`, `{{renewal.premiumChangePct}}`, `{{holder.name}}`, `{{user.name}}`, `{{office.phone}}`, and inserts the token at the cursor.
- Given the body contains a token that is not in the allowed list (for example `{{account.nickname}}`), when I click "Save template", then the token is underlined in danger and saving is blocked with "1 unknown field: {{account.nickname}}".
- Given the Preview pane, when I pick a sample Account (default: Torres Roofing LLC), then every token renders with that Account's data; tokens with no value render as "[no value]" in warning text.
- Given Channel is SMS, when I type, then a counter shows characters and segments ("142 / 160 · 1 segment"), and over 320 characters Save is blocked with "Keep SMS under 2 segments."
- Given I am an Admin and click "Save template", when the save completes, then the list (US-SET-007) shows the template with Last edited updated to today and my name.

## UI states

- Empty: a new template opens with blank fields, Channel Email, and the Preview showing "Start typing to preview."
- Loading: editor skeleton while the template and sample Account load.
- Error: a forced save error shows "Couldn't save the template. Your text is still here." with "Try again".
- No permission: Principal sees the editor read-only (inputs as text, no Save, "Read only" badge); Producer and Account Manager get `/403`.
- Overflow: Body caps at 5,000 characters for Email and 2,000 for Certificate wording, with a counter after 80%; preview scrolls independently.

## Design notes

- Full-width editor inside the Settings content area: left 55% form, right 45% Preview in an elevated card showing the email as recipients would see it (From line from the Account's Office, Subject, Body).
- Merge tokens render inline as neutral mono chips in the body field; unknown tokens as danger-outlined chips.
- Footer: "Cancel" and primary "Save template"; unsaved changes trigger the Settings discard dialog (US-SET-001).

## FE notes

- Component `TemplateEditor` opened at `/settings/templates?edit=TPL-012` or `?new=1`.
- Merge field registry `MERGE_FIELDS` (one typed module) with `resolve(token, context)`; parser `findTokens(body)` returns known and unknown tokens; both unit-tested.
- SMS segment count uses GSM-7 160 / 153 rules; non-GSM characters switch to 70 / 67.
- Store actions `createTemplate`, `updateTemplate`.

## Mock data

- Uses `templates` from US-SET-007 and sample Accounts: Torres Roofing LLC (Business, all fields), Torres Household, and the Account with no Contact (exercises "[no value]").
