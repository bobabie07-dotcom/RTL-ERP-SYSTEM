from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, Buyer, Expense, SalesOrder
from routers.auth import get_current_user, require_permission
from utils import post_batch_revenue
from schemas.schemas import (
    ApprovalAction,
    BuyerCreate, BuyerOut,
    ExpenseCreate, ExpenseOut,
    SalesOrderCreate, SalesOrderOut, SalesOrderRow, SalesOrderUpdate,
)

router = APIRouter(prefix="/sales", tags=["sales"])


# ── Buyers ────────────────────────────────────────────────────────────────────

@router.get("/buyers", response_model=list[BuyerOut])
def list_buyers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Buyer).filter(Buyer.is_active == True).all()


@router.post("/buyers", response_model=BuyerOut, status_code=status.HTTP_201_CREATED)
def create_buyer(
    body: BuyerCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    buyer = Buyer(**body.model_dump())
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


# ── Sales Orders ──────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[SalesOrderRow])
def list_orders(
    batch_id: Optional[int] = Query(None),
    farm_id:  Optional[int] = Query(None),
    status:   Optional[str] = Query(None),
    limit:    int = Query(100, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql = """
        SELECT
            so.id,
            so.batch_id,
            so.order_no,
            so.order_date                AS date,
            b.batch_no                   AS batch,
            buy.name                     AS buyer,
            so.qty_kg,
            so.price_per_kg,
            so.qty_kg * so.price_per_kg  AS total_amount,
            so.status,
            so.payment_status,
            au.full_name                 AS approved_by_name
        FROM sales_orders so
        JOIN batches b       ON so.batch_id   = b.id
        LEFT JOIN buyers buy  ON so.buyer_id   = buy.id
        LEFT JOIN users  au   ON so.approved_by = au.id
        WHERE 1=1
    """
    params: dict = {"limit": limit}
    if batch_id:
        sql += " AND so.batch_id = :batch_id"
        params["batch_id"] = batch_id
    if farm_id:
        sql += " AND b.farm_id = :farm_id"
        params["farm_id"] = farm_id
    if status:
        sql += " AND so.status = :status"
        params["status"] = status
    sql += " ORDER BY so.order_date DESC LIMIT :limit"

    rows = db.execute(text(sql), params).mappings().all()
    return [SalesOrderRow(**dict(r)) for r in rows]


@router.post("/orders", response_model=SalesOrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    body: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "sales")),
):
    if not db.get(Batch, body.batch_id):
        raise HTTPException(status_code=404, detail="Batch not found")
    if db.query(SalesOrder).filter(SalesOrder.order_no == body.order_no).first():
        raise HTTPException(status_code=400, detail="Order number already exists")

    # Block sale if active withdrawal period exists for this batch
    withdrawal = db.execute(text("""
        SELECT COUNT(*) FROM treatments
        WHERE batch_id = :batch_id AND withdrawal_end_date >= CURDATE()
    """), {"batch_id": body.batch_id}).scalar()
    if withdrawal:
        raise HTTPException(
            status_code=409,
            detail="Batch has an active withdrawal period — sale blocked until withdrawal ends",
        )

    order = SalesOrder(**body.model_dump(), created_by=current_user.id, status="pending_approval")
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/orders/{order_id}/approve", response_model=SalesOrderOut)
def approve_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "sales")),
):
    if current_user.role_id not in (1, 2):
        raise HTTPException(status_code=403, detail="Only managers and admins can approve orders")
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Order is already {order.status}")
    from datetime import datetime
    order.status      = "pending"
    order.approved_by = current_user.id
    order.approved_at = datetime.utcnow()

    # Auto-post revenue to batch_revenues
    try:
        post_batch_revenue(
            batch_id=order.batch_id,
            amount=float(order.qty_kg) * float(order.price_per_kg),
            revenue_date=order.order_date,
            db=db,
            category="SALES",
            qty_kg=float(order.qty_kg),
            price_per_kg=float(order.price_per_kg),
            description=f"Sales order {order.order_no}",
            sales_order_id=order.id,
            buyer_id=order.buyer_id,
            created_by=current_user.id,
        )
    except Exception:
        pass  # never block approval due to finance hook failure

    db.commit()
    db.refresh(order)
    return order


