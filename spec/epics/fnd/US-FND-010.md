---
id: US-FND-010
title: Keyboard shortcuts and shortcut help
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/today, /accounts]
dependsOn: [US-FND-001, US-FND-003, US-FND-007]
---

## Story

As an Account Manager who works all day in Fortify, I want keyboard shortcuts for navigation and lists, so that I can move between modules and records without reaching for the mouse.

## Acceptance criteria

- Given any route, when I press `?`, then a dialog lists every shortcut grouped as General, Navigation, and Lists.
- Given the shortcuts: `⌘K` / `Ctrl+K` opens search; `g` then `t` Today, `g i` Inbox, `g a` Accounts, `g c` Contacts, `g l` Leads, `g p` Pipeline, `g o` Policies, `g r` Renewals, `g s` Service, `g k` Tasks; `[` pins or unpins the sidebar; in a list, `j`/`k` move the row focus, `Enter` opens, `x` selects, and `/` focuses the list search.
- Given focus is in a text input, textarea, select, or contenteditable, then single-key shortcuts do nothing; only `⌘K` and `Esc` work.
- Given the help dialog, when I turn off "Single-key shortcuts", then only modifier shortcuts remain active, and the choice persists (WCAG 2.1.4 Character Key Shortcuts).
- Given a `g` sequence target hidden for my role, then the shortcut does nothing and is not listed in help.

## UI states

- Empty: not applicable.
- Loading: not applicable.
- Error: not applicable.
- No permission: shortcuts for hidden routes are omitted.
- Overflow: the help dialog scrolls after 480px.

## Design notes

- Radix Dialog, 560px, two columns of rows: action 14 on the left, keys on the right as kbd chips (fill background, 12px mono, 4px radius).
- Avatar menu item "Keyboard shortcuts" opens the same dialog, showing `?` as its hint.

## FE notes

- `src/shell/shortcuts.ts`: one keydown listener on `document`, a 1s window for `g` sequences, and a registry so list pages register `j/k/x/Enter` while mounted.
- Navigation targets derive from `sitemap.yaml` ids so hidden items drop out automatically.
- Preference in `localStorage` key `fortify.shortcuts.singleKey`.

## Mock data

- None.
