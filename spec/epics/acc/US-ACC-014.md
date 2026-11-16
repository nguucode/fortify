---
id: US-ACC-014
title: Linked Accounts through a shared Contact
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-ACC-010]
---

## Story

As a Producer, I want a Household and a Business that share a Contact to show each other as linked Accounts, so that I spot cross-sell openings like a business owner whose home and auto are written elsewhere.

## Acceptance criteria

- Given a Contact is linked to both a Household and a Business, when either Account page loads, then the header shows "Linked: Torres Roofing LLC" (or "Linked: Torres Household") as a link, derived automatically, with no separate link record to maintain.
- Given I hover the linked chip, when the popover opens, then it shows each linked Account's name, kind, status, Producer, active line count, and the shared Contact ("via Mike Torres").
- Given the linked Account has a different Producer, when the popover renders, then it shows "Different producer: Grant Holloway" so the Producer knows who to coordinate with.
- Given the shared Contact is unlinked from one Account, when the store updates, then the linked chip disappears from both Account headers.
- Given the linked Account is outside my scope, when the chip renders, then it reads "Linked account outside your access" without a name or link.

## UI states

- Empty: no linked Accounts shows nothing in that slot of the header meta row.
- Loading: the chip renders after the header data, with no skeleton (it is optional).
- Error: the chip is omitted silently and a console warning is logged; the rest of the header is unaffected.
- No permission: out-of-scope linked Accounts are named only as above.
- Overflow: 3 or more linked Accounts show the first and "+2"; the popover lists all.

## Design notes

- Chip is a text link in the header meta row with a link icon; popover per Part B (white, ring, menu shadow), 320px wide, one 48px row per linked Account.

## FE notes

- Selector `selectLinkedAccounts(accountId)` = Accounts sharing any Contact, excluding self and Archived; memoized on `accountContacts`.

## Mock data

- Torres Household ↔ Torres Roofing LLC via Mike Torres (hand-made edge case), with different Producers; a Business owner whose Household is in another Office.
