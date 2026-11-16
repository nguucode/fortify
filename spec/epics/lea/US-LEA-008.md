---
id: US-LEA-008
title: Disqualify a Lead with a reason
epic: LEA
roles: [Producer, Principal]
priority: P1
status: Done
size: S
routes: [/leads, /leads/:id]
dependsOn: [US-LEA-003, US-XDT-002]
---

## Story

As a Producer, I want to close a Lead that will not become business, with a reason, so that my list stays focused and a Principal can see why Leads from each source fall out.

## Acceptance criteria

- Given I choose Disqualify on a New or Contacted Lead, when the dialog opens, then I must pick one reason: No response, Not interested, Bought elsewhere, Price only, Outside appetite, Not in a licensed state, Duplicate lead, Bad contact data, or Other.
- Given I pick Other, when I try to confirm, then a note of at least 10 characters is required; for every other reason the note is optional.
- Given I pick Duplicate lead, when the dialog shows, then I must choose the surviving Lead from open Leads that share the phone or email, and the timeline of the surviving Lead logs "Duplicate L-1093 merged into this lead's history" with the duplicate's attempts appended.
- Given I pick Bought elsewhere, when the Lead has an X-date or I enter one, then the dialog offers "Save as X-date" (default on). Confirming runs the US-LEA-006 duplicate check, then creates a Prospect Account (or uses the matched Account) holding an X-date for that line, carrier and date, with no Opportunity, and the Lead becomes Disqualified · Bought elsewhere with a link to the Account. This follows decision O8.
- Given I confirm, when the store saves, then the status becomes Disqualified with the reason, date, and user; the Lead leaves the default Open list; and nothing is deleted.
- Given I am a Principal on /leads, when I select several rows and choose "Disqualify", then one reason applies to all of them (Duplicate lead is not available in bulk).

## UI states

- Empty: not applicable (dialog).
- Loading: confirm button spinner.
- Error: "Couldn't disqualify. Try again." with selections kept; bulk is all or nothing.
- No permission: Account Managers and Admins see Disqualify disabled with "Only the assigned Producer or a Principal can disqualify"; Producers only on their own Leads.
- Overflow: note up to 500 characters with a counter; the surviving-Lead picker scrolls after 5 rows.

## Design notes

- Dialog, 480px. Reasons as a single-column radio list with one muted hint line each where helpful (for example "Not in a licensed state: the agency writes TX and FL only").
- Primary button is neutral, not danger red, because nothing is destroyed: "Disqualify lead".

## FE notes

- `DisqualifyDialog`. Store action `disqualifyLeads(ids, { reason, note, survivorId? })`.
- The reason list is a constant `LEAD_DISQUALIFY_REASONS` shared with Reports (lead source analysis).
- "Save as X-date" calls `createXDate` (US-XDT-002) with `source = 'Lead'`.
- Disqualified Leads stay in the store with `disqualifiedAt`, `disqualifiedBy`, `reason`, `note`.

## Mock data

- 40 Disqualified Leads spread across reasons, weighted toward No response (30%) and Not interested (20%); two open Leads sharing a phone for the Duplicate path; one Lead from Georgia for Not in a licensed state.
