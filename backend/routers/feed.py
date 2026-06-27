from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, FeedIssue, FeedPurchase, FeedStock, FeedType, House, InventoryItem, InventoryMovement
from routers.auth import get_current_user, require_permission
from utils import check_and_create_inventory_alerts
from schemas.schemas import (
    FeedIssueCreate, FeedIssueOut, FeedIssueRow,
    FeedPurchaseCreate, FeedPurchaseOut, FeedPurchaseRow,
    FeedStockRow, FeedTypeCreate, FeedTypePatch, FeedTypeOut,
)

router = APIRouter(prefix="/feed", tags=["feed"])


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

    # When a new link is established, reconcile inventory qty to match feed stock
    if body.inventory_item_id and body.inventory_item_id != old_item_id:
        stock = db.get(FeedStock, type_id)
        inv_item = db.get(InventoryItem, body.inventory_item_id)
        if stock and inv_item:
            old_qty = float(inv_item.qty_on_hand)
            new_qty = float(stock.qty_on_hand_kg)
            inv_item.qty_on_hand = new_qty
            diff = new_qty - old_qty
            if diff != 0:
                db.add(InventoryMovement(
                    item_id=body.inventory_item_id,
                    movement_type="adjustment",
                    qty=abs(diff),
                    reference_type="adjustment",
                    notes=f"Reconciled on link to feed type '{ft.name}' — feed stock was {new_qty} kg",
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
        JOIN feed_types ft ON fp.feed_type_id = ft.id
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


@router.get("/weekly")
def weekly_consumption(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
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
