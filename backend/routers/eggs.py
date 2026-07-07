from datetime import date, datetime
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from database import get_db
from models.models import (
    EggCollection,
    EggGrading,
    EggInventory,
    EggSalesOrder,
    Batch,
    BatchDailyLog,
    Farm,
    House,
    User,
)
from schemas.schemas import (
    EggCollectionCreate,
    EggCollectionOut,
    EggGradingCreate,
    EggGradingOut,
    EggInventoryOut,
    EggSalesOrderCreate,
    EggSalesOrderOut,
)
from routers.auth import get_current_user, require_permission

router = APIRouter(prefix="/eggs", tags=["Eggs"])


def _verify_farm_access(farm_id: int, current_user: User):
    if current_user.role_id not in (1, 5, 6) and farm_id != current_user.farm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this farm's operations",
        )


def _require_layer_farm(db: Session, farm_id: int, current_user: User):
    _verify_farm_access(farm_id, current_user)
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role_id != 6 and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this farm's operations")
    if (farm.farm_type or "broiler") != "layer":
        raise HTTPException(status_code=400, detail="Egg operations are only available for layer farms.")
    return farm


# ── Egg Collections ──────────────────────────────────────────────────────────


@router.get("/collections", response_model=list[EggCollectionOut])
def list_collections(
    farm_id: int,
    batch_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_layer_farm(db, farm_id, current_user)

    q = db.query(EggCollection).filter(
        EggCollection.company_id == current_user.company_id,
        EggCollection.farm_id == farm_id,
    )

    if batch_id:
        q = q.filter(EggCollection.batch_id == batch_id)
    if start_date:
        q = q.filter(EggCollection.collect_date >= start_date)
    if end_date:
        q = q.filter(EggCollection.collect_date <= end_date)

    return q.order_by(EggCollection.collect_date.desc()).all()


@router.post(
    "/collections",
    response_model=EggCollectionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_collection(
    body: EggCollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "eggs")),
):
    # Verify batch exists and belongs to the company
    batch = (
        db.query(Batch)
        .filter(
            Batch.id == body.batch_id,
            Batch.company_id == current_user.company_id,
        )
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Active batch not found")

    _require_layer_farm(db, batch.farm_id, current_user)

    # Save collection
    db_collection = EggCollection(
        company_id=current_user.company_id,
        farm_id=batch.farm_id,
        batch_id=body.batch_id,
        house_id=body.house_id,
        collect_date=body.collect_date,
        total_collected=body.total_collected,
        cracked_count=body.cracked_count,
        defect_summary=body.defect_summary,
        feed_water_log=body.feed_water_log,
        notes=body.notes,
    )
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection


# ── Egg Grading ──────────────────────────────────────────────────────────────


@router.get("/gradings", response_model=list[EggGradingOut])
def list_gradings(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_layer_farm(db, farm_id, current_user)

    return (
        db.query(EggGrading)
        .filter(
            EggGrading.company_id == current_user.company_id,
            EggGrading.farm_id == farm_id,
        )
        .order_by(EggGrading.graded_date.desc())
        .all()
    )


@router.post(
    "/gradings",
    response_model=EggGradingOut,
    status_code=status.HTTP_201_CREATED,
)
def create_grading(
    body: EggGradingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "eggs")),
):
    collection = (
        db.query(EggCollection)
        .filter(
            EggCollection.id == body.collection_id,
            EggCollection.company_id == current_user.company_id,
        )
        .first()
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Egg collection not found")

    _require_layer_farm(db, collection.farm_id, current_user)

    # Sum graded eggs
    graded_sum = (
        body.size_peewee
        + body.size_s
        + body.size_m
        + body.size_l
        + body.size_xl
        + body.size_jumbo
        + body.dirty_count
    )
    if graded_sum > collection.total_collected:
        raise HTTPException(
            status_code=400,
            detail=f"Graded sum ({graded_sum}) exceeds total collected ({collection.total_collected})",
        )

    db_grading = EggGrading(
        company_id=current_user.company_id,
        farm_id=collection.farm_id,
        collection_id=body.collection_id,
        size_peewee=body.size_peewee,
        size_s=body.size_s,
        size_m=body.size_m,
        size_l=body.size_l,
        size_xl=body.size_xl,
        size_jumbo=body.size_jumbo,
        dirty_count=body.dirty_count,
        graded_date=body.graded_date,
    )
    db.add(db_grading)

    # Helper to update inventory stock
    def add_inventory(size_name: str, qty: int):
        if qty <= 0:
            return
        inv = (
            db.query(EggInventory)
            .filter(
                EggInventory.company_id == current_user.company_id,
                EggInventory.farm_id == collection.farm_id,
                EggInventory.size == size_name,
            )
            .first()
        )
        if inv:
            inv.stock_qty += qty
        else:
            new_inv = EggInventory(
                company_id=current_user.company_id,
                farm_id=collection.farm_id,
                size=size_name,
                stock_qty=qty,
            )
            db.add(new_inv)

    add_inventory("Peewee", body.size_peewee)
    add_inventory("S", body.size_s)
    add_inventory("M", body.size_m)
    add_inventory("L", body.size_l)
    add_inventory("XL", body.size_xl)
    add_inventory("Jumbo", body.size_jumbo)
    add_inventory("Dirty", body.dirty_count)
    # Also add cracked from the collection to inventory
    add_inventory("Cracked", collection.cracked_count)

    db.commit()
    db.refresh(db_grading)
    return db_grading


# ── Egg Inventory ────────────────────────────────────────────────────────────


@router.get("/inventory", response_model=list[EggInventoryOut])
def get_inventory(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_layer_farm(db, farm_id, current_user)

    return (
        db.query(EggInventory)
        .filter(
            EggInventory.company_id == current_user.company_id,
            EggInventory.farm_id == farm_id,
        )
        .all()
    )


# ── Egg Sales Orders ──────────────────────────────────────────────────────────


@router.get("/sales", response_model=list[EggSalesOrderOut])
def list_sales(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_layer_farm(db, farm_id, current_user)

    return (
        db.query(EggSalesOrder)
        .filter(
            EggSalesOrder.company_id == current_user.company_id,
            EggSalesOrder.farm_id == farm_id,
        )
        .order_by(EggSalesOrder.order_date.desc())
        .all()
    )


@router.post(
    "/sales",
    response_model=EggSalesOrderOut,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
    body: EggSalesOrderCreate,
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "sales")),
):
    _require_layer_farm(db, farm_id, current_user)

    # Determine multiplier by package type
    multiplier = 30 if body.package_type == "tray" else 360
    total_eggs = body.qty_packages * multiplier

    # Check inventory
    inv = (
        db.query(EggInventory)
        .filter(
            EggInventory.company_id == current_user.company_id,
            EggInventory.farm_id == farm_id,
            EggInventory.size == body.size,
        )
        .first()
    )
    if not inv or inv.stock_qty < total_eggs:
        available = inv.stock_qty if inv else 0
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for size {body.size}. Requested: {total_eggs} eggs, Available: {available} eggs",
        )

    # Subtract stock
    inv.stock_qty -= total_eggs

    # Compute amount
    total_amount = Decimal(body.qty_packages) * Decimal(
        body.price_per_package
    )

    # Auto generate order number — MAX-based to avoid race conditions
    today_str = datetime.today().strftime("%Y%m%d")
    prefix = f"EGG-{today_str}-"
    latest = (
        db.query(func.max(EggSalesOrder.order_no))
        .filter(
            EggSalesOrder.company_id == current_user.company_id,
            EggSalesOrder.order_no.like(f"{prefix}%"),
        )
        .scalar()
    )
    try:
        seq = int(latest.split("-")[-1]) + 1 if latest else 1
    except (ValueError, IndexError):
        seq = 1
    order_no = f"{prefix}{seq:03d}"

    db_sale = EggSalesOrder(
        company_id=current_user.company_id,
        farm_id=farm_id,
        order_no=order_no,
        buyer_id=body.buyer_id,
        order_date=body.order_date,
        size=body.size,
        qty_packages=body.qty_packages,
        package_type=body.package_type,
        total_eggs=total_eggs,
        price_per_package=body.price_per_package,
        total_amount=total_amount,
        status="delivered",
        payment_status="paid",
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale


@router.patch("/sales/{order_id}/status", response_model=EggSalesOrderOut)
def update_sale_status(
    order_id: int,
    status: str,
    payment_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "sales")),
):
    sale = (
        db.query(EggSalesOrder)
        .filter(
            EggSalesOrder.id == order_id,
            EggSalesOrder.company_id == current_user.company_id,
        )
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Egg sales order not found")

    _require_layer_farm(db, sale.farm_id, current_user)

    # Handle cancellation (revert inventory)
    if status == "cancelled" and sale.status != "cancelled":
        inv = (
            db.query(EggInventory)
            .filter(
                EggInventory.company_id == current_user.company_id,
                EggInventory.farm_id == sale.farm_id,
                EggInventory.size == sale.size,
            )
            .first()
        )
        if inv:
            inv.stock_qty += sale.total_eggs

    # Handle reactivation if it was cancelled
    if sale.status == "cancelled" and status != "cancelled":
        inv = (
            db.query(EggInventory)
            .filter(
                EggInventory.company_id == current_user.company_id,
                EggInventory.farm_id == sale.farm_id,
                EggInventory.size == sale.size,
            )
            .first()
        )
        if not inv or inv.stock_qty < sale.total_eggs:
            raise HTTPException(
                status_code=400,
                detail="Cannot reactivate order: Insufficient inventory stock.",
            )
        inv.stock_qty -= sale.total_eggs

    sale.status = status
    sale.payment_status = payment_status
    db.commit()
    db.refresh(sale)
    return sale


# ── Metrics ──────────────────────────────────────────────────────────────────


@router.get("/metrics")
def get_egg_metrics(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_layer_farm(db, farm_id, current_user)

    # Total eggs collected
    total_col = (
        db.query(func.sum(EggCollection.total_collected))
        .filter(
            EggCollection.company_id == current_user.company_id,
            EggCollection.farm_id == farm_id,
        )
        .scalar()
        or 0
    )

    # Total cracked eggs
    total_cracked = (
        db.query(func.sum(EggCollection.cracked_count))
        .filter(
            EggCollection.company_id == current_user.company_id,
            EggCollection.farm_id == farm_id,
        )
        .scalar()
        or 0
    )

    # Total sales
    total_sales = (
        db.query(func.sum(EggSalesOrder.total_amount))
        .filter(
            EggSalesOrder.company_id == current_user.company_id,
            EggSalesOrder.farm_id == farm_id,
            EggSalesOrder.status != "cancelled",
        )
        .scalar()
        or 0.0
    )

    # Compute Hen-Day % trends for the last 30 collections
    collections = (
        db.query(EggCollection)
        .filter(
            EggCollection.company_id == current_user.company_id,
            EggCollection.farm_id == farm_id,
        )
        .order_by(EggCollection.collect_date.desc())
        .limit(30)
        .all()
    )

    trend = []
    for col in reversed(collections):
        # Live count: use BatchDailyLog.current_count (most accurate historical value)
        # If no log exists, fall back to initial_count minus total mortality on that batch
        log = (
            db.query(BatchDailyLog)
            .filter(
                BatchDailyLog.batch_id == col.batch_id,
                BatchDailyLog.log_date <= col.collect_date,
            )
            .order_by(BatchDailyLog.log_date.desc())
            .first()
        )

        if log:
            live_count = log.current_count
        elif col.batch:
            # Fallback: initial − all mortality_records (includes cullings)
            from models.models import MortalityRecord
            total_deaths = (
                db.query(func.coalesce(func.sum(MortalityRecord.count), 0))
                .filter(MortalityRecord.batch_id == col.batch_id)
                .scalar()
            ) or 0
            live_count = max(0, col.batch.initial_count - total_deaths)
        else:
            live_count = 0

        initial_count = col.batch.initial_count if col.batch else 0
        defect_s = col.defect_summary or {}

        reject    = int(defect_s.get("reject", 0) or 0)
        waste     = int(defect_s.get("waste",  0) or 0)
        saleable  = max(0, col.total_collected - (col.cracked_count or 0) - reject - waste)
        trays     = round(col.total_collected / 30, 2)

        hen_day_pct    = round(col.total_collected / live_count    * 100, 1) if live_count    > 0 else 0.0
        hen_housed_pct = round(col.total_collected / initial_count * 100, 1) if initial_count > 0 else 0.0

        trend.append({
            "date":          col.collect_date.strftime("%Y-%m-%d"),
            "total":         col.total_collected,
            "saleable":      saleable,
            "trays":         trays,
            "cracked":       col.cracked_count or 0,
            "hen_day_pct":   hen_day_pct,
            "hen_housed_pct": hen_housed_pct,
        })

    # All-time defect breakdown from defect_summary JSON + cracked_count column
    defect_totals = db.execute(text("""
            SELECT
                COALESCE(SUM(cracked_count), 0)                                    AS cracked,
                COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.soft_shell')),  0)    AS soft_shell,
                COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.double_yolk')), 0)    AS double_yolk,
                COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.dirty')),       0)    AS dirty,
                COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.misshaped')),   0)    AS misshaped,
                COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.reject')),      0)    AS reject,
                COALESCE(SUM(JSON_EXTRACT(defect_summary, '$.waste')),       0)    AS waste
            FROM egg_collections
            WHERE company_id = :cid AND farm_id = :fid
        """),
        {"cid": current_user.company_id, "fid": farm_id}
    ).mappings().one()

    total_defects = sum(int(v or 0) for v in defect_totals.values())
    total_safe    = total_col or 1

    def _dpct(n):
        return round(int(n or 0) / total_safe * 100, 2)

    total_saleable = max(0, int(total_col) - int(defect_totals["cracked"] or 0)
                         - int(defect_totals["reject"] or 0) - int(defect_totals["waste"] or 0))

    return {
        "total_collected": total_col,
        "total_saleable":  total_saleable,
        "total_trays":     round(total_col / 30, 2),
        "total_cracked":   total_cracked,
        "defect_rate": round(total_defects / total_safe * 100, 2) if total_col > 0 else 0.0,
        "defect_breakdown": {
            "cracked":     {"count": int(defect_totals["cracked"] or 0),     "pct": _dpct(defect_totals["cracked"])},
            "soft_shell":  {"count": int(defect_totals["soft_shell"] or 0),  "pct": _dpct(defect_totals["soft_shell"])},
            "double_yolk": {"count": int(defect_totals["double_yolk"] or 0), "pct": _dpct(defect_totals["double_yolk"])},
            "dirty":       {"count": int(defect_totals["dirty"] or 0),       "pct": _dpct(defect_totals["dirty"])},
            "misshaped":   {"count": int(defect_totals["misshaped"] or 0),   "pct": _dpct(defect_totals["misshaped"])},
            "reject":      {"count": int(defect_totals["reject"] or 0),      "pct": _dpct(defect_totals["reject"])},
            "waste":       {"count": int(defect_totals["waste"] or 0),       "pct": _dpct(defect_totals["waste"])},
        },
        "total_sales": float(total_sales),
        "trend": trend,
    }
