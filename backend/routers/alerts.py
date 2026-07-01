import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, Farm
from routers.auth import get_current_user
from schemas.schemas import AlertOut
from utils import generate_farm_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Cache: only regenerate alerts at most once every 5 minutes per farm
_alert_gen_cache: dict[int, float] = {}
_ALERT_GEN_TTL = 300


@router.get("", response_model=list[AlertOut])
def list_alerts(
    farm_id:  int  = Query(1),
    unread:   bool = Query(False),
    limit:    int  = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
        if not farm_id:
            return []

    if farm_id:
        farm = db.get(Farm, farm_id)
        if not farm or (current_user.role_id not in (6,) and farm.company_id != current_user.company_id):
            raise HTTPException(status_code=403, detail="Access denied")

    # Generate new alerts at most once per 5 minutes per farm
    now = time.monotonic()
    if now - _alert_gen_cache.get(farm_id, 0) > _ALERT_GEN_TTL:
        generate_farm_alerts(farm_id, db)
        _alert_gen_cache[farm_id] = now

    q = db.query(Alert).filter(Alert.farm_id == farm_id)
    if unread:
        q = q.filter(Alert.is_read == False)  # noqa: E712
    return q.order_by(Alert.created_at.desc()).limit(limit).all()


@router.patch("/{alert_id}/read", response_model=AlertOut)
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    farm = db.get(Farm, alert.farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    if current_user.role_id not in (6,):
        if farm.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if current_user.role_id not in (1, 5) and alert.farm_id != current_user.farm_id:
            raise HTTPException(status_code=403, detail="Access denied")

    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/mark-all-read", response_model=dict)
def mark_all_read(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id

    if farm_id:
        farm = db.get(Farm, farm_id)
        if not farm or (current_user.role_id not in (6,) and farm.company_id != current_user.company_id):
            raise HTTPException(status_code=403, detail="Access denied")

    updated = (
        db.query(Alert)
        .filter(Alert.farm_id == farm_id, Alert.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return {"marked_read": updated}
