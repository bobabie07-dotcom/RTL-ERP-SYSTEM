import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, Farm, InventoryItem, InventoryMovement, PurchaseOrder, PurchaseOrderItem, Supplier
from routers.auth import get_current_user, require_permission
from utils import check_and_create_inventory_alerts, post_batch_expense
from schemas.schemas import (
    ApprovalAction,
    POItemCreate, PurchaseOrderCreate, PurchaseOrderRow, PurchaseOrderUpdate,
    SupplierCreate, SupplierOut, SyncInventoryPayload,
)

router = APIRouter(prefix="/procurement", tags=["procurement"])


# ── Suppliers ────────────────────────────────────────────────────────────────

def _ensure_farm_access(db: Session, farm_id: int, current_user) -> Farm:
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role_id != 6 and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to farm")
    return farm


def _ensure_supplier_access(db: Session, supplier_id: int | None, current_user) -> Supplier | None:
    if supplier_id is None:
        return None
    supplier = db.get(Supplier, supplier_id)
    if not supplier or not supplier.is_active:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if current_user.role_id != 6 and supplier.company_id not in (None, current_user.company_id):
        raise HTTPException(status_code=403, detail="Access denied to supplier")
    return supplier


def _ensure_item_access(db: Session, item_id: int, farm_id: int, current_user) -> InventoryItem:
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Inventory item {item_id} not found")
    if item.farm_id != farm_id:
        raise HTTPException(status_code=400, detail=f"Inventory item {item_id} does not belong to selected farm")
    if current_user.role_id != 6 and item.company_id not in (None, current_user.company_id):
        raise HTTPException(status_code=403, detail=f"Access denied to inventory item {item_id}")
    return item


@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Supplier).filter(Supplier.is_active == True)
    if current_user.role_id != 6:
        q = q.filter(or_(Supplier.company_id == current_user.company_id, Supplier.company_id == None))
    return q.order_by(Supplier.name).all()


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    body: SupplierCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    supplier = Supplier(**body.model_dump(), company_id=current_user.company_id)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


# ── Purchase Orders ───────────────────────────────────────────────────────────

_PO_ROW_SQL = """
    SELECT po.id, po.po_no, po.order_date, po.expected_date,
           s.name       AS supplier,
           po.batch_id,
           b.batch_no   AS batch,
           po.total_amount, po.status,
           au.full_name AS approved_by_name,
           po.notes
    FROM purchase_orders po
    LEFT JOIN suppliers s  ON po.supplier_id = s.id
    LEFT JOIN batches   b  ON po.batch_id    = b.id
    LEFT JOIN users    au  ON po.approved_by  = au.id
    WHERE po.id = :id
"""


def _fetch_po_row(db: Session, po_id: int) -> PurchaseOrderRow:
    row = db.execute(text(_PO_ROW_SQL), {"id": po_id}).mappings().one()
    return PurchaseOrderRow(**dict(row))


