-- ============================================================
-- RTL Poultry Farming ERP — Sample Seed Data
-- Run after schema.sql
-- ============================================================

USE poultry_erp;

-- ---- Farms ----
INSERT INTO farms (id, name, name_ar, location) VALUES
  (1, 'RTL Main Farm',  'المزرعة الرئيسية', 'المنطقة الشمالية'),
  (2, 'RTL North Farm', 'المزرعة الشمالية', 'المنطقة الشرقية');

-- ---- Houses ----
INSERT INTO houses (id, farm_id, name, capacity, house_type) VALUES
  (1, 1, 'House A-1', 10000, 'broiler'),
  (2, 1, 'House A-2', 10000, 'broiler'),
  (3, 1, 'House B-1',  8000, 'broiler'),
  (4, 1, 'House B-2',  8000, 'broiler'),
  (5, 1, 'House C-1',  6000, 'layer'),
  (6, 1, 'House C-2',  6000, 'layer'),
  (7, 2, 'House N-1', 12000, 'broiler'),
  (8, 2, 'House N-2', 12000, 'broiler');

-- ---- Breeds ----
INSERT INTO breeds (id, name, type, target_fcr, target_daily_gain_g) VALUES
  (1, 'Ross 308',       'broiler', 1.70, 68),
  (2, 'Cobb 500',       'broiler', 1.72, 65),
  (3, 'Lohmann Brown',  'layer',   NULL, NULL),
  (4, 'Hy-Line Brown',  'layer',   NULL, NULL);

-- ---- Users ----
INSERT INTO users (id, farm_id, role_id, full_name, email, password_hash) VALUES
  (1, 1, 1, 'Ahmad Al-Rashidi',  'admin@rtl-poultry.com',   '$2b$12$placeholder_hash_admin'),
  (2, 1, 2, 'Mariam Khalil',     'manager@rtl-poultry.com', '$2b$12$placeholder_hash_mgr'),
  (3, 1, 3, 'Yusuf Salam',       'worker1@rtl-poultry.com', '$2b$12$placeholder_hash_w1'),
  (4, 1, 4, 'Dr. Lina Haddad',   'vet@rtl-poultry.com',     '$2b$12$placeholder_hash_vet');

-- ---- Batches ----
INSERT INTO batches (id, batch_no, house_id, farm_id, breed_id, placed_date, initial_count, cycle_length_days, status, created_by) VALUES
  (1,  'BATCH-2025-01', 1, 1, 1, '2025-03-01', 9800,  42, 'harvested', 2),
  (2,  'BATCH-2025-02', 2, 1, 2, '2025-03-15', 9500,  42, 'harvested', 2),
  (3,  'BATCH-2025-03', 5, 1, 3, '2025-01-10', 5800,  365,'active',    2),
  (4,  'BATCH-2025-04', 3, 1, 1, '2025-05-01', 7800,  42, 'harvested', 2),
  (5,  'BATCH-2025-05', 4, 1, 2, '2025-05-20', 7600,  42, 'harvested', 2),
  (6,  'BATCH-2025-06', 6, 1, 4, '2025-02-01', 5500,  365,'active',    2),
  (7,  'BATCH-2025-07', 7, 2, 1, '2025-06-01', 11500, 42, 'active',    2),
  (8,  'BATCH-2025-08', 1, 1, 2, '2025-06-10', 9900,  42, 'active',    2),
  (9,  'BATCH-2025-09', 3, 1, 1, '2025-06-12', 7700,  42, 'active',    2),
  (10, 'BATCH-2025-10', 2, 1, 2, '2025-06-14', 9200,  42, 'active',    2),
  (11, 'BATCH-2025-11', 4, 1, 1, '2025-06-15', 7500,  42, 'harvest_soon', 2),
  (12, 'BATCH-2025-12', 8, 2, 2, '2025-06-01', 11200, 42, 'active',    2);

