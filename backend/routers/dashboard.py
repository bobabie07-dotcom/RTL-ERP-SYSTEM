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

    # Flock counts (layer uses batches as flocks)
    flock_q = db.query(Batch).filter(Batch.farm_id == farm_id, Batch.company_id == cid)
    total_flocks  = flock_q.count()
    active_flocks = flock_q.filter(Batch.status == "active").count()

    # Live birds = initial_count - mortality - cullings (dynamic)
    live_birds_row = db.execute(text("""
        SELECT COALESCE(SUM(b.initial_count), 0)
             - COALESCE(SUM(m.deaths), 0) AS live_birds
        FROM batches b
        LEFT JOIN (
            SELECT batch_id, SUM(count) AS deaths
            FROM mortality_records
            GROUP BY batch_id
        ) m ON m.batch_id = b.id
        WHERE b.farm_id = :fid AND b.company_id = :cid
          AND b.status = 'active'
    """), {"fid": farm_id, "cid": cid}).scalar()
    total_live_birds = int(live_birds_row or 0)

    # 7-day mortality rate
    mort_row = db.execute(text("""
        SELECT COALESCE(SUM(m.count),0) AS deaths, COALESCE(SUM(b.initial_count),1) AS placed
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        WHERE b.farm_id = :fid AND m.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """), {"fid": farm_id}).mappings().one()
    mortality_rate_7d = round(mort_row["deaths"] / mort_row["placed"] * 100, 3)

    # Today's egg collection
    today_row = db.execute(text("""
        SELECT COALESCE(SUM(total_collected), 0) AS eggs
        FROM egg_collections
        WHERE farm_id = :fid AND company_id = :cid AND collect_date = CURDATE()
    """), {"fid": farm_id, "cid": cid}).scalar()
    today_eggs = int(today_row or 0)

    # Hen-Day % = today eggs / live birds * 100
    hen_day_pct = round((today_eggs / total_live_birds * 100) if total_live_birds > 0 else 0.0, 2)

    # Defect rate = cracked / total collected (last 7 days)
    defect_row = db.execute(text("""
        SELECT COALESCE(SUM(cracked_count), 0) AS cracked,
               COALESCE(SUM(total_collected), 1) AS total
        FROM egg_collections
        WHERE farm_id = :fid AND company_id = :cid
          AND collect_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    """), {"fid": farm_id, "cid": cid}).mappings().one()
    defect_rate = round(defect_row["cracked"] / defect_row["total"] * 100, 2)

    # Total egg inventory
    inv_total = db.execute(text("""
        SELECT COALESCE(SUM(stock_qty), 0) FROM egg_inventories
        WHERE farm_id = :fid AND company_id = :cid
    """), {"fid": farm_id, "cid": cid}).scalar()
    total_egg_inventory = int(inv_total or 0)

    # Month egg sales revenue
    month_sales = db.execute(text("""
        SELECT COALESCE(SUM(total_amount), 0)
        FROM egg_sales_orders
        WHERE farm_id = :fid AND company_id = :cid
          AND status != 'cancelled'
          AND MONTH(order_date) = MONTH(CURDATE())
          AND YEAR(order_date) = YEAR(CURDATE())
    """), {"fid": farm_id, "cid": cid}).scalar()
    month_sales_amount = float(month_sales or 0)

    # Feed stock days (reuse same logic as broiler dashboard)
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
        Batch.farm_id == farm_id,
        VaccinationSchedule.status == "upcoming",
    ).count()

    unread_alerts = db.query(Alert).filter(
        Alert.farm_id == farm_id,
        Alert.is_read == False,  # noqa: E712
    ).count()

    return LayerDashboardKPI(
        total_flocks=total_flocks,
        active_flocks=active_flocks,
        total_live_birds=total_live_birds,
        mortality_rate_7d=mortality_rate_7d,
        today_eggs=today_eggs,
        hen_day_pct=hen_day_pct,
        defect_rate=defect_rate,
        total_egg_inventory=total_egg_inventory,
        month_sales_amount=month_sales_amount,
        feed_stock_days=float(days_row) if days_row is not None else None,
        pending_vaccinations=pending_vaccinations,
        unread_alerts=unread_alerts,
    )
