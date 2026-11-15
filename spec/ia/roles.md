# Roles and permissions

Fortify has four fixed roles: Producer, Account Manager, Principal (the UI label for the Principal / Sales Manager role), and Admin. Settings shows this matrix read-only. In the demo, **View as** in the top bar switches the mock user so every role can be shown.

## Scope

| Role | Sees |
|---|---|
| Producer | **Own**: their Book (Accounts where they are the Producer or the Account Manager), and Leads assigned to them |
| Account Manager | **Office**: every Account in their Office, so CSRs can cover for each other |
| Principal | **Agency**: everything |
| Admin | **Agency**: everything, plus Settings |

## Matrix

Legend: C = create, E = edit, R = read, — = hidden. Every permission applies only within the role's scope.

| Object | Producer | Account Manager | Principal | Admin |
|---|---|---|---|---|
| Lead | C E (own) | C (inbound, assign to a producer) | C E, assign leads | C E |
| Account, Contact, X-date | C E | C E | C E | C E |
| Opportunity, Quote | C E | R; C Cross-sell; C E Remarket and its Quotes | C E | R |
| Renewal | R, E when remarketing | C E | C E | R |
| Service Request | C, E own | C E | C E | R |
| Certificate | R | C (holder-only) | C, approve AI, waiver, and P&NC | R |
| Activity, Task | C E | C E | C E | C E |
| Policy, Term, Insured item, Additional interest (synced from AMS) | R | R | R | R |
| Claim (agency tracking record) | R | C E | C E | R |
| Holder | R | C E | C E | R |
| Reports | Own | Office service | All | All |
| Settings | — | — | R | C E |

## Rules

- **Commission:** a Producer sees only their own commission and split. An Account Manager sees none. Principal and Admin see all. Where a user has no access, commission fields are hidden entirely, not masked.
- **Reassignment:** only Principal and Admin can change an Account's Producer or Account Manager, or move a whole Book in bulk. Every change logs an Activity. A Producer can hand off only their own Leads.
- **No hard delete.**
  - Leads are Disqualified.
  - Accounts are Archived or Merged, by Admin only.
  - Tasks are Canceled.
  - Activities cannot be deleted. A note can be edited for 24 hours.
- **No-permission UI:**
  - Hidden nav items.
  - Disabled actions, with a tooltip giving the reason.
  - An out-of-scope record shows an access-denied page that names the owner and offers "Request access" (mock).
  - Sensitive fields are hidden.

- **Claim:** the loss details lock once the Claim is created. Its tracking fields (carrier claim #, adjuster, status, outcome) can be edited within scope.
- **Remarket:** an Account Manager can create and edit a Remarket Opportunity and its Quotes. The Account's Producer stays the owner and keeps the commission.