-- ---- Batch Daily Logs (latest entry per active batch) ----
INSERT INTO batch_daily_logs (batch_id, log_date, current_count, mortality_count, avg_weight_g, recorded_by) VALUES
  (7,  '2025-06-17', 11380, 8,  1250, 3),
  (8,  '2025-06-17', 9855,  5,  980,  3),
  (9,  '2025-06-17', 7670,  6,  1050, 3),
  (10, '2025-06-17', 9165,  7,  900,  3),
  (11, '2025-06-17', 7395,  4,  2450, 3),
  (12, '2025-06-17', 11110, 9,  1310, 3),
  (3,  '2025-06-17', 5650,  12, NULL, 3),
  (6,  '2025-06-17', 5390,  9,  NULL, 3);

-- ---- Feed Types ----
INSERT INTO feed_types (id, name, name_ar, protein_pct, energy_kcal, unit) VALUES
  (1, 'Starter',  'علف البادئ',   22.0, 3050, 'kg'),
  (2, 'Grower',   'علف النامي',   20.0, 3100, 'kg'),
  (3, 'Finisher', 'علف الناهي',   18.0, 3150, 'kg'),
  (4, 'Layer Mix','خلطة البياض',  17.5, 2800, 'kg');

-- ---- Suppliers ----
INSERT INTO suppliers (id, name, name_ar, contact_name, phone) VALUES
  (1, 'Al-Noor Feed Co.',      'شركة النور للأعلاف',       'Khalid Noor',   '+966-11-1234567'),
  (2, 'Gulf Agro Supplies',    'الخليج للمستلزمات الزراعية','Hassan Qasim',  '+966-11-7654321'),
  (3, 'Medvet Pharma',         'ميدفيت للأدوية البيطرية',  'Dr. Sara Ahmad', '+966-11-9876543');

-- ---- Feed Stock ----
INSERT INTO feed_stock (feed_type_id, qty_on_hand_kg, reorder_qty_kg) VALUES
  (1, 12500.00, 5000.00),
  (2, 28000.00, 8000.00),
  (3, 9800.00,  5000.00),
  (4, 6200.00,  4000.00);

-- ---- Feed Purchases ----
INSERT INTO feed_purchases (feed_type_id, supplier_id, purchase_date, qty_kg, cost_per_kg, invoice_no, created_by) VALUES
  (1, 1, '2025-06-01', 10000, 0.85, 'INV-2025-0601', 2),
  (2, 1, '2025-06-01', 20000, 0.78, 'INV-2025-0602', 2),
  (3, 1, '2025-06-05', 15000, 0.72, 'INV-2025-0603', 2),
  (4, 2, '2025-06-05', 8000,  0.80, 'INV-2025-0604', 2);

-- ---- Feed Issues (recent) ----
INSERT INTO feed_issues (batch_id, house_id, feed_type_id, issue_date, qty_kg, fcr_snapshot, recorded_by) VALUES
  (8,  1, 1, '2025-06-16', 420.00, 1.65, 3),
  (8,  1, 1, '2025-06-17', 435.00, 1.66, 3),
  (9,  3, 2, '2025-06-16', 360.00, 1.71, 3),
  (9,  3, 2, '2025-06-17', 372.00, 1.72, 3),
  (10, 2, 1, '2025-06-16', 410.00, 1.68, 3),
  (10, 2, 1, '2025-06-17', 418.00, 1.68, 3),
  (11, 4, 3, '2025-06-16', 890.00, 1.73, 3),
  (11, 4, 3, '2025-06-17', 875.00, 1.72, 3),
  (7,  7, 2, '2025-06-16', 510.00, 1.70, 3),
  (7,  7, 2, '2025-06-17', 525.00, 1.69, 3),
  (3,  5, 4, '2025-06-16', 280.00, NULL, 3),
  (6,  6, 4, '2025-06-17', 265.00, NULL, 3);

