# Impeccable prompt: CRM for a US independent P&C insurance agency (Cloudflare-style UI)

## Cách dùng

1. Mở Claude Code tại `/Volumes/KAFKA/Code/fortify`.
2. Điền các ô `[CONFIRM: …]` trong khối prompt bên dưới. Ô nào chưa chắc thì cứ để nguyên, Impeccable sẽ hỏi lại.
3. Dán **toàn bộ khối prompt** vào sau `/impeccable`, gửi một lần. Phần A và C đã trỏ thẳng tới `spec/` và `GLOSSARY.md`, nên Impeccable đọc spec gốc chứ không đọc bản tóm tắt.

Impeccable sẽ:
- chạy `init` → ghi `PRODUCT.md` từ phần A;
- coi phần B là visual world đã ghim → không gieo concept ngẫu nhiên ("brief wins");
- coi CRM là mode **Operate** → build theo code, không qua vòng comp bằng ảnh;
- build surface đầu tiên trong phần C, review xong mới ghi `DESIGN.md`.

Các surface sau đi theo thứ tự đợt trong `spec/build-order.md`, mỗi lần gõ `/impeccable build US-XXX-NNN`. Chúng tự kế thừa `DESIGN.md`, không cần dán lại phần B.

Nguồn token: đo trực tiếp từ dash.cloudflare.com (trang Account home và DNS Records, ngày 15/11/2026). Design system nội bộ của Cloudflare tên **Kumo** (Tailwind v4, màu viết bằng OKLCH).

---

## Prompt

````text
Design and build a CRM web app (front-end only, mock data) for a US independent P&C insurance agency. Treat everything below as pinned brief: Part A is product truth for PRODUCT.md, Part B is a pinned visual world (do not run a direction roll against it), Part C is the first surface to build.

## A. Product truth

Product: Fortify, a front-end-only CRM that runs on mock data, for a US independent P&C insurance agency. The agency has 25 users in 3 Offices (Houston TX, San Antonio TX, Tampa FL) and sells personal lines (auto, home, umbrella, renters, condo, flood, boat) and commercial lines (BOP, GL, WC, commercial auto, umbrella) through about 10 carriers. Fortify sits beside the agency's AMS, which stays the system of record for policies and commission. In Fortify those are synced and read-only.

