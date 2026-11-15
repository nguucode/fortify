---
id: US-SET-011
title: Integrations page (mock)
epic: SET
roles: [Admin, Principal]
priority: P2
status: Draft
size: S
routes: [/settings/integrations]
dependsOn: [US-SET-001]
---

## Story

As an Admin, I want to see which outside systems Fortify is connected to and connect or disconnect them, so that the demo shows how Fortify sits beside the AMS, email, and phone without pretending to call real services.

## Acceptance criteria

- Given I open `/settings/integrations`, when it loads, then cards show AMS, Email, SMS, Phone system, Calendar, E-signature, and Comparative rater, each with a generic name (no real vendor brands), a one-line purpose, and a status (Connected, Not connected, Error).
- Given the AMS card, when it renders, then it is always Connected, shows "Last sync 6 min ago", links "View data sync" to `/settings/data-sync`, and has no Disconnect action, with the note "Fortify needs the AMS to show policies."
- Given I am an Admin and click "Connect" on a Not connected card, when the mock dialog confirms "Connect Comparative rater? This is simulated.", then after a 1-second progress state the card shows Connected with today's date.
- Given I click "Disconnect" on a Connected card (not AMS), when I confirm, then it shows Not connected and a muted line names what stops working ("SMS sending will be disabled in Inbox").
- Given a card in Error (seed: Phone system), when it renders, then it shows the reason "Authorization expired on 11/02/2026" and a "Reconnect" action.
- Given the page, when any role views it, then a banner reads "Integrations are simulated in this demo. No data leaves your browser."

## UI states

- Empty: not applicable; the card set is fixed.
- Loading: 7 card skeletons in the grid.
- Error: page error panel "Integrations couldn't load." with "Try again"; a failed mock connect shows the card in Error with "Try again".
- No permission: Principal sees statuses with Connect, Disconnect, and Reconnect disabled and the tooltip "Only Admins can change Settings."; Producer and Account Manager get `/403`.
- Overflow: card text wraps to 2 lines then truncates with tooltip.

## Design notes

- Responsive grid of white cards (ring, 8px radius, resting shadow), 3 columns at 1280px, 1 column on mobile. Card: neutral icon, name (16/500), purpose (14 muted), status dot plus label, one small outline action at the bottom right.
- No vendor logos; icons are generic line icons.

## FE notes

- Store slice `integrations`: `id`, `kind`, `status`, `connectedAt`, `errorReason`; action `setIntegrationStatus(id, status)` with a fake 1,000ms delay on top of mock latency.
- INB can read `selectIntegration('sms').status` to disable SMS sending when disconnected.

## Mock data

- AMS Connected, Email Connected, SMS Connected, Calendar Connected, Phone system Error, E-signature Not connected, Comparative rater Not connected.