-- ---- Medications ----
INSERT INTO medications (id, name, name_ar, category, unit, withdrawal_days) VALUES
  (1,  'Newcastle Disease Vaccine (ND)',    'لقاح مرض نيوكاسل',  'vaccine',     'dose', 0),
  (2,  'Infectious Bronchitis Vaccine (IB)','لقاح التهاب الشعب',  'vaccine',     'dose', 0),
  (3,  'Marek\'s Disease Vaccine',          'لقاح مرض ماريك',     'vaccine',     'dose', 0),
  (4,  'Gumboro Vaccine (IBD)',             'لقاح الغامبورو',      'vaccine',     'dose', 0),
  (5,  'Enrofloxacin 10%',                 'إنروفلوكساسين 10٪',  'antibiotic',  'ml',   10),
  (6,  'Amoxicillin 50%',                  'أموكسيسيلين 50٪',    'antibiotic',  'g',    7),
  (7,  'Multivitamin Complex',             'مركب فيتامينات متعدد','vitamin',     'ml',   0),
  (8,  'Anticoccidial (Amprolium)',         'مضاد الكوكسيديا',     'antiparasitic','g',   3);

-- ---- Vaccination Schedules ----
INSERT INTO vaccination_schedules (batch_id, vaccine_id, scheduled_date, completed_date, route, status, performed_by) VALUES
  (8, 1, '2025-06-12', '2025-06-12', 'eye_drop', 'done',     4),
  (8, 2, '2025-06-12', '2025-06-12', 'spray',    'done',     4),
  (8, 4, '2025-06-19', NULL,         'water',    'upcoming', 4),
  (8, 1, '2025-06-26', NULL,         'water',    'upcoming', 4),
  (9, 1, '2025-06-14', '2025-06-14', 'eye_drop', 'done',     4),
  (9, 4, '2025-06-21', NULL,         'water',    'upcoming', 4),
  (7, 1, '2025-06-03', '2025-06-03', 'eye_drop', 'done',     4),
  (7, 2, '2025-06-03', '2025-06-03', 'spray',    'done',     4),
  (7, 4, '2025-06-17', NULL,         'water',    'upcoming', 4);

-- ---- Mortality Records ----
INSERT INTO mortality_records (batch_id, house_id, record_date, count, cause, recorded_by) VALUES
  (8,  1, '2025-06-15', 3, 'heat_stress', 3),
  (8,  1, '2025-06-16', 2, 'unknown',     3),
  (8,  1, '2025-06-17', 5, 'heat_stress', 3),
  (9,  3, '2025-06-15', 4, 'disease',     3),
  (9,  3, '2025-06-16', 6, 'disease',     3),
  (9,  3, '2025-06-17', 6, 'disease',     3),
  (11, 4, '2025-06-16', 2, 'culling',     3),
  (11, 4, '2025-06-17', 4, 'culling',     3),
  (7,  7, '2025-06-16', 5, 'heat_stress', 3),
  (7,  7, '2025-06-17', 8, 'heat_stress', 3);

-- ---- Inventory Items ----
INSERT INTO inventory_items (id, farm_id, category_id, name, name_ar, unit, qty_on_hand, reorder_level, cost_per_unit) VALUES
  (1,  1, 1, 'Starter Feed (Ross)',   'علف البادئ (روس)',       'kg',   12500, 5000, 0.85),
  (2,  1, 1, 'Grower Feed',           'علف النامي',             'kg',   28000, 8000, 0.78),
  (3,  1, 1, 'Finisher Feed',         'علف الناهي',             'kg',   9800,  5000, 0.72),
  (4,  1, 1, 'Layer Mix',             'خلطة البياض',            'kg',   6200,  4000, 0.80),
  (5,  1, 2, 'Newcastle Vaccine',     'لقاح نيوكاسل',           'dose', 50000, 10000, 0.05),
  (6,  1, 2, 'Gumboro Vaccine',       'لقاح الغامبورو',          'dose', 35000, 10000, 0.06),
  (7,  1, 2, 'Enrofloxacin 10%',      'إنروفلوكساسين 10٪',      'L',    8.5,   5,    45.00),
  (8,  1, 2, 'Amoxicillin 50%',       'أموكسيسيلين 50٪',        'kg',   12.0,  5,    38.00),
  (9,  1, 2, 'Multivitamin Complex',  'مركب فيتامينات',         'L',    4.0,   5,    22.00),
  (10, 1, 3, 'Nipple Drinkers',       'حلمات الشرب',            'pcs',  250,   50,   3.50),
  (11, 1, 3, 'Feeding Trays',         'صواني التغذية',          'pcs',  180,   40,   2.80),
  (12, 1, 4, 'Heating Brooder',       'حاضنة تدفئة',            'pcs',  12,    2,    180.00),
  (13, 1, 5, 'Formaldehyde 37%',      'فورمالدهيد 37٪',         'L',    3.2,   5,    8.00),
  (14, 1, 5, 'Virkon Disinfectant',   'فيركون مطهر',            'kg',   18.0,  5,    25.00);

