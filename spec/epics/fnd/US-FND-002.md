---
id: US-FND-002
title: Top bar with office, global search entry, and avatar
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/today]
dependsOn: [US-FND-001]
---

## Story

As any Fortify user, I want a top bar that shows which Office I am working in, gives me one place to search, and holds my account menu, so that I always know my context and can jump anywhere.

## Acceptance criteria

- Given the shell, when any route renders, then the top bar shows, left to right: the Fortify wordmark, the Office control, the Sample data badge (US-FND-009), the search field, Notifications, View as, Demo controls, and the avatar, matching the `topBar` order in `sitemap.yaml`.
- Given I am a Producer or Account Manager, when I look at the Office control, then it is a static label with my Office (for example "Houston TX").
- Given I am a Principal or Admin, when I open the Office control, then I can choose All offices, Houston TX, San Antonio TX, or Tampa FL, and list pages that support an Office filter apply it; the choice persists for the session.
- Given I click the search field or press ⌘K (Ctrl+K on Windows), then the command palette opens (US-FND-003); the field itself never accepts typing.
- Given I open the avatar menu, then it shows my name, role, and Office, plus "Keyboard shortcuts" (US-FND-010) and "Sign out"; Sign out shows a toast "Sign-out is disabled in the demo".

## UI states

- Empty: not applicable.
- Loading: the top bar renders from the in-memory user before any API call; the notification count appears when its request resolves.
- Error: if the notification count request fails, the bell shows no count, never an error in the bar.
- No permission: the Office control is read-only for Producer and Account Manager, with tooltip "Your Office is set by an Admin."
- Overflow: a long user name in the avatar menu truncates at 220px with a full-name tooltip; below 1024px the search field collapses to an icon button.

## Design notes

- 58px tall, canvas color, 1px bottom line in `--line`.
- Search field 12px radius, white, ring, leading search icon, placeholder "Search accounts, policies, people", trailing `⌘K` hint in a fill-colored kbd chip.
- Office control: 32px ghost button with a building icon and chevron (Principal/Admin) or plain 13/500 text.
- Avatar 28px circle with initials on fill; menu is a Radix DropdownMenu with the popover shadow.
- View as and Demo controls are visually grouped with a 1px divider and a muted "Demo" label so they read as presenter tools, not product features.

## FE notes

- `src/shell/TopBar.tsx`; reads `currentUser` and `officeFilter` from the session store in US-FND-005.
- `officeFilter: 'all' | officeId` lives in the session store; list queries (US-FND-007) include it when the role scope is Agency.
- Global keydown listener for `mod+k` registered once in the shell (shared with US-FND-010).

## Mock data

- Users with each role in each Office; one user with a 40-character name ("Alexandria Montgomery-Vasquez Whitfield") to test truncation.
