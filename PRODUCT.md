# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, Vite, TypeScript, React Router and Tailwind v4. Components are built on Radix primitives and charts on Recharts, behind Fortify chart primitives. This is front-end only: no backend and no real auth. Data comes from an in-memory mock store, seeded deterministically and reset on reload. Decided in wayfinder ticket 07.

## Users

Fortify serves the staff of a US independent property and casualty agency: 25 users in three Offices, Houston TX, San Antonio TX and Tampa FL. There are four fixed roles:

- **Producer:** sells. Works Leads, X-dates and the Pipeline, where Opportunities carry Quotes from several carriers. Also cross-sells. Sees their own Book.
- **Account Manager:** services clients. Works Renewals and Service Requests (policy changes, certificates, claim reports), and remarkets. Sees their Office.
- **Principal:** watches agency pipeline and retention, reviews certificates with an additional insured, waiver or P&NC, and reassigns Books. Sees the whole agency.
- **Admin:** manages users, settings and data sync.

Full scope and permission rules are in `spec/ia/roles.md`.

## Product Purpose

Fortify is the CRM an independent agency uses to sell, service and retain personal and commercial lines through about 10 carriers. Success means that a user can find any Account, Policy, Renewal or request and act on it from a dense list without opening five screens.

The P0 demo loop is: Lead → Qualify (with a duplicate check) → Opportunity → Quotes → Won (creates Bound Terms) → Policy → Renewal → Service Request.

## Positioning

Fortify sits beside the agency's AMS rather than replacing it. The AMS stays the system of record for policies, terms, insured items and commission, which Fortify shows read-only and marked as synced. Fortify owns the work around them:

- Leads, Accounts, Contacts and X-dates
- Opportunities and Quotes
- Renewals as work items
- Service Requests, Certificates and Claim tracking
- Activities and Tasks

The vocabulary is canonical; see `GLOSSARY.md`.

## Operating Context

Work is timed off two dates. X-dates drive prospects, and Term expiration dates drive clients:

- Renewals open 45 days before expiration for personal lines, 120 for Florida residential property, 60 for small commercial and 90 for large commercial.
- Service work is held to business-hour SLAs.

Texas and Florida specifics appear as fields, such as the hurricane deductible, wind mitigation, the windstorm-pool area, PIP/UM rejection and WC non-subscriber status. Rules are in `spec/ia/rules.md` and `spec/ia/object-model.md`.

## Capabilities and Constraints

Source of truth (read it; do not restate it):

- `spec/ia/sitemap.yaml`: the navigation. It drives the real sidebar and the in-app Product menu.
- `spec/ia/roles.md`, `object-model.md`, `rules.md` and `mock-data.md`.
- `spec/epics/**`: 16 Epics, 201 user stories, each with acceptance criteria and required UI states.
- `spec/build-order.md`: P0 in 12 build waves.

Constraints:

- **Layout:** desktop-first at 1280–1600px, usable on tablet, read-only on mobile. Light mode only in v1.
- **Formats:** US formats ($1,234, MM/DD/YYYY, (555) 010-1234).
- **Mock data:** every screen carries a "Sample data" badge, and all carriers are fictional.
- **Demo controls:** latency, a forced error and empty data make every UI state demonstrable.
- **Out of scope:** rating engine, policy administration, billing, claims adjusting, real integrations and real auth.

## Brand Commitments

- **Name and color:** Fortify. The brand color is blue: it is the same hue as the action blue, oklch(57.72% .2324 260), and fills the "F" logomark. The wordmark text stays neutral. There is no second accent. Confirmed 2026-11-15.
- **Reference:** the UI follows the system grammar of the Cloudflare dashboard (the user's chosen reference), but must never use Cloudflare's brand: no orange, no logo, no name.

## Evidence on Hand

All data is synthetic, and the shared seed list is in `spec/ia/mock-data.md`. There are no real customers, carriers, testimonials or metrics, and none may be fabricated as real.

## Product Principles

- **Dense lists are the workplace.** Scanning and acting in place beat drilling into pages.
- **Synced data is visibly read-only.** Changes route through a Service Request rather than pretending to edit the AMS.
- **One vocabulary everywhere.** The UI, stories and code use `GLOSSARY.md` terms.
- **Every state is designed.** Empty, loading, error, no permission and overflow are part of each feature, not afterthoughts.

## Accessibility & Inclusion

WCAG 2.2 AA. Form-control borders, placeholder text and warning text use the contrast-corrected tokens in `spec/ia/rules.md`. Every action is reachable by keyboard, including the ⌘K command palette.
