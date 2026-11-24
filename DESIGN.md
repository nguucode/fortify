---
name: Fortify
description: A calm infrastructure-console grammar for a dense insurance-agency CRM.
colors:
  canvas: "oklch(98.75% 0 0)"
  surface: "#fff"
  recessed: "oklch(96.5% 0 0)"
  fill: "oklch(92.2% 0 0)"
  line: "oklch(14.5% 0 0 / 0.1)"
  line-control: "oklch(14.5% 0 0 / 0.45)"
  strong: "oklch(14.5% 0 0)"
  ink: "oklch(20.5% 0 0)"
  label: "oklch(43.9% 0 0)"
  muted: "oklch(55.6% 0 0)"
  inactive: "oklch(87% 0 0)"
  primary: "oklch(57.72% 0.2324 260)"
  primary-hover: "oklch(48.8% 0.243 264.4)"
  link: "oklch(42.4% 0.199 265.6)"
  selection: "oklch(93.2% 0.032 255.6)"
  success: "oklch(59.6% 0.145 163.2)"
  success-text: "oklch(43.2% 0.095 166.9)"
  success-tint: "oklch(96.2% 0.043 156.7 / 0.57)"
  danger: "oklch(63.7% 0.237 25.3)"
  danger-text: "oklch(50.5% 0.213 27.5)"
  danger-tint: "oklch(93.6% 0.032 17.7 / 0.42)"
  warning: "oklch(73.9% 0.177 58.2)"
  warning-text: "oklch(55% 0.13 57.5)"
  warning-tint: "oklch(93.1% 0.107 94.6 / 0.2)"
  info: "oklch(62.3% 0.214 259.8)"
  info-text: "oklch(42.4% 0.199 265.6)"
  info-tint: "oklch(93.2% 0.032 255.6 / 0.45)"
typography:
  title:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "-0.16px"
    fontFeature: "\"cv11\", \"ss01\""
  metric:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    fontFeature: "\"tnum\""
  section:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "-0.16px"
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
    letterSpacing: "-0.16px"
    fontFeature: "\"cv11\", \"ss01\""
  table-header:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "21px"
    letterSpacing: "-0.16px"
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "-0.16px"
  caption:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "-0.16px"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.recessed}"
  button-ghost:
    textColor: "{colors.label}"
    rounded: "{rounded.md}"
    height: "32px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px 0 32px"
    height: "36px"
  search-entry-global:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    height: "36px"
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "40px"
    padding: "0 12px"
  table-row-hover:
    backgroundColor: "{colors.recessed}"
  status-cell:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  count-pill:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "20px"
  nav-item:
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  nav-item-active:
    backgroundColor: "color-mix(in oklab, {colors.strong} 7%, transparent)"
    textColor: "{colors.link}"
  segmented:
    backgroundColor: "{colors.recessed}"
    rounded: "{rounded.md}"
    padding: "2px"
    height: "36px"
  segmented-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.strong}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  badge:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 6px"
    height: "20px"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "28px"
  callout-warning:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  avatar:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    size: "24px"
  tooltip:
    backgroundColor: "{colors.strong}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
---

# Design System: Fortify

## Overview

**Creative North Star: "The Quiet Console"**

Fortify reads like a calm infrastructure console that happens to run an insurance agency. The grammar is the Cloudflare dashboard's (neutral canvas, white working surfaces, hairline rings, one blue, dense 40px tables) with none of Cloudflare's brand: no orange, no cloud, no borrowed name. Neutrals carry nearly the whole interface; color appears only where it means something: the one action blue, and status hues that encode state.

Density is a feature. A Producer or Account Manager should scan forty Accounts and know what is due next without opening one, so rows stay at 40px, numbers sit in tabular figures, and nothing is padded to look airy. The one expressive move is the Term ribbon, a 12-month micro-timeline drawn from data in every row; everything around it stays quiet so it can be read.

The rejected category default is the card grid with colored stage pills and an oversized KPI hero. Light mode only; WCAG 2.2 AA is a floor, and the contrast-corrected tokens below are part of the system, not exceptions to it.

**Key Characteristics:**
- Neutral canvas, white surfaces, 1px ring edges instead of borders.
- One accent: action blue, which is also the brand hue.
- Inter Variable throughout, 14px base, -0.16px tracking, weights 400/500/600 only.
- 40px rows, 36px controls, 8px radius.
- Status as dot plus label; pills only for counts and plan-like badges.
- The Term ribbon as the signature data glyph.

## Colors

A restrained, achromatic palette with a single saturated blue and four status hues that appear only where they encode state.

