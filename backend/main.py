import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config import settings
from database import engine
from routers import alerts, auth, batch_finance, batch_plans, batches, dashboard, farms, feed, harvest, health, inventory, maintenance, mortality, procurement, reports, sales, spent_hens, support, users, super_admin, eggs

logger = logging.getLogger(__name__)

_SAFE_MIGRATION_MSGS = (
    "duplicate column",
    "already exists",
    "duplicate key",
    "key already",
    "can't drop",
    "check that column",
)


def _safe_add_column(conn, sql: str):
    try:
        conn.execute(text(sql))
    except Exception as exc:
        msg = str(exc).lower()
        if not any(pat in msg for pat in _SAFE_MIGRATION_MSGS):
            logger.warning("Migration step failed (sql=%s...): %s", sql[:80], exc)


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
        # User management extended fields
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN employee_id VARCHAR(50) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN position VARCHAR(100) DEFAULT NULL")
        # Convert global unique on employee_id → per-company composite unique (idempotent)
        try:
            conn.execute(text("ALTER TABLE users DROP INDEX employee_id"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD UNIQUE KEY uq_user_emp_company (company_id, employee_id)"))
        except Exception:
            pass
        # Convert global unique on batch_no → per-company composite unique (idempotent)
        try:
            conn.execute(text("ALTER TABLE batches DROP INDEX batch_no"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE batches ADD UNIQUE KEY uq_batch_no_company (company_id, batch_no)"))
        except Exception:
            pass
        # ── Layer Module additions ─────────────────────────────────────────────
        _safe_add_column(conn, "ALTER TABLE companies ADD COLUMN business_model VARCHAR(20) NOT NULL DEFAULT 'broiler'")
        _safe_add_column(conn, "ALTER TABLE egg_collections ADD COLUMN defect_summary JSON DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE egg_collections ADD COLUMN feed_water_log JSON DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE egg_gradings ADD COLUMN size_peewee INT NOT NULL DEFAULT 0")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS spent_hen_sales (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                company_id      INT NOT NULL,
                farm_id         SMALLINT NOT NULL,
                batch_id        INT DEFAULT NULL,
                sale_date       DATE NOT NULL,
                buyer_id        INT DEFAULT NULL,
                birds_sold      INT NOT NULL,
                avg_weight_kg   DECIMAL(6,3) DEFAULT NULL,
                total_weight_kg DECIMAL(10,3) DEFAULT NULL,
                price_per_kg    DECIMAL(10,2) NOT NULL,
                transport_cost  DECIMAL(10,2) DEFAULT 0,
                total_amount    DECIMAL(12,2) NOT NULL,
                payment_status  VARCHAR(20) NOT NULL DEFAULT 'unpaid',
                notes           TEXT DEFAULT NULL,
                created_by      INT DEFAULT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_shs_company (company_id),
                INDEX idx_shs_farm    (farm_id),
                INDEX idx_shs_batch   (batch_id),
                INDEX idx_shs_date    (sale_date)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN last_password_change_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN created_by INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN updated_by INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
        _safe_add_column(conn, "ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE users MODIFY COLUMN farm_id SMALLINT NULL")
        # Roles extended fields
        _safe_add_column(conn, "ALTER TABLE roles ADD COLUMN description VARCHAR(255) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE roles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
        _safe_add_column(conn, "ALTER TABLE roles ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        # Sync status from is_active for existing rows
        _safe_add_column(conn, "UPDATE users SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END WHERE status = 'active' OR status IS NULL")
        # User roles (many-to-many)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_roles (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL,
                role_id     SMALLINT NOT NULL,
                assigned_by INT DEFAULT NULL,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ur_user (user_id),
                INDEX idx_ur_role (role_id)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        # Login history
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS login_history (
                id             INT AUTO_INCREMENT PRIMARY KEY,
                user_id        INT NOT NULL,
                success        TINYINT(1) NOT NULL,
                ip_address     VARCHAR(45) DEFAULT NULL,
                user_agent     VARCHAR(500) DEFAULT NULL,
                failure_reason VARCHAR(100) DEFAULT NULL,
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_lh_user (user_id)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        # User audit logs
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_audit_logs (
                id             INT AUTO_INCREMENT PRIMARY KEY,
                target_user_id INT NOT NULL,
                action_type    VARCHAR(100) NOT NULL,
                old_value      TEXT DEFAULT NULL,
                new_value      TEXT DEFAULT NULL,
                performed_by   INT NOT NULL,
                ip_address     VARCHAR(45) DEFAULT NULL,
                notes          TEXT DEFAULT NULL,
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ual_target (target_user_id),
                INDEX idx_ual_actor  (performed_by)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        # purchase_orders optional columns (may be missing in older installs)
        _safe_add_column(conn, "ALTER TABLE purchase_orders ADD COLUMN rejection_reason VARCHAR(500) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE purchase_orders ADD COLUMN approved_by INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE purchase_orders ADD COLUMN approved_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE purchase_orders ADD COLUMN created_by INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE purchase_orders ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        # Allow pending_approval / draft statuses if schema predates them
        _safe_add_column(conn, "ALTER TABLE purchase_orders MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending_approval'")
        # sales_orders optional columns (may be missing in older installs)
        _safe_add_column(conn, "ALTER TABLE sales_orders ADD COLUMN rejection_reason VARCHAR(500) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE sales_orders ADD COLUMN approved_by INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE sales_orders ADD COLUMN approved_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE sales_orders ADD COLUMN created_by INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE sales_orders ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        # Allow pending_approval status if schema predates it
        _safe_add_column(conn, "ALTER TABLE sales_orders MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending_approval'")
        # Support ticket extended fields
        _safe_add_column(conn, "ALTER TABLE support_tickets ADD COLUMN affected_module VARCHAR(100) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE support_tickets ADD COLUMN contact_info VARCHAR(255) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE support_tickets ADD COLUMN department VARCHAR(100) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE support_tickets ADD COLUMN closed_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE support_tickets ADD COLUMN escalated_at DATETIME DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE support_tickets ADD COLUMN escalation_notes TEXT DEFAULT NULL")
        # Change ENUM columns to VARCHAR for flexibility
        _safe_add_column(conn, "ALTER TABLE support_tickets MODIFY COLUMN category VARCHAR(100) NOT NULL DEFAULT 'other'")
        _safe_add_column(conn, "ALTER TABLE support_tickets MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'new'")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ticket_activity_logs (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id    INT NOT NULL,
                action_type  VARCHAR(100) NOT NULL,
                old_value    TEXT DEFAULT NULL,
                new_value    TEXT DEFAULT NULL,
                performed_by INT NOT NULL,
                notes        TEXT DEFAULT NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ticket (ticket_id),
                INDEX idx_actor (performed_by)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alerts (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                farm_id    SMALLINT NOT NULL,
                alert_type VARCHAR(50) NOT NULL,
                severity   ENUM('info','warning','danger') NOT NULL DEFAULT 'warning',
                batch_id   INT NULL,
                message    VARCHAR(500) NOT NULL,
                is_read    TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_alerts_farm (farm_id),
                INDEX idx_alerts_read (is_read)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
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
        # ── Batch Finance column additions ────────────────────────────────────
        _safe_add_column(conn, "ALTER TABLE batches ADD COLUMN chick_cost_per_head DECIMAL(10,2) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE batches ADD COLUMN chick_supplier_id SMALLINT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE purchase_orders ADD COLUMN batch_id INT DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE vaccination_schedules ADD COLUMN cost_per_dose DECIMAL(10,4) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE vaccination_schedules ADD COLUMN total_cost DECIMAL(12,2) DEFAULT NULL")
        _safe_add_column(conn, "ALTER TABLE health_events ADD COLUMN cost DECIMAL(12,2) DEFAULT NULL")
        # ── Batch Finance tables ───────────────────────────────────────────────
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_categories (
                id         SMALLINT AUTO_INCREMENT PRIMARY KEY,
                code       VARCHAR(20) NOT NULL UNIQUE,
                name       VARCHAR(100) NOT NULL,
                sort_order SMALLINT DEFAULT 0
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        # Seed categories (INSERT IGNORE = safe to re-run)
        for code, name, order in [
            ("CHICK",         "Chick Purchase Cost",        0),
            ("FEED",          "Feed Cost",                  1),
            ("MEDICINE",      "Medicine / Treatment",       2),
            ("VACCINE",       "Vaccination",                3),
            ("LABOR",         "Labor Cost",                 4),
            ("ELECTRICITY",   "Electricity",                5),
            ("WATER",         "Water",                      6),
            ("BEDDING",       "Bedding / Litter",           7),
            ("DISINFECTION",  "Disinfection / Biosecurity", 8),
            ("MORTALITY_LOSS","Mortality Loss (value)",      9),
            ("EQUIPMENT",     "Equipment",                  10),
            ("TRANSPORT",     "Transportation",             11),
            ("MAINTENANCE",   "Maintenance",                12),
            ("MISC",          "Miscellaneous",              13),
            ("PURCHASE",      "Procurement Purchase",       14),
        ]:
            conn.execute(text(
                "INSERT IGNORE INTO expense_categories (code,name,sort_order) VALUES (:c,:n,:o)"
            ), {"c": code, "n": name, "o": order})

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS batch_expenses (
                id                  INT AUTO_INCREMENT PRIMARY KEY,
                batch_id            INT NOT NULL,
                house_id            SMALLINT NULL,
                category_id         SMALLINT NOT NULL,
                expense_date        DATE NOT NULL,
                amount              DECIMAL(14,2) NOT NULL,
                qty                 DECIMAL(12,4) NULL,
                unit                VARCHAR(20) NULL,
                unit_cost           DECIMAL(12,4) NULL,
                description         VARCHAR(500) NULL,
                source_module       VARCHAR(30) NULL,
                source_ref          VARCHAR(50) NULL,
                mortality_record_id INT NULL,
                is_voided           TINYINT(1) NOT NULL DEFAULT 0,
                void_reason         VARCHAR(255) NULL,
                voided_by           INT NULL,
                voided_at           DATETIME NULL,
                created_by          INT NULL,
                created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_be_batch (batch_id),
                INDEX idx_be_date  (expense_date),
                INDEX idx_be_cat   (category_id)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS batch_revenues (
                id             INT AUTO_INCREMENT PRIMARY KEY,
                batch_id       INT NOT NULL,
                revenue_date   DATE NOT NULL,
                category       VARCHAR(20) NOT NULL DEFAULT 'SALES',
                amount         DECIMAL(14,2) NOT NULL,
                qty_kg         DECIMAL(12,3) NULL,
                qty_birds      INT NULL,
                price_per_kg   DECIMAL(10,4) NULL,
                description    VARCHAR(500) NULL,
                sales_order_id INT NULL,
                buyer_id       INT NULL,
                is_voided      TINYINT(1) NOT NULL DEFAULT 0,
                created_by     INT NULL,
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_br_batch (batch_id),
                INDEX idx_br_date  (revenue_date)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
        # ── Recreate v_batch_summary to include chick cost fields ───────────
        conn.execute(text("""
            CREATE OR REPLACE VIEW v_batch_summary AS
            SELECT
              b.id,
              b.company_id,
              b.batch_no,
              b.farm_id,
              b.house_id,
              b.breed_id,
              h.name                                           AS house,
              f.name                                           AS farm,
              br.name                                          AS breed,
              b.placed_date,
              b.initial_count,
              DATEDIFF(CURDATE(), b.placed_date)               AS age_days,
              b.cycle_length_days,
              b.chick_cost_per_head,
              b.chick_supplier_id,
              b.status,
              COALESCE(dl.current_count, b.initial_count)      AS current_count,
              ROUND(COALESCE(
                (b.initial_count - dl.current_count) / b.initial_count * 100, 0
              ), 2)                                           AS mortality_pct,
              ROUND(COALESCE(fi.total_feed_kg, 0), 2)         AS total_feed_kg,
              ROUND(COALESCE(
                fi.total_feed_kg / NULLIF((dl.current_count * dl.avg_weight_g / 1000), 0), 0
              ), 2)                                           AS fcr,
              dl.avg_weight_g
            FROM batches b
            JOIN houses h  ON b.house_id  = h.id
            JOIN farms  f  ON b.farm_id   = f.id
            LEFT JOIN breeds br ON b.breed_id = br.id
            LEFT JOIN (
              SELECT batch_id, current_count, avg_weight_g
              FROM batch_daily_logs
              WHERE (batch_id, log_date) IN (
                SELECT batch_id, MAX(log_date) FROM batch_daily_logs GROUP BY batch_id
              )
            ) dl ON dl.batch_id = b.id
            LEFT JOIN (
              SELECT batch_id, SUM(qty_kg) AS total_feed_kg
              FROM feed_issues
              GROUP BY batch_id
            ) fi ON fi.batch_id = b.id
        """))
        # ── Recreate v_batch_pnl with LEFT JOIN so feed issues without purchase records
        # use a fallback price (25/kg) instead of being silently dropped.
        # ── Multi-farm assignment junction table ──────────────────────────────
        # Upgrade avg_weight_g to NUMERIC(10,2) to support decimal precision
        _safe_add_column(conn, "ALTER TABLE batch_daily_logs MODIFY COLUMN avg_weight_g NUMERIC(10,2) DEFAULT NULL")

        _safe_add_column(conn, """
            CREATE TABLE IF NOT EXISTS user_farms (
                id      INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                farm_id SMALLINT UNSIGNED NOT NULL,
                UNIQUE KEY (user_id, farm_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """)

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS system_announcements (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                title      VARCHAR(200) NOT NULL,
                body       TEXT NOT NULL,
                target     VARCHAR(50) NOT NULL DEFAULT 'all',
                company_id INT DEFAULT NULL,
                created_by INT DEFAULT NULL,
                expires_at DATETIME DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ann_company (company_id)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4
        """))
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
    allow_origins=[],
    allow_origin_regex=".*",  # allow any origin; auth is JWT-gated
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def _bare_500_handler(request: Request, exc: Exception):
    """Ensure unhandled exceptions always carry CORS headers so the error
    message is visible in DevTools even on cross-origin requests."""
    origin = request.headers.get("origin", "")
    cors_headers = {
        "Access-Control-Allow-Origin": origin or "*",
        "Access-Control-Allow-Credentials": "true",
    }
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
        headers=cors_headers,
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
app.include_router(batch_plans.router,   prefix=API)
app.include_router(batch_finance.router, prefix=API)
app.include_router(harvest.router,     prefix=API)
app.include_router(alerts.router,       prefix=API)
app.include_router(maintenance.router,  prefix=API)
app.include_router(support.router,      prefix=API)
app.include_router(users.router,        prefix=API)
app.include_router(super_admin.router,  prefix=API)
app.include_router(eggs.router,         prefix=API)
app.include_router(spent_hens.router,   prefix=API)


run_startup_migrations()


@app.get("/api/health-check")
def health_check():
    return {"status": "ok", "service": "RTL Poultry ERP API"}
