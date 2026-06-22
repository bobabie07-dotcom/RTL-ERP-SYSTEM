from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, FeedIssue, FeedStock, FeedType, House
from routers.auth import get_current_user, require_permission
from schemas.schemas import (
    FeedIssueCreate, FeedIssueOut, FeedIssueRow,
    FeedStockRow, FeedTypeOut,
)

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("/types", response_model=list[FeedTypeOut])
def list_feed_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(FeedType).all()


@router.get("/stock", response_model=list[FeedStockRow])
def get_feed_stock(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.execute(text("SELECT * FROM v_feed_stock_status ORDER BY id")).mappings().all()
    return [FeedStockRow(**dict(r)) for r in rows]


@router.get("/issues", response_model=list[FeedIssueRow])
def list_feed_issues(
    batch_id: Optional[int] = Query(None),
    farm_id:  Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql = """
        SELECT
            fi.id,
            fi.issue_date   AS date,
            b.batch_no      AS batch,
            h.name          AS house,
            ft.name         AS feed_type,
            fi.qty_kg,
            fi.fcr_snapshot,
            u.full_name     AS recorded_by
        FROM feed_issues fi
        JOIN batches   b  ON fi.batch_id     = b.id
        JOIN houses    h  ON fi.house_id     = h.id
        JOIN feed_types ft ON fi.feed_type_id = ft.id
        LEFT JOIN users u  ON fi.recorded_by  = u.id
        WHERE 1=1
    """
    params: dict = {"limit": limit}
    if batch_id:
        sql += " AND fi.batch_id = :batch_id"
        params["batch_id"] = batch_id
    if farm_id:
        sql += " AND b.farm_id = :farm_id"
        params["farm_id"] = farm_id
    sql += " ORDER BY fi.issue_date DESC LIMIT :limit"

    rows = db.execute(text(sql), params).mappings().all()
    return [FeedIssueRow(**dict(r)) for r in rows]


@router.post("/issues", response_model=FeedIssueOut, status_code=status.HTTP_201_CREATED)
def create_feed_issue(
    body: FeedIssueCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "feed")),
):
    if not db.get(Batch, body.batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if not db.get(FeedType, body.feed_type_id):
        raise HTTPException(status_code=404, detail="Feed type not found")

    issue = FeedIssue(**body.model_dump(), recorded_by=current_user.id)
    db.add(issue)

    # Decrement stock
    stock = db.get(FeedStock, body.feed_type_id)
    if stock:
        stock.qty_on_hand_kg = float(stock.qty_on_hand_kg) - float(body.qty_kg)

    db.commit()
    db.refresh(issue)
    return issue


@router.get("/weekly")
def weekly_consumption(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Feed consumption per house for the last 7 days — feeds the BarChart on FeedPage."""
    rows = db.execute(text("""
        SELECT
            h.name          AS house,
            SUM(fi.qty_kg)  AS total_kg
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        JOIN houses  h ON fi.house_id = h.id
        WHERE b.farm_id    = :farm_id
          AND fi.issue_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY h.id, h.name
        ORDER BY h.name
    """), {"farm_id": farm_id}).mappings().all()
    return [{"house": r["house"], "total_kg": float(r["total_kg"])} for r in rows]