### Primary
- **Action Blue** (primary): the primary button, focus outlines, text caret, checkbox accent, active menu checkmarks, the refetch and sync progress lines, unread dots, the first data series in charts and report bars, Term ribbon ticks, and the Layered F logomark (a squircle tile with a top-light gradient from Action Blue to Pressed Blue; see `brand/logo/README.md`). It is both the action color and the brand color; the wordmark text beside the logomark stays neutral.
- **Pressed Blue** (primary-hover): hover state of the primary button only.
- **Ink Blue** (link): inline text links and link-style actions ("Clear filters", sortable header hover). Darker than Action Blue so body-size text clears 4.5:1.
- **Selection Wash** (selection): text selection background, with strong text on top.

### Neutral
- **Console Grey** (canvas): page background, top bar and sidebar.
- **Paper White** (surface): tables, controls, popovers, toasts. Named `surface`, not `base`, because Tailwind v4's `text-base` size utility collides with a `base` color.
- **Well Grey** (recessed): row hover, button hover, ghost hover, skeleton bars.
- **Divider Grey** (fill): table row dividers, count pills, the Sample data badge, kbd hints, avatar, the ribbon baseline, scrollbar thumb.
- **Ring Line** (line): the 0.1-alpha edge for every surface ring, plus the 1px structural shell dividers.
- **Control Line** (line-control): form control edges only (inputs, selects, toggles at rest). 3.16:1 on white, which passes WCAG 1.4.11.
- **Strong** (strong): headings, primary-column names, active tabs, tooltips, the ribbon's today marker and the calendar's now line.
- **Ink** (ink): default body and cell text.
- **Label** (label): secondary UI text, inactive nav, ghost buttons, filter labels.
- **Muted** (muted): descriptions, meta lines, empty-cell "—", secondary tokens, and the placeholder color. Placeholder was raised from the reference 70.8% to this value (4.73:1) and resolves to `muted` rather than a separate token.
- **Inactive** (inactive): ribbon quarter marks and other non-interactive marks.

### Status
- **Success** (success), **Danger** (danger), **Info** (info): status dots and toast icons. Info is also the "blue" status dot (New, Open, Quoting…).
- **Warning** (warning) for dots and the ribbon's 30-day band; **Warning Text** (warning-text) for warning-colored text and near-term ribbon ticks. Darkened from 59.7% to 55% for 5.06:1.
- **Status text** (success-text, danger-text, info-text): the AA-safe text and icon colors of each hue, used for inline status words, deltas, errors and urgent dates.
- **Status tints** (success-tint, danger-tint, warning-tint, info-tint): Callout backgrounds only. Text on a tint is always ink.

### Named Rules
**The One Blue Rule.** Action Blue is the only accent. It appears on the primary action, focus, links, selection, the active nav item (as Link Blue text), progress lines, unread dots, the first chart series, ribbon ticks and the logomark; nowhere else. Active tabs use strong neutrals, not blue.

**The State-Only Color Rule.** Status hues appear only where they encode state (pipeline stage, policy status, renewal risk, urgency) and always beside a text label or icon.

**The Urgency Rule.** One rule for every date, deadline and SLA counter (`dueTone` in `src/domain/urgency.ts`, rendered by `<Due>`): past due or breached is Danger Text at 500; due today or inside its window (30 days unless the domain sets one, such as the X-date quote window) is Warning Text at 500; both carry a 14px clock. Nothing else gets an urgency color.

## Typography

**Body Font:** Inter Variable (with ui-sans-serif, system-ui)
**Mono Font:** platform mono stack, for reference IDs only

**Character:** One family at three weights, tightened by -0.16px tracking and the cv11/ss01 alternates; hierarchy comes from size and weight steps, never from a second display face.

### Hierarchy
- **Title** (600, 30px/36px): the page H1 only.
- **Metric** (600, 24px/32px, tabular): one number per stat cell (Today pipeline strip, Product overview). Never a heading.
- **Section** (500, 16px/24px): empty and error state titles, palette input.
- **Body** (400 or 500, 14px/21px): the default for cells, buttons, nav, descriptions. Medium for primary-column names and button labels.
- **Table Header** (600, 14px/21px): column headers.
- **Label** (400, 13px/18px): status labels, meta line ("Showing 50 of 206 accounts · $2.07M annual premium"), tooltips, filter chips, secondary tokens.
- **Caption** (400 or 500, 12px/16px): nav group labels, count pills, kbd hints, the "Demo" group label.

