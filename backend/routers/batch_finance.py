from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, BatchExpense, BatchRevenue, ExpenseCategory
from routers.auth import get_current_user, require_permission
from schemas.schemas import (
    BatchExpenseCreate, BatchExpenseRow,
    BatchRevenueCreate, BatchRevenueRow,
    VoidRequest,
)
from utils import post_batch_expense, post_batch_revenue

router = APIRouter(prefix="/batches", tags=["batch-finance"])

_EXP_SELECT = """
    SELECT
        be.id, be.batch_id, be.expense_date,
        ec.code AS category_code, ec.name AS category_name,
        CAST(be.amount   AS DOUBLE) AS amount,
        CAST(be.qty      AS DOUBLE) AS qty,
        be.unit,
        CAST(be.unit_cost AS DOUBLE) AS unit_cost,
        be.description, be.source_module, be.source_ref,
        be.is_voided, be.void_reason, be.created_at
    FROM batch_expenses be
    JOIN expense_categories ec ON ec.id = be.category_id
"""

_REV_SELECT = """
    SELECT
        br.id, br.batch_id, br.revenue_date, br.category,
        CAST(br.amount       AS DOUBLE) AS amount,
        CAST(br.qty_kg       AS DOUBLE) AS qty_kg,
        br.qty_birds,
        CAST(br.price_per_kg AS DOUBLE) AS price_per_kg,
        br.description, br.sales_order_id, br.is_voided, br.created_at
    FROM batch_revenues br
"""


def _get_batch_or_404(batch_id: int, db: Session, current_user=None) -> Batch:
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user and current_user.role_id not in (1, 5) and batch.farm_id != current_user.farm_id:
        raise HTTPException(status_code=403, detail="Access denied to this batch")
    return batch


# ── Expense Categories ────────────────────────────────────────────────────────

