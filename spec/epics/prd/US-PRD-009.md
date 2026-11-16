---
id: US-PRD-009
title: Glossary page with search and term links
epic: PRD
roles: [Producer, Account Manager, Principal, Admin]
priority: P0
status: Done
size: S
routes: [/product/glossary]
dependsOn: [US-PRD-001, US-PRD-002, US-FND-015]
---

## Story

As a designer writing copy for a Renewal screen, I want to search the glossary and see each term's definition and the words to avoid, so that the UI uses the agency's vocabulary exactly.

## Acceptance criteria

- Given `/product/glossary`, then `GLOSSARY.md` renders as terms grouped by its sections (Customers, Selling, Policies, Retention, Service, Work, Market, Systems), each term with its name, definition, and an "Avoid" line listing the avoid words.
- Given I type in search, then terms filter as I type on the term name, the definition, and the avoid words; typing "ticket" shows Service Request, because "ticket" is an avoid word for it.
- Given a term, then it has an anchor (`#service-request`) and a "Copy link" button that copies the full URL and shows the toast "Link copied".
- Given I open `/product/glossary#renewal`, then the page scrolls to Renewal and briefly highlights it (no highlight animation under reduced motion).
- Given a section nav on the left of the content, then it lists the 8 sections with term counts.

## UI states

- Empty: not applicable.
- Loading: none.
- Error: if parsing yields no terms, show "The glossary couldn’t be read." with the file path in mono.
- No permission: not applicable.
- Overflow: long definitions wrap; avoid lists wrap onto a second line.
- Filtered: "No terms match “claimz”." with "Clear search"; the meta line reads "Showing 3 of 41 terms".

## Design notes

- Each term is a row, not a card: name 14/600, definition 14 text-default, Avoid line 13 muted with the avoid words in text-label.
- Toolbar: 36px search with placeholder "Search terms and avoid words".

## FE notes

- `src/spec/glossary.ts` parses `## Section` and `**Term**:` blocks with their `_Avoid_:` line into `{ section, term, slug, definition, avoid[] }`; exported through the index so the object model page (US-PRD-007) can link terms.

## Mock data

- None; reads `GLOSSARY.md`.
