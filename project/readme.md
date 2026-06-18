# RTL Poultry Farming ERP — Design System

> "Manage Smarter. Farm Better." — the complete ERP for modern poultry farm management.

This design system captures the visual language, tokens, components, and full-screen UI
recreations for **RTL Poultry Farming ERP**, a web-based enterprise resource planning
product for poultry farms (Philippine market — currency is the peso, ₱). It is a dense,
data-heavy operations dashboard: farms, poultry houses, batches, inventory, feed,
mortality, medication, procurement, expenses, sales, and reports.

## Sources

The system was reconstructed from three product mockups supplied by the client:

- `uploads/login.png` — split login screen (dark brand hero + white sign-in card)
- `uploads/dashboard.png` — main dashboard (sidebar + KPI grid + charts + tables)
- `uploads/screens.png` — montage of Batch Details, Inventory, Mortality Tracker, Feed
  Management, Expenses, Sales, and Reports views

No codebase or Figma file was provided, so tokens and components are derived from the
pixels (colors sampled directly) plus standard dashboard conventions. **If a codebase or
Figma exists, re-attach it** — code is a far better source of truth than screenshots.

> **Brand-name note:** the project brief names the company *"B&b poultry and agrivet"*,
> but every supplied mockup is branded **"RTL Poultry Farming ERP"**. This system is built
> against the visible brand (RTL). If RTL is a product sold to B&b (or the brand should be
> renamed), tell me and I'll re-skin — logo wordmark and color are centralized.

---

## CONTENT FUNDAMENTALS

**Voice.** Confident, encouraging, operational. Marketing surfaces (login hero) speak in
short imperative slogans — "Manage Smarter.", "Farm Better." — two-word punchy fragments,
each capitalized and period-terminated. The product itself is plain, functional, and
direct.

**Person.** The app addresses the user in second person and by name: "Welcome back,
Admin!", "Here's what's happening on your farms today." Friendly but professional —
contractions are fine ("Here's", "what's").

**Casing.**
- Page/section titles: Title Case ("Batch Management", "Feed Consumption").
- KPI labels: Title Case, often with a unit in parentheses — "Feed Consumption (kg)",
  "Total Expenses (₱)", "Avg. Weight (kg)".
