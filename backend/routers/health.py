import logging
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, HealthEvent, Medication, Treatment, VaccinationSchedule
from routers.auth import get_current_user, require_permission
from schemas.schemas import (
    HealthEventCreate, HealthEventOut,
    MedicationCreate, MedicationOut,
    TreatmentCreate, TreatmentOut,
    UpcomingVaccination,
    VaccinationCreate, VaccinationOut, VaccinationStatusUpdate, VaccinationUpdate,
)
from utils import post_batch_expense

router = APIRouter(prefix="/health", tags=["health"])


# ── Medications / Vaccines ────────────────────────────────────────────────────

@router.get("/medications", response_model=list[MedicationOut])
def list_medications(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Medication)
    if category:
        q = q.filter(Medication.category == category)
    return q.order_by(Medication.name).all()


@router.post("/medications", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
def create_medication(
    body: MedicationCreate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "medications")),
):
    med = Medication(**body.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


# ── Vaccination Schedules ─────────────────────────────────────────────────────

@router.get("/vaccinations", response_model=list[VaccinationOut])
def list_vaccinations(
    batch_id: Optional[int] = Query(None),
    status:   Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(VaccinationSchedule)
    if batch_id:
        q = q.filter(VaccinationSchedule.batch_id == batch_id)
    if status:
        q = q.filter(VaccinationSchedule.status == status)
    return q.order_by(VaccinationSchedule.scheduled_date).all()


@router.post("/vaccinations", response_model=VaccinationOut, status_code=status.HTTP_201_CREATED)
def create_vaccination(
    body: VaccinationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "vaccination_schedules")),
):
    if not db.get(Batch, body.batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if not db.get(Medication, body.vaccine_id):
        raise HTTPException(status_code=404, detail="Vaccine/medication not found")

    vacc = VaccinationSchedule(**body.model_dump(), created_by=current_user.id)
    db.add(vacc)
    db.commit()
    db.refresh(vacc)
    return vacc


@router.patch("/vaccinations/{vacc_id}", response_model=VaccinationOut)
def update_vaccination(
    vacc_id: int,
    body: VaccinationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "vaccination_schedules")),
):
    vacc = db.get(VaccinationSchedule, vacc_id)
    if not vacc:
        raise HTTPException(status_code=404, detail="Vaccination schedule not found")
    prev_status = vacc.status
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(vacc, field, value)

    # Auto-post VACCINE expense when marking done with a cost
    if prev_status != "done" and vacc.status == "done":
        try:
            cost = float(vacc.total_cost or 0)
            if cost > 0:
                vaccine_name = vacc.vaccine.name if vacc.vaccine else f"Vaccine #{vacc.vaccine_id}"
                post_batch_expense(
                    batch_id=vacc.batch_id,
                    category_code="VACCINE",
                    amount=cost,
                    expense_date=vacc.completed_date or vacc.scheduled_date,
                    db=db,
                    unit_cost=float(vacc.cost_per_dose or 0) or None,
                    description=f"Vaccination — {vaccine_name}",
                    source_module="VACCINATION",
                    source_ref=str(vacc.id),
                    created_by=current_user.id,
                )
        except Exception:
            logger.warning("post_batch_expense failed for vaccination %s", vacc.id, exc_info=True)

    db.commit()
    db.refresh(vacc)
    return vacc


@router.delete("/vaccinations/{vacc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vaccination(
    vacc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "vaccination_schedules")),
):
    vacc = db.get(VaccinationSchedule, vacc_id)
    if not vacc:
        raise HTTPException(status_code=404, detail="Vaccination schedule not found")
    if vacc.created_by != current_user.id and current_user.role_id not in (1, 5):
        raise HTTPException(status_code=403, detail="You can only delete vaccination schedules you created")
    db.delete(vacc)
    db.commit()


@router.get("/vaccinations/upcoming", response_model=list[UpcomingVaccination])
def upcoming_vaccinations(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5):
        farm_id = current_user.farm_id
        if not farm_id:
            return []
    rows = db.execute(text("""
        SELECT v.*
        FROM v_upcoming_vaccinations v
        JOIN batches b ON v.batch_no = b.batch_no
        WHERE b.farm_id = :farm_id
    """), {"farm_id": farm_id}).mappings().all()
    return [UpcomingVaccination(**dict(r)) for r in rows]


# ── Health Events ─────────────────────────────────────────────────────────────

@router.get("/events", response_model=list[HealthEventOut])
def list_health_events(
    batch_id:   Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(HealthEvent)
    if batch_id:
        q = q.filter(HealthEvent.batch_id == batch_id)
    if event_type:
        q = q.filter(HealthEvent.event_type == event_type)
    return q.order_by(HealthEvent.event_date.desc()).all()


@router.post("/events", response_model=HealthEventOut, status_code=status.HTTP_201_CREATED)
def create_health_event(
    body: HealthEventCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "health_events")),
):
    if not db.get(Batch, body.batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    event = HealthEvent(**body.model_dump(), performed_by=current_user.id)
    db.add(event)
    db.flush()

    # Auto-post MEDICINE expense if cost provided
    if body.cost and float(body.cost) > 0:
        try:
            post_batch_expense(
                batch_id=body.batch_id,
                category_code="MEDICINE",
                amount=float(body.cost),
                expense_date=body.event_date,
                db=db,
                description=f"Health event — {body.event_type}: {body.description or ''}".strip(": "),
                source_module="HEALTH_EVENT",
                source_ref=str(event.id),
                created_by=current_user.id,
            )
        except Exception:
            logger.warning("post_batch_expense failed for health event %s", event.id, exc_info=True)

    db.commit()
    db.refresh(event)
    return event


# ── Treatments ────────────────────────────────────────────────────────────────

@router.get("/treatments", response_model=list[TreatmentOut])
def list_treatments(
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Treatment)
    if batch_id:
        q = q.filter(Treatment.batch_id == batch_id)
    return q.order_by(Treatment.start_date.desc()).all()


@router.post("/treatments", response_model=TreatmentOut, status_code=status.HTTP_201_CREATED)
def create_treatment(
    body: TreatmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "treatments")),
):
    if not db.get(Batch, body.batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if not db.get(Medication, body.medication_id):
        raise HTTPException(status_code=404, detail="Medication not found")

    treatment = Treatment(**body.model_dump(), recorded_by=current_user.id)
    db.add(treatment)
    db.commit()
    db.refresh(treatment)
    return treatment


@router.get("/treatments/active-withdrawals")
def active_withdrawals(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5):
        farm_id = current_user.farm_id
        if not farm_id:
            return []
    """Batches with an active withdrawal period — must not be sold yet."""
    rows = db.execute(text("""
        SELECT
            b.batch_no,
            h.name          AS house,
            med.name        AS medication,
            t.withdrawal_end_date,
            DATEDIFF(t.withdrawal_end_date, CURDATE()) AS days_remaining
        FROM treatments t
        JOIN batches     b   ON t.batch_id      = b.id
        JOIN houses      h   ON b.house_id      = h.id
        JOIN medications med ON t.medication_id = med.id
        WHERE b.farm_id           = :farm_id
          AND t.withdrawal_end_date >= CURDATE()
        ORDER BY t.withdrawal_end_date
    """), {"farm_id": farm_id}).mappings().all()
    return [dict(r) for r in rows]
