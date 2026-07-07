from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, HarvestRecord
from routers.auth import get_current_user, require_permission
from schemas.schemas import HarvestCreate, HarvestOut, HarvestPnL, HarvestUpdate

router = APIRouter(prefix="/harvest", tags=["harvest"])


@router.post("/{batch_id}", response_model=HarvestOut, status_code=status.HTTP_201_CREATED)
def create_harvest(
    batch_id: int,
    body: HarvestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing = db.query(HarvestRecord).filter(HarvestRecord.batch_id == batch_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Harvest record already exists for this batch")

    record = HarvestRecord(**body.model_dump(), batch_id=batch_id, recorded_by=current_user.id)
    db.add(record)
    batch.status = "harvested"
    db.commit()
    db.refresh(record)
    return record


@router.get("/{batch_id}", response_model=HarvestOut)
def get_harvest(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    record = db.query(HarvestRecord).filter(HarvestRecord.batch_id == batch_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No harvest record for this batch")
    return record


@router.patch("/{batch_id}", response_model=HarvestOut)
def update_harvest(
    batch_id: int,
    body: HarvestUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "batches")),
):
    record = db.query(HarvestRecord).filter(HarvestRecord.batch_id == batch_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No harvest record for this batch")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{batch_id}/pnl", response_model=HarvestPnL)
def get_harvest_pnl(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    record = db.query(HarvestRecord).filter(HarvestRecord.batch_id == batch_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No harvest record for this batch")

    exp_rows = db.execute(text("""
        SELECT ec.code AS category, SUM(be.amount) AS total
        FROM batch_expenses be
        JOIN expense_categories ec ON be.category_id = ec.id
        WHERE be.batch_id = :batch_id
          AND be.is_voided = FALSE
        GROUP BY ec.code
    """), {"batch_id": batch_id}).mappings().all()
    expense_detail = {r["category"]: float(r["total"]) for r in exp_rows}

    mort_row = db.execute(text("""
        SELECT
            COALESCE(SUM(count), 0)                             AS total_deaths,
            COALESCE(SUM(count * chicken_weight_kg), 0)         AS total_weight_kg
        FROM mortality_records
        WHERE batch_id = :batch_id
    """), {"batch_id": batch_id}).mappings().one()

    return HarvestPnL(
        harvest=record,
        revenue=float(record.total_revenue),
        total_expenses=sum(expense_detail.values()),
        expense_detail=expense_detail,
        mortality_deaths=int(mort_row["total_deaths"]),
        mortality_weight_kg=float(mort_row["total_weight_kg"]),
    )
