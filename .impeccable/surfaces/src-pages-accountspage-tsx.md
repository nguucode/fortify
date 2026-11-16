---
version: 1
slug: "src-pages-accountspage-tsx"
primary_target: "src/pages/AccountsPage.tsx"
related_targets: ["src/App.tsx","src/components/shell/Sidebar.tsx","src/components/shell/TopBar.tsx"]
---

# Surface: Fortify app shell + Accounts list

Mode: Operate. Build path: code-led (Operate surfaces are always code-led; no image generation in this harness).

Scope: the shell stories US-FND-001, 002, 005, 007, 015, 016, 017 and the Accounts list US-ACC-001 at /accounts. The audience is agency Producers, Account Managers, Principals and Admins working a dense book. The job is to find an Account and its next date, then act.

Constraints: spec/ is the source of truth. Use the pinned Cloudflare-grammar tokens from IMPECCABLE-PROMPT.md Part B, amended by spec/ia/rules.md for accessibility. There is no brand hue.

## Direction contract

THESIS: A working CRM shell that reads like a calm infrastructure console. Every Account row answers "when is the next thing due?" without opening it. It refuses the category default of a card grid with colored stage pills and an oversized KPI hero.

OWN-WORLD: The canvas is oklch(98.75% 0 0), and the working surfaces are white with 1px ring edges (oklch(14.5% 0 0 / .1)). There are no borders, gradients or shadows beyond the two ring and elevation recipes. Inter Variable sets everything at a 14px base with -0.16px tracking, using weights 400, 500 and 600. Action blue oklch(57.72% .2324 260) appears only on the primary button, focus, links, selection and the Term ribbon ticks. The user confirmed the same hue as the brand color; it fills only the "F" logomark. Status shows as a dot or icon plus a 13px label. Controls are 36px with an 8px radius, and table rows are 40px.

STORY: A Producer lands on Accounts, sees their Book with the saved views All, Prospects, Clients, Former clients, Households and Businesses, scans the Term ribbon for renewals and X-dates coming up, filters, sorts, and opens an Account. Demo controls let a presenter show the loading, error and empty states on demand.

FIRST VIEWPORT: There is a top bar 58px high. From left to right it holds the Fortify wordmark (a blue "F" logomark with neutral text), the office control, the Sample data badge and a search entry with a ⌘K hint, matching the US-FND-002 order. On the right sit notifications, then View as and Demo controls grouped under a muted "Demo" label, then the avatar. On the left is a grouped sidebar 232px wide that collapses to a 56px rail. The content has a 32px gutter. The H1 "Accounts" is 30/600, with a muted 14px line under it. Saved view tabs sit above a toolbar that holds search, Filters and Export, with "+ New account" as the primary button at the right. Display options and the checkbox column ship with US-FND-019 (P1). Below is a 40px-row table: Account (name, kind, and a muted token of Contact, followed by "· Office" for agency-scope roles). US-ACC-001 lists Office as a column. It is dropped deliberately: Office is constant in Own and Office scope, and as a column it pushed the agency view past 1440 and truncated people names. Agency roles read it from the token and filter by it, Status, Producer, Account Manager, Active policies, Annual premium, Next expiration, the Term ribbon with a month axis, and Last activity. A pagination footer with rows-per-page closes the table. Responsive mobile layout ships with US-FND-011; this pass gives mobile a read-only rendition.

FORM: Pinned by the brief (Cloudflare dashboard grammar, user-chosen). This is position 1 of 1. new-work.md says a user- or brief-pinned direction beats the roll, so concept-seed was deliberately not run. seed: 093425e7f94bf8c264392efe03820b2a (concept-seed roll recorded 2026-11-16; dealt structures not adopted because the user-pinned brief governs). The signature move is the Term ribbon: a 12-month micro-timeline in each Account row, with blue ticks for Term expirations (Renewals), hollow ticks for X-dates and a "today" hairline. It is drawn from data at runtime, with a hover tooltip and an accessible text summary.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
