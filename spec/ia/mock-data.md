# Mock data

All data is fictional and every screen shows a **Sample data** badge.

## Scale

| Entity | Count |
|---|---|
| Users | 25 |
| Offices | 3: Houston TX, San Antonio TX, Tampa FL |
| Accounts | 600: 480 Households, 120 Businesses |
| Contacts | about 1,400 |
| Policies / Terms | about 1,500 / 3,500 |
| Leads | 180 |
| Opportunities | 220 |
| Quotes | 450 |
| X-dates | 250 |
| Open Renewals | about 150 |
| Service Requests | 300 |
| Certificates | 80 |
| Claims | 40 |
| Activities | about 5,000 |
| Tasks | 600 |

## Generation

- **Generator:** `@faker-js/faker` with a fixed seed. Its JSON output is committed to `src/mock/data/`.
- **Dates:** stored as day offsets from today and resolved when the app loads, so the demo never goes stale.
- **Hand-made edge cases:**
  - The Torres family: the "Torres Household" linked to "Torres Roofing LLC" through Mike Torres.
  - Very long names.
  - An Account with no Contact.
  - A Business with 12 Locations.
  - A Renewal with a +38% premium increase.

## Distribution

- **States:** TX 60%, FL 40%. About 20% of Accounts are coastal: FL ones carry a hurricane deductible and a wind mitigation date; TX ones sit in the windstorm-pool area and have a WPI-8 number.
- **Personal lines:** auto 45%, home 35%, umbrella 8%; the rest are renters, condo, flood, and boat.
- **Commercial lines:** BOP, GL, WC, and commercial auto. Some TX employers are WC non-subscribers.
- **Carriers:** about 10, all fictional.
  - Some write personal lines only, some write commercial lines only, and some are appointed in one state only.
  - One fictional FL insurer of last resort.
  - One fictional TX windstorm pool.

## Personal data

- Diverse US names.
- Real ZIP codes and cities, with fake street addresses.
- Phone numbers in the (555) 010-xxxx range.
- Emails at `@example.com`.
- Policy numbers follow a per-carrier format.

## Mock API and Demo controls

- **Store:** an in-memory store that supports mutations (Qualify, Won, Service Request, and so on). Reloading the page resets it.
- **Latency:** every call takes 200 to 600ms, so loading states are visible.
- **Demo controls** sit in the top bar next to View as. They:
  - toggle latency,
  - force an error on the current route,
  - simulate empty data.

  This makes every required UI state demonstrable.

## Shared seed list

This list is canonical. Names that appear in story text are examples only; when they differ, this list wins.

- **View as users (US-FND-004):**
  - Dana Whitfield, Producer, Houston
  - Marisol Reyes, Account Manager, Houston
  - Grant Holloway, Principal, agency-wide
  - Priya Nair, Admin
- **Role mix (25 users):** 1 Admin, 2 Principals, 10 Producers, 12 Account Managers.
- **Carriers (fictional):**
  - Lone Star Mutual: TX only; personal and commercial lines.
  - Gulf Harbor Insurance: FL and TX; personal lines.
  - Keystone Commercial Casualty: commercial lines only.
  - Gulfstream Indemnity: FL only; home.
  - Pecan Valley Auto: TX only; auto.
  - Bayfront Specialty: E&S, via wholesaler.
  - Meridian National: TX and FL; personal and commercial lines.
  - Copperline Workers Comp: WC only.
  - Sunshine State Residual (FL insurer of last resort): home.
  - Texas Coastal Windstorm Pool (TX windstorm pool): wind and hail.
- **ID formats:** SR-10495 (Service Request), CERT-0412 (Certificate).
- **Showcase Account:** Torres Roofing LLC has 3 Holders and 6 Certificates. 7 Certificates agency-wide are in Needs review.