The source of truth is in this repo, so read it before designing. Do not restate it into PRODUCT.md; link to it.
- GLOSSARY.md holds the canonical vocabulary. Use these terms exactly; never use the _Avoid_ words.
- spec/README.md sets the story conventions.
- spec/ia/sitemap.yaml defines the navigation. It drives the real sidebar.
- spec/ia/roles.md defines the roles, scopes and permission matrix.
- spec/ia/object-model.md defines the objects, lifecycles and timing rules.
- spec/ia/rules.md holds the business rules, SLAs, retention and the accessibility token overrides.
- spec/ia/mock-data.md describes the mock data shape and the shared seed list.
- spec/epics/**: 16 Epics, 201 user stories. Each has acceptance criteria and required UI states.
- spec/build-order.md lists the P0 stories in 12 build waves.

Users and jobs:
- Producer: sells. Works Leads, X-dates, the Pipeline (Opportunities with multi-carrier Quotes) and cross-sell. Sees their own Book.
- Account Manager: services clients. Works Renewals, Service Requests (policy changes, certificates, claim reports) and remarketing. Sees their Office.
- Principal: runs the agency's pipeline and retention, reviews certificates with an additional insured, waiver or P&NC, and reassigns Books. Sees the whole agency.
- Admin: users, settings and data sync.

Demo loop (P0): Lead → Qualify, with a duplicate check → Opportunity → Quotes → Won, which creates Bound Terms → Policy → Renewal → Service Request (Policy change). The in-app Product menu (/product) renders the IA and the backlog from spec/.

US conventions: $1,234, MM/DD/YYYY, (555) 010-1234, two-letter states. Every screen carries a "Sample data" badge, and all carriers are fictional. The tool is desktop-first (1280–1600px), usable on tablet and read-only on mobile. Accessibility target: WCAG 2.2 AA. Light mode only in v1.

Stack: React 19 + Vite + TypeScript + React Router + Tailwind v4, with components built on Radix primitives and charts in Recharts behind FND chart primitives.

Success: a user can find any Account, Policy, Renewal or request and act on it from a dense list without opening five screens. Every UI state in a story (empty, loading, error, no permission, overflow) can be demonstrated through Demo controls.

## B. Pinned visual world: Cloudflare dashboard grammar

Reproduce the system grammar of the Cloudflare dashboard (its Kumo design system): calm neutral canvas, white working surfaces, hairline rings in place of borders, one blue for primary action, and dense 40px data tables. Do NOT copy Cloudflare's brand: no orange cloud, no Cloudflare name or logo, and no #f6821f orange anywhere. The brand color is blue, the same hue as the action blue: it fills the "F" logomark, and the wordmark text stays neutral. The action blue remains the only accent (confirmed 2026-11-15).

Color (OKLCH; use these as tokens, not as one-off values):
- canvas (page bg)          oklch(98.75% 0 0)
- base / surface (cards, tables, controls) #fff
- elevated                  oklch(98% 0 0)
- recessed (wells, hover rows) oklch(96.5% 0 0)
- fill (neutral chips, dividers in tables) oklch(92.2% 0 0)
- hairline                  oklch(93.5% 0 0)
- line (ring color)         oklch(14.5% 0 0 / 0.1)
- line-control (form control borders only: input, select, checkbox, radio) oklch(14.5% 0 0 / 0.45), 3.16:1 on white, which passes WCAG 1.4.11. Cards and tables keep the 0.1 hairline.
- text-strong   oklch(14.5% 0 0)   | text-default oklch(20.5% 0 0)
- text-label    oklch(43.9% 0 0)   | text-muted   oklch(55.6% 0 0)
- text-placeholder oklch(55.6% 0 0) (raised from Cloudflare's 70.8% to pass WCAG 4.5:1) | text-inactive oklch(87% 0 0)
- primary       oklch(57.72% 0.2324 260), hover oklch(48.8% 0.243 264.4)
- link          oklch(42.4% 0.199 265.6)
- success oklch(59.6% 0.145 163.2) / text oklch(43.2% 0.095 166.9) / tint oklch(96.2% 0.043 156.7 / 0.57)
- danger  oklch(63.7% 0.237 25.3)  / text oklch(50.5% 0.213 27.5)  / tint oklch(93.6% 0.032 17.7 / 0.42)
- warning oklch(73.9% 0.177 58.2)  / text oklch(55% 0.13 57.5) (darkened from 59.7% for 5.06:1 contrast)  / tint oklch(93.1% 0.107 94.6 / 0.2)
- info    oklch(62.3% 0.214 259.8) / text oklch(42.4% 0.199 265.6) / tint oklch(93.2% 0.032 255.6 / 0.45)
- badge hues: red 57.7% .245 27.3 · green 59.6% .145 163.2 · orange 81.5% .197 76 · purple 55.8% .288 302.3 · teal 54.9% .096 184.6 · blue 54.6% .245 262.9 · neutral 55.6% 0 0
Color strategy: Restrained. Neutrals carry about 95% of the UI. Blue appears only on the primary action, links, focus and selection. Status color appears only where it encodes state (pipeline stage, policy status, renewal risk, consent), always paired with an icon or a text label.

Type:
- Inter Variable for all UI. Monospace only for IDs, emails in technical contexts, and tabular figures; use the platform mono stack (Cloudflare's own "Paper Mono" is not available).
- Letter-spacing -0.16px globally. Weights 400 / 500 / 600 only.
- Scale: xs 12/16 · sm 13/15.3 · base 14/21 · lg 16/24 · page title 30/36 at 600. Section title 16/22 at 500. Table header 14 at 600. Table cell and status labels 13–14. Muted descriptions 14 at 400 in text-muted.
- Numbers in tables use tabular-nums and right alignment.

Shape and depth:
- Radius: 8px for buttons, cards, table containers and nav items; 12px for the global search field and large panels; 4px for checkboxes; full pill for badges and avatars.
- No CSS borders on surfaces. Edges come from a ring: box-shadow 0 0 0 1px var(--line). Resting cards add 0 1px 2px rgb(0 0 0 / .05). Popovers and menus add 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1). No other shadows, no gradients, no glass.

Layout shell:
- Top bar 58px on the canvas color with a 1px bottom line: workspace switcher and plan badge on the left; Ask AI, Support, notifications and avatar on the right.
- Left nav: a 56px icon rail that expands to labeled groups on hover or pin; items are 8px-radius rows, icons at 50% opacity until hover or active.
- Content is left-aligned with 32px gutters and no centered max-width on list pages.
- Page header: H1 (30/600), then a one-line muted description (14) with an inline doc link; secondary page actions sit top-right as small outline buttons.

Components:
- Toolbar row above every list: search input (36px, white, ring, leading icon, placeholder "Search households"), then secondary buttons (36px, white, ring, 14/500, icon and label: Filters, Display options, Import, Export), then the primary button at the far right (36px, blue, white 14/500 text, leading "+" icon, e.g. "+ Add lead").
- Usage/meta line under the toolbar in 13px muted text (e.g. "Showing 48 of 212 policies renewing in 60 days · $1.24M premium").
- Collapsible callout panel (white, ring, 8px radius) for system recommendations: a title with a count badge, items with a colored dot, a bold first line and a muted second line. Use it for "3 policies renew in the next 30 days with no remarket started" and similar nudges.
- Data table: white container with 8px top radius; 40px header row (14/600) and 40px body rows with 1px fill-color dividers; checkbox column; sortable headers with an info-tooltip icon; empty cells show "—" in muted; a text "Edit" action at row end and a row overflow menu; whole row hover in recessed. Primary column shows the name with a muted secondary token (e.g. the household under the policy number), truncated with an ellipsis and a full-value tooltip.
- Status cell: small icon or dot plus 13px label, never a filled colored pill for stage or policy status. Pills are reserved for counts and plan-like badges.
- Analytics cards (dashboard only): white, ring, 8px radius; 13px label with an overflow menu; 24px value; delta in success/danger text with an arrow; thin 1px-stroke line charts in primary blue on hairline gridlines.

Density and motion: Cloudflare-level density; never pad a table to look airy. Motion is limited to 100–200ms opacity and transform on menus, rail expand and row hover. No entrance animations.

## C. First surface to build

Build the shell from spec/build-order.md (waves 1–3) and then the Accounts list. That is the shell every later surface inherits, and one dense table to prove the grammar:
- US-FND-001: app shell with the grouped sidebar from sitemap.yaml
- US-FND-002: top bar with the office control, search entry and avatar
- US-FND-005: mock data store, API latency and Demo controls
- US-FND-015, US-FND-016, US-FND-017: toasts and confirm dialogs, shared empty/loading/error states, and status cells and badges
- US-FND-007: the data table pattern with saved views, filters, sorting and pagination
- US-ACC-001: the Accounts list with saved views

Implement each story to its acceptance criteria and UI states. The route is /accounts at 1440px. Out of scope for this pass: the other Epics.
````

---

## Ghi chú thiết kế (không dán vào prompt)

- **Nút primary của Cloudflare là màu xanh, không phải cam.** Màu cam `#f6821f` chỉ dùng cho logo và thương hiệu. Prompt cấm hẳn màu cam để giao diện không trông như hàng nhái Cloudflare. Nếu CRM có màu thương hiệu riêng, chỉ đưa vào ô brand, đừng thay màu xanh của action.
- **Rủi ro mật độ:** Cloudflare thiết kế cho dev và ops. Producer và CSR của agency ít kỹ thuật hơn, nên mật độ 40px vẫn ổn nhưng phải dùng thuật ngữ bảo hiểm thay vì thuật ngữ kỹ thuật.
- **Stage và trạng thái policy hiển thị bằng chấm màu kèm chữ, không dùng pill tô màu.** Cloudflare làm đúng như vậy ở cột Proxy status. Một bảng 40 dòng toàn pill màu sẽ biến thành confetti.
- Font Paper Mono của Cloudflare không có bản công khai, nên prompt dùng font mono của hệ thống.
