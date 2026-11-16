---
id: US-RPT-007
title: Service report
epic: RPT
roles: [Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/reports]
dependsOn: [US-RPT-001, US-RPT-002, US-FND-020, US-SRV-002]
---

## Story

As an Account Manager, I want to see my Office's Service Requests by type, status, and age, and how fast each Account Manager closes them, so that we can balance the queue and catch requests that are stuck waiting.

## Acceptance criteria

- Given the Service report, then cards show: Opened (Service Requests created in the range), Done (completed in the range), Open now, and Median days to Done ("2.5 days"), with previous-period deltas.
- Given the status chart, then bars show open Service Requests by status: New, In progress, Waiting on carrier, Waiting on client.
- Given the type table, then rows by type (Policy change, Certificate request, Claim report, ID card / evidence, Billing question, Cancellation request, General) show Opened, Done, Open, and Median days to Done.
- Given the aging chart, then open Service Requests are bucketed by age: 0–2 days, 3–7 days, 8–14 days, 15+ days; the 15+ bucket label is in danger text.
- Given the Account Manager table, then each Account Manager in scope has Open, Done, Median days to Done, and Waiting on carrier counts; clicking a row opens `/service?view=list` filtered to that Account Manager.
- Given Certificates, then a line under the cards reads "Certificates issued: 34 · Needs review now: 3", linking to `/certificates`.

## UI states

- Empty: "No Service Requests in this range."
- Loading: card, chart, and table skeletons.
- Error: "Couldn't load the Service report. Retry."
- No permission: Producers do not have this report, because the Account Manager owns Service Requests (object-model.md) and roles.md gives Producers only their own reports; Account Managers are fixed to their Office.
- Overflow: median with fewer than 3 Done shows "—" with the tooltip "Not enough completed requests"; the type name "ID card / evidence" fits the column without truncation.
- Filtered: Office (Principal, Admin), Lines, and date range apply everywhere.

## Design notes

- Same report grammar as US-RPT-003; status bars neutral with labels, aging buckets as a single-hue bar set.

## FE notes

- Charts use the FND chart primitives (US-FND-020: Recharts wrapped with tabular numbers, the primary blue series, and hairline gridlines).
- Component `ServiceReport`; selectors over SRV Service Requests (type, status, createdAt, doneAt, Account Manager) and CRT Certificates (status, issuedAt). Median computed on Done requests in the range.

## Mock data

- 300 Service Requests across all types and statuses with 12 months of history; about 10 open for 15+ days, mostly Waiting on carrier; 80 Certificates with 3 in Needs review.