### Named Rules
**The Three Weights Rule.** 400, 500 and 600 only. Nothing light, nothing bold beyond 600.

**The Tabular Numbers Rule.** Counts, money, dates, rate changes and the meta line use tabular figures; numeric columns align right.

## Layout

App shell: a 58px top bar on the canvas with a 1px bottom line, a left sidebar that rests as a 56px icon rail and expands to 240px with labeled groups after 150ms of hover or focus (overlaying content), or pins open and reflows the page. Content is left-aligned with 32px gutters (16px under 640px) and no centered max-width on list pages.

Page rhythm: H1 then a one-line muted description 4px below (`PageTitle`); saved-view tabs 24px below the header (`ViewTabs`); the toolbar 16px below the tabs; applied filter chips 12px below; the meta line 12px below; the table 8px below. Gaps between toolbar items are 8px; table cells pad 12px horizontally.

**The One Toolbar Rule.** Every list uses the same toolbar row (`ListToolbar`, built into `DataTable`): search (320px), Filters (a popover of selects bound to the URL, with a count pill), view controls (Segmented), Display, Export; a flexible gap; then secondary list actions and the one primary action at the far right. All toolbar controls are 36px. Filters never sit inline as bare selects. Lists put their create action in the toolbar, not the page header; `PageTitle` actions are for pages without a list (Reports export).

Responsive: the global search entry collapses to an icon button below 1024px; the office control and primary list action hide below 640px, where the list is a read-only rendition. Wide tables scroll horizontally with the primary column sticky.

**The No-Airy-Table Rule.** Rows are 40px, header row 40px. Never pad a table to look spacious.

## Elevation & Depth

Flat, with ring edges. Depth is conveyed by the canvas-to-white step and a 1px ring; real shadows appear only on floating layers.

