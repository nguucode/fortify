---
id: US-SRV-014
title: SLA due dates with due-soon and overdue indicators
epic: SRV
roles: [Account Manager, Producer, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/service, /service/:id]
dependsOn: [US-SRV-001, US-SRV-003, US-FND-008]
---

## Story

As an Account Manager, I want every request to get a due time from its type and to show when it is close to or past due, so that same-day work like certificates and claim reports never slips behind routine changes.

## Acceptance criteria

- Given a new request, when it is created, then Due is set from its type in business hours (Monday to Friday, 8:00 AM to 5:00 PM in the Office's time zone, excluding US federal holidays; 1 business day = 9 business hours): Claim report 4 business hours (to submit to the carrier), ID card / evidence 4 business hours, Certificate request 4 business hours when holder-only or 1 business day when it asks for additional insured, waiver of subrogation, or primary & noncontributory, Policy change 1 business day, Cancellation request 1 business day, Billing question 2 business days, General 3 business days.
- Given a request in Waiting on client, when it renders, then the indicator reads "SLA paused" with a clock icon, and when it leaves that status, Due moves later by the business hours it spent waiting; time in Waiting on carrier keeps counting.
- Given an open request with 2 business hours or less left, when it renders on the board, the list, or the request page, then the due indicator shows "Due in 1h 40m" with the warning icon; past due shows "Overdue 2d" with the danger icon; otherwise it shows the due date ("Due 11/18/2026").
- Given requests in Waiting on carrier or Waiting on client for more than 5 business days, when the board renders, then those cards also show "Waiting 7d" in muted text with a clock icon.
- Given at least one overdue or long-waiting request in scope, when `/service` loads, then a collapsible callout reads "7 requests need attention" with items such as "SR-10431 · Certificate request · Overdue 1d" and "5 requests waiting on carrier more than 5 business days".
- Given a request becomes overdue, when the mock clock passes its due time, then its assignee receives a notification "SR-10431 is overdue" (US-FND-008).

## UI states

- Empty: no callout when nothing is overdue or long-waiting.
- Loading: the indicator slot shows a 60px skeleton.
- Error: if the SLA can't be computed (missing Office), the indicator shows "Due —" and the request is left out of the callout.
- No permission: indicators are visible to all roles; the callout's items link only to requests in the user's scope.
- Overflow: "Overdue 99+d" above 99 days; the callout lists the 5 most overdue items, then "View all 23 in list" linking to the Overdue saved view.

## Design notes

- Indicator: 13px label with a 14px icon; warning and danger use their text tokens, never a filled pill. Done requests show no indicator.
- Callout per Part B: white, ring, 8px radius, title with a count pill, items with a colored dot, bold first line (ID · type · state) and a muted second line (Account · assignee). Collapsed state remembered per session.

## FE notes

- `slaRules.ts` holds the table above (the rules.md Service SLAs) and the US federal holiday list, using observed dates when a holiday falls on a weekend; `computeDue(createdAt, type, officeTz, details)` honors `serviceTypeRegistry[type].dueOverride` (US-SRV-011) and the Certificate request wording flags. Offices: Houston and San Antonio on America/Chicago, Tampa on America/New_York. Settings shows the same rules read-only on the Pipeline stages page (US-SET-006).
- Due is stored on create; edits go through US-SRV-015. Leaving Waiting on client adds the paused business minutes to Due (`pausedBusinessMinutes` on the request); no other status change moves Due.
- The mock clock is the app's "now", so offsets in mock data keep overdue scenarios current.

## Mock data

- In Marisol Reyes's office: 4 overdue (one Certificate request overdue 1 day), 3 due within 2 business hours, 5 waiting on carrier for 6 to 12 business days.
- One request in Waiting on client for 3 business days (paused), one in Waiting on carrier past Due (not paused), and one Policy change created on 11/25/2026 at 3:00 PM whose Due skips Thanksgiving (11/26/2026) and lands on 11/27/2026 at 3:00 PM.
- One Policy change overdue 104 days for the overflow scenario; one request on an Account with no Office for the error scenario.
