from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, MortalityRecord
from routers.auth import get_current_user, require_permission
from schemas.schemas import MortalityCreate, MortalityOut, MortalityRate7d, MortalityRow, MortalityUpdate
from sync_helpers import _delete_sentinel, sync_mortality_to_log
from utils import post_batch_expense

router = APIRouter(prefix="/mortality", tags=["mortality"])
# current_count is derived in v_batch_summary from mortality_records directly —
# no need to sync a stored column after each CUD operation.


@router.get("", response_model=list[MortalityRow])
def list_mortality(
    batch_id: Optional[int] = Query(None),
    farm_id:  Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql = """
        SELECT
            m.id,
            m.batch_id,
            m.record_date      AS date,
            b.batch_no         AS batch,
            h.name             AS house,
            m.count,
            m.chicken_weight_kg,
            m.cause,
            m.cause_notes,
            u.full_name        AS recorded_by
        FROM mortality_records m
        JOIN batches b  ON m.batch_id   = b.id
        JOIN houses  h  ON m.house_id   = h.id
        LEFT JOIN users u ON m.recorded_by = u.id
        WHERE 1=1
    """
    params: dict = {"limit": limit}
    if batch_id:
        sql += " AND m.batch_id = :batch_id"
        params["batch_id"] = batch_id
    if farm_id:
        sql += " AND b.farm_id = :farm_id"
        params["farm_id"] = farm_id
    sql += " ORDER BY m.record_date DESC LIMIT :limit"

    rows = db.execute(text(sql), params).mappings().all()
    return [MortalityRow(**dict(r)) for r in rows]


@router.post("", response_model=MortalityOut, status_code=status.HTTP_201_CREATED)
def create_mortality_record(
    body: MortalityCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "mortality")),
):
    # Remove any sentinel for this date — a real record now takes precedence
    _delete_sentinel(db, body.batch_id, body.record_date)
    record = MortalityRecord(**body.model_dump(), recorded_by=current_user.id)
    db.add(record)
    db.flush()
    sync_mortality_to_log(db, record.batch_id, record.record_date)

    # Auto-post mortality loss expense (cost per bird × count)
    try:
        batch_obj = db.get(Batch, record.batch_id)
        initial   = batch_obj.initial_count if batch_obj else 1

        feed_cost = db.execute(text("""
            SELECT COALESCE(SUM(fi.qty_kg * COALESCE(fp.avg_cost, 25.0)), 0)
            FROM feed_issues fi
            LEFT JOIN (SELECT feed_type_id, AVG(cost_per_kg) AS avg_cost
                       FROM feed_purchases GROUP BY feed_type_id) fp
                ON fp.feed_type_id = fi.feed_type_id
            WHERE fi.batch_id = :bid
        """), {"bid": record.batch_id}).scalar() or 0

        legacy_exp = db.execute(text(
            "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE batch_id=:bid"
        ), {"bid": record.batch_id}).scalar() or 0

        other_be = db.execute(text(
            "SELECT COALESCE(SUM(amount),0) FROM batch_expenses WHERE batch_id=:bid AND is_voided=FALSE"
        ), {"bid": record.batch_id}).scalar() or 0

        total_cost    = float(feed_cost) + float(legacy_exp) + float(other_be)
        cost_per_bird = total_cost / initial if initial else 0
        loss_value    = cost_per_bird * record.count

        post_batch_expense(
            batch_id=record.batch_id,
            category_code="MORTALITY_LOSS",
            amount=loss_value,
            expense_date=record.record_date,
            db=db,
            qty=record.count,
            unit="birds",
            unit_cost=cost_per_bird,
            description=f"Mortality loss — {record.count} birds ({record.cause})",
            source_module="MORTALITY",
            source_ref=str(record.id),
            mortality_record_id=record.id,
            house_id=record.house_id,
            created_by=current_user.id,
        )
    except Exception:
        pass  # never block mortality recording due to finance hook failure

    db.commit()
    db.refresh(record)
    return record


@router.patch("/{record_id}", response_model=MortalityOut)
def update_mortality_record(
    record_id: int,
    body: MortalityUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "mortality")),
):
    record = db.get(MortalityRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    old_date = record.record_date
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.flush()
    # If date changed, also sync the old date (record moved away from it)
    if old_date != record.record_date:
        sync_mortality_to_log(db, record.batch_id, old_date)
    _delete_sentinel(db, record.batch_id, record.record_date)
    sync_mortality_to_log(db, record.batch_id, record.record_date)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mortality_record(
    record_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "mortality")),
):
    record = db.get(MortalityRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    batch_id, record_date = record.batch_id, record.record_date
    db.delete(record)
    db.flush()
    sync_mortality_to_log(db, batch_id, record_date)
    db.commit()


@router.get("/rates-7d", response_model=list[MortalityRate7d])
def mortality_rates_7d(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT
            m.batch_id,
            b.batch_no,
            h.name                                              AS house,
            SUM(m.count)                                        AS total_deaths_7d,
            COALESCE(
                dl.current_count,
                b.initial_count - COALESCE(all_mort.total_deaths, 0)
            )                                                   AS current_count,
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
        LEFT JOIN (
            SELECT batch_id, SUM(count) AS total_deaths
            FROM mortality_records
            GROUP BY batch_id
        ) all_mort ON all_mort.batch_id = m.batch_id
        WHERE m.record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          AND b.farm_id = :farm_id
        GROUP BY m.batch_id, b.batch_no, h.name, dl.current_count, b.initial_count, all_mort.total_deaths
        ORDER BY mortality_rate_pct DESC
    """), {"farm_id": farm_id}).mappings().all()
    return [MortalityRate7d(**dict(r)) for r in rows]


@router.get("/trend")
def mortality_trend(
    batch_id: int = Query(...),
    days: int = Query(7, le=90),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT record_date AS date, SUM(count) AS deaths
        FROM mortality_records
        WHERE batch_id  = :batch_id
          AND record_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
        GROUP BY record_date
        ORDER BY record_date
    """), {"batch_id": batch_id, "days": days}).mappings().all()
    return [{"date": str(r["date"]), "deaths": int(r["deaths"])} for r in rows]
