---
id: US-SRV-005
title: New Service Request with type picker and shared fields
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P0
status: Done
size: M
routes: [/service, /accounts/:id]
dependsOn: [US-FND-005, US-SRV-001]
---

## Story

As an Account Manager taking a call, I want to start a request by picking its type and filling a few shared fields, so that every request lands with the right Account, Policy, owner, and due date, whatever the type.

## Acceptance criteria

- Given the user clicks "+ New request" on `/service` or on the Account page's Service tab, when the sheet opens, then step 1 lists the seven types with a one-line description each: Policy change, Certificate request, Claim report, ID card / evidence, Billing question, Cancellation request, General.
- Given the sheet was opened from an Account, when step 2 shows, then Account is prefilled and locked; opened from `/service`, Account is a searchable combobox limited to the user's scope.
- Given the selected type, when step 2 shows, then Policy is required for Policy change, ID card / evidence, Claim report, and Cancellation request, optional for Billing question and General, and replaced by the policy picker inside the Certificate request form; the list shows Active and Pending cancellation Terms, with a "Show expired and canceled" toggle.
- Given the shared fields, when the user fills them, then Subject is prefilled from the type (e.g. "Policy change · Add vehicle") and editable up to 120 characters, Requested via is one of Phone, Email, SMS, Walk-in, Assignee defaults to the Account's Account Manager, and Due is computed from the type's SLA (US-SRV-014).
- Given a General request, when the user submits, then only the shared fields are needed and Description becomes required.
- Given a valid form, when the user clicks "Create request", then the request is created in status New, a system Activity is logged on the Account, the sheet closes, and a toast reads "SR-10483 created" with a "View" link to `/service/SR-10483`.
- Given unsaved input, when the user closes the sheet, then a confirm reads "Discard this request?" with "Discard" and "Keep editing".

## UI states

- Empty: an Account with no policies (Prospect) disables Policy change, ID card / evidence, Claim report, and Cancellation request in step 1 with the tooltip "This Account has no policies." A Former client opens with "Show expired and canceled" already on.
- Loading: the Account combobox shows "Searching…"; the Policy select shows a skeleton row while the Account's policies load; "Create request" shows a spinner while saving.
- Error: field errors inline on blur and on submit ("Choose a policy."); a save failure keeps the sheet open with a banner "Couldn't create the request. Your entries are kept." and "Try again".
- No permission: Admin sees "+ New request" disabled with "Admins have read-only access to Service Requests." A Producer's Account combobox returns only their Book. Assignee is editable only by Account Managers (Office AMs) and Principals; a Producer sees it read-only.
- Overflow: long Account names truncate in the combobox with a tooltip; an Account with 40 policies shows a scrollable select grouped by line; attachments are limited to 10 files of 10 MB each, with "File too large (max 10 MB)." on violation.

## Design notes

- Right-side sheet, 560px, over a dimmed canvas; header "New service request" with the step ("1 of 2") in muted text; footer with "Back", "Cancel", and the primary "Create request".
- Step 1: 7 radio cards in a single column (white, ring, 8px radius, 12px padding): icon, 14/500 label, 13px muted description. Selected card uses the blue ring and focus style.
- Step 2: shared fields first (Account, Policy, Subject, Requested via, Assignee, Due, Description, Attachments), then a divider and the type section from the matching form story under a 16/500 section title (e.g. "Policy change details").
- Policy options show "LSM-PA-4471029 · Personal auto · Lone Star Mutual · 03/01/2026 – 03/01/2027"; expired and canceled ones show their status as muted text.

## FE notes

- `NewServiceRequestSheet` with `react-hook-form` + `zod`. The schema is the shared schema merged with `serviceTypeRegistry[type].formSchema`; each typed story registers `FormSection`, `formSchema`, `defaultSubject`, and `DetailsView`.
- Entry points pass `{ accountId?, policyId?, type? }`; the Policy page (POL) and Claims list (US-CLM-001) open the same sheet with preset values.
- Store actions: `serviceRequests.create(input)` returns the new ID; `activities.log`. IDs are sequential from SR-10483 in the mock.
- The sheet has no URL of its own and is not deep-linkable: rules.md adds no query parameter for it, so every entry point opens it in place with preset values.
- Attachments are mock: files are kept as object URLs in memory and listed by name and size; nothing is uploaded.

## Mock data

- Torres Household (Client, 4 policies), Torres Roofing LLC (Business, 6 policies), a Prospect "Quintero Household" with no policies and no Contact, a Former client "Delgado Household" whose 2 policies expired.
- One Business with 40 policies across lines for the overflow scenario.
- Assignee defaults: Torres Household → Marisol Reyes; Okafor Household → Keisha Grant.
