---
id: US-FND-018
title: Permission gates for actions, fields, and records
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/accounts, /accounts/:id, /pipeline/:id]
dependsOn: [US-FND-004, US-FND-006]
---

## Story

As a Principal demoing roles, I want every Epic to apply the permission matrix the same way (hidden nav, disabled actions with a reason, hidden sensitive fields, access-denied records), so that switching View as shows consistent, believable behavior.

## Acceptance criteria

- Given the matrix in `spec/ia/roles.md`, then a single `can(user, action, object, record?)` answers every check, scoped to Own, Office, or Agency.
- Given an action the role cannot take, then the control renders disabled with a tooltip giving the reason, for example "Only a Principal or Admin can change the Producer." or "Account Managers can create Cross-sell and Remarket Opportunities only."
- Given commission fields, then a Producer sees only their own commission and split, an Account Manager sees none, and Principal and Admin see all; where access is missing, the field, column, and label are removed entirely, not masked.
- Given a synced object (Policy, Term, Insured item, Additional interest, commission), then no role gets an edit control; the place an edit would go offers "Request a Policy change".
- Given a Claim, then its loss details are read-only for every role after creation, and its tracking fields (carrier claim #, adjuster, status, outcome) are editable only by Account Managers (Office) and Principals; Holders likewise are editable only by Account Managers and Principals.
- Given an out-of-scope record, then the record route renders access-denied (US-FND-006).

## UI states

- Empty: not applicable.
- Loading: gated controls render in their final state immediately, because the current user is in memory.
- Error: not applicable.
- No permission: this story defines the patterns.
- Overflow: reason tooltips wrap at 280px.

## Design notes

- Disabled buttons use text-inactive on base with the ring kept, cursor not-allowed; tooltip on hover and focus.

## FE notes

- `src/auth/permissions.ts` encodes the matrix as data (`role → object → actions`) plus scope rules; `<Can action object record fallback="disable|hide">` and `useCan()`.
- Use `aria-disabled="true"` instead of `disabled` so the tooltip is reachable by keyboard (US-FND-012).
- Unit tests: one per matrix cell, so the matrix in `roles.md` and the code stay in step.

## Mock data

- Accounts where the Producer is Dana Whitfield, Accounts where she is only the Account Manager, and Accounts in another Office; Opportunities with commission splits.