@router.get("/orders", response_model=list[PurchaseOrderRow])
def list_purchase_orders(
    farm_id: Optional[int] = Query(None),
    status:  Optional[str] = Query(None),
    limit:   int           = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role_id not in (1, 5):
        farm_id = current_user.farm_id
        if not farm_id:
            return []
    sql = """
        SELECT
            po.id,
            po.po_no,
            po.order_date,
            po.expected_date,
            s.name       AS supplier,
            po.batch_id,
            b.batch_no   AS batch,
            po.total_amount,
            po.status,
            au.full_name AS approved_by_name,
            po.notes
        FROM purchase_orders po
        LEFT JOIN suppliers s  ON po.supplier_id = s.id
        LEFT JOIN batches   b  ON po.batch_id    = b.id
        LEFT JOIN users     au ON po.approved_by  = au.id
        WHERE 1=1
    """
    params: dict = {"limit": limit}
    if current_user.role_id != 6:
        sql += " AND po.company_id = :company_id"
        params["company_id"] = current_user.company_id
    if farm_id:
        sql += " AND po.farm_id = :farm_id"
        params["farm_id"] = farm_id
    if status:
        sql += " AND po.status = :status"
        params["status"] = status
    sql += " ORDER BY po.order_date DESC LIMIT :limit"

    rows = db.execute(text(sql), params).mappings().all()
    return [PurchaseOrderRow(**dict(r)) for r in rows]


@router.post("/orders", response_model=PurchaseOrderRow, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    body: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "procurement")),
):
    farm = _ensure_farm_access(db, body.farm_id, current_user)
    _ensure_supplier_access(db, body.supplier_id, current_user)
    if body.batch_id:
        batch = db.get(Batch, body.batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.farm_id != body.farm_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to selected farm")
        if current_user.role_id != 6 and batch.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Access denied to batch")
    for it in body.items:
        _ensure_item_access(db, it.item_id, body.farm_id, current_user)

    latest_no = (
        db.query(func.max(PurchaseOrder.po_no))
        .filter(PurchaseOrder.company_id == farm.company_id)
        .scalar()
    )
    try:
        seq = int(latest_no.split("-")[-1]) + 1 if latest_no else 1
    except (ValueError, IndexError):
        seq = 1
    po_no = f"PO-{seq:06d}"

    items_data = body.items
    total = sum(float(it.qty_ordered) * float(it.unit_price) for it in items_data) if items_data else (float(body.total_amount or 0))

    po = PurchaseOrder(
        company_id=farm.company_id,
        farm_id=body.farm_id,
        supplier_id=body.supplier_id,
        batch_id=body.batch_id,
        order_date=body.order_date,
        expected_date=body.expected_date,
        notes=body.notes,
        total_amount=total,
        po_no=po_no,
        status="pending_approval",
        created_by=current_user.id,
    )
    db.add(po)
    db.flush()

    for it in items_data:
        db.add(PurchaseOrderItem(
            po_id=po.id,
            item_id=it.item_id,
            qty_ordered=it.qty_ordered,
            unit_price=it.unit_price,
        ))

    db.commit()
    db.refresh(po)
    return _fetch_po_row(db, po.id)


@router.patch("/orders/{po_id}", response_model=PurchaseOrderRow)
def update_purchase_order(
    po_id: int,
    body: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "procurement")),
):
    po = db.get(PurchaseOrder, po_id)
    if not po or (current_user.role_id != 6 and po.company_id != current_user.company_id):
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status not in ("pending_approval", "draft"):
        raise HTTPException(status_code=400, detail="Only draft or pending approval purchase orders can be edited")

    if body.farm_id is not None:
        new_farm = _ensure_farm_access(db, body.farm_id, current_user)
        po.farm_id = body.farm_id
        po.company_id = new_farm.company_id

    if body.batch_id is not None:
        new_batch = db.get(Batch, body.batch_id)
        if not new_batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if new_batch.farm_id != po.farm_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to selected farm")
        if current_user.role_id != 6 and new_batch.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Access denied to batch")
        po.batch_id = body.batch_id

    if body.supplier_id is not None:
        _ensure_supplier_access(db, body.supplier_id, current_user)

    exclude = {"farm_id", "batch_id"}
    for field, value in body.model_dump(exclude_none=True).items():
        if field not in exclude:
            setattr(po, field, value)

    db.commit()
    return _fetch_po_row(db, po_id)


@router.post("/orders/{po_id}/approve", response_model=PurchaseOrderRow)
def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "procurement")),
):
    try:
        if current_user.role_id not in (1, 2):
            raise HTTPException(status_code=403, detail="Only managers and admins can approve purchase orders")
        po = db.get(PurchaseOrder, po_id)
        if not po or (current_user.role_id != 6 and po.company_id != current_user.company_id):
            raise HTTPException(status_code=404, detail="Purchase order not found")
        if po.status != "pending_approval":
            raise HTTPException(status_code=400, detail=f"Purchase order is already {po.status}")
        po.status      = "ordered"
        po.approved_by = current_user.id
        po.approved_at = datetime.utcnow()
        db.commit()
        return _fetch_po_row(db, po_id)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/orders/{po_id}/reject", response_model=PurchaseOrderRow)
def reject_purchase_order(
    po_id: int,
    body: ApprovalAction,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "procurement")),
):
    if current_user.role_id not in (1, 2):
        raise HTTPException(status_code=403, detail="Only managers and admins can reject purchase orders")
    po = db.get(PurchaseOrder, po_id)
    if not po or (current_user.role_id != 6 and po.company_id != current_user.company_id):
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Purchase order is already {po.status}")
    po.status           = "cancelled"
    po.rejection_reason = body.rejection_reason
    po.approved_by      = current_user.id
    po.approved_at      = datetime.utcnow()
    db.commit()
    return _fetch_po_row(db, po_id)


