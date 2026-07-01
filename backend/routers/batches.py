import logging
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, BatchDailyLog, House
from routers.auth import get_current_user, require_permission
from schemas.schemas import (
    BatchCreate, BatchOut, BatchSummaryRow, BatchUpdate,
    BreedOut, DailyLogCreate, DailyLogOut, DailyLogUpdate, FarmOut, HouseOut,
)
from sync_helpers import cleanup_sentinel_on_log_delete, sync_log_to_mortality
from utils import post_batch_expense

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=list[BatchSummaryRow])
def list_batches(
    farm_id:  Optional[int] = Query(None),
    status:   Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sql = "SELECT * FROM v_batch_summary WHERE 1=1"
    params: dict = {}

    if current_user.role_id not in (6,):
        sql += " AND company_id = :company_id"
        params["company_id"] = current_user.company_id

    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
        if not farm_id:
            return []

    if farm_id:
        sql += " AND farm_id = :farm_id"
        params["farm_id"] = farm_id
    if status:
        sql += " AND status = :status"
        params["status"] = status
    sql += " ORDER BY placed_date DESC"

    rows = db.execute(text(sql), params).mappings().all()
    return [BatchSummaryRow(**dict(r)) for r in rows]


@router.post("", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(
    body: BatchCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    if db.query(Batch).filter(
        Batch.batch_no == body.batch_no,
        Batch.company_id == current_user.company_id,
    ).first():
        raise HTTPException(status_code=400, detail="Batch number already exists")

    house = db.get(House, body.house_id)
    if not house:
        raise HTTPException(status_code=404, detail="House not found")

    from models import Farm
    farm = db.get(Farm, house.farm_id)
    if current_user.role_id not in (6,) and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to this house")

    batch = Batch(**body.model_dump(), company_id=current_user.company_id, created_by=current_user.id)
    db.add(batch)
    db.flush()

    # Auto-post chick purchase cost
    if body.chick_cost_per_head and float(body.chick_cost_per_head) > 0:
        try:
            total_chick_cost = float(body.chick_cost_per_head) * body.initial_count
            post_batch_expense(
                batch_id=batch.id,
                category_code="CHICK",
                amount=total_chick_cost,
                expense_date=body.placed_date,
                db=db,
                qty=body.initial_count,
                unit="birds",
                unit_cost=float(body.chick_cost_per_head),
                description=f"Chick purchase — {body.initial_count} birds @ {body.chick_cost_per_head}/head",
                source_module="BATCH",
                source_ref=str(batch.id),
                created_by=current_user.id,
            )
        except Exception:
            logger.warning("post_batch_expense failed for chick cost on batch %s", batch.id, exc_info=True)

    db.commit()
    db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=BatchSummaryRow)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = db.execute(
        text("SELECT * FROM v_batch_summary WHERE id = :id"),
        {"id": batch_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if current_user.role_id not in (6,):
        if row["company_id"] != current_user.company_id:
            raise HTTPException(status_code=403, detail="Access denied to this batch")
        if current_user.role_id not in (1, 5) and row["farm_id"] != current_user.farm_id:
            raise HTTPException(status_code=403, detail="Access denied to this batch")
        
    return BatchSummaryRow(**dict(row))


@router.patch("/{batch_id}", response_model=BatchOut)
def update_batch(
    batch_id: int,
    body: BatchUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user.role_id != 6 and batch.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(batch, field, value)
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("delete")),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(batch)
    db.commit()


# ── Daily Logs ────────────────────────────────────────────────────────────────

@router.get("/{batch_id}/logs", response_model=list[DailyLogOut])
def list_logs(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return (
        db.query(BatchDailyLog)
        .filter(BatchDailyLog.batch_id == batch_id)
        .order_by(BatchDailyLog.log_date.desc())
        .all()
    )


@router.post("/{batch_id}/logs", response_model=DailyLogOut, status_code=status.HTTP_201_CREATED)
def add_log(
    batch_id: int,
    body: DailyLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing = (
        db.query(BatchDailyLog)
        .filter(BatchDailyLog.batch_id == batch_id, BatchDailyLog.log_date == body.log_date)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Log already exists for this date")

    log = BatchDailyLog(**body.model_dump(), batch_id=batch_id, recorded_by=current_user.id)
    db.add(log)
    db.flush()
    sync_log_to_mortality(db, batch_id, log.log_date, log.mortality_count, current_user.id)
    db.commit()
    db.refresh(log)
    return log


@router.patch("/{batch_id}/logs/{log_id}", response_model=DailyLogOut)
def update_log(
    batch_id: int,
    log_id: int,
    body: DailyLogUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    log = db.query(BatchDailyLog).filter(BatchDailyLog.id == log_id, BatchDailyLog.batch_id == batch_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    old_date = log.log_date
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.flush()
    # If the log date changed, remove the sentinel from the old date
    if old_date != log.log_date:
        cleanup_sentinel_on_log_delete(db, batch_id, old_date)
    sync_log_to_mortality(db, batch_id, log.log_date, log.mortality_count or 0, current_user.id)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{batch_id}/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    batch_id: int,
    log_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    log = db.query(BatchDailyLog).filter(BatchDailyLog.id == log_id, BatchDailyLog.batch_id == batch_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log.recorded_by != current_user.id and current_user.role_id not in (1, 5):
        raise HTTPException(status_code=403, detail="You can only delete logs you created")
    log_date = log.log_date
    db.delete(log)
    db.flush()
    cleanup_sentinel_on_log_delete(db, batch_id, log_date)
    db.commit()


# ── Reference data ────────────────────────────────────────────────────────────

@router.get("/meta/farms", response_model=list[FarmOut])
def list_farms(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from models import Farm
    if current_user.role_id in (1, 5):
        return db.query(Farm).all()
    else:
        return db.query(Farm).filter(Farm.id == current_user.farm_id).all()


@router.get("/meta/houses", response_model=list[HouseOut])
def list_houses(
    farm_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5):
        farm_id = current_user.farm_id
    q = db.query(House).filter(House.is_active == True)
    if farm_id:
        q = q.filter(House.farm_id == farm_id)
    return q.all()


@router.get("/meta/breeds", response_model=list[BreedOut])
def list_breeds(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from models import Breed
    return db.query(Breed).all()
