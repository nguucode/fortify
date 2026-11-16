---
id: US-SRV-009
title: Claim report form (first notice of loss)
epic: SRV
roles: [Account Manager, Producer, Principal]
priority: P1
status: Done
size: M
routes: [/service, /accounts/:id]
dependsOn: [US-SRV-005, US-CLM-002]
---

## Story

As an Account Manager taking a first notice of loss call, I want a form that follows the matching ACORD loss notice, so that I capture what the carrier will ask for on the first call and the Claim starts tracking right away.

## Acceptance criteria

- Given type Claim report, when the details section shows, then Loss type comes first with four options that name their form: Property (ACORD 1), Auto (ACORD 2), Liability (ACORD 3), Workers' compensation (ACORD 4); the Policy select then shows only policies of matching lines, including expired and canceled Terms.
- Given any Loss type, when the user fills the shared fields, then Date of loss is required and cannot be in the future, Time of loss is optional, Reported by is a Contact on the Account or "Someone else" (name and phone), Loss location defaults to the policy's garaging address or insured location, Description is required (at least 20 characters), and Police or fire report #, Injuries (Yes, No, Unknown), and Estimated amount are optional.
- Given Loss type Auto, then the form adds Vehicle and Driver (pickers from the Policy's Insured items, plus "Driver not listed"), Other party (name, phone, their carrier), and Vehicle drivable (Yes, No); Property adds the property or location and Cause (Wind, Hail, Water, Fire, Theft, Hurricane, Sinkhole, Other); Liability adds Claimant name and phone and Damage type (Bodily injury, Property damage); Workers' compensation adds Employee name, Job title, Body part injured, Treatment (None, First aid, Clinic, Emergency room, Hospitalized), and Lost time (Yes, No).
- Given the Date of loss falls outside the selected Term, when the user leaves the field, then a warning (not a block) reads "Date of loss 02/10/2026 is outside the selected term (03/01/2026 – 03/01/2027). Check which policy was in force."
- Given Florida rules, when Cause is Hurricane, then the form shows the Term's hurricane deductible read-only ("Hurricane deductible: 2% of dwelling = $8,400"); when Cause is Sinkhole and Date of loss is more than 2 years ago, a warning reads "Florida sinkhole claims must be reported within 2 years of discovery."
- Given a Texas Business marked as a WC non-subscriber, when Loss type shows, then Workers' compensation is disabled with "Alamo Heights Bakery LLC is a Texas WC non-subscriber."
- Given the user submits, when the request is created, then a linked Claim is created in status Reported with the captured loss details, the request's Linked records shows "Claim CL-2042 · Reported", and the toast offers "Open claim" to `/claims/CL-2042`.

## UI states

- Empty: an Account with no policy of the chosen line shows "No auto policies on this Account. Pick another loss type or check the Account." and blocks submit.
- Loading: Insured item pickers show skeleton rows while the Term loads.
- Error: "Date of loss can't be in the future."; "Describe what happened (at least 20 characters)."; save failures follow US-SRV-005 and no Claim is created when the request fails.
- No permission: Admin cannot open the sheet. Insured items and Term values are read-only.
- Overflow: Description up to 4,000 characters with a counter after 3,500; a Business with 12 Locations gets a searchable location picker.

## Design notes

- Loss type as 4 radio cards in a 2×2 grid, each with the form name in muted 12px text ("ACORD 2").
- Shared fields, then a divider and the type-specific group under a 16/500 title ("Auto details"). Warnings render inline under their field with the warning icon and warning text color.
- The Details view on the request page shows the loss summary and links to the Claim, which holds the authoritative copy of these details (US-CLM-002).

## FE notes

- Registers `serviceTypeRegistry['Claim report']`; `canClose` requires the linked Claim's status to be Submitted to carrier or later, or Closed (withdrawn).
- On create, the store creates the request and calls `claims.createFromReport(serviceRequestId, lossDetails)`, an action owned by CLM (see US-CLM-002 for the Claim entity); both happen in one store transaction so a failure creates neither.
- Line matching per Loss type lives in `claimReportRules.ts` (Auto: personal and commercial auto; Property: home, condo, renters, dwelling, BOP property, flood; Liability: GL, BOP, umbrella; WC: workers' compensation).
- Stored shape: `details: { lossType, acordForm, dateOfLoss, timeOfLoss, reportedBy, lossLocation, description, reportNumber, injuries, estimatedAmount, typeFields }`.

## Mock data

- Okafor Household (FL, coastal home GSI-HO3-882104, 2% hurricane deductible on $420,000 dwelling) for the hurricane scenario.
- Torres Household auto LSM-PA-4471029 with an expired prior Term (03/01/2025 – 03/01/2026) for the outside-term warning.
- Alamo Heights Bakery LLC (San Antonio, TX WC non-subscriber).
- Patel Household with no auto policy for the empty scenario.
