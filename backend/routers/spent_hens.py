import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.models import Batch, Buyer, SpentHenSale, User
from routers.auth import get_current_user, require_permission
from schemas.schemas import SpentHenSaleCreate, SpentHenSaleOut, SpentHenSaleUpdate
from utils import post_batch_revenue, void_batch_revenues_by_source

router = APIRouter(prefix="/spent-hens", tags=["Spent Hens"])
logger = logging.getLogger(__name__)


def _verify_farm_access(farm_id: int, current_user: User):
    if current_user.role_id not in (1, 5, 6) and farm_id != current_user.farm_id:
        raise HTTPException(status_code=403, detail="Access denied to this farm's operations")


def _post_spent_hen_revenue(sale: SpentHenSale, db: Session, user_id: int | None = None):
    if not sale.batch_id:
        return None
    return post_batch_revenue(
        batch_id=sale.batch_id,
        amount=float(sale.total_amount),
        revenue_date=sale.sale_date,
        db=db,
        category="SPENT_HENS",
        qty_kg=float(sale.total_weight_kg or 0) or None,
        qty_birds=sale.birds_sold,
        price_per_kg=float(sale.price_per_kg),
        description=f"Spent hen sale #{sale.id}",
        source_module="SPENT_HENS",
        source_ref=str(sale.id),
        buyer_id=sale.buyer_id,
        created_by=user_id,
    )


@router.get("", response_model=list[SpentHenSaleOut])
def list_sales(
    farm_id: int,
    batch_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_farm_access(farm_id, current_user)

    q = db.query(SpentHenSale).filter(
        SpentHenSale.company_id == current_user.company_id,
        SpentHenSale.farm_id == farm_id,
    )
    if batch_id:
        q = q.filter(SpentHenSale.batch_id == batch_id)
    if start_date:
        q = q.filter(SpentHenSale.sale_date >= start_date)
    if end_date:
        q = q.filter(SpentHenSale.sale_date <= end_date)

    return q.order_by(SpentHenSale.sale_date.desc()).all()


@router.post("", response_model=SpentHenSaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(
    body: SpentHenSaleCreate,
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "spent_hens")),
):
    _verify_farm_access(farm_id, current_user)

    if body.batch_id:
        batch = db.query(Batch).filter(
            Batch.id == body.batch_id,
            Batch.company_id == current_user.company_id,
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.farm_id != farm_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to selected farm")

    total_weight = None
    if body.avg_weight_kg and body.birds_sold:
        total_weight = round(body.avg_weight_kg * body.birds_sold, 3)

    total_amount = Decimal(str(body.price_per_kg)) * Decimal(str(total_weight or body.birds_sold))
    total_amount = total_amount - Decimal(str(body.transport_cost or 0))

    sale = SpentHenSale(
        company_id=current_user.company_id,
        farm_id=farm_id,
        batch_id=body.batch_id,
        sale_date=body.sale_date,
        buyer_id=body.buyer_id,
        birds_sold=body.birds_sold,
        avg_weight_kg=body.avg_weight_kg,
        total_weight_kg=total_weight,
        price_per_kg=body.price_per_kg,
        transport_cost=body.transport_cost or 0,
        total_amount=total_amount,
        payment_status=body.payment_status,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(sale)
    db.flush()
    _post_spent_hen_revenue(sale, db, current_user.id)
    db.commit()
    db.refresh(sale)
    return sale


@router.patch("/{sale_id}", response_model=SpentHenSaleOut)
def update_sale(
    sale_id: int,
    body: SpentHenSaleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "spent_hens")),
):
    sale = db.get(SpentHenSale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Spent hen sale not found")
    if current_user.role_id != 6 and sale.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    data = body.model_dump(exclude_unset=True)
    if "batch_id" in data:
        raise HTTPException(status_code=400, detail="Batch cannot be changed after creating a spent hen sale")
    for field, value in data.items():
        setattr(sale, field, value)

    # Recalculate total if weight or price changed
    if sale.avg_weight_kg and sale.birds_sold:
        sale.total_weight_kg = round(float(sale.avg_weight_kg) * sale.birds_sold, 3)
    total = Decimal(str(sale.price_per_kg)) * Decimal(str(sale.total_weight_kg or sale.birds_sold))
    sale.total_amount = total - Decimal(str(sale.transport_cost or 0))
    void_batch_revenues_by_source(
        db,
        "SPENT_HENS",
        str(sale.id),
        "Spent hen sale updated",
        voided_by=current_user.id,
    )
    _post_spent_hen_revenue(sale, db, current_user.id)

    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("write", "spent_hens")),
):
    sale = db.get(SpentHenSale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Spent hen sale not found")
    if current_user.role_id != 6 and sale.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    void_batch_revenues_by_source(
        db,
        "SPENT_HENS",
        str(sale.id),
        "Spent hen sale deleted",
        voided_by=current_user.id,
    )
    db.delete(sale)
    db.commit()


@router.get("/summary")
def sale_summary(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_farm_access(farm_id, current_user)

    row = db.execute(
        __import__("sqlalchemy").text("""
            SELECT
                COUNT(*)                        AS total_sales,
                COALESCE(SUM(birds_sold), 0)    AS total_birds,
                COALESCE(SUM(total_weight_kg),0)AS total_weight_kg,
                COALESCE(SUM(total_amount), 0)  AS total_revenue
            FROM spent_hen_sales
            WHERE company_id = :cid AND farm_id = :fid
        """),
        {"cid": current_user.company_id, "fid": farm_id},
    ).mappings().one()
    return dict(row)
