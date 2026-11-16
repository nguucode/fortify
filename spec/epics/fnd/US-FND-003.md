---
id: US-FND-003
title: Command palette (⌘K) global search
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/today]
dependsOn: [US-FND-002, US-FND-005]
---

## Story

As an Account Manager on a call, I want to type a name, phone number, or policy number and jump straight to the record, so that I can answer the caller without clicking through lists.

## Acceptance criteria

- Given the palette is open with an empty query, then it shows up to 5 recently viewed records and the actions "Add lead", "Go to Renewals", and "Go to Tasks", filtered by what my role can do.
- Given I type at least 2 characters, when 150ms pass without typing, then results appear grouped as Accounts, Contacts, Leads, Opportunities, Policies, and Service Requests, at most 5 per group, each with "See all 23 results" linking to that list with `?q=` applied.
- Given I type a policy number such as "GHI-HO-4471023", then the exact Policy match is the first result above all groups.
- Given I type "5550101234" or "(555) 010-1234", then Contacts and Leads with that phone match regardless of formatting.
- Given my role scope is Own or Office, then records outside my scope never appear in results.
- Given results, when I use ↑/↓ and Enter, then the highlighted record opens and the palette closes; Esc closes without navigating and returns focus to where it was.

## UI states

- Empty: "No results for “torrez”" with a hint "Try a policy number, phone, or email."
- Loading: a 2px progress line under the input while the request is in flight; previous results stay visible.
- Error: inline row "Search is unavailable. Try again." with a Retry button; the palette stays open.
- No permission: out-of-scope records are excluded; actions the role cannot take (for example "Start quote" for Admin, who only reads Opportunities) are not listed.
- Overflow: long names truncate with an ellipsis; each row shows a muted secondary token (Account under a Contact, Account under a Policy number).

## Design notes

- Radix Dialog, 640px wide, 12px radius, popover shadow, positioned 96px from the top.
- 48px input row; result rows 40px with entity icon, primary text 14, secondary 13 muted, and a right-aligned entity label.
- Group headers 12/600 text-label. Highlighted row uses recessed background, not blue.
- Policy numbers and IDs in the platform mono stack.

## FE notes

- `src/shell/CommandPalette.tsx`; `api.search(query, { limit: 5 })` in the mock API scores prefix matches on name, normalized phone digits, email, and exact policy number.
- Recently viewed: the session store appends on each record route visit, capped at 5, deduplicated.
- Combobox semantics: `role="combobox"` input with `aria-activedescendant` on a `role="listbox"`; announce result count in a polite live region.

## Mock data

- Accounts, Contacts, Leads, Opportunities, Policies, and Service Requests from the store; the Torres Household and Torres Roofing LLC (both appear for "torres"); a name over 60 characters; Contacts sharing a phone number.
