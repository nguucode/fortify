---
id: US-POL-001
title: Browse Policies list with saved views
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: M
routes: [/policies]
dependsOn: [US-FND-001, US-FND-005, US-FND-007]
---

## Story

As an Account Manager, I want one list of every Policy in my scope with saved views for Active, Pending cancellation, Expired, Canceled, and Recent production, so that I can find a Policy by number, Account, or Carrier without opening the AMS.

## Acceptance criteria

- Given I open `/policies`, when the page loads, then I see the saved view tabs Active (default), Pending cancellation, Expired, Canceled, and Recent production, each with a count, and a table with columns Policy number, Account, Line, Carrier, Current Term status, Effective, Expiration, Premium, Producer, and Account Manager.
- Given the Active view, then it lists Policies whose current Term status is Bound or Active; Pending cancellation lists Policies whose current Term carries the Pending cancellation flag; Expired and Canceled match the current Term status; Recent production lists Policies whose first Term was bound in the last 30 days.
- Given I type "LSM-PA-44" or "Torres" in the search field, when I stop typing for 250ms, then the table filters by policy number, Account name, or Named insured, and the meta line reads "Showing 3 of 1,012 policies · $8,940 premium".
- Given I am a Producer, then I see only Policies on Accounts in my Book; an Account Manager sees their Office; Principal and Admin see the agency.
- Given I click a row, then I land on `/policies/:id`; given I click the Account name in the row, then I land on `/accounts/:id` with the Policies tab open.
- Given any view, then there is no create, edit, or delete control anywhere on the page, and the page description reads "Synced from your AMS. To change a policy, open a Policy change from the Policy page."

## UI states

- Empty: "No policies in this view." with a muted second line naming the view, e.g. "Nothing is pending cancellation right now." No primary button, because Policies are not created in Fortify.
- Loading: 10 skeleton rows at 40px under a real header row; view counts show a 24px shimmer.
- Error: inline error panel in the table area, "Couldn't load policies. Try again." with a Retry button; saved view tabs stay interactive.
- No permission: not reachable; every role can read Policies within scope. Admin sees the list read-only like everyone else.
- Overflow: Account names and Named insureds truncate with an ellipsis and a full-value tooltip; premium up to $1,250,000.00 stays right-aligned in tabular figures; 1,000+ rows paginate at 50 per page.
- Filtered: chips for Line, Carrier, State (TX, FL), Office, Producer, Account Manager; "Clear filters" link; empty result reads "No policies match these filters." with a Clear filters button.

## Design notes

- List page per Part B: H1 "Policies", muted description with the AMS sentence above, then the toolbar: search ("Search policies"), Filters, Display options, Export. No primary button on the right.
- Primary column shows the policy number in mono with the Account name as the muted secondary token below it.
- Current Term status uses dot + 13px label (Active green, Bound blue, Pending cancellation orange with a warning icon, Canceled red, Expired neutral, Renewed/Rewritten/Non-renewed neutral). Never filled pills.
- The AMS sync indicator from US-POL-004 sits right-aligned in the page header: "Synced from AMS · 12 min ago".
- Line shows the icon plus label (Auto, Home, Condo, Renters, Umbrella, Flood, Boat, BOP, GL, WC, Commercial auto).

## FE notes

- Enhanced by US-FND-019 (P1): the P0 build ships without these; their controls appear once those stories land.
- Route `/policies`, `PoliciesListPage` built on the FND data table (`DataTable`, `SavedViewTabs`, `FilterBar`) from US-FND-007.
- Saved view ids map to sitemap `savedViews`; selected view and filters live in the URL query (`?view=pending-cancellation&line=home`).
- Read via `store.policies.list({ scope, view, filters, search, page })`; the scope comes from the View as user (US-FND-004). Current Term is resolved as the Term with the latest effective date.
- Export is a client-side CSV of the filtered rows (US-FND-019), commission columns never included.

## Mock data

- About 1,500 Policies across 10 fictional Carriers, TX 60% / FL 40%.
- Each status represented: at least 12 Pending cancellation, 40 Canceled, 120 Expired, and 25 bound in the last 30 days for Recent production (including the Policies created by a Won Opportunity during the demo).
- One Account name over 80 characters, and one commercial Policy with $1,250,000 premium.
