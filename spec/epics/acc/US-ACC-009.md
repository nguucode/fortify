---
id: US-ACC-009
title: Account Documents tab
epic: ACC
roles: [Producer, Account Manager, Principal, Admin]
priority: P1
status: Done
size: M
routes: [/accounts/:id]
dependsOn: [US-ACC-003, US-FND-005, US-FND-007]
---

## Story

As an Account Manager, I want every document for an Account in one tab, filterable by type and by the record it belongs to, with mock upload and preview, so that I can find the dec page or the signed proposal while the Contact is on the phone.

## Acceptance criteria

- Given I open the Documents tab, when it loads, then a table lists Name, Type, Linked to, Source, Added by, Added on, and Size, newest first.
- Given documents come from two sources, when they render, then Source reads "AMS" (dec pages, ID cards, policy forms; read-only) or "Uploaded" (added in Fortify), and AMS documents have no rename or remove action.
- Given I click "Upload", when I pick one or more files under 25 MB each, then I choose a Type (Application, Signed proposal, Loss run, Photo, Correspondence, Other) and optionally a linked record, and the documents appear at the top with a toast "2 documents added"; a System Activity "Uploaded 2 documents" is logged.
- Given I click a row, when the preview panel opens, then it shows the file name, metadata, and a placeholder page preview, with a "Download" button that saves the mock file.
- Given I filter by Type "Loss run" or by Linked to "Policy WC-2024-88190", when the filter applies, then only matching documents show and the meta line updates.
- Given an Uploaded document I added, when I open its row menu, then I can rename it or change its Type and linked record; there is no delete.

## UI states

- Empty: "No documents yet. Upload an application, loss run, or photo, or wait for policy documents to sync from the AMS." with an "Upload" button.
- Loading: 8 skeleton rows; uploads show a per-file progress row.
- Error: list error with Retry; a file over 25 MB is rejected with "inspection-photos.zip is larger than 25 MB."
- No permission: AMS rows show a disabled rename item with the tooltip "Synced from AMS. This document can't be changed in Fortify."; an Archived Account disables Upload.
- Overflow: long file names truncate in the middle ("Torres_Roofing_Loss_Runs_…_2026.pdf") with a full-name tooltip; 120 documents page at 50.
- Filtered: "No documents match these filters." with "Clear filters".

## Design notes

- Standard data table inside the tab with a small toolbar: search "Search documents", Type and Linked to filters, primary "Upload".
- File type icon (PDF, image, spreadsheet) before the name; Source as a muted text label with a sync icon for AMS.
- Preview as a 560px right-side panel, not a modal.

## FE notes

- `AccountDocumentsTab` on the FND `DataTable`; store `documents` entity with `{ id, accountId, name, type, source, linked, addedById, addedAt, sizeBytes }`.
- Upload keeps the `File` as an object URL in memory only (lost on reload, as the store is); action `addDocuments(accountId, files, meta)`.
- Download uses the object URL for uploads and a bundled placeholder PDF for AMS documents.

## Mock data

- About 6 documents per Client Account; Torres Roofing LLC has 31, including 3 loss runs and certificates.
- A Prospect with no documents; one file name over 80 characters.
