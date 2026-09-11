# Handoff: Deli Design Brief Hub

## Overview
An internal creative-ops tool for Deli's in-house design department. It tracks design briefs from intake through delivery: Others Department (internal requesters) submit briefs, the Design Manager reviews and assigns them to a designer, the designer works the job through a fixed 6-step workflow, and the requester gets notified as it moves and completes. It also gives the manager visibility into team workload/capacity and a monthly summary report.

## About the Design Files
The file in this bundle (`Deli Design Brief Hub v2.dc.html`) is a **design reference built in HTML** — a working prototype showing intended look, content, and behavior, with mock in-memory data (nothing persists to a real database, there is no server, no real auth). It is not production code to copy as-is.

**The task is to recreate this design in the target codebase's real environment** (React, Vue, whatever the team already uses — or the most appropriate modern framework if this is greenfield), backed by a real database, real auth, and real notifications, using the codebase's existing component/design-system patterns where they exist.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy (Thai + English), and interaction states are final/intentional. Recreate pixel-close using the target codebase's own component library — don't feel obligated to use raw hex values in the README if the codebase has design tokens that already match closely, but the values below are the source of truth.

## Roles & Access
Three roles, no real backend auth in the prototype — production needs real authentication with these permission sets:

1. **Design Manager (owner)** — full access. Email + password login. Can: create briefs, receive/accept incoming briefs, assign a brief to a designer, approve or request revision on submitted work, view workload dashboard, download the monthly report, reset the monthly cycle.
2. **Designer** — invite-only (must sign in with an email on an invited list; no password). Can: view jobs assigned to them, submit work-in-progress or final files (link + image upload), see notifications when the manager assigns them a job.
3. **Others Department (internal requester / "guest")** — Google login only (must be a `@gmail.com` address in the prototype's mock check — production should use real OAuth). Can: create new briefs, view only briefs **they personally submitted** (their `requesterEmail`), approve/request revision **only on their own briefs**, cannot assign designers, cannot see other departments' briefs.

The prototype has a login screen with 3 "Preview" shortcut buttons (bypass credentials) purely for design walkthrough purposes — remove these in production and require real credential/OAuth flows.

## Data Model
Suggested entities for the backend:

**User**
- id, name, email, role (`manager` | `designer` | `requester`), initials, avatar/department

**Project (Brief)**
- id, code (format `DL-YYMM-NN`), title, category (enum: Product / E-Commerce / Modern Trade / Corporate / General Trade — each has a fixed accent color, see Design Tokens), status (enum, 6-step workflow, see below), designerId (nullable until assigned), requesterId, requesterEmail
- brief text, spec fields (key/value pairs shown as chips — e.g. Deliverable, Channel, Round)
- assets (int, total artwork count), assetsDone (int, completed count)
- startDate (set when manager accepts + assigns — this is "brief date", not a separately editable field), dueDate (deadline; **weekends are disallowed** as due dates — validate both on a date-picker and on manual date input)
- delivery timing tag: `early` | `ontime` | `late` (derived by comparing completion date to due date)
- history: ordered list of {title, date, note, statusColor} — an audit trail entry is appended on every status change
- files: list of {name, ext, size, url} — supports both uploaded images and pasted links (Google Sheet / Drive / other URL)
- companyHolidays: a fixed list of blocked non-working dates (see Business Rules)

**Notification**
- id, userId (recipient), type (e.g. "assigned", "approved", "revision_requested", "submitted"), projectId, message, read (bool), createdAt

**MonthlyReportSnapshot** (for the reset/report feature)
- month, totalProjects, totalAssets, deptWorkloadPct, statusBreakdown (counts per status) — captured at reset time so historical reports survive the reset

## Workflow (fixed 6 steps)
In order, each with a distinct accent color:
1. **Brief** (received, dot: neutral/ink) — "Received in-house"
2. **Review** (dot: blue) — manager reviewing the brief
3. **Design** (dot: brand red) — active design work
4. **Revision** (dot: amber) — client/requester-requested changes
5. **Approved** (dot: green)
6. **Completed** (dot: dark ink, filled)

**Critical business rule:** a project only enters "Design" — i.e. work only starts — after the Design Manager explicitly accepts the brief AND assigns it to a designer. Before that it sits in Brief/Review with no assignee and no start date.

Step position drives two UI elements: a numeric badge like "3/6 · Design" and a progress bar that fills proportionally (1/6 → 6/6), reaching 100% only at Completed. (Earlier iteration showed "artworks done / total" on this bar — that was replaced; use workflow step position, not artwork completion count.)

## Screens / Views

### 1. Login
Two-column layout, min-height 100vh, wraps on narrow widths (`flex-wrap:wrap`, each column `flex:1 1 50%; min-width:320px`).
- **Left column**: solid brand red (`#C4142F`) background. Top bar: logo mark (52×52px white rounded-square tile containing the red "deli" logotype image, padding 9px) + "Design Brief Hub / Design department" wordmark (uppercase, letter-spacing 0.18em) + language switcher (TH/EN pill toggle) + dark/light mode toggle button. Center: two glass cards (`background: rgba(255,255,255,.14)`, `backdrop-filter: blur(6px)`, `border-radius:26px`, border `1px solid rgba(255,255,255,.3)`):
  - **Department status card**: department workload % (Archivo, 80px, weight 700) + status label (2-line, e.g. "overload / and overlaps") on the left; an animated mascot GIF (open/busy/overloaded state, scaled 1.4×, absolutely positioned) on the right, sized/positioned so it doesn't overlap the text.
  - **Date/time card**: current date + live digital clock, large (38px).
  - Below: 3 stat blocks (Archivo 64px numerals) — Projects/Artworks, Designers count, Workflow steps count.
- **Right column**: light background gradient. "Select your access" eyebrow + "Who are you?" H2. Three login cards stacked:
  1. **Others Department** — recommended badge, permission chips (✓ New brief, ✓ View work & Workflow, ✕ Assign designer), Gmail-only login button (Google "G" icon SVG).
  2. **Design Manager** — solid red card (full-bleed brand color, not glass), "FULL ACCESS" badge, email + password fields, "Design Department Login" button (white bg / red text).
  3. Inside the same red Manager card, below its login button: a secondary "Designer" sub-section — email-only field (must match an invited-designer allowlist) + Gmail-styled button, no password.

### 2. Overview (Home)
Top header bar (sticky): breadcrumb-style current-section label, search input, "+ New Brief" button (red, with a `sweepShine` light-sweep animation), "Monthly report" button (Design-Manager only).
Body, centered column, max content width ~1360–1440px:
- **Hero**: brand-red rounded panel. Left: eyebrow + large H1 headline + 2-line subhead + two CTA buttons (solid white "View all work", outlined "Open Workflow"). Right: 4 stat tiles in a row with thin vertical dividers (rgba white 28%): "Projects" (large number + "N project / M assets" sub-line), "Designers", "Workflow steps", last tile flagged "ALERT" in white-on-red for overdue count.
- **Workflow strip**: 6 equal-width step cards in a row, each showing step number (e.g. "03"), step name (TH+EN), short description, and a live count of projects currently in that step; arrows between cards; each step's card background/accent uses that step's assigned color.
- **Two-column row**: (left) Department Workload donut chart with center total, category legend with % bars below; (right) — *note: "This week's summary" list was explicitly removed per user feedback and replaced with the Department Status widget* (see Department Status below) — do not reintroduce a weekly-summary list here unless asked.
- **Department Status widget**: header shows week navigator (‹ prev / next › arrows + "7 Sep – 13 Sep" style date range label), then 3 rows — one per capacity state (Open for briefs / Busy still available / Overloaded & overlapping) — each row: large mascot icon (open/busy/overload themed illustration) in a colored tile, status name (2-line TH label + EN caps subtitle), short guidance note, and (Manager view only) avatar chips of team members currently in that state. The *active* state (matching current department load %) is visually emphasized; inactive rows are dimmed but still meet 4.5:1 text contrast. Percentage number is shown large and first, before the label, to avoid confusion. Department capacity % is computed from total assigned load ÷ total team capacity (Manager 20% share/cap 4, Designer A 40%/cap 8, Designer B 40%/cap 8 → team cap 20), and varies week to week (prototype uses a repeating pseudo-random weekly offset — production should compute this from real assignment data per week).
- **Selected Works preview**: section header + "Portfolio →" link, 3 featured project cards (only Design/Review status projects), each: cover image area (category-tinted placeholder + diagonal stripe pattern + label chip), category dot + code, status pill + step badge ("03/06 · Design"), title, category + designer line.

### 3. Selected Works (full grid)
Centered header (title + "N projects" count), category filter pills (All / Product / E-Commerce / Modern Trade / Corporate / General Trade — pill styling, active = dark fill), responsive grid (2–4 columns, configurable — was exposed as a tweak prop `gridColumns`). Each card: cover image placeholder (category-tinted gradient + diagonal stripe overlay), status pill top-right on cover, category dot + code row, title, **workflow-step label + progress bar** (e.g. "3/6 · Design", bar fills 1/6→6/6 — NOT an artwork-count bar), footer row: designer avatar + name + due-date (colored red if late, muted otherwise). Only Others-Department users see their own submitted briefs here; Manager/Designer see everything (Designer sees own-assigned + can request nothing on others').

### 4. Workflow (Kanban)
6 equal columns (one per status), each column header shows step name + live count; cards inside show cover thumbnail, title, category dot + designer name + short due date. Drag is not required — this is a read/status view, status changes happen via manager actions elsewhere (accept+assign, approve, request revision), not drag-and-drop, in the current design.

### 5. Workload
Two-column layout:
- **Left**: large donut chart (category breakdown) with center total (jobs + total artwork count), legend rows with count + %.
- **Right**: per-designer capacity list — avatar, name, role label ("Designer A · 40%"), load bar (color-coded), current load/cap fraction; plus an alert callout when someone is near/over capacity, and a note when jobs are double-booked on the same due date ("deadline clashes: N").
All percentages/colors updated to a deepened pastel palette (see Design Tokens) — this was explicitly requested to be readable and "less flat pastel."

### 6. Project Detail
Full-bleed cover header (category-tinted, diagonal stripe, dark gradient overlay for text legibility) with code chip, status pill, large title.
Two-column body:
- **Left (wider)**: Brief section (description text + 3 spec chips: Deliverable / Channel / Round), Revision History (vertical timeline with colored dots per entry, date, note).
- **Right**: Designer card (avatar, name, meta rows: Category / Status / Deadline / Revisions count / Requested by) with **Approve** (red) / **Request revision** (outline) action buttons — visible to Manager, and to the requester **only if it's their own brief**; a submit-work panel for Designer/Manager with link input + image-upload slot; Files list (colored file-type icon tile, name, size) — supports pasted Google Sheet/Drive/other links as first-class "files," not just uploads.

### 7. New Brief modal/form
Fields: requester name (**required** — cannot submit without it; for Others-Department this auto-fills from their logged-in email/derived name), title, category select, brief description, deliverable/channel/round spec fields, asset count, due date picker (**weekends disabled/unselectable**, company holidays also blocked — see Business Rules), optional link/file attach.
On submit: success toast/modal — "Brief submitted successfully. Please wait for the Design Manager to accept and assign it." with a close button. No calendar date is auto-picked as "start" — the actual start date is stamped only when the Manager accepts + assigns.

### 8. Notifications
Bell icon with unread badge; panel lists entries with a modernized line-icon per type (not emoji) — e.g. "The Design Manager has assigned this job to you" (designer-facing), "Your brief was approved" / "revision requested" (requester-facing), each linking to the relevant project.

### 9. Monthly Report modal (Manager-only)
Header with current month/year label; 3 stat tiles (Total Projects, Total Artworks, Dept Workload %); status-breakdown list (color dot + step name + count); **Download CSV** button (generates a CSV of the above); **Reset month** button — requires an inline confirm step ("Clear this month's briefs and workload data?" → "Confirm reset") before it actually clears briefs/assignments/notifications for the new cycle. Footer note: "Resets every month · downloadable by the Design Manager only."

## Business Rules
- **Weekend due dates are disallowed.** Both the calendar picker (grey out + `cursor:not-allowed` on Sat/Sun cells) and free-text/native date input (reject on change, clear the value) must enforce this.
- **Company holidays are blocked non-working days** in addition to weekends — a fixed list was configured in the prototype (13 Oct, 23 Oct, 7 Dec, 31 Dec — Thai public holidays) and later removed per user request; keep as a supported concept (a `companyHolidays: Date[]` list feeding the same picker-blocking logic) even though it's currently empty, since the user may re-enable it.
- **Work cannot start (status cannot leave Brief/Review) until the Design Manager both accepts the brief and assigns a designer.** This is the gate for entering "Design" status and for setting `startDate`.
- **A brief requires a requester name to submit** — form-level required-field validation.
- **Requesters (Others Department) can only view and act on briefs they personally submitted** — filter all list/detail views by `requesterEmail === currentUser.email` for that role; they cannot request revision on briefs they didn't submit, and cannot assign designers under any circumstance.
- **Designer capacity is shared/aggregated at the department level for display on the login screen and Overview** (a single department-wide % derived from summed load ÷ summed capacity across all 3 team members), even though the Workload screen also shows it broken out per person.
- **Approve/Request-revision only becomes available to the Designer or Manager once a submission exists** (i.e., not on a bare "Design" status with nothing submitted yet) — gate the button, don't just disable it silently.
- Team composition is fixed at 3 people: Design Manager (20% job-taking share, capacity 4), Designer A (40% share, capacity 8), Designer B (40% share, capacity 8) — capacity numbers should be configurable per person in a real system, not hardcoded.

## Interactions & Behavior
- **Language toggle**: TH / EN pill switch in the header/login — every user-facing string (including department-status labels, month names, permission chips, toasts) must have both translations; don't leave any hardcoded-Thai or hardcoded-English string when the app is in the other language.
- **Dark mode**: toggle button on the login screen only in the current design (main app currently always light) — if dark mode is extended app-wide, re-run a contrast pass: all "inactive" state text must still hit 4.5:1 against its background in both themes.
- **Light-sweep animation**: a diagonal light-sweep highlight (`sweepShine` keyframe, ease-in-out, ~3s loop, `transform: translateX(-130%) skewX(-20deg)` → `translateX(230%)`) is used sparingly — currently only on the "+ New Brief" button. It was explicitly added, then removed from several other places (department-status %, Overview-to-Calendar hover) after user feedback that it was overused — **do not add it broadly**; treat it as a rare "primary call to action" accent only.
- **Overview → Calendar hover states**: the row of quick links from Overview through Calendar should be transparent/borderless at rest and only show a light-red background/border on hover; clicking should transition to solid brand-red feedback (not a pale tint) — this was a specific contrast/legibility fix requested.
- Hover states generally: cards lift slightly (`translateY(-3px)` + soft shadow) on Selected Works / Workflow board items; buttons darken (red → `#8E0E22`) or tint background on hover.
- Category color coding is used consistently everywhere a category appears (dot, bar fill, chip): Product = brand red, E-Commerce = blue, Modern Trade = amber, Corporate = green, General Trade = violet/purple (5th category was added later — confirm exact hue with the Design Tokens section below).

## Design Tokens

**Colors**
- Brand red / primary accent: `#C4142F` (hover/darker: `#8E0E22`)
- Ink (text): `#1A1614`
- Base background: `#EFEBE6` (warm off-white)
- Surface/card: `#FFFFFF`
- Category accents (deepened pastel, not flat pastel): Product = red family, E-Commerce = blue `oklch(0.52 0.14 250)`, Modern Trade = amber `oklch(0.62 0.14 68)`, Corporate = green `oklch(0.5 0.13 156)`, General Trade = violet (added later — sample from the live file's `PASTEL_OF`/category map)
- Workflow step accents: Brief = neutral ink, Review = blue, Design = brand red, Revision = amber, Approved = green, Completed = dark ink filled
- Status/capacity: Open/Green, Busy/Amber, Overloaded/Red (mascot + text + row background all keyed to this 3-state palette)

**Typography**
- Thai + Latin body: **Anuphan** (400/500/600/700)
- Display/numerals: **Archivo** (used for big stat numbers, tabular-nums)
- Mono/eyebrow labels: **JetBrains Mono** (400/500)
- Base body size ~14–15px; H1 hero ~54px; large stat numerals 60–80px depending on context; never below 24px for any headline-scale number, never below the app's ~11px floor for eyebrow labels.

**Shape & Spacing**
- Card radius: 20px (large panels), 13–14px (smaller cards), pill = fully rounded for chips/status badges
- Card border: `1px solid rgba(26,22,20,.08)` in light mode
- Section max-width: ~1360–1440px, centered
- Grid gaps: 18–22px typical between cards

**Motion**
- Hover lift: `transform: translateY(-3px)` + shadow increase, ~160ms ease
- `sweepShine` keyframe (see Interactions) — 3s loop, used sparingly

## Assets
- `assets/deli-logo-red.png`, `assets/deli-logo-white.png` — brand wordmark, user-supplied
- `assets/level-open.gif`, `assets/level-busy.gif`, `assets/level-over.gif` — animated mascot illustrations for the 3 capacity states (user-approved custom artwork; carry these over as-is or have real assets commissioned to match)
- Project cover images throughout are **placeholders** (category-tinted CSS gradient + diagonal stripe overlay) — replace with real artwork/photography per project in production; do not treat the striped placeholder pattern as final visual design.

## Screenshots
Reference captures in `screenshots/`, matching the "Screens / Views" section above:
- `01-login.png` — Login (department status card, mascot, role selector)
- `02-overview.png` — Overview / Home (hero, workflow strip, stats)
- `03-selected-works.png` — Selected Works grid with category filters
- `04-workflow.png` — Workflow kanban (6-step board)
- `05-workload.png` — Workload dashboard (donut + department capacity)
- `06-project-detail.png` — Project Detail (cover, step tracker, brief)

## Backend Build Notes (for Claude Code)
This package is for implementing a **real backend** behind the prototype. Concretely:
- Stand up real auth for the 3 roles (see Roles & Access) — replace the mock Gmail/password/invite-list checks with real OAuth (Google) for Manager/Others-Department and a real invite/allowlist + magic-link or password auth for Designers.
- Implement the data model above (User, Project/Brief, Notification, MonthlyReportSnapshot) in a real database — pick whatever the target stack already uses; if greenfield, a simple Postgres schema mirroring the entities above is enough to start.
- Implement the business rules verbatim (weekend/holiday date blocking, brief-requires-requester-name, manager-must-accept-and-assign before work starts, requester scoping to own briefs, approve/request-revision gating) as server-side validation, not just client-side — the prototype only enforces these in the UI.
- Notifications should be pushed server-side on the same trigger points the prototype fakes client-side (assign → notify designer; approve/revision → notify requester).
- The monthly report reset should snapshot current-month stats into `MonthlyReportSnapshot` before clearing live data, so past months stay downloadable.
- Everything else (screens, copy, layout, tokens, animations) is UI-only and can be recreated in whatever frontend framework the target codebase uses, following the Screens/Views and Design Tokens sections above.

## Files
- `Deli Design Brief Hub v2.dc.html` — the full interactive prototype (single file, all screens, mock data, and the logic described above lives inline in this file's script). This is the authoritative reference for exact copy, spacing, and conditional logic not fully captured above — read it directly for anything ambiguous in this README.
- `assets/` — mascot GIFs and logo images referenced by the prototype.
- `support.js` — runtime harness the prototype file depends on to render standalone; not needed once recreated in a real framework.
