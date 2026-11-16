---
id: US-FND-016
title: Shared empty, loading, and error states
epic: FND
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/today, /accounts]
dependsOn: [US-FND-005]
---

## Story

As anyone using Fortify, I want empty, loading, and error states that look and behave the same everywhere, so that I always know whether data is coming, missing, or broken, and what to do next.

## Acceptance criteria

- Given a list or panel with no data, then the empty state shows a 24px muted icon, a 16/500 title ("No renewals in the window"), a 14 muted line explaining why, and the module's primary action when the role has it.
- Given a list with filters that return nothing, then the filtered empty state says "No renewals match these filters" with "Clear filters" instead of the create action.
- Given a request is pending, then lists show 10 skeleton rows at 40px, record pages show header and field skeletons, and panels show 3 skeleton lines; skeletons appear only if the wait exceeds 150ms.
- Given a request fails, then the error state shows "We couldn’t load renewals.", a muted line "Check your connection or try again.", a primary "Try again", and the reference id in mono ("ERR-7F3A").
- Given Demo controls force empty or error on the current route, then these exact components render, so every story's UI states are demonstrable.

## UI states

- Empty: this story defines it.
- Loading: this story defines it.
- Error: this story defines it.
- No permission: not applicable; access-denied is US-FND-006.
- Overflow: long module names in copy wrap; the state stays left-aligned in the content column.

## Design notes

- Left-aligned in the table container or panel, 48px top padding, no illustrations.
- Skeletons are recessed blocks with 4px radius and a 1.2s opacity pulse, disabled under reduced motion.

## FE notes

- `src/patterns/states/EmptyState.tsx`, `FilteredEmpty.tsx`, `Skeleton.tsx` (`rows`, `variant: table | record | panel`), and `ErrorState.tsx` (`onRetry`, `refId`).
- `useQuery` (US-FND-005) returns `status` so pages switch on one value: `loading | empty | error | forbidden | not_found | ready`.

## Mock data

- Driven by Demo controls; no extra entities.
