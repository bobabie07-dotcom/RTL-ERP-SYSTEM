from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Batch, BatchExpenseItem, BatchFeedPhase, BatchFinancialPlan
from routers.auth import get_current_user, require_permission

router = APIRouter(prefix="/batch-plans", tags=["batch-plans"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class FeedPhaseIn(BaseModel):
    phase_order:    int   = 0
    feed_type_name: str
    grams_per_day:  int   = 0
    duration_days:  int   = 0
    cost_per_50kg:  float = 0.0


class ExpenseItemIn(BaseModel):
    category:  str
    qty:       float = 0.0
    period:    Optional[str] = None
    unit_cost: float = 0.0
    notes:     Optional[str] = None


class BatchPlanIn(BaseModel):
    bird_cost_per_head:      float = 0.0
    delivery_cost_per_head:  float = 0.0
    infrastructure_cost:     float = 0.0
    contract_price_per_head: Optional[float] = None
    expected_price_per_kg:   Optional[float] = None
    supplier_name:           Optional[str]   = None
    notes:                   Optional[str]   = None
    feed_phases:             list[FeedPhaseIn]   = []
    expense_items:           list[ExpenseItemIn] = []


def _build_response(plan: BatchFinancialPlan, initial_count: int) -> dict:
    heads = initial_count

    # Capital
    bird_total    = float(plan.bird_cost_per_head)     * heads
    deliv_total   = float(plan.delivery_cost_per_head) * heads
    infra         = float(plan.infrastructure_cost)
    total_capital = bird_total + deliv_total + infra

    # Feed phases
    phases_out = []
    total_feed_cost = 0.0
    for p in plan.feed_phases:
        total_kg   = heads * p.grams_per_day * p.duration_days / 1000
        bags       = total_kg / 50
        cost       = round(bags * float(p.cost_per_50kg), 2)
        total_feed_cost += cost
        phases_out.append({
            "id":            p.id,
            "phase_order":   p.phase_order,
            "feed_type_name": p.feed_type_name,
            "grams_per_day": p.grams_per_day,
            "duration_days": p.duration_days,
            "cost_per_50kg": float(p.cost_per_50kg),
            "total_kg":      round(total_kg, 2),
            "bags":          round(bags, 2),
            "cost":          cost,
        })

    # Expense items
    items_out = []
    total_other = 0.0
    for e in plan.expense_items:
        total = round(float(e.qty) * float(e.unit_cost), 2)
        total_other += total
        items_out.append({
            "id":       e.id,
            "category": e.category,
            "qty":      float(e.qty),
            "period":   e.period,
            "unit_cost": float(e.unit_cost),
            "total":    total,
            "notes":    e.notes,
        })

    # Profitability
    total_expenses = total_feed_cost + total_other
    if plan.contract_price_per_head is not None:
        expected_revenue = float(plan.contract_price_per_head) * heads
        revenue_basis    = f"P{plan.contract_price_per_head}/head x {heads} birds"
    else:
        expected_revenue = 0.0
        revenue_basis    = "No revenue projection set"
    gross_profit = expected_revenue - total_expenses
    net_profit   = gross_profit - infra

    return {
        "batch_id":              plan.batch_id,
        "supplier_name":         plan.supplier_name,
        "notes":                 plan.notes,
        "initial_count":         heads,
        # Capital
        "bird_cost_per_head":    float(plan.bird_cost_per_head),
        "delivery_cost_per_head": float(plan.delivery_cost_per_head),
        "infrastructure_cost":   infra,
        "bird_total":            round(bird_total, 2),
        "delivery_total":        round(deliv_total, 2),
        "total_capital":         round(total_capital, 2),
        # Revenue
        "contract_price_per_head": float(plan.contract_price_per_head) if plan.contract_price_per_head else None,
        "expected_price_per_kg":   float(plan.expected_price_per_kg)   if plan.expected_price_per_kg   else None,
        "expected_revenue":       round(expected_revenue, 2),
        "revenue_basis":          revenue_basis,
        # Feed
        "feed_phases":        phases_out,
        "total_feed_cost":    round(total_feed_cost, 2),
        # Expenses
        "expense_items":      items_out,
        "total_other":        round(total_other, 2),
        # Summary
        "total_expenses":     round(total_expenses, 2),
        "gross_profit":       round(gross_profit, 2),
        "net_profit":         round(net_profit, 2),
    }


@router.get("/{batch_id}")
def get_plan(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    plan = db.query(BatchFinancialPlan).filter_by(batch_id=batch_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No financial plan for this batch")
    batch = db.get(Batch, batch_id)
    return _build_response(plan, batch.initial_count)


@router.put("/{batch_id}", status_code=status.HTTP_200_OK)
def upsert_plan(
    batch_id: int,
    body: BatchPlanIn,
    db: Session = Depends(get_db),
    _=Depends(require_permission("write", "batches")),
):
    batch = db.get(Batch, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    plan = db.query(BatchFinancialPlan).filter_by(batch_id=batch_id).first()
    if plan:
        # Clear child rows — cascade will delete them
        db.query(BatchFeedPhase).filter_by(plan_id=plan.id).delete()
        db.query(BatchExpenseItem).filter_by(plan_id=plan.id).delete()
        plan.bird_cost_per_head      = body.bird_cost_per_head
        plan.delivery_cost_per_head  = body.delivery_cost_per_head
        plan.infrastructure_cost     = body.infrastructure_cost
        plan.contract_price_per_head = body.contract_price_per_head
        plan.expected_price_per_kg   = body.expected_price_per_kg
        plan.supplier_name           = body.supplier_name
        plan.notes                   = body.notes
    else:
        plan = BatchFinancialPlan(
            batch_id                = batch_id,
            bird_cost_per_head      = body.bird_cost_per_head,
            delivery_cost_per_head  = body.delivery_cost_per_head,
            infrastructure_cost     = body.infrastructure_cost,
            contract_price_per_head = body.contract_price_per_head,
            expected_price_per_kg   = body.expected_price_per_kg,
            supplier_name           = body.supplier_name,
            notes                   = body.notes,
        )
        db.add(plan)
        db.flush()

    for i, ph in enumerate(body.feed_phases):
        db.add(BatchFeedPhase(
            plan_id        = plan.id,
            phase_order    = i,
            feed_type_name = ph.feed_type_name,
            grams_per_day  = ph.grams_per_day,
            duration_days  = ph.duration_days,
            cost_per_50kg  = ph.cost_per_50kg,
        ))
    for ei in body.expense_items:
        db.add(BatchExpenseItem(
            plan_id   = plan.id,
            category  = ei.category,
            qty       = ei.qty,
            period    = ei.period,
            unit_cost = ei.unit_cost,
            notes     = ei.notes,
        ))

    db.commit()
    db.refresh(plan)
    return _build_response(plan, batch.initial_count)


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_permission("delete")),
):
    plan = db.query(BatchFinancialPlan).filter_by(batch_id=batch_id).first()
    if plan:
        db.delete(plan)
        db.commit()
