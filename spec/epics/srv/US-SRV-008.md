---
id: US-SRV-008
title: Certificate request form
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P1
status: Draft
size: S
routes: [/service, /accounts/:id]
dependsOn: [US-SRV-005]
---

## Story

As an Account Manager, I want to capture a Business's certificate request with the holder and the wording it needs, so that the Certificates queue gets a complete request and anything with additional insured or waiver wording goes to review before issuance.

## Acceptance criteria

- Given a Household Account, when step 1 of the sheet shows, then Certificate request is disabled with the tooltip "Certificates are for Business Accounts. Use ID card / evidence for a Household."
- Given a Business Account, when the details section shows, then Holder is a select of the Account's existing Holders plus "New holder", which reveals Name, Address line 1, City, State, ZIP, and Email.
- Given the form, when the user fills it, then they choose one or more of the Account's Active policies to include (at least one), tick any of Additional insured, Waiver of subrogation, and Primary & noncontributory, enter Description of operations (up to 500 characters, placeholder "Re: Job #2291, 4100 Westheimer Rd, Houston TX 77027"), set Needed by (default today), and choose Delivery (Email to holder, Email to Account contact).
- Given any of Additional insured, Waiver of subrogation, or Primary & noncontributory is ticked, when the box changes, then a callout reads "Needs review: a Principal approves additional insured, waiver, or primary & noncontributory wording before the certificate is issued."
- Given the user submits, when the request is created, then a linked Certificate is created in status Requested, or Needs review when any of the three boxes is ticked, and the request's Linked records shows it; issuance, approval, Holder creation, and re-issue are handled by the CRT Epic.
- Given the linked Certificate is later Issued, when CRT emits the event, then this request moves to Done automatically (US-SRV-004).

## UI states

- Empty: a Business with no Holders shows the Holder select with only "New holder" and the hint "No holders yet for Torres Roofing LLC."; a Business with no Active policies blocks submit with "This Business has no active policies to include."
- Loading: Holder select and policy list show skeleton rows.
- Error: "Choose at least one policy."; "Enter a valid email." on the new holder; ZIP must be 5 digits.
- No permission: Producers can create the request (Certificate creation by the store is a system action); Admin cannot open the sheet. Issuing is not offered anywhere in this form.
- Overflow: Holder names truncate in the select with a tooltip; Accounts with more than 25 Holders get a searchable select.

## Design notes

- Policies as a checkbox list: "KCC-GL-0019387 · General liability · Keystone Commercial Casualty · exp. 06/01/2027".
- The three wording boxes sit together under a 13px label "Holder wording"; the Needs review callout uses the warning icon and text, not a filled background block.
- Details view on the request page: Holder block, Policies list, wording flags as text ("Additional insured · Waiver of subrogation"), Description of operations in a recessed well.

## FE notes

- Registers `serviceTypeRegistry['Certificate request']`; `canClose` returns false with "Closes when the certificate is issued." until the Certificate is Issued.
- On create, the store calls `certificates.createFromRequest(serviceRequestId, { holder, policyIds, wording, descriptionOfOperations, neededBy, delivery })`, an action owned by CRT; SRV only passes the captured values and links `certificateId`.
- New holder values ride on the request; CRT decides whether to create a Holder at issuance.

## Mock data

- Torres Roofing LLC: GL, commercial auto, WC, and umbrella Active; 3 Holders ("Westheimer Commons Development LLC", "City of Houston Public Works", "Brazos Builders Inc.").
- A Business with no Holders and one with 30 Holders.
- SR-10495 linked to CERT-0412 in Needs review (Additional insured + Waiver of subrogation).