### Shadow Vocabulary
- **Ring** (`box-shadow: 0 0 0 1px var(--color-line)`): every resting surface: table container, secondary buttons, filter chips, global search entry.
- **Control** (`box-shadow: 0 0 0 1px var(--color-line-control)`): form controls (search input, selects, toggle off-state) and hover on the global search entry and avatar.
- **Pop** (`box-shadow: 0 0 0 1px var(--color-line), 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): popovers, menus, toasts, the command palette, the hover-expanded sidebar.

### Named Rules
**The Ring Not Border Rule.** Surfaces get edges from a ring shadow, never a CSS border. 1px `line` borders are reserved for structural shell dividers (top bar bottom, sidebar edge, tab strip, sidebar footer), and `fill` borders for table row dividers.

**The Two-Edge Rule.** Cards and tables keep the 0.1 hairline; only form controls get the 0.45 control line.

## Shapes

Gently rounded and consistent, on a four-step scale only (4, 8, 12, full): 8px for buttons, inputs, panels, cards, callouts, table containers, nav items, popovers and toasts (the logomark uses its own squircle); 12px for the global search entry, the command palette, dialogs and chat bubbles; 4px for menu items, segmented items, kbd hints, dismiss buttons, highlights and skeleton bars; full round for count pills, badges, status dots, toggles and avatars. No other radius values. The table container rounds only its top corners; the pagination footer closes the bottom.

## Components

### Buttons
Compact and quiet; only one per toolbar is blue.
- **Shape:** 8px radius, 36px tall (32px small variant), 12px horizontal padding, 6px icon gap, 14px/500 label.
- **Primary:** Action Blue fill, white label, leading "+" icon for create actions. Hover shifts to Pressed Blue.
- **Secondary:** white with a ring, ink label, leading icon (Filters, Export). Hover fills Well Grey.
- **Ghost:** no fill, label color; hover fills Well Grey and text goes strong. Used for icon buttons in the top bar.
- **Toggle:** a secondary button with `aria-pressed` (Assigned to me, Mine, P0/P1/P2, renewal bands). Pressed fills Well Grey with strong text and the control ring; an optional count pill follows the label. Several mutually exclusive options are a Segmented control instead.
- **Danger:** Danger fill, white label, Danger Text on hover. Only for the confirm button of a destructive dialog (Discard, Delete, Cancel policy). Never a colour override on another variant.
- **Focus:** 2px Action Blue outline, 2px offset, everywhere.
- **Disabled:** 50% opacity, not-allowed cursor.

### Chips
- **Count pill** (`CountPill`): fill background, label text, 12px/500 tabular, 20px, full round. Counts only.
- **Badge** (`Badge`): the same pill for words: Sample data, Read only, Primary, Next, Demo, and coverage flags (AI, WVD, P&NC). Never a status, never colored.
- **Applied filter chip** (`FilterChip`, `FilterChips`): 28px, white with ring, 8px radius, 13px text, a 20px remove button; followed by a "Clear all" link.

### Segmented control
`Segmented`: a recessed 8px track with 2px padding and 4px-radius items; the selected item is white with a ring, 13px/500 strong. 36px in toolbars and page headers, 32px inside panels, sheets and popovers. Radiogroup semantics. Used for view switchers (Board/List, Month/Week/Day), short scopes (Open/All, Month/Year to date) and small pickers.

### Callouts
`Callout`: an inline message with a status tint, a ring, 8px radius, 8px/12px padding, a 16px tone icon (warning triangle, danger circle, success check, info) and 14px ink text, with at most one trailing action. Tones: warning (needs attention, may duplicate), danger (errors that block a save; role alert), success (done), info (neutral notes). The `bleed` variant is a full-width banner under a record header (archived Account, pending certificate) with a bottom divider instead of a ring. `AttentionCallout` is the collapsible list form of the warning tone.

### Boards
`BoardColumn`: a recessed well per stage, 14/600 title with a count pill and an optional muted figure (premium sum), cards below (`boardCard`: white, ring, 12px padding, Well Grey on hover), at most 50 per column with a link to the list for the rest. Pipeline and Service share it.

### Headings inside pages
`SubHeading` (14/600 strong) labels sub-sections inside panels, sheets and records; `Panel` titles and state titles use Section (16/500). No other heading steps.

### Progress
`ProgressLine`: the one progress indicator, a solid 2px Action Blue line (table refetch, AMS sync, palette search). No pulsing bars.

### Avatar
`Avatar`: initials on a fill circle, 12px/500 label text; 24px in rows and timelines, 28px for the top-bar account menu.

### Status Cell
An 8px colored dot plus a 13px ink label, optional muted "· reason" with a tooltip. Never a filled colored pill. Unknown statuses fall back to the neutral dot. Empty status shows a muted "—".

### Data Table
White container, ring, 8px radius (top corners only when the pagination footer closes it). 40px header row (14/600, strong) and 40px body rows with 1px fill dividers; whole-row hover in Well Grey (100ms). Sortable headers show an arrow on the active column and go link-blue on hover. The primary column carries a kind icon, the name (14/500 strong, truncated, link on hover) and a muted 13px secondary token; for agency-scope roles that token reads "Contact · Office" because Office is not a column. Empty cells show a muted "—". Dates inside 30 days render in Warning Text at 500 with a clock icon. The pagination footer is white with a ring, a fill top divider and 13px label text.

**Primary column** (`PrimaryCell`): one line, never stacked: optional kind icon, optional mono reference ID (CERT-0131, SR-10439), the name (14/500 strong, a link), then the muted 13px token. The primary column is at least 280px wide and stays sticky while the table scrolls sideways, including when a checkbox column precedes it.

**Search and pagination** are part of `DataTable`: every list has a search box in its toolbar (bound to `?q`), and long lists page through the shared footer (`TablePagination`: range, rows per page 25/50/100, Previous/Next; `?page`, `?size`). Lists never silently cut off at a fixed count.

**Saved views** are always `ViewTabs` (bound to `?view`, or `?saved` where `?view` is the Board/List switch); section tabs inside a page are `TabBar`. Both are 14px with a 2px strong underline and count pills.

**Premium change** (`RateChange`): a signed percent with one decimal in tabular figures (+12.4%); +10% or more is Danger Text, −5% or less is Success Text (rules.md), anything between is ink. No arrows.

**Priority** is a status: dot plus label (`StatusCell`), High red, Normal and Low neutral.

**Display options:** every list's Display popover sets row density (Comfortable 40px, Compact 32px, saved per list) and column visibility; the primary column cannot be hidden.

**Small tables** inside panels and sheets use the same grammar through the `mini` classes: 12px cell padding, 40px rows, fill dividers, no toolbar.

**Loading:** skeleton rows only on first load, and only after 150ms, so fast loads never flash. **Refetch:** rows stay in place and a solid 2px Action Blue line runs under the header row. **Empty and error:** left-aligned, no illustration: a 24px muted (or danger) icon, a 16/500 title, a muted body, and one action.

### Inputs / Fields
- **Style:** white, 36px, 8px radius, control-line ring, 14px text, leading 16px muted search icon; selects match.
- **Focus:** 2px Action Blue outline; caret in Action Blue.
- **Toggle:** 20x36 track, fill with control ring when off, Action Blue when on.

### Navigation
- **Icons:** Lucide at 1.75 stroke for 16px and larger; 12–14px inline icons keep 2. Create actions use the Plus icon, never a typed "+".
- **Sidebar:** 32px items, 8px radius, 14/500. Icons 16px at 1.75 stroke, 60% opacity until hover or active. Items sit on a wash of the strong ink, so they darken a light rail and lighten a dark one on any sidebar or app background: hover 4% with strong text, active 7% with Link Blue text and icon (dark mode 6% and 11%). On a picked app background (Color or Gradient) with a transparent sidebar, the active item takes the solved strong ink and a 10% wash instead, since blue can't be guaranteed to read on an arbitrary hue. Tokens: `--nav-hover-a`, `--nav-active-a`, `--nav-active-ink`; utilities `nav-hover`, `nav-active`. Collapsed rail shows tooltips to the right and swaps group labels for 1px dividers.
- **Saved-view tabs:** 14px text with count pills; the active tab gets a 2px strong underline and 500 weight, never blue.
- **Top bar:** logomark (24px Layered F app icon, `/logo.svg`) and neutral wordmark, office control, Sample data badge, global search entry with a ⌘K hint; on the right, notifications, then View as and Demo controls grouped behind a 1px divider under a muted "Demo" caption, then the avatar.
- **Menus and popovers:** white, Pop shadow, 8px radius, 32px items with 4px radius; the selected option carries a blue check.
- **Command palette:** 560px, 12px radius, Pop shadow, 48px input at 16px, over a strong/20 scrim.
- **Dialogs:** 400–440px (560px for multi-step flows), 12px radius, Pop shadow, 20px padding, 16/500 title, actions bottom-right with Cancel focused for consequential actions.
- **Page states:** No access and Not found render the empty-state grammar as the page, with its title as the H1. Areas (Settings) name who may use them instead of an owner's Book.

### Toasts
Bottom-right stack of up to three, 360px, white with Pop shadow, 8px radius, a 16px tone-colored icon and 14px ink message. Non-danger toasts dismiss after 4s; danger stays.

### Term Ribbon (signature)
A 120px, 12-month strip in each Account row, drawn from data at runtime. A 1px fill baseline, 1px inactive quarter marks, and a strong 2px "today" marker at the left edge. Renewals are 3px solid Action Blue ticks; X-dates are hollow 8px rings in Action Blue. Ticks within 30 days switch to Warning Text, and a warning band shades the first 30 days only when something is due inside it. The column header carries month labels at the quarter marks. Hover lists every date; a screen-reader summary carries the same content.

**The One Glyph Rule.** The ribbon is the only expressive element on a list surface. It stays a data glyph: no labels inside it, no color outside blue, warning and neutrals.

### Motion
100 to 200ms opacity, color, width and transform only: row hover 100ms, buttons and nav 150ms, rail expand 150ms after a 150ms intent delay, tooltips after 150ms. No entrance animations. Reduced motion collapses all durations.

## Do's and Don'ts

### Do:
- **Do** use Action Blue only for the primary action, focus, links, selection, ribbon ticks and the logomark.
- **Do** give surfaces a 1px ring at 0.1 alpha, and form controls the 0.45 control line.
- **Do** keep rows at 40px and controls at 36px with an 8px radius; 12px only for the global search entry and large panels.
- **Do** show status as a dot plus a 13px label, and keep pills for counts and plan-like badges.
- **Do** build list pages from `PageTitle`, `ViewTabs` and `DataTable` (toolbar, filters, actions, meta), and messages from `Callout`; never hand-roll them.
- **Do** use tabular figures and right alignment for numbers, and a muted "—" for empty cells.
- **Do** keep rows in place on refetch with the 2px progress line; show skeletons only on first load after 150ms.
- **Do** carry Office as a "Contact · Office" token for agency-scope roles rather than adding a column.

### Don't:
- **Don't** introduce a second accent, an orange brand color, or Cloudflare's name or mark.
- **Don't** use filled colored pills for stage or policy status.
- **Don't** put CSS borders on cards, tables, controls or popovers; borders are for shell dividers and row dividers only.
- **Don't** use gradients, glass, or shadows outside the Ring, Control and Pop recipes.
- **Don't** use weights other than 400, 500 and 600, or a second display face.
- **Don't** pad tables to look airy, or add entrance animations.
- **Don't** use arbitrary radii, font sizes, line heights or tracking (`rounded-[5px]`, `text-[10px]`); stay on the scales above.
- **Don't** lift a resting card with the Pop shadow on hover; hover fills Well Grey.
