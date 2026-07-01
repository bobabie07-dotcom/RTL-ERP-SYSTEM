from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import InventoryCategory, InventoryItem, InventoryMovement, Supplier
from routers.auth import get_current_user, require_permission
from schemas.schemas import (
    InventoryCategoryCreate, InventoryCategoryOut,
    InventoryItemCreate, InventoryItemOut, InventoryItemUpdate,
    MovementCreate, MovementOut, ReservePayload, SupplierOut,
)
from utils import check_and_create_inventory_alerts

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[InventoryCategoryOut])
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(InventoryCategory).all()


@router.post("/categories", response_model=InventoryCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    body: InventoryCategoryCreate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "inventory")),
):
    name = body.name.strip()
    existing = db.query(InventoryCategory).filter(InventoryCategory.name.ilike(name)).first()
    if existing:
        return existing
    cat = InventoryCategory(name=name, name_ar=body.name_ar)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ── Items ─────────────────────────────────────────────────────────────────────

@router.get("/items", response_model=list[InventoryItemOut])
def list_items(
    farm_id:     Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    status:      Optional[str] = Query(None),  # in_stock | low_stock | out_of_stock
    search:      Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(InventoryItem)
    if current_user.role_id not in (6,):
        q = q.filter(InventoryItem.company_id == current_user.company_id)

    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
    if farm_id:
        q = q.filter(InventoryItem.farm_id == farm_id)
    if category_id:
        q = q.filter(InventoryItem.category_id == category_id)
    if search:
        q = q.filter(InventoryItem.name.ilike(f"%{search}%"))

    items = q.order_by(InventoryItem.name).all()

    # Apply status filter in Python (computed property)
    if status:
        items = [i for i in items if i.status == status]

    return items


@router.post("/items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    body: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "inventory")),
):
    item = InventoryItem(**body.model_dump(), company_id=current_user.company_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/items/{item_id}", response_model=InventoryItemOut)
def update_item(
    item_id: int,
    body: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "inventory")),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("delete")),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


# ── Movements ─────────────────────────────────────────────────────────────────

@router.get("/movements", response_model=list[MovementOut])
def list_movements(
    item_id: Optional[int] = Query(None),
    limit:   int = Query(50, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(InventoryMovement)
    if item_id:
        q = q.filter(InventoryMovement.item_id == item_id)
    return q.order_by(InventoryMovement.created_at.desc()).limit(limit).all()


@router.post("/movements", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def record_movement(
    body: MovementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = db.get(InventoryItem, body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    movement = InventoryMovement(**body.model_dump(), created_by=current_user.id)
    db.add(movement)

    delta = float(body.qty) if body.movement_type == "in" else -float(body.qty)
    item.qty_on_hand = float(item.qty_on_hand) + delta

    check_and_create_inventory_alerts(item, db)
    db.commit()
    db.refresh(movement)
    return movement


# ── Reserve / Release ─────────────────────────────────────────────────────────

@router.post("/items/{item_id}/reserve", response_model=InventoryItemOut)
def reserve_stock(
    item_id: int,
    body: ReservePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "inventory")),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if float(body.qty) > item.qty_available:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reserve {body.qty} — only {item.qty_available:.2f} {item.unit} available",
        )
    item.qty_reserved = float(item.qty_reserved) + float(body.qty)
    db.add(InventoryMovement(
        item_id=item.id,
        movement_type="adjustment",
        qty=body.qty,
        reference_type="adjustment",
        notes=f"Reserved: {body.reason or 'manual reservation'}",
        created_by=current_user.id,
    ))
    check_and_create_inventory_alerts(item, db)
    db.commit()
    db.refresh(item)
    return item


@router.post("/items/{item_id}/release", response_model=InventoryItemOut)
def release_stock(
    item_id: int,
    body: ReservePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "inventory")),
):
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    release_qty = min(float(body.qty), float(item.qty_reserved))
    item.qty_reserved = max(0.0, float(item.qty_reserved) - release_qty)
    db.add(InventoryMovement(
        item_id=item.id,
        movement_type="adjustment",
        qty=release_qty,
        reference_type="adjustment",
        notes=f"Released reservation: {body.reason or 'manual release'}",
        created_by=current_user.id,
    ))
    db.commit()
    db.refresh(item)
    return item


# ── Check Alerts ──────────────────────────────────────────────────────────────

class CheckAlertsPayload(BaseModel):
    farm_id: int


@router.post("/check-alerts", status_code=status.HTTP_204_NO_CONTENT)
def check_inventory_alerts(
    body: CheckAlertsPayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    target_farm_id = body.farm_id
    if current_user.role_id not in (1, 5):
        target_farm_id = current_user.farm_id
    items = db.query(InventoryItem).filter(InventoryItem.farm_id == target_farm_id).all()
    for item in items:
        check_and_create_inventory_alerts(item, db)
    db.commit()


# ── Suppliers ─────────────────────────────────────────────────────────────────

@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Supplier).filter(Supplier.is_active == True).all()
