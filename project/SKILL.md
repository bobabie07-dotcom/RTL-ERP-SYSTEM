---
name: rtl-poultry-design
description: Use this skill to generate well-branded interfaces and assets for RTL Poultry Farming ERP, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `readme.md` — full design guide: content & visual foundations, iconography, index.
- `styles.css` — global entry; `@import` this to get all tokens + fonts.
- `tokens/` — colors, typography, spacing, shadows, fonts.
- `components/` — React primitives (Button, Badge, StatCard, DataTable, SidebarNav, …),
  each with a `.prompt.md` usage note.
- `ui_kits/erp/` — interactive full-screen recreation (login → dashboard → batch).
- `assets/` — logo lockup, hen mark, hero imagery.

## Brand in one breath
Deep "farmhouse" green sidebar + bright green primary (#1F9A55), clean white workspace,
Poppins display / Inter body, soft low shadows, Lucide line icons, peso (₱) currency.
Voice: confident, operational, second-person ("Welcome back, Admin!"). No emoji.
