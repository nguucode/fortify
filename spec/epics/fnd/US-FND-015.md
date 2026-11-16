---
id: US-FND-015
title: Toasts and confirmation dialogs
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/leads, /tasks]
dependsOn: [US-FND-001]
---

## Story

As a Producer marking an Opportunity Lost or Disqualifying a Lead, I want a clear confirmation before status changes that are hard to reverse and a short confirmation after every change, so that I trust what Fortify did and can undo a slip.

## Acceptance criteria

- Given a successful mutation, then a toast appears bottom-right for 4 seconds with a one-line message ("Task marked done") and closes on Esc or its close button; it pauses while hovered or focused.
- Given a reversible mutation (Mark Task done, Mark notification read), then the toast offers "Undo" for 5 seconds, and Undo restores the previous state in the store; an Activity the change logs (Task completed) is written only after the Undo window closes.
- Given an action that ends a lifecycle (Disqualify Lead, Mark Lost, Cancel Task, Non-renew), then a confirmation dialog names the record and the consequence ("Disqualify Lead Jordan Pham? It leaves the intake list. You can’t undo this.") and, where the lifecycle needs one, requires a reason from a select before the confirm button enables.
- Given a failed mutation, then an error toast stays until dismissed, with "Try again" when the action can be retried.
- Given several toasts, then at most 3 stack, newest on top.

## UI states

- Empty: not applicable.
- Loading: the confirm button shows "Disqualifying…" while the mutation runs; the dialog cannot be closed until it resolves.
- Error: the dialog stays open with an inline error if the mutation fails.
- No permission: actions the role cannot take never open the dialog; they are disabled at the trigger (US-FND-018).
- Overflow: toast text clamps to 2 lines; record names in dialogs wrap.

## Design notes

- Toast: 360px, base surface, ring, popover shadow, 8px radius, status icon (success, danger) plus 14 text; no colored background.
- Confirmation dialog: Radix AlertDialog, 440px; title 16/500, body 14, footer with secondary Cancel (focused by default) and the confirm button; the confirm button is danger-styled only for Disqualify, Lost, Cancel, and Non-renew.

## FE notes

- `src/patterns/toast.ts` exposes `toast.success(msg, { undo })` and `toast.error(msg, { retry })` on top of Radix Toast; region `aria-live="polite"`, errors `assertive`.
- `src/patterns/ConfirmDialog.tsx` with `{ title, body, confirmLabel, tone, reasonOptions? }`.
- Undo calls the inverse store mutation; there is no hard delete anywhere, matching `spec/ia/roles.md`.

## Mock data

- Disqualification reasons (Not interested, Unreachable, Out of appetite, Duplicate, Other) and Lost reasons (Price, Coverage, Went with another agency, No decision, Other), seeded as defaults that Admins edit in Settings > Pipeline stages.