@router.get("/{batch_id}/finance/categories")
def list_expense_categories(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    cats = db.query(ExpenseCategory).order_by(ExpenseCategory.sort_order).all()
    return [{"id": c.id, "code": c.code, "name": c.name} for c in cats]


# ── Expenses ──────────────────────────────────────────────────────────────────

@router.get("/{batch_id}/finance/expenses", response_model=list[BatchExpenseRow])
def list_batch_expenses(
    batch_id: int,
    include_voided: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_batch_or_404(batch_id, db, current_user)
    sql = _EXP_SELECT + " WHERE be.batch_id = :bid"
    params = {"bid": batch_id}
    if not include_voided:
        sql += " AND be.is_voided = FALSE"
    sql += " ORDER BY be.expense_date DESC, be.created_at DESC"
    rows = db.execute(text(sql), params).mappings().all()
    return [BatchExpenseRow(**dict(r)) for r in rows]


@router.post("/{batch_id}/finance/expenses", response_model=BatchExpenseRow, status_code=201)
def add_batch_expense(
    batch_id: int,
    body: BatchExpenseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    _get_batch_or_404(batch_id, db, current_user)
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == body.category_code).first()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Expense category '{body.category_code}' not found")

    exp = post_batch_expense(
        batch_id=batch_id,
        category_code=body.category_code,
        amount=body.amount,
        expense_date=body.expense_date,
        db=db,
        qty=body.qty,
        unit=body.unit,
        unit_cost=body.unit_cost,
        description=body.description,
        source_module="MANUAL",
        created_by=current_user.id,
    )
    db.commit()
    db.refresh(exp)
    row = db.execute(text(_EXP_SELECT + " WHERE be.id = :id"), {"id": exp.id}).mappings().one()
    return BatchExpenseRow(**dict(row))


@router.patch("/{batch_id}/finance/expenses/{exp_id}", response_model=BatchExpenseRow)
def update_batch_expense(
    batch_id: int,
    exp_id: int,
    body: BatchExpenseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    _get_batch_or_404(batch_id, db, current_user)
    exp = db.get(BatchExpense, exp_id)
    if not exp or exp.batch_id != batch_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    if exp.is_voided:
        raise HTTPException(status_code=400, detail="Cannot edit a voided expense")
    if exp.source_module != "MANUAL":
        raise HTTPException(status_code=400, detail="Only manual expenses can be edited")

    cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == body.category_code).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    exp.category_id  = cat.id
    exp.expense_date = body.expense_date
    exp.amount       = body.amount
    exp.qty          = body.qty
    exp.unit         = body.unit
    exp.unit_cost    = body.unit_cost
    exp.description  = body.description
    db.commit()

    row = db.execute(text(_EXP_SELECT + " WHERE be.id = :id"), {"id": exp_id}).mappings().one()
    return BatchExpenseRow(**dict(row))


@router.post("/{batch_id}/finance/expenses/{exp_id}/void")
def void_batch_expense(
    batch_id: int,
    exp_id: int,
    body: VoidRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    _get_batch_or_404(batch_id, db, current_user)
    exp = db.get(BatchExpense, exp_id)
    if not exp or exp.batch_id != batch_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    if exp.is_voided:
        raise HTTPException(status_code=400, detail="Already voided")
    exp.is_voided   = True
    exp.void_reason = body.void_reason
    exp.voided_by   = current_user.id
    exp.voided_at   = datetime.utcnow()
    db.commit()
    return {"ok": True}


# ── Revenues ──────────────────────────────────────────────────────────────────

@router.get("/{batch_id}/finance/revenues", response_model=list[BatchRevenueRow])
def list_batch_revenues(
    batch_id: int,
    include_voided: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_batch_or_404(batch_id, db, current_user)
    sql = _REV_SELECT + " WHERE br.batch_id = :bid"
    params = {"bid": batch_id}
    if not include_voided:
        sql += " AND br.is_voided = FALSE"
    sql += " ORDER BY br.revenue_date DESC, br.created_at DESC"
    rows = db.execute(text(sql), params).mappings().all()
    return [BatchRevenueRow(**dict(r)) for r in rows]


@router.post("/{batch_id}/finance/revenues", response_model=BatchRevenueRow, status_code=201)
def add_batch_revenue(
    batch_id: int,
    body: BatchRevenueCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "batches")),
):
    _get_batch_or_404(batch_id, db, current_user)
    rev = post_batch_revenue(
        batch_id=batch_id,
        amount=body.amount,
        revenue_date=body.revenue_date,
        db=db,
        category=body.category,
        qty_kg=body.qty_kg,
        qty_birds=body.qty_birds,
        price_per_kg=body.price_per_kg,
        description=body.description,
        created_by=current_user.id,
    )
    db.commit()
    db.refresh(rev)
    row = db.execute(text(_REV_SELECT + " WHERE br.id = :id"), {"id": rev.id}).mappings().one()
    return BatchRevenueRow(**dict(row))


# ── P&L ───────────────────────────────────────────────────────────────────────

@router.get("/{batch_id}/finance/pnl")
def get_batch_pnl(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    batch = _get_batch_or_404(batch_id, db, current_user)

    # Revenue from batch_revenues (auto-posted when sales orders are approved)
    rev_captured = float(db.execute(text("""
        SELECT COALESCE(SUM(amount), 0) FROM batch_revenues
        WHERE batch_id = :bid AND is_voided = FALSE
    """), {"bid": batch_id}).scalar() or 0)

    # Revenue from approved sales_orders not yet in batch_revenues (backward compat)
    rev_uncaptured = float(db.execute(text("""
        SELECT COALESCE(SUM(so.qty_kg * so.price_per_kg), 0)
        FROM sales_orders so
        WHERE so.batch_id = :bid
          AND so.status NOT IN ('pending_approval', 'cancelled')
          AND NOT EXISTS (
              SELECT 1 FROM batch_revenues br
              WHERE br.sales_order_id = so.id AND br.is_voided = FALSE
          )
    """), {"bid": batch_id}).scalar() or 0)

    total_revenue = rev_captured + rev_uncaptured

    # Feed cost from feed_issues × avg purchase price (always from raw source)
    feed_row = db.execute(text("""
        SELECT
            COALESCE(SUM(fi.qty_kg * COALESCE(fp.avg_cost, 25.0)), 0) AS feed_cost,
            COALESCE(SUM(fi.qty_kg), 0)                                AS total_feed_kg
        FROM feed_issues fi
        LEFT JOIN (
            SELECT feed_type_id, AVG(cost_per_kg) AS avg_cost
            FROM feed_purchases GROUP BY feed_type_id
        ) fp ON fp.feed_type_id = fi.feed_type_id
        WHERE fi.batch_id = :bid
    """), {"bid": batch_id}).mappings().one()
    feed_cost     = float(feed_row["feed_cost"])
    total_feed_kg = float(feed_row["total_feed_kg"])

    # Mortality count
    mortality_count = int(db.execute(text("""
        SELECT COALESCE(SUM(count), 0) FROM mortality_records WHERE batch_id = :bid
    """), {"bid": batch_id}).scalar() or 0)

    # batch_expenses: mortality loss (auto-posted by mortality hook)
    mortality_loss = float(db.execute(text("""
        SELECT COALESCE(SUM(be.amount), 0)
        FROM batch_expenses be
        JOIN expense_categories ec ON ec.id = be.category_id
        WHERE be.batch_id = :bid AND be.is_voided = FALSE AND ec.code = 'MORTALITY_LOSS'
    """), {"bid": batch_id}).scalar() or 0)

    # batch_expenses: all other categories (MANUAL entries: labor, utilities, etc.)
    other_batch = float(db.execute(text("""
        SELECT COALESCE(SUM(be.amount), 0)
        FROM batch_expenses be
        JOIN expense_categories ec ON ec.id = be.category_id
        WHERE be.batch_id = :bid AND be.is_voided = FALSE AND ec.code != 'MORTALITY_LOSS'
    """), {"bid": batch_id}).scalar() or 0)

    total_expenses = feed_cost + mortality_loss + other_batch
    gross_profit   = total_revenue - total_expenses

    initial_count = batch.initial_count or 1
    surviving     = max(0, initial_count - mortality_count)

    cost_per_bird      = total_expenses / initial_count if initial_count else None
    cost_per_surviving = total_expenses / surviving     if surviving     else None
    feed_cost_per_bird = feed_cost     / initial_count if initial_count else None
    revenue_per_bird   = total_revenue / initial_count if initial_count else None

    margin = (gross_profit / total_revenue * 100) if total_revenue else None
    roi    = (gross_profit / total_expenses * 100) if total_expenses else None

    # FCR from latest fcr_snapshot in feed_issues
    fcr = db.execute(text("""
        SELECT MAX(fcr_snapshot) FROM feed_issues
        WHERE batch_id = :bid AND fcr_snapshot IS NOT NULL
    """), {"bid": batch_id}).scalar()

    # Per-category breakdown from batch_expenses
    cat_rows = db.execute(text("""
        SELECT ec.code, ec.name, ec.sort_order,
               COALESCE(SUM(be.amount), 0) AS total
        FROM batch_expenses be
        JOIN expense_categories ec ON ec.id = be.category_id
        WHERE be.batch_id = :bid AND be.is_voided = FALSE
        GROUP BY ec.id, ec.code, ec.name, ec.sort_order
        ORDER BY ec.sort_order
    """), {"bid": batch_id}).mappings().all()

    by_category = [{"code": "FEED", "name": "Feed Cost", "amount": round(feed_cost, 2)}]
    by_category += [{"code": r["code"], "name": r["name"], "amount": round(float(r["total"]), 2)} for r in cat_rows]

    def r2(v): return round(float(v), 2) if v is not None else None

    return {
        "total_revenue":        r2(total_revenue),
        "feed_cost":            r2(feed_cost),
        "mortality_loss":       r2(mortality_loss),
        "other_batch_expenses": r2(other_batch),
        "total_expenses":       r2(total_expenses),
        "gross_profit":         r2(gross_profit),
        "profit_margin_pct":    r2(margin),
        "roi_pct":              r2(roi),
        "initial_count":        initial_count,
        "mortality_count":      mortality_count,
        "surviving_count":      surviving,
        "cost_per_bird":        r2(cost_per_bird),
        "cost_per_surviving":   r2(cost_per_surviving),
        "feed_cost_per_bird":   r2(feed_cost_per_bird),
        "revenue_per_bird":     r2(revenue_per_bird),
        "total_feed_kg":        r2(total_feed_kg),
        "fcr":                  r2(fcr),
        "by_category":          by_category,
    }
