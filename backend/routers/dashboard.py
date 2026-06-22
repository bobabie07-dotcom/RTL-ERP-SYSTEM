from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, Batch, BatchDailyLog, FeedStock, FeedType, MortalityRecord, VaccinationSchedule
from routers.auth import get_current_user
from schemas.schemas import DashboardKPI

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=DashboardKPI)
def get_dashboard(
    farm_id: int = 1,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
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
