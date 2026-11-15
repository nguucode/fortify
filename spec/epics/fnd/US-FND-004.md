---
id: US-FND-004
title: View as role switcher (demo)
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Draft
size: S
routes: [/today]
dependsOn: [US-FND-002, US-FND-005]
---

## Story

As the person demoing Fortify, I want to switch the mock user to a Producer, an Account Manager, a Principal, or an Admin, so that I can show how scope and permissions change without signing in and out.

## Acceptance criteria

- Given I open View as, then I see four presets, one per role, each with a name, role, and Office: Dana Whitfield (Producer, Houston TX), Marisol Reyes (Account Manager, Houston TX), Grant Holloway (Principal, all offices), and Priya Nair (Admin, all offices), matching the canonical seed list in `spec/ia/mock-data.md`, with the current one checked.
- Given I pick a preset, then the sidebar, Today, lists, permissions, and the avatar update within one render, and a toast says "Viewing as Marisol Reyes · Account Manager".
- Given I am on a record that is out of scope for the new user, when I switch, then that route renders the access-denied page (US-FND-006) instead of the record.
- Given I am on `/settings/users` and switch to a Producer, then the route renders access-denied, because Settings is hidden for that role.
- Given I switch, then unsaved form input is guarded first (US-FND-014); my store mutations are kept, because only the user changes, not the data.

## UI states

- Empty: not applicable.
- Loading: none; the switch is synchronous.
- Error: not applicable.
- No permission: View as is a demo control visible to every role.
- Overflow: preset names truncate at 200px.

## Design notes

- 32px ghost button with an eye icon and the label "View as · Producer" so the active role is always visible during a demo.
- Radix DropdownMenu with radio items; each item has a 24px avatar, 14/500 name, and a 13 muted line "Producer · Houston TX".
- Grouped with Demo controls behind the muted "Demo" divider in the top bar.

## FE notes

- `src/shell/ViewAs.tsx`; sets `currentUserId` in the session store (US-FND-005). Permission checks (US-FND-018) and list scopes read the current user, so nothing else subscribes to View as directly.
- Persist the chosen preset in `sessionStorage` (`fortify.viewAs`) so a refresh mid-demo keeps the role, even though the data resets.

## Mock data

- The four preset users must exist in `users.json` with Books that make each scope visible: Dana's Book holds the Torres Household and Torres Roofing LLC; Marisol's Office (Houston TX) has at least 150 Accounts.