@router.delete("/orders/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("delete")),
):
    if current_user.role_id not in (1, 2):
        raise HTTPException(status_code=403, detail="Only managers and admins can delete purchase orders")
    po = db.get(PurchaseOrder, po_id)
    if not po or (current_user.role_id != 6 and po.company_id != current_user.company_id):
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status not in ("pending_approval", "cancelled"):
        raise HTTPException(status_code=400, detail="Only pending approval or cancelled purchase orders can be deleted")
    for item in db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po_id).all():
        db.delete(item)
    db.delete(po)
    db.commit()


@router.post("/orders/{po_id}/receive", response_model=PurchaseOrderRow)
def receive_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "procurement")),
):
    try:
        po = db.get(PurchaseOrder, po_id)
        if not po or (current_user.role_id != 6 and po.company_id != current_user.company_id):
            raise HTTPException(status_code=404, detail="Purchase order not found")
        if po.status not in ("ordered", "partial"):
            raise HTTPException(status_code=400, detail="Only ordered POs can be marked received")

        for po_item in db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po_id).all():
            delta = float(po_item.qty_ordered) - float(po_item.qty_received)
            if delta <= 0 or not po_item.item_id:
                continue
            inv_item = db.get(InventoryItem, po_item.item_id)
            if not inv_item:
                continue
            _ensure_item_access(db, inv_item.id, po.farm_id, current_user)
            inv_item.qty_on_hand = float(inv_item.qty_on_hand) + delta
            if float(po_item.unit_price or 0) > 0:
                inv_item.cost_per_unit = float(po_item.unit_price)
            db.add(InventoryMovement(
                item_id=inv_item.id,
                movement_type="in",
                qty=delta,
                reference_type="purchase",
                reference_id=po.id,
                notes=f"Received via {po.po_no}",
                created_by=current_user.id,
            ))
            po_item.qty_received = float(po_item.qty_ordered)
            check_and_create_inventory_alerts(inv_item, db)

        po.status = "received"

        # Auto-post PURCHASE expense to linked batch
        if po.batch_id:
            try:
                posted = 0
                for po_item in db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po_id).all():
                    item_amount = float(po_item.qty_ordered) * float(po_item.unit_price or 0)
                    if item_amount <= 0:
                        continue
                    inv_item = db.get(InventoryItem, po_item.item_id)
                    item_name = inv_item.name if inv_item else f"Item #{po_item.item_id}"
                    result = post_batch_expense(
                        batch_id=po.batch_id,
                        category_code="PURCHASE",
                        amount=item_amount,
                        expense_date=po.order_date,
                        db=db,
                        qty=float(po_item.qty_ordered),
                        unit_cost=float(po_item.unit_price or 0),
                        description=f"{item_name} via {po.po_no}",
                        source_module="PROCUREMENT",
                        source_ref=po.po_no,
                        created_by=current_user.id,
                    )
                    if result is None:
                        logger.warning("PURCHASE category missing — expense not posted for %s item %s", po.po_no, po_item.item_id)
                    else:
                        posted += 1
                if posted > 0:
                    logger.info("Posted %d PURCHASE expense(s) to batch %s from %s", posted, po.batch_id, po.po_no)
            except Exception:
                logger.warning("post_batch_expense failed for PO %s", po.po_no, exc_info=True)

        db.commit()
        return _fetch_po_row(db, po_id)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/orders/{po_id}/sync-inventory", status_code=status.HTTP_204_NO_CONTENT)
def sync_inventory_from_po(
    po_id: int,
    body: SyncInventoryPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "procurement")),
):
    po = db.get(PurchaseOrder, po_id)
    if not po or (current_user.role_id != 6 and po.company_id != current_user.company_id):
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status != "received":
        raise HTTPException(status_code=400, detail="Only received POs can be synced to inventory")
    existing_movement = db.query(InventoryMovement).filter(
        InventoryMovement.reference_type == "purchase",
        InventoryMovement.reference_id == po.id,
    ).first()
    if existing_movement:
        raise HTTPException(status_code=409, detail="Purchase order is already synced to inventory")

    for it in body.items:
        if not it.item_id or float(it.qty_ordered) <= 0:
            continue
        inv_item = _ensure_item_access(db, it.item_id, po.farm_id, current_user)
        inv_item.qty_on_hand = float(inv_item.qty_on_hand) + float(it.qty_ordered)
        if float(it.unit_price or 0) > 0:
            inv_item.cost_per_unit = float(it.unit_price)
        db.add(InventoryMovement(
            item_id=inv_item.id,
            movement_type="in",
            qty=it.qty_ordered,
            reference_type="purchase",
            reference_id=po.id,
            notes=f"Backfilled from {po.po_no}",
            created_by=current_user.id,
        ))

    db.commit()
