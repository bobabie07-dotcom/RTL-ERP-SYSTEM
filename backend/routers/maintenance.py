from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, Expense, MaintenanceLog
from routers.auth import get_current_user
from schemas.schemas import MaintenanceLogCreate, MaintenanceLogOut, MaintenanceLogUpdate
from utils import post_batch_expense

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

CATEGORY_LABELS = {
    "roofing":      "Roofing Installations",
    "plumbing":     "Plumbing Systems",
    "structural":   "Structural Works",
    "gutter":       "Concrete Gutter Replacements",
    "electrical":   "Electrical",
    "dismantling":  "Dismantling Works",
    "other":        "Other",
}


@router.get("", response_model=list[MaintenanceLogOut])
def list_logs(
    house_id: Optional[int] = Query(None),
    farm_id:  Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(MaintenanceLog)
    if house_id:
        q = q.filter(MaintenanceLog.house_id == house_id)
    if farm_id:
        q = q.filter(MaintenanceLog.farm_id == farm_id)
    return q.order_by(MaintenanceLog.log_date.desc()).all()


@router.post("", response_model=MaintenanceLogOut, status_code=status.HTTP_201_CREATED)
def create_log(
    body: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    log = MaintenanceLog(**body.model_dump(), recorded_by=current_user.id)

    # If completed with cost, create an expense record immediately
    if body.status == "completed" and float(body.cost) > 0:
        log, _ = _attach_expense(log, body, db, current_user.id)

    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.patch("/{log_id}", response_model=MaintenanceLogOut)
def update_log(
    log_id: int,
    body: MaintenanceLogUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    log = db.get(MaintenanceLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")

    data = body.model_dump(exclude_unset=True)
    was_completed = log.status == "completed"
    new_status = data.get("status", log.status)
    new_cost   = float(data.get("cost", log.cost) or 0)
    new_alloc  = data.get("batch_allocated", log.batch_allocated)

    for field, value in data.items():
        setattr(log, field, value)

    # Create expense when transitioning to completed with a cost
    if not was_completed and new_status == "completed" and new_cost > 0 and not log.expense_id:
        log, _ = _attach_expense(log, _log_as_body(log, new_alloc), db, current_user.id)

    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    log = db.get(MaintenanceLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    # Remove linked expense so financial totals stay accurate
    if log.expense_id:
        exp = db.get(Expense, log.expense_id)
        if exp:
            db.delete(exp)
    db.delete(log)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _active_batch_for_house(house_id: int, db: Session) -> Optional[Batch]:
    return (
        db.query(Batch)
        .filter(Batch.house_id == house_id, Batch.status.in_(["active", "harvest_soon"]))
        .order_by(Batch.placed_date.desc())
        .first()
    )


class _log_as_body:
    """Duck-typed adapter so _attach_expense can accept both create body and existing log."""
    def __init__(self, log: MaintenanceLog, batch_allocated: bool):
        self.house_id        = log.house_id
        self.farm_id         = log.farm_id
        self.log_date        = log.log_date
        self.category        = log.category
        self.description     = log.description
        self.cost            = log.cost
        self.batch_allocated = batch_allocated


def _attach_expense(log: MaintenanceLog, body, db: Session, user_id: int):
    """Create an Expense record tied to this maintenance log."""
    batch_id = None
    if body.batch_allocated:
        active = _active_batch_for_house(body.house_id, db)
        if active:
            batch_id = active.id

    label = CATEGORY_LABELS.get(body.category, "Maintenance")
    desc  = f"[Maintenance – {label}] {body.description or ''}".strip()

    expense = Expense(
        farm_id      = body.farm_id,
        batch_id     = batch_id,
        category     = "maintenance",
        amount       = body.cost,
        expense_date = body.log_date,
        description  = desc,
        recorded_by  = user_id,
    )
    db.add(expense)
    db.flush()          # get expense.id before committing

    log.expense_id = expense.id
    log.batch_id   = batch_id

    # Also post to batch_expenses ledger when allocated to a batch
    if batch_id:
        try:
            post_batch_expense(
                batch_id=batch_id,
                category_code="MAINTENANCE",
                amount=float(body.cost),
                expense_date=body.log_date,
                db=db,
                description=desc,
                source_module="MAINTENANCE",
                source_ref=str(log.id) if log.id else None,
                house_id=body.house_id,
                created_by=user_id,
            )
        except Exception:
            pass  # never block maintenance creation

    return log, expense
