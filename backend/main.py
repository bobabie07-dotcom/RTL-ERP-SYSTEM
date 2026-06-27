from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import engine
from routers import alerts, auth, batch_plans, batches, dashboard, farms, feed, harvest, health, inventory, maintenance, mortality, procurement, reports, sales, support


def _safe_add_column(conn, sql: str):
    try:
        conn.execute(text(sql))
    except Exception:
        pass  # column already exists


def run_startup_migrations():
    with engine.begin() as conn:
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN is_first_login BOOLEAN NOT NULL DEFAULT FALSE")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN phone VARCHAR(50) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE feed_types ADD COLUMN inventory_item_id INT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE NULL")
        _safe_add_column(conn, "ALTER TABLE purchase_order_items ADD COLUMN qty_received NUMERIC(12,2) NOT NULL DEFAULT 0")
        _safe_add_column(conn, "ALTER TABLE inventory_items ADD COLUMN qty_reserved NUMERIC(12,2) NOT NULL DEFAULT 0")
        _safe_add_column(conn, "ALTER TABLE inventory_items ADD COLUMN brand VARCHAR(100) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE inventory_items ADD COLUMN remarks TEXT DEFAULT NULL")
        _safe_add_column(conn, """
            ALTER TABLE alerts MODIFY COLUMN alert_type
            ENUM('mortality_high','feed_low','vaccination_due','withdrawal_active',
                 'batch_harvest','inventory_low','inventory_expiry','other') NOT NULL
        """)
        conn.execute(text("INSERT IGNORE INTO inventory_categories (name, name_ar) VALUES ('Manual', 'يدوي')"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS support_tickets (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                ticket_no        VARCHAR(20) UNIQUE NOT NULL,
                user_id          INT NOT NULL,
                farm_id          INT NULL,
                subject          VARCHAR(255) NOT NULL,
                category         ENUM('bug','access_request','feature_request','general') NOT NULL DEFAULT 'general',
                priority         ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
                description      TEXT NOT NULL,
                status           ENUM('open','in_progress','waiting_on_user','resolved','closed') NOT NULL DEFAULT 'open',
                assigned_to      INT NULL,
                resolution_notes TEXT NULL,
                created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                resolved_at      DATETIME NULL
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ticket_comments (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id   INT NOT NULL,
                user_id     INT NOT NULL,
                comment     TEXT NOT NULL,
                is_internal BOOLEAN NOT NULL DEFAULT FALSE,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        # Recreate v_batch_pnl with LEFT JOIN so feed issues without purchase records
        # use a fallback price (25/kg) instead of being silently dropped.
        conn.execute(text("""
            CREATE OR REPLACE VIEW v_batch_pnl AS
            SELECT
              b.id                                              AS batch_id,
              b.batch_no,
              h.name                                           AS house,
              COALESCE(rev.total_revenue, 0)                   AS total_revenue,
              COALESCE(fc.feed_cost, 0)                        AS feed_cost,
              COALESCE(ex.other_expenses, 0)                   AS other_expenses,
              COALESCE(rev.total_revenue, 0)
                - COALESCE(fc.feed_cost, 0)
                - COALESCE(ex.other_expenses, 0)               AS gross_profit
            FROM batches b
            JOIN houses h ON b.house_id = h.id
            LEFT JOIN (
              SELECT batch_id, SUM(total_amount) AS total_revenue
              FROM sales_orders WHERE status != 'cancelled'
              GROUP BY batch_id
            ) rev ON rev.batch_id = b.id
            LEFT JOIN (
              SELECT fi.batch_id,
                     SUM(fi.qty_kg * COALESCE(fp.cost_per_kg, 25.0)) AS feed_cost
              FROM feed_issues fi
              LEFT JOIN (
                SELECT feed_type_id, AVG(cost_per_kg) AS cost_per_kg
                FROM feed_purchases GROUP BY feed_type_id
              ) fp ON fp.feed_type_id = fi.feed_type_id
              GROUP BY fi.batch_id
            ) fc ON fc.batch_id = b.id
            LEFT JOIN (
              SELECT batch_id, SUM(amount) AS other_expenses
              FROM expenses WHERE batch_id IS NOT NULL
              GROUP BY batch_id
            ) ex ON ex.batch_id = b.id
        """))


app = FastAPI(
    title="RTL Poultry Farming ERP",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api"
app.include_router(auth.router,      prefix=API)
app.include_router(dashboard.router, prefix=API)
app.include_router(farms.router,     prefix=API)
app.include_router(batches.router,   prefix=API)
app.include_router(feed.router,      prefix=API)
app.include_router(mortality.router, prefix=API)
app.include_router(health.router,    prefix=API)
app.include_router(inventory.router, prefix=API)
app.include_router(sales.router,        prefix=API)
app.include_router(procurement.router,  prefix=API)
app.include_router(reports.router,      prefix=API)
app.include_router(batch_plans.router, prefix=API)
app.include_router(harvest.router,     prefix=API)
app.include_router(alerts.router,       prefix=API)
app.include_router(maintenance.router,  prefix=API)
app.include_router(support.router,      prefix=API)


run_startup_migrations()


@app.get("/api/health-check")
def health_check():
    return {"status": "ok", "service": "RTL Poultry ERP API"}
