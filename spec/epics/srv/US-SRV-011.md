---
id: US-SRV-011
title: Billing question form
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P1
status: Draft
size: S
routes: [/service, /accounts/:id]
dependsOn: [US-SRV-005]
---

## Story

As an Account Manager, I want to log a billing question with its topic and amount, so that I can chase the carrier or the Account and spot nonpayment notices before a policy cancels.

## Acceptance criteria

- Given type Billing question, when the details section shows, then Topic is one of Payment due, Missed payment or late notice, Refund, Payment plan change, Autopay or payment method, Premium increase, Other.
- Given the form, when the user fills it, then Amount (dollars, optional) and Statement or notice date (optional, MM/DD/YYYY) are available, and Billing method shows read-only from the Policy (Direct bill or Agency bill, or "—" when unknown).
- Given Topic Missed payment or late notice, when the user answers "Notice of cancellation received?" with Yes, then Cancellation effective date becomes required, Due is shortened to 4 business hours, and a warning reads "Nonpayment notices move fast. Confirm the payment date with the carrier today."
- Given any billing request, when the form renders, then the helper under Description reads "Don't record card or bank account numbers here. Fortify doesn't take payments."
- Given no Policy is selected, when the request is created, then the subject reads "Billing question · Refund" and the Details view shows "—" for Billing method.

## UI states

- Empty: not applicable beyond US-SRV-005; with no Policy, Billing method shows "—".
- Loading: Billing method shows a 13px skeleton while the Policy loads.
- Error: "Enter the cancellation effective date."; Amount accepts 0.01 to 999,999.99 ("Enter an amount up to $999,999.99.").
- No permission: Admin cannot open the sheet.
- Overflow: amounts render with tabular-nums and thousands separators ("$12,480.00").

## Design notes

- Topic select first, then a 2-column row for Amount and Statement or notice date, then the conditional nonpayment group in a recessed well.
- The card-number helper is plain 13px muted text with an info icon, not a callout.

## FE notes

- Registers `serviceTypeRegistry['Billing question']`; overrides the SLA via `dueOverride(details)` when a cancellation notice is present (US-SRV-014 reads it).
- Description field: a client-side check warns "This looks like a card number. Remove it before saving." when it matches 13 to 19 consecutive digits; the value is never logged.

## Mock data

- Patel Household home with a missed payment and a notice of cancellation effective 11/25/2026.
- A Business on Agency bill asking about a $12,480.00 audit balance; a Household refund of $86.50 with no Policy linked.
