---
id: US-LEA-010
title: Import a purchased lead list
epic: LEA
roles: [Principal, Admin]
priority: P2
status: Done
size: M
routes: [/leads]
dependsOn: [US-FND-005, US-LEA-001, US-LEA-002]
---

## Story

As a Principal who bought a list of homeowners, I want to import it as Leads with duplicates flagged before anything is saved, so that Producers can work it without calling our own Clients.

## Acceptance criteria

- Given I click "Import" on /leads, when the dialog opens, then I name the list and vendor (for example "Q4 Homeowners TX", "Acme Data Co."), choose the Office the Leads belong to, choose a CSV file up to 2,000 rows, and see the required columns: first_name, last_name, phone or email, zip, line.
- Given the file is parsed, when I reach "Map columns", then each CSV header is matched to a Lead field automatically by name, unmatched headers can be mapped or ignored, and a preview shows the first 20 rows.
- Given the mapping is set, when I reach "Review", then rows are counted as Ready, Invalid (for example "Row 14: phone has 9 digits"), and Possible duplicate (matching an Account, Contact, or open Lead by phone or email), for example "1,204 ready · 37 invalid · 81 possible duplicates".
- Given I choose an assignment, when I confirm, then Ready rows become New Leads with Source "Purchased list" and the list name as Source detail, either Unassigned or split evenly across selected Producers; Invalid rows are skipped; Possible duplicates are skipped unless I tick "Import possible duplicates too".
- Given the import completes, when the dialog closes, then a toast reads "1,204 leads imported from Q4 Homeowners TX" and the list is filtered to that source detail.

## UI states

- Empty: a file with headers only: "This file has no rows."
- Loading: parsing shows "Reading 1,322 rows…"; import shows a determinate progress bar.
- Error: not a CSV or over 2,000 rows: "Use a .csv file with up to 2,000 rows." Import failure: nothing is saved.
- No permission: Import is hidden for Producers and Account Managers.
- Overflow: the Invalid and Possible duplicate groups expand into scrollable tables with row number, name, and reason; "Download skipped rows" exports them as CSV.

## Design notes

- Dialog, 800px, three steps: "Upload", "Map columns", "Review". Mapping is a two-column table (CSV header, Fortify field select). Review counts are three 13px label + 24px value tiles.
- Note under the upload: "Only import lists you have permission to contact. Fortify does not check do-not-call registries." (demo honesty, no fake compliance).

## FE notes

- Parse in the browser; no upload leaves the client. Reuse the Lead validation schema from US-LEA-002 and `findMatches` from US-LEA-006.
- Store action `importLeads(rows, { listName, vendor, officeId, assigneeIds })`; assignees are limited to Producers and Principals who can work Leads in that Office, one transaction.
- Ship `public/mock/purchased-list-sample.csv` (60 rows: 50 valid, 4 invalid, 6 matching existing Accounts or Leads) so the demo works without a real file.

## Mock data

- The sample CSV above; existing Accounts and Leads that 6 sample rows match by phone or email.
