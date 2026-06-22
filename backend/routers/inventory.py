from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import InventoryCategory, InventoryItem, InventoryMovement, PurchaseOrder, Supplier
from routers.auth import get_current_user, require_permission
from schemas.schemas import (
    InventoryCategoryOut, InventoryItemCreate, InventoryItemOut, InventoryItemUpdate,
    MovementCreate, MovementOut, SupplierOut,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[InventoryCategoryOut])
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(InventoryCategory).all()


# ── Items ─────────────────────────────────────────────────────────────────────

@router.get("/items", response_model=list[InventoryItemOut])
def list_items(
    farm_id:     Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    status:      Optional[str] = Query(None),  # in_stock | low_stock | out_of_stock
    search:      Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(InventoryItem)
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
    _=Depends(require_permission("write", "inventory")),
):
    item = InventoryItem(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/items/{item_id}", response_model=InventoryItemOut)
def update_item(
    item_id: int,
    body: InventoryItemUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "inventory")),
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

    # Update quantity on hand
    delta = float(body.qty) if body.movement_type == "in" else -float(body.qty)
    item.qty_on_hand = float(item.qty_on_hand) + delta

    db.commit()
    db.refresh(movement)
    return movement


# ── Suppliers ─────────────────────────────────────────────────────────────────

@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Supplier).filter(Supplier.is_active == True).all()
