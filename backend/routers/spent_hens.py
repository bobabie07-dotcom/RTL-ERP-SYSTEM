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

router = APIRouter(prefix="/spent-hens", tags=["Spent Hens"])
logger = logging.getLogger(__name__)


def _verify_farm_access(farm_id: int, current_user: User):
    if current_user.role_id not in (1, 5, 6) and farm_id != current_user.farm_id:
        raise HTTPException(status_code=403, detail="Access denied to this farm's operations")


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

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(sale, field, value)

    # Recalculate total if weight or price changed
    if sale.avg_weight_kg and sale.birds_sold:
        sale.total_weight_kg = round(float(sale.avg_weight_kg) * sale.birds_sold, 3)
    total = Decimal(str(sale.price_per_kg)) * Decimal(str(sale.total_weight_kg or sale.birds_sold))
    sale.total_amount = total - Decimal(str(sale.transport_cost or 0))

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
