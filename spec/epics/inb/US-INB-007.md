---
id: US-INB-007
title: Link a conversation to an Account or create a Lead
epic: INB
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Draft
size: M
routes: [/inbox]
dependsOn: [US-INB-002, US-LEA-002, US-WRK-002]
---

## Story

As an Account Manager, I want to attach an unmatched email, text, or call to the right Account, or turn it into a Lead, so that every conversation ends up in an Account's Activity or in the Lead intake.

## Acceptance criteria

- Given a conversation's address or phone matches no Contact, then the reading pane shows an "Unmatched" banner with three actions: "Link to Account", "Create Lead", and "Not about an Account" (marks it Done with that reason).
- Given the sender matches exactly one Contact on more than one Account (for example Mike Torres on Torres Household and Torres Roofing LLC), then the banner instead asks "Which Account is this about?" with both Accounts as options.
- "Link to Account" opens a picker that searches Accounts in my scope by name, policy number, phone, or email; after picking, I choose an existing Contact or "Add as new Contact", and can tick "Save {address} to this Contact".
- Given I confirm a link, then every message in the conversation is logged as an Activity on that Account, a system Activity reads "Conversation linked from Inbox by Marisol Reyes", and the banner is replaced by the Account link and a "Related record" picker (Policy, Opportunity, Renewal, or Service Request on that Account).
- Given I choose "Change Account" on a linked conversation, then the new Account receives the Activities and the old Account keeps its Activities with a system Activity "Conversation moved to Torres Roofing LLC"; Activities are never deleted.
- "Create Lead" opens the Lead create flow (LEA Epic) prefilled with name, email or phone, my Office, Source "Phone" or "Web form" by channel, and the first message as the note; on save the conversation links to the new Lead and shows it in the header.

## UI states

- Empty: the Account picker with no match reads "No Account matches "{query}". Create a Lead instead?"
- Loading: the picker shows 5 skeleton rows while searching; linking shows a spinner on Confirm.
- Error: a failed link keeps the picker open with "Couldn't link the conversation. Try again."
- No permission: the picker lists only Accounts in my scope. A Producer can create a Lead only assigned to themselves; an Account Manager's Lead must be assigned to a Producer (LEA Epic).
- Overflow: Account results show name, status, Office, and Producer in one row, truncating the name with a tooltip; at most 20 results.

## Design notes

- Unmatched banner: white, ring, 8px radius, warning icon plus "Unmatched: no Contact has (555) 010-4417"; actions as small outline buttons, "Link to Account" primary.
- Picker is a 480px popover with a 36px search field and 48px two-line result rows.

## FE notes

- `conversations.link({ id, accountId, contactId | newContact, saveAddress })` backfills Activities through the WRK Activity action; `conversations.relink` writes the move Activity on both Accounts.
- Matching runs at seed time and on every new inbound message: exact email (case-insensitive) or exact phone in E.164.

## Mock data

- About 40 unmatched conversations; Mike Torres as the multi-Account match; one sender who is an existing Lead (matches the Lead, links to it, no Account).
