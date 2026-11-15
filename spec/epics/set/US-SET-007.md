---
id: US-SET-007
title: Templates list
epic: SET
roles: [Admin, Principal]
priority: P1
status: Draft
size: S
routes: [/settings/templates]
dependsOn: [US-FND-007, US-SET-001]
---

## Story

As an Admin, I want to see every email and SMS template and the standard certificate wording the agency uses, grouped by purpose, so that I know what staff send to clients and which templates are stale.

## Acceptance criteria

- Given I open `/settings/templates`, when it loads, then columns are Name, Channel (Email, SMS, Certificate wording), Category (Sales, X-date, Renewal, Service, Certificates), Used in (the screen that offers it, for example "Renewal page"), Last edited (MM/DD/YYYY and by whom), and Status (Active, Retired).
- Given the list, when it loads, then Active templates show first, grouped by Category, and the meta line reads "16 templates · 2 retired".
- Given I am an Admin, when I click "+ New template" or a row, then the template editor opens (US-SET-008); as a Principal a row click opens the editor read-only.
- Given a row's overflow menu, when I click "Duplicate", then a copy named "Copy of Renewal notice, 45 days" opens in the editor; "Retire" and "Restore" toggle Status. There is no delete.
- Given filters, when I filter by Channel, Category, or Status, then the list updates and the filters persist in the URL.

## UI states

- Empty: "No templates yet. Templates fill emails, texts, and certificate wording with account details." with "+ New template" (Admin only).
- Loading: 8 skeleton rows.
- Error: page error panel "Templates couldn't load." with "Try again".
- No permission: Principal sees "+ New template", Duplicate, and Retire disabled with "Only Admins can change Settings."; Producer and Account Manager get `/403`.
- Overflow: names truncate with tooltip; Used in shows the first location and "+2".
- Filtered: chips with "Clear all"; no match shows "No templates match these filters."

## Design notes

- Part B list page; Channel renders as a small icon (envelope, message, document) plus label; Retired rows in text-muted.
- Group headers inside the table are 13/600 rows on the recessed fill, not separate tables.

## FE notes

- Store slice `templates`: `id`, `name`, `channel`, `category`, `usedIn[]`, `subject`, `body`, `status`, `updatedAt`, `updatedBy`.
- Actions `duplicateTemplate(id)`, `setTemplateStatus(id, status)`.
- Other Epics read templates by `category` and `channel` with `selectActiveTemplates({ category, channel })`; Certificate wording templates feed the "Insert standard wording" menu in US-CRT-005.

## Mock data

- 16 templates, for example: "Quote follow-up, 3 days" (Email, Sales), "X-date outreach, 60 days" (Email, X-date), "X-date reminder" (SMS, X-date), "Renewal notice, 45 days" (Email, Renewal), "Renewal: premium increase" (Email, Renewal), "Certificate delivery" (Email, Certificates), "Additional insured wording, GL" and "Waiver of subrogation wording" (Certificate wording, Certificates), "ID card ready" (SMS, Service), "Policy change received" (Email, Service).
- 2 Retired templates; one template with a 90-character name.
