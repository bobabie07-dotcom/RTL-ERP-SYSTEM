# Print and PDF Audit

This file tracks ERP-wide print/PDF standardization. Status values:

- `Standardized`: Uses shared print CSS, shared header/footer, hidden UI chrome, table pagination rules.
- `Needs Review`: Page has print support but still needs visual print preview verification.
- `Not Applicable`: Page is operational only and does not need a printable document.

## Shared Standard Applied

- Global print stylesheet: `src/styles/print.css`
- Shared print button/header/footer: `src/components/core/PrintButton.jsx`
- Shared printable card hook: `src/components/data/Card.jsx`
- Shared printable table hook: `src/components/data/DataTable.jsx`
- App-wide print footer injection: `src/components/navigation/AppLayout.jsx`
- Reports print CSS consolidated into global print standard: `src/pages/ReportsPage.jsx`

## Current Audit Matrix

| Module/Page | Print Status | PDF Export Status | Issues Found | Fix Applied | Validation Result |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Needs Review | Needs Review | Existing print button relied on basic CSS only. | Global header/footer/CSS now applies. | Build validation pending visual preview. |
| Farm Management | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Poultry Houses | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Batch Management | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Batch Details | Needs Review | Needs Review | Complex details/tables need page-break verification. | Global card/table/header/footer standard now applies. | Build validation pending visual preview. |
| Feed Management | Needs Review | Needs Review | Wide feed and schedule tables can overflow. | Global overflow and table wrapping rules now apply. | Build validation pending visual preview. |
| Standard Feed Schedule | Needs Review | Needs Review | Wide schedule table needs landscape/wrap behavior. | Global table wrapping and print hooks now apply. | Build validation pending visual preview. |
| Mortality Tracker | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Animal Health | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Inventory | Needs Review | Needs Review | Wide inventory tables can overflow. | Global overflow and table wrapping rules now apply. | Build validation pending visual preview. |
| Sales & Procurement | Needs Review | Needs Review | Wide sales/procurement tables can overflow. | Global overflow and table wrapping rules now apply. | Build validation pending visual preview. |
| Reports & Analytics | Standardized | Standardized | Used isolated injected print CSS, inconsistent with other modules. | Removed one-off print CSS, added standardized orientation handling and generated-by metadata. | Build validation pending visual preview. |
| Egg Collections | Needs Review | Needs Review | Layer-only page; basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Egg Grading | Needs Review | Needs Review | Layer-only page; basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Egg Sales | Needs Review | Needs Review | Layer-only page; basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Spent Hen Sales | Needs Review | Needs Review | Layer-only page; basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| User Management | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Notifications | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |
| Maintenance | Needs Review | Needs Review | Basic print only. | Global card/table print hooks now apply. | Build validation pending visual preview. |

## Next Visual QA Pass

Run print preview checks for:

1. Reports & Analytics: Batch P&L, Feed Standard Variance, Batch Comparison.
2. Batch Details: daily logs, feed standard timeline, vaccination/medication sections.
3. Feed Management: stock, purchases, releases, standard schedule.
4. Inventory: stock table and movements.
5. Sales & Procurement: sales, purchase orders, approvals.

For each page, verify:

- Sidebar and topbar are hidden.
- Buttons, filters, action columns, and pagination controls are hidden.
- All visible rows and columns print.
- Table headers repeat on later pages.
- Rows are not split awkwardly.
- Wide reports switch to landscape or wrap without clipping.
- Header includes logo, company/app name, report title, generated date/time, and generated by.
- Footer includes confidentiality/system metadata.