- Nav items: Title Case ("Mortality Management", "Reports & Analytics").
- Table headers: Title Case, terse ("Batch No.", "Mortality %", "FCR", "Avg. Weight").
- Buttons: Title Case ("Add Item", "Issue Feed", "Generate Report", "Add Mortality
  Record", "View All Batches").

**Numbers & units.**
- Currency is peso with the ₱ glyph, thousands separators, no decimals on large sums:
  "₱2,450,000", "₱1,250,000". Per-unit costs may show decimals ("₱40.00").
- Counts use thousands separators: "48,250", "46,210".
- Percentages to 1–2 decimals: "4.21%", "95.6%", "42.63%".
- Trend deltas are signed and colored: "↑ 5.6% vs last month" (green = good),
  "↓ 0.6% vs last month" (note: for mortality a *down* arrow is the good outcome).
- Domain metrics use industry abbreviations as-is: **FCR** (feed conversion ratio),
  Avg. Weight (kg), Survival Rate, Mortality %.

**Tone of status copy.** Brief, scannable, with a status word: "Active", "In Stock",
"Low Stock", "Approved", "Pending", "Vaccination Due", "Upcoming Harvest". Alerts are
counts + nouns: "18 items", "2 batches", "5 batches".

**Emoji:** none. The product never uses emoji. Iconography carries all the visual
shorthand (see ICONOGRAPHY).

**Examples to emulate:**
- Empty/welcome line: "Welcome back, {name}! Here's what's happening on your farms today."
- KPI card: label "Mortality Rate" → value "4.21%" → delta "↓ 0.6% vs last month".
- Alert chip: icon + "Low Stock Alerts" + "18 items".

---

## VISUAL FOUNDATIONS

**Overall.** A clean, bright, white-card workspace anchored by a deep "farmhouse" green
sidebar. Generous whitespace, soft shadows, restrained color — green is the brand spine;
multi-hue color appears only in data viz and semantic states.

**Color.**
- **Primary green** `--green-500 #1F9A55` — primary buttons, active nav, links, the
  "Login" CTA. Hover deepens to `--green-600 #17813F`.
- **Bright accent** `--green-400 #2FAC64` — the logo wordmark ("RTL", "Farm Better.")
  and selected highlights. Slightly more saturated/luminous than primary.
- **Deep green / ink** `--ink-900 #071F11` — sidebar and login hero background; nearly
  black with a green cast. Text on it is `--text-on-dark #E8F0EB`.
- **Workspace** `--gray-50 #F9FAFB` page behind white cards.
- **Pale green tint** `--green-50 #E7F5EC` — circular backings behind stat icons, soft
  chips, success backgrounds.
- **Neutrals** run a standard slate gray ramp; primary text `--gray-900 #111827`,
  secondary `--gray-500`, muted/placeholder `--gray-400`.

**Semantic & data-viz.** success green, danger red `#EF4444` (mortality spikes, expense
increases, delete), warning amber `#F59E0B` (low stock), info blue `#3B82F6`. Charts use a
fixed 5-hue categorical palette: feed=green, labor=blue, medicine=amber, utilities=purple,
others=slate; mortality line=red, feed line=green.

**Imagery.** Warm, naturally-lit photography of live broiler flocks and farm interiors.
The login hero is a full-bleed photo of a poultry house overlaid with a dark green-to-
transparent gradient so white text stays legible. Photos skew warm (browns, warm whites).
No b&w, no heavy grain.

**Type.** Rounded geometric display sans (Poppins) for headings, slogans, and big stat
numbers; neutral UI sans (Inter) for body, labels, and tables. The wordmark sets
"POULTRY FARMING ERP" in spaced uppercase under a bolder "RTL POULTRY". Stat values are
large and bold (≈30px); KPI labels are small (13–14px) and gray.

**Spacing & layout.** 4px base scale. Fixed 260px dark sidebar, 64px top bar, fluid card
grid (KPIs in a 4-up grid, charts 3-up below). Card padding 24px. Content max ~1320px.

**Cards.** White, radius `--radius-lg 14px`, hairline `1px` border `--gray-200` **plus** a
soft low shadow `--shadow-card` (both — not shadow-only). Stat cards put the metric on the
left and a 48px pale-green circle holding a line icon on the right.

**Corners.** Buttons/inputs `--radius-md 10px`; cards `14px`; large panels `18px`; badges
& avatars fully pill/round.

**Borders.** Hairline `1px solid --gray-200` is the workhorse — on cards, inputs, table
row dividers, dropdowns. Inputs darken/green their border on focus with a soft
`--ring` glow.

**Shadows.** Soft and low-contrast — `--shadow-card` for resting cards, `--shadow-md` for
dropdowns/menus, `--shadow-lg` for dialogs. No hard or colored shadows. Sidebar and hero
use color, not shadow, for separation.

**Hover states.** Buttons darken one green step; ghost/secondary buttons pick up a faint
`--gray-100` fill; nav items get a translucent light overlay on the dark sidebar; table
rows get a `--gray-50` wash; cards may lift to `--shadow-md`.

**Press states.** Subtle — brief darken; optionally a 1px translate or `scale(0.99)`. No
large bounces.

**Motion.** Quiet and functional. Fades and short slides, 120–280ms, `--ease-out` /
`--ease-std`. Numbers may count up on dashboard load; charts ease in. No infinite
decorative loops. Respect `prefers-reduced-motion`.

**Transparency & blur.** Used sparingly: the login hero gradient overlay, and a
semi-transparent dark "stats strip" floating over the hero photo. No frosted-glass
chrome elsewhere.

---

## ICONOGRAPHY

- **Style:** thin, rounded line icons — Feather / **Lucide** family (consistent ~2px
  stroke, rounded caps). Used throughout: sidebar nav, top bar (bell, mail, calendar,
  chevrons), KPI cards, table actions (edit pencil, eye, trash).
- **Source / substitution:** no icon assets shipped in the brief. This system uses
  **Lucide** via CDN (`https://unpkg.com/lucide@latest`) — the closest match to the
  product's stroke weight and rounding. **FLAGGED:** if the real product ships a specific
  icon font or SVG set, supply it and I'll swap.
- **Stat-card icons** sit inside a 48px circle filled with a pale tint of the relevant
  color (usually `--green-50`; red tint for mortality, etc.) with the icon in the matching
  saturated hue.
- **Emoji:** never used.
- **Unicode glyph:** the peso sign **₱** is used as a currency glyph in labels and values.
- **Brand mark:** a custom line-drawn **hen/chicken** logo (head with red comb, green
  body) — see `assets/`. It is hand-illustrated, not a stock icon. The screenshot mark
  could not be vectorized losslessly; `assets/logo-mark.svg` is a faithful **rebuild** —
  replace with the official asset when available.

---

## INDEX

**Foundations / tokens**
- `styles.css` — global entry (import this). Imports everything below.
- `tokens/colors.css` · `tokens/typography.css` · `tokens/spacing.css` ·
  `tokens/fonts.css` · `tokens/base.css`
- `guidelines/*.card.html` — foundation specimen cards (Type, Colors, Spacing).

**Components** (`components/`) — see each `*.prompt.md`
- `core/Button`, `core/IconButton`, `core/Badge`, `core/Tag`, `core/Avatar`
- `forms/Input`, `forms/Select`, `forms/Checkbox`
- `data/StatCard`, `data/Card`, `data/DataTable`, `data/ProgressRing`
- `navigation/SidebarNav`, `navigation/Topbar`

**UI kit** (`ui_kits/erp/`) — interactive full-screen recreations
- `index.html` — login → dashboard → batch details click-through
- `LoginScreen.jsx`, `DashboardScreen.jsx`, `BatchDetailScreen.jsx`, `AppShell.jsx`

**Assets** (`assets/`) — logo mark, wordmark, hero imagery.

**Other**
- `SKILL.md` — Agent Skills wrapper (for use in Claude Code).
- `readme.md` — this file.
