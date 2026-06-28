from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Alert
from routers.auth import get_current_user
from schemas.schemas import AlertOut
from utils import generate_farm_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(
    farm_id:  int  = Query(1),
    unread:   bool = Query(False),
    limit:    int  = Query(50, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    # Generate any new alerts before returning the list
    generate_farm_alerts(farm_id, db)

    q = db.query(Alert).filter(Alert.farm_id == farm_id)
    if unread:
        q = q.filter(Alert.is_read == False)  # noqa: E712
    return q.order_by(Alert.created_at.desc()).limit(limit).all()


@router.patch("/{alert_id}/read", response_model=AlertOut)
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.post("/mark-all-read", response_model=dict)
def mark_all_read(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    updated = (
        db.query(Alert)
        .filter(Alert.farm_id == farm_id, Alert.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return {"marked_read": updated}
