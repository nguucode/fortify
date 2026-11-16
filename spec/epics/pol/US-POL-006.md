---
id: US-POL-006
title: Rewrite links between replaced and replacing Policies
epic: POL
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: S
routes: [/policies, /policies/:id]
dependsOn: [US-POL-002, US-POL-005]
---

## Story

As a Principal, I want a Rewritten Policy to point to the Policy that replaced it, and the new one to point back, so that retention is traced across Carriers without double counting.

## Acceptance criteria

- Given a Policy whose last Term is Rewritten, then the Policy page shows a neutral banner "Replaced by MRN-HO-0098312 · Meridian National · effective 04/01/2026" linking to the new Policy.
- Given the replacing Policy, then its header shows "Replaces GHI-HO-7710245 · Gulf Harbor Insurance" linking back.
- Given the Terms tab of the replaced Policy, then the Rewritten Term's Source column reads "Rewritten to MRN-HO-0098312".
- Given the Policies list, then the Expired, Canceled, and Active views never show a Rewritten Policy as Active, and a "Replaced" muted token appears under the policy number of Rewritten rows.
- Given a chain of two Rewrites, then each Policy links only one step back and one step forward.

## UI states

- Empty: Policies with no Rewrite show nothing extra.
- Loading: the banner renders with the header skeleton.
- Error: if the linked Policy is missing, the banner reads "Replaced by a policy that hasn't synced yet."
- No permission: none extra; both Policies belong to the same Account, so the page scope check covers the link.
- Overflow: long Carrier names truncate in the banner with a tooltip.

## Design notes

- Neutral banner (recessed surface, ring, info icon), not warning: a Rewrite is a normal outcome.

## FE notes

- Fields `policy.replacedByPolicyId` and `policy.replacesPolicyId`; `RewriteBanner` component in `PolicyHeader`.

## Mock data

- At least 6 Rewrite pairs, one chain of two (FL home moved from the fictional FL carrier of last resort to a private Carrier and back). Both Policies of a pair always sit on the same Account.
