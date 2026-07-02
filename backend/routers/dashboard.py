from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, Batch, BatchDailyLog, FeedStock, FeedType, MortalityRecord, VaccinationSchedule
from models.models import EggCollection, EggInventory
from routers.auth import get_current_user
from schemas.schemas import DashboardKPI, LayerDashboardKPI

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=DashboardKPI)
def get_dashboard(
    farm_id: int = 1,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
        if not farm_id:
            raise HTTPException(status_code=403, detail="No farm assigned to your account. Contact your administrator.")

    from models import Farm
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role_id not in (6,) and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to this farm's dashboard")

    farm_batches = db.query(Batch).filter(Batch.farm_id == farm_id)

    total_batches  = farm_batches.count()
    active_batches = farm_batches.filter(Batch.status == "active").count()
    harvest_soon   = farm_batches.filter(Batch.status == "harvest_soon").count()

    # Sum current bird count from latest daily log per batch
    total_birds_row = db.execute(text("""
        SELECT COALESCE(SUM(dl.current_count), 0)
        FROM batches b
        LEFT JOIN batch_daily_logs dl
          ON dl.batch_id = b.id
          AND dl.log_date = (
            SELECT MAX(log_date) FROM batch_daily_logs WHERE batch_id = b.id
          )
        WHERE b.farm_id = :farm_id
          AND b.status IN ('active', 'harvest_soon')
    """), {"farm_id": farm_id}).scalar()

    # 7-day mortality rate across farm
    mort_row = db.execute(text("""
        SELECT
          COALESCE(SUM(m.count), 0)              AS deaths,
          COALESCE(SUM(b.initial_count), 1)      AS placed
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND m.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """), {"farm_id": farm_id}).mappings().one()
    mortality_rate = round(mort_row["deaths"] / mort_row["placed"] * 100, 3)

    # Cumulative mortality rate: all-time deaths / all-time birds placed (active batches)
    cumul_row = db.execute(text("""
        SELECT
          COALESCE(SUM(m.count), 0)         AS total_deaths,
          COALESCE(SUM(b.initial_count), 1) AS total_placed
        FROM batches b
        LEFT JOIN mortality_records m ON m.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND b.status IN ('active', 'harvest_soon')
    """), {"farm_id": farm_id}).mappings().one()
    cumulative_mortality_rate = round(
        cumul_row["total_deaths"] / cumul_row["total_placed"] * 100, 3
    )

    # Minimum days remaining across all feed types
    days_row = db.execute(text("""
        SELECT MIN(
          CASE
            WHEN avg_daily.qty > 0
            THEN FLOOR(fs.qty_on_hand_kg / avg_daily.qty)
            ELSE NULL
          END
        ) AS min_days
        FROM feed_stock fs
        JOIN (
          SELECT feed_type_id, AVG(qty_kg) AS qty
          FROM feed_issues
          WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY feed_type_id
        ) avg_daily ON avg_daily.feed_type_id = fs.feed_type_id
    """)).scalar()

    pending_vaccinations = db.query(VaccinationSchedule).join(Batch).filter(
        Batch.farm_id == farm_id,
        VaccinationSchedule.status == "upcoming",
    ).count()

    unread_alerts = db.query(Alert).filter(
        Alert.farm_id == farm_id,
        Alert.is_read == False,
    ).count()

    return DashboardKPI(
        total_batches=total_batches,
        active_batches=active_batches,
        harvest_soon=harvest_soon,
        total_birds=int(total_birds_row or 0),
        mortality_rate_7d=mortality_rate,
        cumulative_mortality_rate=cumulative_mortality_rate,
        feed_stock_days=float(days_row) if days_row is not None else None,
        pending_vaccinations=pending_vaccinations,
        unread_alerts=unread_alerts,
    )


@router.get("/layer-kpis", response_model=LayerDashboardKPI)
def get_layer_dashboard(
    farm_id: int = 1,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
        if not farm_id:
            raise HTTPException(status_code=403, detail="No farm assigned to your account.")

    from models import Farm
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role_id not in (6,) and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to this farm's dashboard")

    cid = current_user.company_id

    # ── Flock counts ──────────────────────────────────────────────────────────
    flock_q = db.query(Batch).filter(Batch.farm_id == farm_id, Batch.company_id == cid)
    total_flocks  = flock_q.count()
    active_flocks = flock_q.filter(Batch.status == "active").count()

    # ── Bird counts with correct formula ──────────────────────────────────────
    # Active Birds = Initial − Mortality (incl. cullings) − Spent Hen Sales
    # Cullings are in mortality_records with cause='culling' so SUM(count) covers all removals
    bird_row = db.execute(text("""
        SELECT
            COALESCE(SUM(b.initial_count), 0)   AS initial_count,
            COALESCE(SUM(mr.all_deaths), 0)     AS all_deaths,
            COALESCE(SUM(mr.true_deaths), 0)    AS mortality_count,
            COALESCE(SUM(mr.culling_count), 0)  AS culling_count
        FROM batches b
        LEFT JOIN (
            SELECT batch_id,
                   SUM(count)                                               AS all_deaths,
                   SUM(CASE WHEN cause != 'culling' THEN count ELSE 0 END) AS true_deaths,
                   SUM(CASE WHEN cause  = 'culling' THEN count ELSE 0 END) AS culling_count
            FROM mortality_records
            GROUP BY batch_id
        ) mr ON mr.batch_id = b.id
        WHERE b.farm_id = :fid AND b.company_id = :cid AND b.status = 'active'
    """), {"fid": farm_id, "cid": cid}).mappings().one()

    spent_hens_row = db.execute(text("""
        SELECT COALESCE(SUM(birds_sold), 0) AS birds_sold,
               COALESCE(SUM(total_amount), 0) AS revenue
        FROM spent_hen_sales
        WHERE farm_id = :fid AND company_id = :cid
    """), {"fid": farm_id, "cid": cid}).mappings().one()

    initial_birds    = int(bird_row["initial_count"] or 0)
    all_deaths       = int(bird_row["all_deaths"] or 0)
    mortality_count  = int(bird_row["mortality_count"] or 0)
    culling_count    = int(bird_row["culling_count"] or 0)
    spent_hen_count  = int(spent_hens_row["birds_sold"] or 0)
    spent_hen_revenue= float(spent_hens_row["revenue"] or 0)

    # Active Birds = Initial − all mortality records − spent hen sales
    total_live_birds = max(0, initial_birds - all_deaths - spent_hen_count)

    # Livability % = Active ÷ Initial × 100
    livability_pct  = round(total_live_birds / initial_birds * 100, 2) if initial_birds > 0 else 0.0
    # Mortality % = True deaths ÷ Initial × 100
    mortality_pct   = round(mortality_count / initial_birds * 100, 3) if initial_birds > 0 else 0.0
    # Culling % = Cullings ÷ Initial × 100
    culling_pct     = round(culling_count / initial_birds * 100, 3) if initial_birds > 0 else 0.0

    # ── 7-day mortality rate ───────────────────────────────────────────────────
    mort7_row = db.execute(text("""
        SELECT COALESCE(SUM(m.count), 0) AS deaths,
               COALESCE(SUM(b.initial_count), 1) AS placed
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        WHERE b.farm_id = :fid AND m.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """), {"fid": farm_id}).mappings().one()
    mortality_rate_7d = round(mort7_row["deaths"] / mort7_row["placed"] * 100, 3)

    # ── Today's egg production ─────────────────────────────────────────────────
    today_row = db.execute(text("""
        SELECT
            COALESCE(SUM(total_collected), 0)                                              AS total,
            COALESCE(SUM(cracked_count), 0)                                               AS cracked,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.reject')),  0)                   AS reject,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.waste')),   0)                   AS waste,
            COALESCE(SUM(JSON_EXTRACT(feed_water_log, '$.feed_kg')), NULL)                AS feed_kg,
            COALESCE(SUM(JSON_EXTRACT(feed_water_log, '$.water_liters')), NULL)           AS water_l
        FROM egg_collections
        WHERE farm_id = :fid AND company_id = :cid AND collect_date = CURDATE()
    """), {"fid": farm_id, "cid": cid}).mappings().one()

    today_eggs     = int(today_row["total"] or 0)
    today_reject   = int(today_row["reject"] or 0)
    today_waste    = int(today_row["waste"] or 0)
    today_cracked  = int(today_row["cracked"] or 0)
    # Saleable = Total − Cracked − Reject − Waste
    today_saleable = max(0, today_eggs - today_cracked - today_reject - today_waste)
    today_trays    = round(today_eggs / 30, 2)

    # Hen-Day % = Today Eggs ÷ Active Birds × 100
    hen_day_pct    = round(today_eggs / total_live_birds * 100, 2) if total_live_birds > 0 else 0.0
    # Hen-Housed % = Today Eggs ÷ Initial Head Count × 100
    hen_housed_pct = round(today_eggs / initial_birds * 100, 2) if initial_birds > 0 else 0.0
    # Average Eggs Per Hen = Today Eggs ÷ Active Birds
    avg_eggs_per_hen = round(today_eggs / total_live_birds, 4) if total_live_birds > 0 else 0.0

    # Feed & Water Per Bird
    raw_feed  = today_row["feed_kg"]
    raw_water = today_row["water_l"]
    feed_consumed_kg = float(raw_feed)  if raw_feed  is not None else None
    water_consumed_l = float(raw_water) if raw_water is not None else None
    feed_per_bird  = round(feed_consumed_kg  / total_live_birds, 4) if feed_consumed_kg  and total_live_birds > 0 else None
    water_per_bird = round(water_consumed_l / total_live_birds, 4) if water_consumed_l and total_live_birds > 0 else None

    # ── Production trends (7d and 30d daily averages) ─────────────────────────
    def _avg_daily(days: int) -> float:
        row = db.execute(text("""
            SELECT COALESCE(SUM(total_collected), 0) / GREATEST(:days, 1) AS avg_eggs
            FROM egg_collections
            WHERE farm_id = :fid AND company_id = :cid
              AND collect_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
        """), {"fid": farm_id, "cid": cid, "days": days}).scalar()
        return round(float(row or 0), 1)

    avg_7d_eggs  = _avg_daily(7)
    avg_30d_eggs = _avg_daily(30)

    # ── Defect rate & distributions (7-day window) ────────────────────────────
    defect_row = db.execute(text("""
        SELECT
            COALESCE(SUM(cracked_count), 0)                                    AS cracked,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.soft_shell')),  0)    AS soft_shell,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.double_yolk')), 0)    AS double_yolk,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.dirty')),       0)    AS dirty,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.misshaped')),   0)    AS misshaped,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.reject')),      0)    AS reject,
            COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.waste')),       0)    AS waste,
            COALESCE(SUM(total_collected), 1)                                  AS total
        FROM egg_collections
        WHERE farm_id = :fid AND company_id = :cid
          AND collect_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """), {"fid": farm_id, "cid": cid}).mappings().one()

    d_total = int(defect_row["total"]) or 1

    def _pct(n):
        return round(int(n or 0) / d_total * 100, 2)

    defect_rate = round(
        (int(defect_row["cracked"] or 0) + int(defect_row["soft_shell"] or 0)
         + int(defect_row["double_yolk"] or 0) + int(defect_row["dirty"] or 0)
         + int(defect_row["misshaped"] or 0) + int(defect_row["reject"] or 0)
         + int(defect_row["waste"] or 0)) / d_total * 100, 2
    )
    defect_distribution = {
        "cracked":     {"count": int(defect_row["cracked"] or 0),     "pct": _pct(defect_row["cracked"])},
        "soft_shell":  {"count": int(defect_row["soft_shell"] or 0),  "pct": _pct(defect_row["soft_shell"])},
        "double_yolk": {"count": int(defect_row["double_yolk"] or 0), "pct": _pct(defect_row["double_yolk"])},
        "dirty":       {"count": int(defect_row["dirty"] or 0),       "pct": _pct(defect_row["dirty"])},
        "misshaped":   {"count": int(defect_row["misshaped"] or 0),   "pct": _pct(defect_row["misshaped"])},
        "reject":      {"count": int(defect_row["reject"] or 0),      "pct": _pct(defect_row["reject"])},
        "waste":       {"count": int(defect_row["waste"] or 0),       "pct": _pct(defect_row["waste"])},
    }

    # ── Grade distribution (all-time from grading records) ────────────────────
    grade_row = db.execute(text("""
        SELECT
            COALESCE(SUM(size_peewee), 0) AS peewee,
            COALESCE(SUM(size_s),      0) AS s,
            COALESCE(SUM(size_m),      0) AS m,
            COALESCE(SUM(size_l),      0) AS l,
            COALESCE(SUM(size_xl),     0) AS xl,
            COALESCE(SUM(size_jumbo),  0) AS jumbo,
            COALESCE(SUM(dirty_count), 0) AS dirty
        FROM egg_gradings
        WHERE farm_id = :fid AND company_id = :cid
    """), {"fid": farm_id, "cid": cid}).mappings().one()

    g_total = sum(int(v or 0) for v in grade_row.values()) or 1

    def _gpct(n):
        return round(int(n or 0) / g_total * 100, 2)

    grade_distribution = {
        "peewee": {"count": int(grade_row["peewee"] or 0), "pct": _gpct(grade_row["peewee"])},
        "small":  {"count": int(grade_row["s"] or 0),      "pct": _gpct(grade_row["s"])},
        "medium": {"count": int(grade_row["m"] or 0),      "pct": _gpct(grade_row["m"])},
        "large":  {"count": int(grade_row["l"] or 0),      "pct": _gpct(grade_row["l"])},
        "xl":     {"count": int(grade_row["xl"] or 0),     "pct": _gpct(grade_row["xl"])},
        "jumbo":  {"count": int(grade_row["jumbo"] or 0),  "pct": _gpct(grade_row["jumbo"])},
        "dirty":  {"count": int(grade_row["dirty"] or 0),  "pct": _gpct(grade_row["dirty"])},
    }

    # ── Inventory ─────────────────────────────────────────────────────────────
    inv_total = db.execute(text("""
        SELECT COALESCE(SUM(stock_qty), 0) FROM egg_inventories
        WHERE farm_id = :fid AND company_id = :cid
    """), {"fid": farm_id, "cid": cid}).scalar()
    total_egg_inventory = int(inv_total or 0)

    # ── Sales ─────────────────────────────────────────────────────────────────
    month_sales = db.execute(text("""
        SELECT COALESCE(SUM(total_amount), 0)
        FROM egg_sales_orders
        WHERE farm_id = :fid AND company_id = :cid AND status != 'cancelled'
          AND MONTH(order_date) = MONTH(CURDATE())
          AND YEAR(order_date)  = YEAR(CURDATE())
    """), {"fid": farm_id, "cid": cid}).scalar()
    month_sales_amount = float(month_sales or 0)

    today_sales = db.execute(text("""
        SELECT COALESCE(SUM(total_amount), 0)
        FROM egg_sales_orders
        WHERE farm_id = :fid AND company_id = :cid AND status != 'cancelled'
          AND order_date = CURDATE()
    """), {"fid": farm_id, "cid": cid}).scalar()
    today_sales_revenue = float(today_sales or 0)

    # ── Feed stock days ────────────────────────────────────────────────────────
    days_row = db.execute(text("""
        SELECT MIN(
          CASE WHEN avg_daily.qty > 0
               THEN FLOOR(fs.qty_on_hand_kg / avg_daily.qty)
               ELSE NULL END
        ) AS min_days
        FROM feed_stock fs
        JOIN (
          SELECT feed_type_id, AVG(qty_kg) AS qty
          FROM feed_issues
          WHERE issue_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY feed_type_id
        ) avg_daily ON avg_daily.feed_type_id = fs.feed_type_id
    """)).scalar()

    pending_vaccinations = db.query(VaccinationSchedule).join(Batch).filter(
        Batch.farm_id == farm_id, VaccinationSchedule.status == "upcoming",
    ).count()

    unread_alerts = db.query(Alert).filter(
        Alert.farm_id == farm_id, Alert.is_read == False,  # noqa: E712
    ).count()

    return LayerDashboardKPI(
        total_flocks=total_flocks,
        active_flocks=active_flocks,
        initial_birds=initial_birds,
        total_live_birds=total_live_birds,
        spent_hen_count=spent_hen_count,
        mortality_count=mortality_count,
        mortality_pct=mortality_pct,
        culling_count=culling_count,
        culling_pct=culling_pct,
        livability_pct=livability_pct,
        mortality_rate_7d=mortality_rate_7d,
        today_eggs=today_eggs,
        today_saleable=today_saleable,
        today_trays=today_trays,
        hen_day_pct=hen_day_pct,
        hen_housed_pct=hen_housed_pct,
        avg_eggs_per_hen=avg_eggs_per_hen,
        feed_consumed_kg=feed_consumed_kg,
        water_consumed_l=water_consumed_l,
        feed_per_bird=feed_per_bird,
        water_per_bird=water_per_bird,
        avg_7d_eggs=avg_7d_eggs,
        avg_30d_eggs=avg_30d_eggs,
        defect_rate=defect_rate,
        grade_distribution=grade_distribution,
        defect_distribution=defect_distribution,
        total_egg_inventory=total_egg_inventory,
        month_sales_amount=month_sales_amount,
        today_sales_revenue=today_sales_revenue,
        spent_hen_revenue=spent_hen_revenue,
        feed_stock_days=float(days_row) if days_row is not None else None,
        pending_vaccinations=pending_vaccinations,
        unread_alerts=unread_alerts,
    )
