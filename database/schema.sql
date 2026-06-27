-- ============================================================
-- RTL Poultry Farming ERP — MySQL Database Schema
-- Encoding: utf8mb4 (Arabic text support)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS poultry_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE poultry_erp;


-- ============================================================
-- AUTH & ORGANIZATION
-- ============================================================

CREATE TABLE roles (
  id            TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL UNIQUE,         -- 'admin','manager','farm_worker','vet'
  name_ar       VARCHAR(100) NOT NULL,               -- Arabic label
  permissions   JSON NOT NULL DEFAULT ('{}')
) ENGINE=InnoDB;

CREATE TABLE farms (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  name_ar       VARCHAR(200),
  location      VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id       SMALLINT UNSIGNED NOT NULL,
  role_id       TINYINT UNSIGNED NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 1: FLOCKS / BATCHES  (القطعان)
-- ============================================================

CREATE TABLE houses (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id       SMALLINT UNSIGNED NOT NULL,
  name          VARCHAR(50) NOT NULL,               -- 'House A-1'
  capacity      INT UNSIGNED NOT NULL DEFAULT 0,
  house_type    ENUM('layer','broiler','breeder') NOT NULL DEFAULT 'broiler',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (farm_id) REFERENCES farms(id)
) ENGINE=InnoDB;

CREATE TABLE breeds (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,              -- 'Ross 308', 'Lohmann Brown'
  type          ENUM('broiler','layer','dual') NOT NULL,
  target_fcr    DECIMAL(4,2),
  target_daily_gain_g SMALLINT UNSIGNED,           -- grams/day
  laying_peak_pct DECIMAL(5,2)                     -- for layers
) ENGINE=InnoDB;

CREATE TABLE batches (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_no      VARCHAR(30) NOT NULL UNIQUE,        -- 'BATCH-2025-08'
  house_id      SMALLINT UNSIGNED NOT NULL,
  farm_id       SMALLINT UNSIGNED NOT NULL,
  breed_id      SMALLINT UNSIGNED,
  placed_date   DATE NOT NULL,
  initial_count INT UNSIGNED NOT NULL,
  cycle_length_days SMALLINT UNSIGNED NOT NULL DEFAULT 42,
  status        ENUM('active','harvest_soon','harvested','terminated') NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_by    INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (house_id) REFERENCES houses(id),
  FOREIGN KEY (farm_id)  REFERENCES farms(id),
  FOREIGN KEY (breed_id) REFERENCES breeds(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- Daily snapshot per batch: bird counts, weights, quick FCR
CREATE TABLE batch_daily_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT UNSIGNED NOT NULL,
  log_date      DATE NOT NULL,
  current_count INT UNSIGNED NOT NULL,             -- alive birds
  mortality_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  avg_weight_g  SMALLINT UNSIGNED,                 -- grams (weighed sample)
  culls         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  notes         TEXT,
  recorded_by   INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_batch_date (batch_id, log_date),
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 2: FEED MANAGEMENT  (الأعلاف)
-- ============================================================

CREATE TABLE feed_types (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,             -- 'Starter', 'Grower', 'Finisher'
  name_ar       VARCHAR(200),
  protein_pct   DECIMAL(5,2),
  energy_kcal   SMALLINT UNSIGNED,
  unit          ENUM('kg','ton') NOT NULL DEFAULT 'kg',
  notes         TEXT
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(300),
  contact_name  VARCHAR(100),
  phone         VARCHAR(30),
  email         VARCHAR(150),
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE feed_purchases (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  feed_type_id  SMALLINT UNSIGNED NOT NULL,
  supplier_id   SMALLINT UNSIGNED,
  purchase_date DATE NOT NULL,
  qty_kg        DECIMAL(10,2) NOT NULL,
  cost_per_kg   DECIMAL(8,4) NOT NULL,
  total_cost    DECIMAL(12,2) GENERATED ALWAYS AS (qty_kg * cost_per_kg) STORED,
  received_date DATE,
  expiry_date   DATE,
  invoice_no    VARCHAR(50),
  notes         TEXT,
  created_by    INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_type_id) REFERENCES feed_types(id),
  FOREIGN KEY (supplier_id)  REFERENCES suppliers(id),
  FOREIGN KEY (created_by)   REFERENCES users(id)
) ENGINE=InnoDB;

-- Feed stock balance per feed type (materialized via triggers or app logic)
CREATE TABLE feed_stock (
  feed_type_id  SMALLINT UNSIGNED PRIMARY KEY,
  qty_on_hand_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_qty_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (feed_type_id) REFERENCES feed_types(id)
) ENGINE=InnoDB;

CREATE TABLE feed_issues (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT UNSIGNED NOT NULL,
  house_id      SMALLINT UNSIGNED NOT NULL,
  feed_type_id  SMALLINT UNSIGNED NOT NULL,
  issue_date    DATE NOT NULL,
  qty_kg        DECIMAL(10,2) NOT NULL,
  fcr_snapshot  DECIMAL(5,3),                      -- FCR recorded at time of entry
  recorded_by   INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)     REFERENCES batches(id),
  FOREIGN KEY (house_id)     REFERENCES houses(id),
  FOREIGN KEY (feed_type_id) REFERENCES feed_types(id),
  FOREIGN KEY (recorded_by)  REFERENCES users(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 3: HEALTH & VETERINARY  (الصحة)
-- ============================================================

CREATE TABLE medications (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(300),
  category      ENUM('antibiotic','vaccine','vitamin','antifungal','antiparasitic','other') NOT NULL,
  unit          VARCHAR(20) NOT NULL DEFAULT 'ml',
  withdrawal_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  notes         TEXT
) ENGINE=InnoDB;

CREATE TABLE vaccination_schedules (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT UNSIGNED NOT NULL,
  vaccine_id    SMALLINT UNSIGNED NOT NULL,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  dose_per_bird VARCHAR(50),
  route         ENUM('water','spray','injection','eye_drop','wing_web') NOT NULL DEFAULT 'water',
  performed_by  INT UNSIGNED,
  status        ENUM('upcoming','done','missed') NOT NULL DEFAULT 'upcoming',
  notes         TEXT,
  FOREIGN KEY (batch_id)    REFERENCES batches(id),
  FOREIGN KEY (vaccine_id)  REFERENCES medications(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE health_events (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT UNSIGNED NOT NULL,
  event_type    ENUM('vaccination','medication','weighing','vet_visit','observation','culling') NOT NULL,
  event_date    DATE NOT NULL,
  description   VARCHAR(500),
  status        ENUM('upcoming','done','missed') NOT NULL DEFAULT 'done',
  performed_by  INT UNSIGNED,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)    REFERENCES batches(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE treatments (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id            INT UNSIGNED NOT NULL,
  medication_id       SMALLINT UNSIGNED NOT NULL,
  start_date          DATE NOT NULL,
  end_date            DATE,
  dosage_per_bird     VARCHAR(100),
  withdrawal_end_date DATE,                        -- critical: no sale before this date
  diagnosis           VARCHAR(500),
  prescribed_by       VARCHAR(150),               -- vet name (may not be a system user)
  recorded_by         INT UNSIGNED,
  notes               TEXT,
  FOREIGN KEY (batch_id)      REFERENCES batches(id),
  FOREIGN KEY (medication_id) REFERENCES medications(id),
  FOREIGN KEY (recorded_by)   REFERENCES users(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 4: MORTALITY TRACKING  (النفوق)
-- ============================================================

-- Detailed cause records (daily_logs has the count; this has the why)
CREATE TABLE mortality_records (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT UNSIGNED NOT NULL,
  house_id      SMALLINT UNSIGNED NOT NULL,
  record_date   DATE NOT NULL,
  count         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  cause         ENUM('heat_stress','disease','injury','culling','unknown','other') NOT NULL DEFAULT 'unknown',
  cause_notes   VARCHAR(500),
  recorded_by   INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)    REFERENCES batches(id),
  FOREIGN KEY (house_id)    REFERENCES houses(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 5: INVENTORY  (المخزون)
-- ============================================================

CREATE TABLE inventory_categories (
  id    TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(100)
) ENGINE=InnoDB;

CREATE TABLE inventory_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id       SMALLINT UNSIGNED NOT NULL,
  category_id   TINYINT UNSIGNED NOT NULL,
  name          VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(300),
  sku           VARCHAR(50),
  unit          VARCHAR(20) NOT NULL DEFAULT 'pcs',
  qty_on_hand   DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,4),
  expiry_date   DATE,
  brand         VARCHAR(100),
  remarks       TEXT,
  last_updated  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id)     REFERENCES farms(id),
  FOREIGN KEY (category_id) REFERENCES inventory_categories(id)
) ENGINE=InnoDB;

CREATE TABLE inventory_movements (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id       INT UNSIGNED NOT NULL,
  movement_type ENUM('in','out','adjustment') NOT NULL,
  qty           DECIMAL(12,2) NOT NULL,
  reference_type ENUM('purchase','issue','adjustment','sale','return') NOT NULL,
  reference_id  INT UNSIGNED,                      -- FK to relevant table (polymorphic)
  notes         TEXT,
  created_by    INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id)    REFERENCES inventory_items(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id       SMALLINT UNSIGNED NOT NULL,
  supplier_id   SMALLINT UNSIGNED,
  order_date    DATE NOT NULL,
  expected_date DATE,
  status        ENUM('draft','ordered','partial','received','cancelled') NOT NULL DEFAULT 'draft',
  total_amount  DECIMAL(12,2),
  notes         TEXT,
  created_by    INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id)     REFERENCES farms(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  po_id         INT UNSIGNED NOT NULL,
  item_id       INT UNSIGNED NOT NULL,
  qty_ordered   DECIMAL(12,2) NOT NULL,
  qty_received  DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_price    DECIMAL(10,4) NOT NULL,
  FOREIGN KEY (po_id)    REFERENCES purchase_orders(id),
  FOREIGN KEY (item_id)  REFERENCES inventory_items(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 6: SALES & FINANCE  (المبيعات والمالية)
-- ============================================================

CREATE TABLE buyers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  name_ar       VARCHAR(300),
  contact_name  VARCHAR(100),
  phone         VARCHAR(30),
  email         VARCHAR(150),
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sales_orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no      VARCHAR(30) NOT NULL UNIQUE,       -- 'SO-2025-001'
  batch_id      INT UNSIGNED NOT NULL,
  buyer_id      INT UNSIGNED,
  order_date    DATE NOT NULL,
  delivery_date DATE,
  qty_kg        DECIMAL(10,2) NOT NULL,
  price_per_kg  DECIMAL(8,4) NOT NULL,
  total_amount  DECIMAL(12,2) GENERATED ALWAYS AS (qty_kg * price_per_kg) STORED,
  status        ENUM('pending','delivered','completed','cancelled') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  notes         TEXT,
  created_by    INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)   REFERENCES batches(id),
  FOREIGN KEY (buyer_id)   REFERENCES buyers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- Cost tracking per batch (non-feed, non-med expenses)
CREATE TABLE expenses (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT UNSIGNED,                      -- NULL = farm-level overhead
  farm_id       SMALLINT UNSIGNED NOT NULL,
  category      ENUM('labor','utilities','maintenance','transport','chicks','other') NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  expense_date  DATE NOT NULL,
  description   VARCHAR(500),
  recorded_by   INT UNSIGNED,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id)    REFERENCES batches(id),
  FOREIGN KEY (farm_id)     REFERENCES farms(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB;


-- ============================================================
-- MODULE 7: NOTIFICATIONS / ALERTS  (التنبيهات)
-- ============================================================

CREATE TABLE alerts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farm_id       SMALLINT UNSIGNED NOT NULL,
  alert_type    ENUM('mortality_high','feed_low','vaccination_due','withdrawal_active','batch_harvest','other') NOT NULL,
  severity      ENUM('info','warning','danger') NOT NULL DEFAULT 'warning',
  batch_id      INT UNSIGNED,
  message       VARCHAR(500) NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id)  REFERENCES farms(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
) ENGINE=InnoDB;


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Active batch summary (used by Batches page table)
CREATE OR REPLACE VIEW v_batch_summary AS
SELECT
  b.id,
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
  b.status,
  COALESCE(dl.current_count, b.initial_count)      AS current_count,
  COALESCE(
    (b.initial_count - dl.current_count) / b.initial_count * 100, 0
  )                                                AS mortality_pct,
  COALESCE(fi.total_feed_kg, 0)                    AS total_feed_kg,
  COALESCE(
    fi.total_feed_kg / NULLIF((dl.current_count * dl.avg_weight_g / 1000), 0), 0
  )                                                AS fcr,
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
) fi ON fi.batch_id = b.id;

-- Feed stock with days-remaining estimate
CREATE OR REPLACE VIEW v_feed_stock_status AS
SELECT
  ft.id,
  ft.name,
  ft.name_ar,
  fs.qty_on_hand_kg,
  fs.reorder_qty_kg,
  COALESCE(daily.avg_daily_consumption_kg, 0)      AS avg_daily_kg,
  CASE
    WHEN COALESCE(daily.avg_daily_consumption_kg, 0) = 0 THEN NULL
    ELSE FLOOR(fs.qty_on_hand_kg / daily.avg_daily_consumption_kg)
  END                                              AS days_remaining,
  CASE
    WHEN fs.qty_on_hand_kg <= 0               THEN 'out_of_stock'
    WHEN fs.qty_on_hand_kg <= fs.reorder_qty_kg THEN 'low'
    ELSE 'ok'
  END                                              AS stock_status
FROM feed_types ft
JOIN feed_stock fs ON fs.feed_type_id = ft.id
LEFT JOIN (
  SELECT feed_type_id, AVG(qty_kg) AS avg_daily_consumption_kg
  FROM feed_issues
  WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  GROUP BY feed_type_id
) daily ON daily.feed_type_id = ft.id;

-- Mortality rate per batch (7-day rolling)
CREATE OR REPLACE VIEW v_mortality_rate_7d AS
SELECT
  m.batch_id,
  b.batch_no,
  h.name                                           AS house,
  SUM(m.count)                                     AS total_deaths_7d,
  dl.current_count,
  ROUND(SUM(m.count) / NULLIF(b.initial_count, 0) * 100, 3) AS mortality_rate_pct
FROM mortality_records m
JOIN batches b  ON m.batch_id  = b.id
JOIN houses  h  ON m.house_id  = h.id
LEFT JOIN (
  SELECT batch_id, current_count
  FROM batch_daily_logs
  WHERE (batch_id, log_date) IN (
    SELECT batch_id, MAX(log_date) FROM batch_daily_logs GROUP BY batch_id
  )
) dl ON dl.batch_id = m.batch_id
WHERE m.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY m.batch_id, b.batch_no, h.name, dl.current_count, b.initial_count;

-- Upcoming vaccinations (next 7 days)
CREATE OR REPLACE VIEW v_upcoming_vaccinations AS
SELECT
  vs.id,
  b.batch_no,
  h.name                                           AS house,
  med.name                                         AS vaccine,
  vs.scheduled_date,
  DATEDIFF(vs.scheduled_date, CURDATE())           AS days_until,
  vs.route,
  vs.status
FROM vaccination_schedules vs
JOIN batches     b   ON vs.batch_id  = b.id
JOIN houses      h   ON b.house_id   = h.id
JOIN medications med ON vs.vaccine_id = med.id
WHERE vs.status = 'upcoming'
  AND vs.scheduled_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY vs.scheduled_date;

-- Batch P&L summary (revenue - feed costs - other expenses)
CREATE OR REPLACE VIEW v_batch_pnl AS
SELECT
  b.id                                             AS batch_id,
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
) ex ON ex.batch_id = b.id;


-- ============================================================
-- SEED: ROLES & INVENTORY CATEGORIES
-- ============================================================

INSERT INTO roles (name, name_ar, permissions) VALUES
  ('admin',       'مدير النظام',    '{"all": true}'),
  ('manager',     'مدير المزرعة',   '{"read": true, "write": true, "delete": true}'),
  ('farm_worker', 'عامل المزرعة',   '{"read": true, "write": true}'),
  ('vet',         'الطبيب البيطري', '{"read": true, "write": ["health_events","treatments","vaccination_schedules"]}');

INSERT INTO inventory_categories (name, name_ar) VALUES
  ('Feed',       'أعلاف'),
  ('Medicine',   'أدوية'),
  ('Supplies',   'مستلزمات'),
  ('Equipment',  'معدات'),
  ('Disinfectant','مطهرات');

SET FOREIGN_KEY_CHECKS = 1;
