from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Batch, FeedIssue, FeedPurchase, FeedStock, FeedType, House, InventoryItem,
    InventoryMovement, Farm, MortalityRecord, StandardFeedSchedule, Supplier,
)
from routers.auth import get_current_user, require_permission
from utils import check_and_create_inventory_alerts
from schemas.schemas import (
    BatchFeedStandardSummary, BatchFeedTimelineRow, FeedVarianceReportRow,
    FeedIssueCreate, FeedIssueOut, FeedIssueRow,
    FeedPurchaseCreate, FeedPurchaseOut, FeedPurchaseRow,
    FeedStockRow, FeedTypeCreate, FeedTypePatch, FeedTypeOut,
    StandardFeedScheduleCreate, StandardFeedScheduleOut, StandardFeedScheduleUpdate,
)

router = APIRouter(prefix="/feed", tags=["feed"])


def _ensure_batch_access(db: Session, batch_id: int, current_user) -> Batch:
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user.role_id != 6 and batch.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to batch")
    return batch


def _ensure_house_for_batch(db: Session, house_id: int, batch: Batch):
    house = db.get(House, house_id)
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    if house.farm_id != batch.farm_id:
        raise HTTPException(status_code=400, detail="House does not belong to selected batch farm")
    return house


def _ensure_supplier_access(db: Session, supplier_id: int | None, current_user):
    if supplier_id is None:
        return None
    supplier = db.get(Supplier, supplier_id)
    if not supplier or not supplier.is_active:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if current_user.role_id != 6 and supplier.company_id not in (None, current_user.company_id):
        raise HTTPException(status_code=403, detail="Access denied to supplier")
    return supplier


def _ensure_inventory_item_access(item: InventoryItem, current_user):
    if current_user.role_id != 6 and item.company_id not in (None, current_user.company_id):
        raise HTTPException(status_code=403, detail="Access denied to linked inventory item")


def _round2(value) -> float:
    return round(float(value or 0), 2)


def _variance_alert(variance_pct: Optional[float]) -> Optional[str]:
    if variance_pct is None:
        return None
    if variance_pct > 10:
        return "Feed usage is higher than expected."
    if variance_pct < -10:
        return "Feed usage is below standard."
    return None


def _schedule_for_age(db: Session, age_days: int) -> Optional[StandardFeedSchedule]:
    age = max(1, int(age_days or 0))
    row = db.query(StandardFeedSchedule).filter(
        StandardFeedSchedule.age_day_start <= age,
        StandardFeedSchedule.age_day_end >= age,
    ).order_by(StandardFeedSchedule.week_number.asc()).first()
    if row:
        return row
    return db.query(StandardFeedSchedule).order_by(StandardFeedSchedule.week_number.desc()).first()


def _mortality_until(db: Session, batch_id: int, on_date: date) -> int:
    return int(db.query(func.coalesce(func.sum(MortalityRecord.count), 0)).filter(
        MortalityRecord.batch_id == batch_id,
        MortalityRecord.record_date <= on_date,
    ).scalar() or 0)


def _actual_feed_between(db: Session, batch_id: int, start_date: date, end_date: date) -> float:
    return float(db.query(func.coalesce(func.sum(FeedIssue.qty_kg), 0)).filter(
        FeedIssue.batch_id == batch_id,
        FeedIssue.issue_date >= start_date,
        FeedIssue.issue_date <= end_date,
    ).scalar() or 0)


def _standard_row_for_day(db: Session, batch: Batch, on_date: date) -> dict:
    age_days = max(0, (on_date - batch.placed_date).days)
    schedule = _schedule_for_age(db, max(1, age_days))
    birds_alive = max(0, int(batch.initial_count or 0) - _mortality_until(db, batch.id, on_date))
    daily_grams = float(schedule.daily_feed_grams) if schedule else 0
    standard_kg = birds_alive * daily_grams / 1000
    actual_kg = _actual_feed_between(db, batch.id, on_date, on_date)
    diff = actual_kg - standard_kg
    variance = (diff / standard_kg * 100) if standard_kg else None
    return {
        "date": on_date,
        "age_days": age_days,
        "week_number": schedule.week_number if schedule else None,
        "feed_type": schedule.feed_type if schedule else None,
        "birds_alive": birds_alive,
        "daily_feed_grams": daily_grams if schedule else None,
        "standard_feed_kg": _round2(standard_kg),
        "actual_feed_kg": _round2(actual_kg),
        "difference_kg": _round2(diff),
        "variance_pct": round(variance, 2) if variance is not None else None,
        "alert": _variance_alert(variance),
    }


