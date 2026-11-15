---
id: US-SET-001
title: Settings layout, navigation, and access
epic: SET
roles: [Admin, Principal, Producer, Account Manager]
priority: P1
status: Draft
size: S
routes: [/settings, /settings/users, /403]
dependsOn: [US-FND-001, US-FND-004, US-FND-006]
---

## Story

As an Admin, I want one Settings area with a section nav for every Settings page, editable by me and read-only for Principals, so that agency configuration lives in one predictable place and nobody else can change it.

## Acceptance criteria

- Given I am an Admin or a Principal, when I click Settings in the sidebar footer, then `/settings` redirects to `/settings/users` and a section nav lists, in groups: Organization (Users, Offices, Roles), Workflow (Pipeline stages, Templates), Market (Carriers & appointments, Licenses), System (Integrations, Data sync).
- Given I am a Producer or an Account Manager, when the sidebar renders, then Settings is not shown; when I open any `/settings` URL directly, then I see the access-denied page (`/403`) reading "Settings are limited to Admins and Principals." with "Back to Today".
- Given I am a Principal, when any Settings page renders, then the page header shows a "Read only" badge and every create, edit, or toggle control is disabled with the tooltip "Only Admins can change Settings."
- Given I am an Admin and a page has unsaved edits, when I click another section in the nav, then a dialog asks "Discard unsaved changes?" with "Keep editing" and "Discard".
- Given I switch role with View as (US-FND-004) while on a Settings page, when the new role is Producer or Account Manager, then I land on `/403`; when it is Principal, the page re-renders read-only.
- Given Carriers & appointments and Licenses, when they appear in the section nav, then each carries a muted "Read only" label for every role, since they are managed outside Fortify.

## UI states

- Empty: not applicable; the nav is static.
- Loading: the section nav renders immediately; the content area shows the page's own skeleton.
- Error: a forced error on a Settings page shows that page's error panel; the section nav stays usable.
- No permission: hidden nav item for Producer and Account Manager, `/403` on direct URL, read-only for Principal, as above.
- Overflow: at widths under 1024px the section nav collapses into a select at the top of the content ("Settings: Users").

## Design notes

- Settings content area: a 220px section nav on the left of the content (not a second sidebar rail), 8px-radius rows, group labels in 12px text-label uppercase-free sentence case; the active row uses the recessed fill and text-strong.
- Each Settings page follows the list-page header: H1 (for example "Users"), a one-line muted description, actions top-right.
- "Read only" badge: neutral pill next to the H1.

## FE notes

- Routes under a `SettingsLayout` with nested routes for the nine pages from `sitemap.yaml` `footer.settings.pages`; the section nav is generated from that list plus a local group map, so a new page in the sitemap shows up without code changes to the layout.
- Route guard `requireRole(['principal','admin'])` redirects to `/403`; `useCanEditSettings()` returns `role === 'admin'` and every page reads it.
- Unsaved-change guard through the router's blocker API, shared by all Settings forms.

## Mock data

- Users with each role for View as testing: at least 1 Admin, 2 Principals, 1 Producer, 1 Account Manager.
