---
id: US-FND-006
title: Access-denied and not-found pages
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/403, /404]
dependsOn: [US-FND-001, US-FND-004]
---

## Story

As a Producer who follows a link to an Account outside my Book, I want a clear page that says who owns it and lets me ask for access, so that I am not stuck on a blank screen or a generic error.

## Acceptance criteria

- Given I open a record outside my scope, such as `/accounts/A-10423`, then the page renders access-denied in place (the URL is unchanged) with the title "You don’t have access to this Account" and the line "It’s in Rafael Ortiz’s Book, San Antonio TX office."
- Given the access-denied page, when I click "Request access", then the button becomes "Request sent" (disabled) and a toast says "We let Rafael Ortiz know (demo)."
- Given I open a route hidden for my role, such as `/settings/users` as a Producer, then access-denied renders without an owner line and without Request access, with "Settings are available to Principals and Admins."
- Given I open an unknown route or a record id that does not exist, then the not-found page renders in place with "We couldn’t find that page" and a link "Go to Today".
- Given I open `/403` or `/404` directly, then the same pages render, so other screens can link to them.

## UI states

- Empty: not applicable.
- Loading: a record route shows its loading state until the API answers 403 or 404; then the page swaps in.
- Error: other API errors use the shared error state (US-FND-016), not these pages.
- No permission: this story is the No-permission page for records and hidden routes.
- Overflow: owner names longer than 40 characters wrap to a second line.

## Design notes

- Inside the shell (sidebar and top bar stay), content left-aligned at the page-header position: a 40px muted lock icon (or a compass icon for not found), the page title 30/600, a 14 muted line, then actions.
- Request access is the primary button; "Back" is a secondary outline button.
- No illustration, no error code shown to the user except a mono "403" or "404" in 12px muted text.

## FE notes

- `src/shell/AccessDenied.tsx` and `NotFound.tsx`; record routes render them when `useQuery` returns `status: 'forbidden' | 'not_found'`.
- The mock API returns `{ status: 403, owner: { name, office } }` for out-of-scope records; hidden routes are guarded by a `RequireRole` route wrapper fed by `sitemap.yaml` `visibleTo`.
- Router catch-all `*` renders `NotFound`.

## Mock data

- An Account in another Producer's Book in another Office; a nonexistent id `A-99999`; an owner with a long name.