@router.get("/standard-schedule", response_model=list[StandardFeedScheduleOut])
def list_standard_schedule(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(StandardFeedSchedule).order_by(StandardFeedSchedule.week_number.asc()).all()


@router.post("/standard-schedule", response_model=StandardFeedScheduleOut, status_code=status.HTTP_201_CREATED)
def create_standard_schedule_row(
    body: StandardFeedScheduleCreate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "feed")),
):
    if body.age_day_end < body.age_day_start:
        raise HTTPException(status_code=400, detail="Age day end must be after start")
    if db.query(StandardFeedSchedule).filter(StandardFeedSchedule.week_number == body.week_number).first():
        raise HTTPException(status_code=400, detail="Week number already exists")
    row = StandardFeedSchedule(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/standard-schedule/{row_id}", response_model=StandardFeedScheduleOut)
def update_standard_schedule_row(
    row_id: int,
    body: StandardFeedScheduleUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "feed")),
):
    row = db.get(StandardFeedSchedule, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule row not found")
    data = body.model_dump(exclude_unset=True)
    start = data.get("age_day_start", row.age_day_start)
    end = data.get("age_day_end", row.age_day_end)
    if end < start:
        raise HTTPException(status_code=400, detail="Age day end must be after start")
    if "week_number" in data:
        existing = db.query(StandardFeedSchedule).filter(
            StandardFeedSchedule.week_number == data["week_number"],
            StandardFeedSchedule.id != row.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Week number already exists")
    for field, value in data.items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/standard-schedule/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_standard_schedule_row(
    row_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "feed")),
):
    row = db.get(StandardFeedSchedule, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schedule row not found")
    db.delete(row)
    db.commit()


@router.get("/batches/{batch_id}/standard", response_model=BatchFeedStandardSummary)
def get_batch_feed_standard(
    batch_id: int,
    on_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    batch = _ensure_batch_access(db, batch_id, current_user)
    target = on_date or date.today()
    day = _standard_row_for_day(db, batch, target)

    week_start = target - timedelta(days=target.weekday())
    week_end = week_start + timedelta(days=6)
    actual_week = _actual_feed_between(db, batch.id, week_start, week_end)
    weekly_standard = day["standard_feed_kg"] * 7
    monthly_projection = day["standard_feed_kg"] * 30

    cumulative_standard = 0.0
    cursor = batch.placed_date
    while cursor <= target:
        cumulative_standard += _standard_row_for_day(db, batch, cursor)["standard_feed_kg"]
        cursor += timedelta(days=1)
    actual_to_date = _actual_feed_between(db, batch.id, batch.placed_date, target)
    remaining = max(0.0, cumulative_standard - actual_to_date)

    feed_efficiency = None
    if day["birds_alive"] > 0 and day["actual_feed_kg"] > 0:
        feed_efficiency = round(day["actual_feed_kg"] / day["birds_alive"], 4)

    return BatchFeedStandardSummary(
        batch_id=batch.id,
        batch_no=batch.batch_no,
        date=target,
        current_age_days=day["age_days"],
        current_week=day["week_number"],
        current_feed_type=day["feed_type"],
        birds_alive=day["birds_alive"],
        daily_feed_grams=day["daily_feed_grams"],
        daily_standard_kg=day["standard_feed_kg"],
        weekly_standard_kg=_round2(weekly_standard),
        monthly_projection_kg=_round2(monthly_projection),
        actual_today_kg=day["actual_feed_kg"],
        actual_week_kg=_round2(actual_week),
        difference_kg=day["difference_kg"],
        variance_pct=day["variance_pct"],
        feed_efficiency=feed_efficiency,
        remaining_feed_kg=_round2(remaining),
        alert=day["alert"],
    )


@router.get("/batches/{batch_id}/timeline", response_model=list[BatchFeedTimelineRow])
def get_batch_feed_timeline(
    batch_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    days: int = Query(30, ge=1, le=180),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    batch = _ensure_batch_access(db, batch_id, current_user)
    end = end_date or date.today()
    start = start_date or max(batch.placed_date, end - timedelta(days=days - 1))
    if start < batch.placed_date:
        start = batch.placed_date
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    rows = []
    cursor = start
    while cursor <= end:
        day = _standard_row_for_day(db, batch, cursor)
        rows.append(BatchFeedTimelineRow(
            date=day["date"],
            age_days=day["age_days"],
            week_number=day["week_number"],
            feed_type=day["feed_type"],
            birds_alive=day["birds_alive"],
            standard_feed_kg=day["standard_feed_kg"],
            actual_feed_kg=day["actual_feed_kg"],
            difference_kg=day["difference_kg"],
            variance_pct=day["variance_pct"],
            alert=day["alert"],
        ))
        cursor += timedelta(days=1)
    return rows


@router.get("/standard-variance", response_model=list[FeedVarianceReportRow])
def standard_variance_report(
    farm_id: Optional[int] = Query(None),
    batch_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
        if not farm_id:
            return []
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=30))

    q = db.query(Batch)
    if current_user.role_id != 6:
        q = q.filter(Batch.company_id == current_user.company_id)
    if farm_id:
        farm = db.get(Farm, farm_id)
        if not farm or (current_user.role_id != 6 and farm.company_id != current_user.company_id):
            raise HTTPException(status_code=403, detail="Access denied")
        q = q.filter(Batch.farm_id == farm_id)
    if batch_id:
        q = q.filter(Batch.id == batch_id)

    rows = []
    for batch in q.all():
        cursor = max(batch.placed_date, start)
        while cursor <= end:
            day = _standard_row_for_day(db, batch, cursor)
            rows.append(FeedVarianceReportRow(
                batch_id=batch.id,
                batch_no=batch.batch_no,
                date=day["date"],
                week_number=day["week_number"],
                feed_type=day["feed_type"],
                standard_feed_kg=day["standard_feed_kg"],
                actual_feed_kg=day["actual_feed_kg"],
                difference_kg=day["difference_kg"],
                variance_pct=day["variance_pct"],
                alert=day["alert"],
            ))
            cursor += timedelta(days=1)
    return rows


@router.get("/standard-report")
def standard_feed_report(
    farm_id: Optional[int] = Query(None),
    batch_id: Optional[int] = Query(None),
    period: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
        if not farm_id:
            return []
    end = end_date or date.today()
    start = start_date or (end - timedelta(days=30))

    q = db.query(Batch)
    if current_user.role_id != 6:
        q = q.filter(Batch.company_id == current_user.company_id)
    if farm_id:
        farm = db.get(Farm, farm_id)
        if not farm or (current_user.role_id != 6 and farm.company_id != current_user.company_id):
            raise HTTPException(status_code=403, detail="Access denied")
        q = q.filter(Batch.farm_id == farm_id)
    if batch_id:
        q = q.filter(Batch.id == batch_id)

    buckets = {}
    for batch in q.all():
        cursor = max(batch.placed_date, start)
        while cursor <= end:
            day = _standard_row_for_day(db, batch, cursor)
            if period == "weekly":
                bucket_key = f"{cursor.isocalendar().year}-W{cursor.isocalendar().week:02d}"
            elif period == "monthly":
                bucket_key = cursor.strftime("%Y-%m")
            else:
                bucket_key = cursor.isoformat()
            key = (batch.id, bucket_key)
            bucket = buckets.setdefault(key, {
                "batch_id": batch.id,
                "batch_no": batch.batch_no,
                "period": bucket_key,
                "period_type": period,
                "standard_feed_kg": 0.0,
                "actual_feed_kg": 0.0,
                "feed_cost": 0.0,
                "days": 0,
            })
            schedule = _schedule_for_age(db, max(1, day["age_days"]))
            cost_per_bird = float(schedule.cost_per_bird or 0) if schedule else 0
            bucket["standard_feed_kg"] += day["standard_feed_kg"]
            bucket["actual_feed_kg"] += day["actual_feed_kg"]
            bucket["feed_cost"] += day["birds_alive"] * cost_per_bird
            bucket["days"] += 1
            cursor += timedelta(days=1)

    result = []
    for bucket in buckets.values():
        diff = bucket["actual_feed_kg"] - bucket["standard_feed_kg"]
        variance = (diff / bucket["standard_feed_kg"] * 100) if bucket["standard_feed_kg"] else None
        result.append({
            **bucket,
            "standard_feed_kg": _round2(bucket["standard_feed_kg"]),
            "actual_feed_kg": _round2(bucket["actual_feed_kg"]),
            "difference_kg": _round2(diff),
            "variance_pct": round(variance, 2) if variance is not None else None,
            "feed_cost": _round2(bucket["feed_cost"]),
            "alert": _variance_alert(variance),
        })
    return sorted(result, key=lambda r: (r["period"], r["batch_no"]))


@router.get("/types", response_model=list[FeedTypeOut])
def list_feed_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(FeedType).all()


@router.post("/types", response_model=FeedTypeOut, status_code=status.HTTP_201_CREATED)
def create_feed_type(
    body: FeedTypeCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    ft = FeedType(**body.model_dump())
    db.add(ft)
    db.commit()
    db.refresh(ft)
    # Also create an empty stock row so it shows up in the stock table
    db.add(FeedStock(feed_type_id=ft.id, qty_on_hand_kg=0, reorder_qty_kg=0))
    db.commit()
    return ft


@router.get("/stock", response_model=list[FeedStockRow])
def get_feed_stock(db: Session = Depends(get_db), _=Depends(get_current_user)):
    rows = db.execute(text("""
        SELECT
            v.*,
            ft.inventory_item_id,
            ii.name AS inventory_item_name
        FROM v_feed_stock_status v
        JOIN feed_types ft ON ft.id = v.id
        LEFT JOIN inventory_items ii ON ii.id = ft.inventory_item_id
        ORDER BY v.id
    """)).mappings().all()
    return [FeedStockRow(**dict(r)) for r in rows]


@router.patch("/types/{type_id}", response_model=FeedTypeOut)
def update_feed_type(
    type_id: int,
    body: FeedTypePatch,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "feed")),
):
    ft = db.get(FeedType, type_id)
    if not ft:
        raise HTTPException(status_code=404, detail="Feed type not found")

    old_item_id = ft.inventory_item_id
    ft.inventory_item_id = body.inventory_item_id

    # Whenever a link is saved, sync feed_stock to match inventory qty (inventory is master)
    if body.inventory_item_id:
        stock = db.get(FeedStock, type_id)
        inv_item = db.get(InventoryItem, body.inventory_item_id)
        if stock and inv_item:
            _ensure_inventory_item_access(inv_item, current_user)
            inv_qty = float(inv_item.qty_on_hand)
            old_feed_qty = float(stock.qty_on_hand_kg)
            stock.qty_on_hand_kg = inv_qty
            diff = inv_qty - old_feed_qty
            if diff != 0:
                db.add(InventoryMovement(
                    item_id=body.inventory_item_id,
                    movement_type="adjustment",
                    qty=abs(diff),
                    reference_type="adjustment",
                    notes=f"Feed stock adjusted on link to '{ft.name}' — synced from inventory ({inv_qty} kg)",
                    created_by=current_user.id,
                ))
                check_and_create_inventory_alerts(inv_item, db)

    db.commit()
    db.refresh(ft)
    return ft


@router.get("/purchases", response_model=list[FeedPurchaseRow])
def list_feed_purchases(
    farm_id: Optional[int] = Query(None),
    limit:   int = Query(100, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql = """
        SELECT
            fp.id,
            fp.purchase_date,
            ft.name         AS feed_type,
            s.name          AS supplier,
            fp.qty_kg,
            fp.cost_per_kg,
            fp.qty_kg * fp.cost_per_kg AS total_cost,
            fp.invoice_no
        FROM feed_purchases fp
        LEFT JOIN feed_types ft ON fp.feed_type_id = ft.id
        LEFT JOIN suppliers s ON fp.supplier_id = s.id
        ORDER BY fp.purchase_date DESC
        LIMIT :limit
    """
    rows = db.execute(text(sql), {"limit": limit}).mappings().all()
    return [FeedPurchaseRow(**dict(r)) for r in rows]


@router.post("/purchases", response_model=FeedPurchaseOut, status_code=status.HTTP_201_CREATED)
def create_feed_purchase(
    body: FeedPurchaseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "feed")),
):
    ft = db.get(FeedType, body.feed_type_id)
    if not ft:
        raise HTTPException(status_code=404, detail="Feed type not found")
    _ensure_supplier_access(db, body.supplier_id, current_user)

    purchase = FeedPurchase(**body.model_dump(), created_by=current_user.id)
    db.add(purchase)
    db.flush()  # get purchase.id before commit

    # Update feed stock
    stock = db.get(FeedStock, body.feed_type_id)
    if stock:
        stock.qty_on_hand_kg = float(stock.qty_on_hand_kg) + float(body.qty_kg)
    else:
        db.add(FeedStock(feed_type_id=body.feed_type_id, qty_on_hand_kg=float(body.qty_kg), reorder_qty_kg=0))

    # Sync IN to inventory if this feed type is linked to an inventory item
    if ft.inventory_item_id:
        inv_item = db.get(InventoryItem, ft.inventory_item_id)
        if inv_item:
            _ensure_inventory_item_access(inv_item, current_user)
            inv_item.qty_on_hand = float(inv_item.qty_on_hand) + float(body.qty_kg)
            db.add(InventoryMovement(
                item_id=ft.inventory_item_id,
                movement_type="in",
                qty=body.qty_kg,
                reference_type="purchase",
                reference_id=purchase.id,
                notes=f"Feed purchase — {ft.name}" + (f" | Inv: {body.invoice_no}" if body.invoice_no else ""),
                created_by=current_user.id,
            ))
            check_and_create_inventory_alerts(inv_item, db)

    db.commit()
    db.refresh(purchase)
    return purchase


@router.get("/issues", response_model=list[FeedIssueRow])
def list_feed_issues(
    batch_id: Optional[int] = Query(None),
    farm_id:  Optional[int] = Query(None),
    limit: int = Query(100, le=500),
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
    sql = """
        SELECT
            fi.id,
            fi.batch_id,
            fi.house_id,
            fi.feed_type_id,
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
    batch = _ensure_batch_access(db, body.batch_id, current_user)
    _ensure_house_for_batch(db, body.house_id, batch)
    ft = db.get(FeedType, body.feed_type_id)
    if not ft:
        raise HTTPException(status_code=404, detail="Feed type not found")

    issue = FeedIssue(**body.model_dump(), recorded_by=current_user.id)
    db.add(issue)
    db.flush()  # get issue.id

    # Decrement feed stock
    stock = db.get(FeedStock, body.feed_type_id)
    if stock:
        stock.qty_on_hand_kg = float(stock.qty_on_hand_kg) - float(body.qty_kg)

    # Sync OUT to inventory if linked
    if ft.inventory_item_id:
        inv_item = db.get(InventoryItem, ft.inventory_item_id)
        if inv_item:
            _ensure_inventory_item_access(inv_item, current_user)
            inv_item.qty_on_hand = float(inv_item.qty_on_hand) - float(body.qty_kg)
            db.add(InventoryMovement(
                item_id=ft.inventory_item_id,
                movement_type="out",
                qty=body.qty_kg,
                reference_type="issue",
                reference_id=issue.id,
                notes=f"Feed issue — {ft.name} to batch",
                created_by=current_user.id,
            ))
            check_and_create_inventory_alerts(inv_item, db)

    db.commit()
    db.refresh(issue)
    return issue


@router.patch("/issues/{issue_id}", response_model=FeedIssueOut)
def update_feed_issue(
    issue_id: int,
    body: FeedIssueCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "feed")),
):
    issue = db.get(FeedIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Feed issue not found")
    _ensure_batch_access(db, issue.batch_id, current_user)
    new_batch = _ensure_batch_access(db, body.batch_id, current_user)
    _ensure_house_for_batch(db, body.house_id, new_batch)

    old_qty = float(issue.qty_kg)
    old_ft_id = issue.feed_type_id
    new_qty = float(body.qty_kg)
    new_ft_id = body.feed_type_id
    new_ft = db.get(FeedType, new_ft_id)
    if not new_ft:
        raise HTTPException(status_code=404, detail="Feed type not found")

    # Reverse old stock deduction
    old_stock = db.get(FeedStock, old_ft_id)
    if old_stock:
        old_stock.qty_on_hand_kg = float(old_stock.qty_on_hand_kg) + old_qty
    old_ft = db.get(FeedType, old_ft_id)
    if old_ft and old_ft.inventory_item_id:
        old_inv = db.get(InventoryItem, old_ft.inventory_item_id)
        if old_inv:
            _ensure_inventory_item_access(old_inv, current_user)
            old_inv.qty_on_hand = float(old_inv.qty_on_hand) + old_qty

    # Apply updated fields
    issue.batch_id     = body.batch_id
    issue.house_id     = body.house_id
    issue.feed_type_id = new_ft_id
    issue.issue_date   = body.issue_date
    issue.qty_kg       = new_qty
    issue.fcr_snapshot = body.fcr_snapshot

    # Apply new stock deduction
    new_stock = db.get(FeedStock, new_ft_id)
    if new_stock:
        new_stock.qty_on_hand_kg = float(new_stock.qty_on_hand_kg) - new_qty
    if new_ft.inventory_item_id:
        new_inv = db.get(InventoryItem, new_ft.inventory_item_id)
        if new_inv:
            _ensure_inventory_item_access(new_inv, current_user)
            new_inv.qty_on_hand = float(new_inv.qty_on_hand) - new_qty
            check_and_create_inventory_alerts(new_inv, db)

    db.commit()
    db.refresh(issue)
    return issue


@router.get("/weekly")
def weekly_consumption(
    farm_id: Optional[int] = Query(None),
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