@router.post("/orders/{order_id}/reject", response_model=SalesOrderOut)
def reject_order(
    order_id: int,
    body: ApprovalAction,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "sales")),
):
    if current_user.role_id not in (1, 2):
        raise HTTPException(status_code=403, detail="Only managers and admins can reject orders")
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Order is already {order.status}")
    order.status           = "cancelled"
    order.rejection_reason = body.rejection_reason
    order.approved_by      = current_user.id
    from datetime import datetime
    order.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.patch("/orders/{order_id}", response_model=SalesOrderOut)
def update_order(
    order_id: int,
    body: SalesOrderUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("delete")),
):
    if current_user.role_id not in (1, 2):
        raise HTTPException(status_code=403, detail="Only managers and admins can delete orders")
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()


# ── Expenses ──────────────────────────────────────────────────────────────────

@router.get("/expenses", response_model=list[ExpenseOut])
def list_expenses(
    farm_id:  Optional[int] = Query(None),
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Expense)
    if farm_id:
        q = q.filter(Expense.farm_id == farm_id)
    if batch_id:
        q = q.filter(Expense.batch_id == batch_id)
    return q.order_by(Expense.expense_date.desc()).all()


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense = Expense(**body.model_dump(), recorded_by=current_user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.patch("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()


# ── Payment recording ─────────────────────────────────────────────────────────

@router.patch("/orders/{order_id}/payment", response_model=SalesOrderOut)
def record_payment(
    order_id: int,
    body: SalesOrderUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if body.payment_status:
        order.payment_status = body.payment_status
    db.commit()
    db.refresh(order)
    return order


# ── Accounts Receivable ───────────────────────────────────────────────────────

@router.get("/receivables")
def accounts_receivable(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT
            so.id,
            so.batch_id,
            so.order_no,
            so.order_date,
            so.delivery_date,
            buy.name                              AS buyer,
            buy.phone                             AS buyer_phone,
            b.batch_no                            AS batch,
            so.qty_kg * so.price_per_kg           AS total_amount,
            so.payment_status,
            so.status                             AS order_status,
            DATEDIFF(CURDATE(), so.order_date)    AS days_outstanding
        FROM sales_orders so
        JOIN batches b       ON so.batch_id  = b.id
        LEFT JOIN buyers buy  ON so.buyer_id  = buy.id
        WHERE b.farm_id = :farm_id
          AND so.status NOT IN ('cancelled','pending_approval')
          AND so.payment_status IN ('unpaid','partial')
        ORDER BY so.order_date ASC
    """), {"farm_id": farm_id}).mappings().all()

    total_outstanding = sum(float(r["total_amount"] or 0) for r in rows)

    overdue_30  = [r for r in rows if int(r["days_outstanding"] or 0) >= 30]
    overdue_60  = [r for r in rows if int(r["days_outstanding"] or 0) >= 60]

    return {
        "total_outstanding": round(total_outstanding, 2),
        "count":             len(rows),
        "overdue_30_count":  len(overdue_30),
        "overdue_60_count":  len(overdue_60),
        "orders":            [dict(r) for r in rows],
    }


# ── Revenue summary ───────────────────────────────────────────────────────────

@router.get("/summary")
def sales_summary(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    row = db.execute(text("""
        SELECT
            COUNT(so.id)                                        AS total_orders,
            COALESCE(SUM(so.qty_kg * so.price_per_kg), 0)      AS total_revenue,
            COALESCE(SUM(so.qty_kg), 0)                        AS total_kg,
            COALESCE(AVG(so.price_per_kg), 0)                  AS avg_price_per_kg,
            SUM(CASE WHEN so.status = 'pending' THEN 1 ELSE 0 END) AS pending_orders
        FROM sales_orders so
        JOIN batches b ON so.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND so.status != 'cancelled'
    """), {"farm_id": farm_id}).mappings().one()
    return dict(row)
