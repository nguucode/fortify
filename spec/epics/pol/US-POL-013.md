---
id: US-POL-013
title: Commission on the Policy page by role
epic: POL
roles: [Producer, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/policies/:id]
dependsOn: [US-POL-002, US-FND-004]
---

## Story

As a Producer, I want to see my commission and share on a Policy, so that I know what the Term earns me, while Account Managers never see commission at all.

## Acceptance criteria

- Given I am the Producer on the current Term's commission record, then the Overview tab shows a Commission card: Commission rate (e.g. 12.0%), Agency commission on the current Term ($262.08), My share (50%, new business; 40% on a renewal Term), and My commission ($131.04).
- Given I am a Producer who is not the Producer on the commission record (for example, I am the Account's Account Manager), then the Commission card is absent, as for an Account Manager.
- Given I am a Principal or Admin, then the card shows the rate, agency commission, the Producer, and their share and amount.
- Given I am an Account Manager, then the Commission card and every commission column are absent from the DOM, not masked.
- Given commission data has not synced for a Bound Term, then the card reads "Commission appears after the AMS syncs the issued policy."

## UI states

- Empty: the not-yet-synced message above.
- Loading: card skeleton.
- Error: inline "Couldn't load commission." with Retry.
- No permission: hidden entirely for Account Manager.
- Overflow: commission on a $1,250,000 Policy fits in tabular figures.

## Design notes

- Small white card with ring in the Overview right column; figures right-aligned, labels 12px.

## FE notes

- `CommissionCard` gated by a `canSeeCommission(user, policy)` selector shared with RPT; it reads the synced commission records (Term, producer, new or renewal, rate, producer share, amount) from rules.md. Unit test the selector for all 4 roles.

## Mock data

- Commission records for every Active Term with the default share (50% new business, 40% renewal); a Policy where the viewing Producer is only the Account Manager; one Bound demo Term with no commission yet.