-- ---- Buyers ----
INSERT INTO buyers (id, name, name_ar, contact_name, phone) VALUES
  (1, 'Al-Madinah Poultry Market', 'سوق المدينة للدواجن',   'Faris Khalil', '+966-11-2345678'),
  (2, 'Star Supermarket Chain',    'سلسلة نجم السوبرماركت', 'Noura Ahmad',  '+966-11-3456789'),
  (3, 'Al-Waha Restaurant Group',  'مجموعة مطاعم الواحة',   'Saeed Munir',  '+966-11-4567890'),
  (4, 'Riyadh Wholesale Hub',      'مركز الرياض للجملة',     'Omar Faleh',   '+966-11-5678901');

-- ---- Sales Orders ----
INSERT INTO sales_orders (order_no, batch_id, buyer_id, order_date, delivery_date, qty_kg, price_per_kg, status, payment_status, created_by) VALUES
  ('SO-2025-001', 1, 1, '2025-04-10', '2025-04-12', 18500.00, 9.20, 'completed', 'paid',    2),
  ('SO-2025-002', 2, 2, '2025-04-25', '2025-04-26', 16200.00, 9.35, 'completed', 'paid',    2),
  ('SO-2025-003', 4, 3, '2025-06-10', '2025-06-11', 14800.00, 9.50, 'completed', 'paid',    2),
  ('SO-2025-004', 5, 1, '2025-06-28', NULL,         14000.00, 9.45, 'pending',   'unpaid',  2),
  ('SO-2025-005', 11,4, '2025-06-30', NULL,         17500.00, 9.60, 'pending',   'unpaid',  2);

-- ---- Expenses ----
INSERT INTO expenses (batch_id, farm_id, category, amount, expense_date, description, recorded_by) VALUES
  (8,  1, 'chicks',      1980.00, '2025-06-10', 'Day-old chick purchase — 9,900 heads',        2),
  (8,  1, 'labor',        350.00, '2025-06-17', 'Weekly labor allocation — House A-1',          2),
  (8,  1, 'utilities',    180.00, '2025-06-17', 'Electricity & water — House A-1',              2),
  (9,  1, 'chicks',      1540.00, '2025-06-12', 'Day-old chick purchase — 7,700 heads',         2),
  (9,  1, 'labor',        280.00, '2025-06-17', 'Weekly labor — House B-1',                    2),
  (11, 1, 'chicks',      1500.00, '2025-06-15', 'Day-old chick purchase — 7,500 heads',         2),
  (11, 1, 'maintenance',  250.00, '2025-06-16', 'Drinker line repair — House B-2',              2),
  (NULL,1, 'utilities',   900.00, '2025-06-17', 'Farm-level electricity — June 2nd half',       2);

-- ---- Alerts ----
INSERT INTO alerts (farm_id, alert_type, severity, batch_id, message) VALUES
  (1, 'mortality_high',   'danger',  9,  'معدل نفوق مرتفع في الحظيرة B-1 — ١.٨٪ (٧ أيام)'),
  (1, 'feed_low',         'warning', NULL,'مخزون علف الناهي أقل من المستهدف — ٩٫٨ طن متبقي'),
  (1, 'vaccination_due',  'info',    8,  'تطعيم الغامبورو مستحق غداً — الدُفعة BATCH-2025-08'),
  (1, 'vaccination_due',  'info',    9,  'تطعيم الغامبورو مستحق غداً — الدُفعة BATCH-2025-09'),
  (1, 'batch_harvest',    'warning', 11, 'الدُفعة BATCH-2025-11 جاهزة للحصاد خلال ٧ أيام');
