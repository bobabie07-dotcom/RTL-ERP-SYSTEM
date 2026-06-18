# RTL Poultry Farming ERP — UI Kit

Interactive, high-fidelity recreation of the RTL Poultry Farming ERP web app, composed
from the design system's component primitives.

## Run
Open `index.html`. Flow: **Login** (any credentials → "Login") → **Dashboard** → click a
batch number → **Batch Detail** → "Back". The sidebar switches the page title; only
Dashboard and Batch Management render full content (other modules show a placeholder — they
were not in the supplied mockups).

## Files
- `index.html` — app entry + router (login / dashboard / batch).
- `AppShell.jsx` — sidebar + topbar chrome wrapping a content slot.
- `LoginScreen.jsx` — split dark-hero + sign-in card.
- `DashboardScreen.jsx` — KPI grid, mortality line, expense donut, feed bars, batch table.
- `BatchDetailScreen.jsx` — batch KPIs, weight-gain chart, progress ring, activity log.
- `icons.jsx` — Lucide-style inline-SVG icon set (`window.RTLIcons`).
- `charts.jsx` — cosmetic inline-SVG Line/Donut/Bar charts (`window.RTLCharts`).

## Notes
- Components come from `window.RTLPoultryFarmingERPDesignSystem_698a73` via `_ds_bundle.js`.
- Charts are visual recreations, not a real charting library.
- Data is fabricated sample content consistent with the brand's copy conventions.
