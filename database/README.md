# Database — RTL Poultry Farming ERP

## Quick Start

```bash
# 1. Create DB and tables
mysql -u root -p < database/schema.sql

# 2. Load sample data
mysql -u root -p poultry_erp < database/seed.sql
```

## Entity Relationship Overview

```
farms ──< houses ──< batches ──< batch_daily_logs
                                       │
              users ──────────────────┤ (recorded_by)
                │                     ├─< feed_issues >── feed_types
                │                     ├─< mortality_records
                │                     ├─< vaccination_schedules >── medications
                │                     ├─< health_events
                │                     ├─< treatments >── medications
                │                     └─< sales_orders >── buyers
                │
farms ──< inventory_items >── inventory_categories
                └─< inventory_movements
                └─< purchase_order_items ──< purchase_orders >── suppliers

feed_types ──< feed_stock
feed_types ──< feed_purchases >── suppliers
feed_types ──< feed_issues
```

## Tables by Module

| Module | Tables |
|--------|--------|
| Auth | `roles`, `users`, `farms` |
| Flocks | `breeds`, `houses`, `batches`, `batch_daily_logs` |
| Feed | `feed_types`, `feed_stock`, `feed_purchases`, `feed_issues` |
| Health | `medications`, `vaccination_schedules`, `health_events`, `treatments` |
| Mortality | `mortality_records` |
| Inventory | `inventory_categories`, `inventory_items`, `inventory_movements`, `purchase_orders`, `purchase_order_items`, `suppliers` |
| Sales/Finance | `buyers`, `sales_orders`, `expenses` |
| Alerts | `alerts` |

## Views

| View | Used by |
|------|---------|
| `v_batch_summary` | Batches page table |
| `v_feed_stock_status` | Feed dashboard, low-stock alerts |
| `v_mortality_rate_7d` | Mortality page stats |
| `v_upcoming_vaccinations` | Health calendar, alert badges |
| `v_batch_pnl` | Reports > Financial Summary |

## Key Business Rules Enforced in Schema

- **Withdrawal date** (`treatments.withdrawal_end_date`) — must be checked before creating a sale order for that batch
- **Feed stock** (`feed_stock.qty_on_hand_kg`) — decremented by app on each `feed_issues` insert
- **Batch status** flow: `active` → `harvest_soon` (≤ 7 days left) → `harvested` / `terminated`
- **Mortality alert** triggers when 7-day rate > configurable threshold (read from `roles.permissions` or a future `settings` table)
