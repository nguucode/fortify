---
id: US-CLM-006
title: Claim follow-up nudges
epic: CLM
roles: [Account Manager, Principal]
priority: P2
status: Done
size: S
routes: [/claims, /claims/:id]
dependsOn: [US-CLM-001, US-CLM-004, US-FND-008]
---

## Story

As an Account Manager, I want Fortify to point out claims that have gone quiet, so that I chase the carrier before the Account calls me upset.

## Acceptance criteria

- Given Claims with no carrier claim # 2 business days after submission to the carrier, Open with no check-in for 7 business days, or Open while their Claim report request is Waiting on client (client documents) with no check-in for 14 business days, when `/claims` loads, then a collapsible callout reads "5 claims need follow-up" with items such as "CL-2045 · No claim # after 3 business days" and "CL-2036 · No check-in in 9 business days".
- Given a callout item or a Claim page that meets a rule, when the user clicks "Create follow-up task", then a Task "Follow up with Gulfstream Indemnity on claim GSI-26-0041877" is created for the Claim's Account Manager, due in 1 business day, linked to the Claim and the Account.
- Given a Claim that meets a rule, when its row renders in the Claims list, then the Days open cell carries a warning icon with a tooltip naming the rule.
- Given a Claim first meets a rule, when the mock clock passes the threshold, then the Account Manager receives a notification "CL-2045 has no claim # after 2 business days" (US-FND-008), once per rule per Claim.
- Given an adjuster or client call or email is logged as an Activity on the Claim, or a follow-up Task on it is completed, when the list refreshes, then the check-in rules reset for that Claim.

## UI states

- Empty: no callout when no Claim meets a rule.
- Loading: the callout is not shown until the list has loaded.
- Error: Task creation failure shows "Couldn't create the task. Try again."
- No permission: Producers and Admin do not see the callout or the "Create follow-up task" action; the warning icon still shows in their list.
- Overflow: the callout lists the 5 oldest items, then "View all 12" which filters the list to Claims needing follow-up.
- Filtered: the "Needs follow-up" filter added by this story shows "No claims need follow-up." when empty.

## Design notes

- Callout per Part B, above the table: title with count pill, items with a warning dot, bold first line (ID · rule), muted second line (Account · Carrier · Account Manager).
- On the Claim page, a single-line inline notice under the step row with the warning icon and a text button "Create follow-up task".

## FE notes

- `claimFollowUpRules.ts` with three rules (rules.md, Claims): `noClaimNumber` (status Submitted to carrier, 2 business days since `submittedAt`), `checkIn` (status Open and not waiting on client, 7 business days since the last check-in), and `checkInWaitingOnClient` (status Open and the linked Claim report request is Waiting on client, 14 business days since the last check-in). A check-in is a call or email Activity linked to the Claim, or a completed Task on it. Business days use the US federal holiday list in `slaRules.ts`.
- Store: `claims.list` returns `followUp: RuleId[]` per Claim; `tasks.create`, `notifications.push`.

## Mock data

- CL-2045 submitted 3 business days ago with no claim #; CL-2036 Open with the last check-in 9 business days ago; one Claim Open and waiting on client documents with the last check-in 10 business days ago (no nudge yet); 12 Claims meeting a rule in the Tampa Office for the overflow scenario.
