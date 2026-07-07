from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Farm
from routers.auth import get_current_user
from schemas.schemas import BatchPnL

router = APIRouter(prefix="/reports", tags=["reports"])


def _verify_farm_access(farm_id: int, db: Session, current_user):
    if current_user.role_id not in (1, 5, 6):
        farm_id = current_user.farm_id
    if not farm_id:
        raise HTTPException(status_code=400, detail="No farm assigned")
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role_id not in (6,) and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to this farm's reports")
    return farm_id


# Fallback price used when a feed type has no purchase records in the DB.
FALLBACK_FEED_PRICE = 25.0  # ₱/kg


@router.get("/farm-finances")
def farm_finances(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    """Financial health overview for a single farm."""
    year = db.execute(text("SELECT YEAR(CURDATE())")).scalar()

    rev = db.execute(text("""
        SELECT
            COALESCE(br.total_revenue, 0)
          + COALESCE(legacy_sales.total_revenue, 0)
          + COALESCE(legacy_spent_hens.total_revenue, 0)
          + COALESCE(egg_sales.total_revenue, 0) AS total_revenue
        FROM (SELECT 1) seed
        LEFT JOIN (
            SELECT SUM(br.amount) AS total_revenue
            FROM batch_revenues br
            JOIN batches b ON br.batch_id = b.id
            WHERE b.farm_id = :fid
              AND br.is_voided = FALSE
              AND YEAR(br.revenue_date) = :yr
        ) br ON 1=1
        LEFT JOIN (
            SELECT SUM(so.qty_kg * so.price_per_kg) AS total_revenue
            FROM sales_orders so
            JOIN batches b ON so.batch_id = b.id
            LEFT JOIN batch_revenues br
              ON br.sales_order_id = so.id AND br.is_voided = FALSE
            WHERE b.farm_id = :fid
              AND so.status != 'cancelled'
              AND br.id IS NULL
              AND YEAR(so.order_date) = :yr
        ) legacy_sales ON 1=1
        LEFT JOIN (
            SELECT SUM(shs.total_amount) AS total_revenue
            FROM spent_hen_sales shs
            LEFT JOIN batch_revenues br
              ON br.source_module = 'SPENT_HENS'
             AND br.source_ref = CAST(shs.id AS CHAR)
             AND br.is_voided = FALSE
            WHERE shs.farm_id = :fid
              AND br.id IS NULL
              AND YEAR(shs.sale_date) = :yr
        ) legacy_spent_hens ON 1=1
        LEFT JOIN (
            SELECT SUM(total_amount) AS total_revenue
            FROM egg_sales_orders
            WHERE farm_id = :fid
              AND status != 'cancelled'
              AND YEAR(order_date) = :yr
        ) egg_sales ON 1=1
    """), {"fid": farm_id, "yr": year}).scalar()

    category_rows = db.execute(text("""
        SELECT
            ec.code,
            ec.name,
            ec.sort_order,
            COALESCE(SUM(be.amount), 0) AS amount
        FROM batch_expenses be
        JOIN batches b ON be.batch_id = b.id
        JOIN expense_categories ec ON ec.id = be.category_id
        WHERE b.farm_id = :fid
          AND be.is_voided = FALSE
          AND YEAR(be.expense_date) = :yr
        GROUP BY ec.id, ec.code, ec.name, ec.sort_order
        ORDER BY ec.sort_order, ec.name
    """), {"fid": farm_id, "yr": year}).mappings().all()

    source_rows = db.execute(text("""
        SELECT
            COALESCE(NULLIF(be.source_module, ''), 'MANUAL') AS source_module,
            COALESCE(SUM(be.amount), 0) AS amount
        FROM batch_expenses be
        JOIN batches b ON be.batch_id = b.id
        WHERE b.farm_id = :fid
          AND be.is_voided = FALSE
          AND YEAR(be.expense_date) = :yr
        GROUP BY COALESCE(NULLIF(be.source_module, ''), 'MANUAL')
        ORDER BY amount DESC
    """), {"fid": farm_id, "yr": year}).mappings().all()

    # Per-feed-type average pricing avoids skewing when different feed grades are used.
    feed_exp = db.execute(text("""
        SELECT COALESCE(SUM(fi.qty_kg * COALESCE(fp.cost_per_kg, :fallback)), 0)
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        LEFT JOIN (
            SELECT feed_type_id, AVG(cost_per_kg) AS cost_per_kg
            FROM feed_purchases GROUP BY feed_type_id
        ) fp ON fp.feed_type_id = fi.feed_type_id
        WHERE b.farm_id = :fid AND YEAR(fi.issue_date) = :yr
    """), {"fid": farm_id, "yr": year, "fallback": FALLBACK_FEED_PRICE}).scalar()

    feed_kg = db.execute(text("""
        SELECT COALESCE(SUM(fi.qty_kg), 0)
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        WHERE b.farm_id = :fid AND YEAR(fi.issue_date) = :yr
    """), {"fid": farm_id, "yr": year}).scalar()

    active = db.execute(text("""
        SELECT COUNT(*) AS cnt,
               COALESCE(SUM(b.initial_count), 0) AS initial_birds
        FROM batches b
        WHERE b.farm_id = :fid AND b.status IN ('active','harvest_soon')
    """), {"fid": farm_id}).mappings().one()

    placed_year = db.execute(text("""
        SELECT COALESCE(SUM(b.initial_count), 0)
        FROM batches b
        WHERE b.farm_id = :fid AND YEAR(b.placed_date) = :yr
    """), {"fid": farm_id, "yr": year}).scalar()

    mortality = db.execute(text("""
        SELECT COALESCE(SUM(m.count), 0) AS total_deaths
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        WHERE b.farm_id = :fid AND YEAR(m.record_date) = :yr
    """), {"fid": farm_id, "yr": year}).scalar()

    current_birds = db.execute(text("""
        SELECT COALESCE(SUM(
            COALESCE(bl.current_count, b.initial_count - COALESCE(m.total_deaths, 0))
        ), 0)
        FROM batches b
        LEFT JOIN (
            SELECT batch_id, current_count
            FROM batch_daily_logs
            WHERE (batch_id, log_date) IN (
                SELECT batch_id, MAX(log_date) FROM batch_daily_logs GROUP BY batch_id
            )
        ) bl ON bl.batch_id = b.id
        LEFT JOIN (
            SELECT batch_id, SUM(count) AS total_deaths
            FROM mortality_records GROUP BY batch_id
        ) m ON m.batch_id = b.id
        WHERE b.farm_id = :fid AND b.status IN ('active','harvest_soon')
    """), {"fid": farm_id}).scalar()

    total_rev = float(rev)
    feed_cost = float(feed_exp)
    batch_expense_total = sum(float(r["amount"] or 0) for r in category_rows)
    mortality_loss = sum(float(r["amount"] or 0) for r in category_rows if r["code"] == "MORTALITY_LOSS")
    other_batch_expenses = batch_expense_total - mortality_loss
    total_exp = batch_expense_total + feed_cost
    deaths = int(mortality)
    initial = int(active["initial_birds"])
    placed = int(placed_year or 0)
    cost_per_active_bird = (total_exp / initial) if initial > 0 else 0
    cost_per_placed_bird = (total_exp / placed) if placed > 0 else 0
    estimated_mortality_cost = deaths * cost_per_active_bird

    return {
        "year": year,
        "active_batches": int(active["cnt"]),
        "active_birds": int(current_birds or 0),
        "initial_birds": initial,
        "placed_birds_year": placed,
        "total_mortality": deaths,
        "mortality_loss": round(mortality_loss, 2),
        "mortality_cost": round(estimated_mortality_cost, 2),
        "estimated_mortality_cost": round(estimated_mortality_cost, 2),
        "revenue": round(total_rev, 2),
        "feed_cost": round(feed_cost, 2),
        "feed_used_kg": round(float(feed_kg), 2),
        "batch_expenses": round(batch_expense_total, 2),
        "other_batch_expenses": round(other_batch_expenses, 2),
        "expenses": round(total_exp, 2),
        "gross_profit": round(total_rev - total_exp, 2),
        "cost_per_active_bird": round(cost_per_active_bird, 2),
        "cost_per_placed_bird": round(cost_per_placed_bird, 2),
        "by_category": [
            {"code": "FEED", "name": "Feed Consumption Cost", "amount": round(feed_cost, 2)},
            *[
                {"code": r["code"], "name": r["name"], "amount": round(float(r["amount"] or 0), 2)}
                for r in category_rows
            ],
        ],
        "by_source": [
            {"source_module": r["source_module"], "amount": round(float(r["amount"] or 0), 2)}
            for r in source_rows
        ],
    }


@router.get("/mortality-impact")
def mortality_impact(
    farm_id:      int   = Query(1),
    market_price: float = Query(120.0),
    pricing_mode: str   = Query("per_kg"),   # "per_kg" (broiler) or "per_bird" (layer/rtl)
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    """Per-batch mortality financial impact with profit projection."""

    rows = db.execute(text("""
        SELECT
            b.id               AS batch_id,
            b.batch_no,
            h.name             AS house,
            b.initial_count,
            COALESCE(
                bl.current_count,
                b.initial_count - COALESCE(mort_total.total_deaths, 0)
            )                              AS current_count,
            COALESCE(bl.avg_weight_g, 0)  AS avg_weight_g,
            COALESCE(fi_agg.total_feed_kg, 0) AS total_feed_kg,
            COALESCE(fi_agg.feed_cost, 0)     AS feed_cost,
            COALESCE(exp_agg.other_expenses, 0) AS other_expenses
        FROM batches b
        JOIN houses h ON b.house_id = h.id
        LEFT JOIN (
            SELECT batch_id, current_count, avg_weight_g
            FROM batch_daily_logs
            WHERE (batch_id, log_date) IN (
                SELECT batch_id, MAX(log_date) FROM batch_daily_logs GROUP BY batch_id
            )
        ) bl ON b.id = bl.batch_id
        LEFT JOIN (
            SELECT batch_id, SUM(count) AS total_deaths
            FROM mortality_records GROUP BY batch_id
        ) mort_total ON b.id = mort_total.batch_id
        LEFT JOIN (
            SELECT fi.batch_id,
                   SUM(fi.qty_kg) AS total_feed_kg,
                   SUM(fi.qty_kg * COALESCE(fp.cost_per_kg, :fallback)) AS feed_cost
            FROM feed_issues fi
            LEFT JOIN (
                SELECT feed_type_id, AVG(cost_per_kg) AS cost_per_kg
                FROM feed_purchases GROUP BY feed_type_id
            ) fp ON fp.feed_type_id = fi.feed_type_id
            GROUP BY fi.batch_id
        ) fi_agg ON b.id = fi_agg.batch_id
        LEFT JOIN (
            SELECT batch_id, SUM(amount) AS other_expenses
            FROM batch_expenses
            WHERE is_voided = FALSE
            GROUP BY batch_id
        ) exp_agg ON b.id = exp_agg.batch_id
        WHERE b.farm_id = :fid AND b.status IN ('active','harvest_soon')
        ORDER BY b.batch_no
    """), {"fid": farm_id, "fallback": FALLBACK_FEED_PRICE}).mappings().all()

    result = []
    for r in rows:
        initial       = int(r["initial_count"])
        current       = int(r["current_count"])
        deaths        = max(0, initial - current)
        feed_kg       = float(r["total_feed_kg"])
        feed_cost     = float(r["feed_cost"])
        other_exp     = float(r["other_expenses"])
        avg_w         = int(r["avg_weight_g"])

        total_expenses   = feed_cost + other_exp
        cost_per_bird    = total_expenses / initial if initial > 0 else 0
        mortality_pct    = (deaths / initial * 100) if initial > 0 else 0

        if pricing_mode == "per_bird":
            mortality_loss  = deaths * market_price   # dead birds × price/bird
            proj_weight_kg  = 1                       # sentinel — means "data available"
            proj_revenue    = current * market_price
            proj_profit     = proj_revenue - total_expenses
            breakeven_price = total_expenses / current if current > 0 else 0
        else:
            mortality_loss  = deaths * cost_per_bird
            proj_weight_kg  = current * avg_w / 1000 if avg_w > 0 else 0
            proj_revenue    = proj_weight_kg * market_price
            proj_profit     = proj_revenue - total_expenses
            breakeven_price = total_expenses / proj_weight_kg if proj_weight_kg > 0 else 0

        if total_expenses == 0:
            status = "profitable"
        elif proj_profit > 0:
            status = "profitable"
        elif proj_profit > -total_expenses * 0.1:
            status = "at_risk"
        else:
            status = "loss"

        result.append({
            "batch_id":        r["batch_id"],
            "batch_no":        r["batch_no"],
            "house":           r["house"],
            "initial_count":   initial,
            "current_count":   current,
            "deaths":          deaths,
            "mortality_pct":   round(mortality_pct, 2),
            "total_feed_kg":   round(feed_kg, 2),
            "total_expenses":  round(total_expenses, 2),
            "cost_per_bird":   round(cost_per_bird, 2),
            "mortality_loss":  round(mortality_loss, 2),
            "proj_weight_kg":  round(proj_weight_kg, 2),
            "proj_revenue":    round(proj_revenue, 2),
            "proj_profit":     round(proj_profit, 2),
            "breakeven_price": round(breakeven_price, 2),
            "status":          status,
        })
    return result


@router.get("/batch-pnl", response_model=list[BatchPnL])
def batch_pnl(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    rows = db.execute(text("""
        SELECT v.*
        FROM v_batch_pnl v
        JOIN batches b ON v.batch_id = b.id
        WHERE b.farm_id = :farm_id
        ORDER BY v.gross_profit DESC
    """), {"farm_id": farm_id}).mappings().all()
    return [BatchPnL(**dict(r)) for r in rows]


@router.get("/feed-consumption")
def feed_efficiency(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    rows = db.execute(text("""
        SELECT
            b.id                AS batch_id,
            b.batch_no,
            h.name              AS house,
            SUM(fi.qty_kg)      AS total_feed_kg,
            dl.avg_weight_g,
            dl.current_count,
            ROUND(
              SUM(fi.qty_kg) / NULLIF(dl.current_count * dl.avg_weight_g / 1000, 0), 3
            )                   AS fcr
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        JOIN houses  h ON b.house_id  = h.id
        LEFT JOIN (
          SELECT batch_id, avg_weight_g, current_count
          FROM batch_daily_logs
          WHERE (batch_id, log_date) IN (
            SELECT batch_id, MAX(log_date)
            FROM batch_daily_logs GROUP BY batch_id
          )
        ) dl ON dl.batch_id = b.id
        WHERE b.farm_id = :farm_id
        GROUP BY b.id, b.batch_no, h.name, dl.avg_weight_g, dl.current_count
        ORDER BY fcr ASC
    """), {"farm_id": farm_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/sales-performance")
def monthly_summary(
    farm_id: int = Query(1),
    year:    int = Query(2025),
    month:   int = Query(6),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    params = {"farm_id": farm_id, "year": year, "month": month, "fallback": FALLBACK_FEED_PRICE}

    mortality = db.execute(text("""
        SELECT COALESCE(SUM(m.count), 0) AS total_deaths
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND YEAR(m.record_date)  = :year
          AND MONTH(m.record_date) = :month
    """), params).scalar()

    feed_used = db.execute(text("""
        SELECT COALESCE(SUM(fi.qty_kg), 0) AS total_kg
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND YEAR(fi.issue_date)  = :year
          AND MONTH(fi.issue_date) = :month
    """), params).scalar()

    feed_cost = db.execute(text("""
        SELECT COALESCE(SUM(fi.qty_kg * COALESCE(fp.cost_per_kg, :fallback)), 0)
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        LEFT JOIN (
            SELECT feed_type_id, AVG(cost_per_kg) AS cost_per_kg
            FROM feed_purchases GROUP BY feed_type_id
        ) fp ON fp.feed_type_id = fi.feed_type_id
        WHERE b.farm_id = :farm_id
          AND YEAR(fi.issue_date)  = :year
          AND MONTH(fi.issue_date) = :month
    """), params).scalar()

    revenue = db.execute(text("""
        SELECT
            COALESCE(br.total_revenue, 0)
          + COALESCE(legacy_sales.total_revenue, 0)
          + COALESCE(legacy_spent_hens.total_revenue, 0)
          + COALESCE(egg_sales.total_revenue, 0) AS total
        FROM (SELECT 1) seed
        LEFT JOIN (
            SELECT SUM(br.amount) AS total_revenue
            FROM batch_revenues br
            JOIN batches b ON br.batch_id = b.id
            WHERE b.farm_id = :farm_id
              AND br.is_voided = FALSE
              AND YEAR(br.revenue_date)  = :year
              AND MONTH(br.revenue_date) = :month
        ) br ON 1=1
        LEFT JOIN (
            SELECT SUM(so.qty_kg * so.price_per_kg) AS total_revenue
            FROM sales_orders so
            JOIN batches b ON so.batch_id = b.id
            LEFT JOIN batch_revenues br
              ON br.sales_order_id = so.id AND br.is_voided = FALSE
            WHERE b.farm_id = :farm_id
              AND so.status != 'cancelled'
              AND br.id IS NULL
              AND YEAR(so.order_date)  = :year
              AND MONTH(so.order_date) = :month
        ) legacy_sales ON 1=1
        LEFT JOIN (
            SELECT SUM(shs.total_amount) AS total_revenue
            FROM spent_hen_sales shs
            LEFT JOIN batch_revenues br
              ON br.source_module = 'SPENT_HENS'
             AND br.source_ref = CAST(shs.id AS CHAR)
             AND br.is_voided = FALSE
            WHERE shs.farm_id = :farm_id
              AND YEAR(shs.sale_date)  = :year
              AND MONTH(shs.sale_date) = :month
              AND br.id IS NULL
        ) legacy_spent_hens ON 1=1
        LEFT JOIN (
            SELECT SUM(total_amount) AS total_revenue
            FROM egg_sales_orders
            WHERE farm_id = :farm_id
              AND status != 'cancelled'
              AND YEAR(order_date)  = :year
              AND MONTH(order_date) = :month
        ) egg_sales ON 1=1
    """), params).scalar()

    expenses = db.execute(text("""
        SELECT COALESCE(SUM(be.amount), 0) AS total
        FROM batch_expenses be
        JOIN batches b ON be.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND be.is_voided = FALSE
          AND YEAR(be.expense_date)  = :year
          AND MONTH(be.expense_date) = :month
    """), params).scalar()

    rev_f  = float(revenue)
    exp_f  = float(expenses)
    feed_f = float(feed_cost)

    return {
        "year":            year,
        "month":           month,
        "total_mortality": int(mortality),
        "feed_used_kg":    float(feed_used),
        "feed_cost":       round(feed_f, 2),
        "revenue":         round(rev_f, 2),
        "expenses":        round(exp_f, 2),
        "gross_profit":    round(rev_f - exp_f - feed_f, 2),
    }


@router.get("/inventory-snapshot")
def inventory_snapshot(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    rows = db.execute(text("""
        SELECT
            ic.name         AS category,
            COUNT(ii.id)    AS item_count,
            SUM(CASE WHEN (ii.qty_on_hand - ii.qty_reserved) <= 0
                     THEN 1 ELSE 0 END)                                        AS out_of_stock,
            SUM(CASE WHEN (ii.qty_on_hand - ii.qty_reserved) <= ii.reorder_level
                     AND  (ii.qty_on_hand - ii.qty_reserved) > 0
                     THEN 1 ELSE 0 END)                                        AS low_stock,
            SUM(CASE WHEN (ii.qty_on_hand - ii.qty_reserved) > ii.reorder_level
                     THEN 1 ELSE 0 END)                                        AS in_stock
        FROM inventory_items ii
        JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.farm_id = :farm_id
        GROUP BY ic.id, ic.name
        ORDER BY ic.name
    """), {"farm_id": farm_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/batch-comparison")
def batch_comparison(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    """Compare key KPIs across all batches for a farm."""

    rows = db.execute(text("""
        SELECT
            b.id,
            b.batch_no,
            h.name                  AS house,
            b.placed_date,
            b.initial_count,
            b.status,
            b.cycle_length_days,
            COALESCE(dl.current_count,
                     b.initial_count - COALESCE(mort.total_deaths, 0)) AS current_count,
            COALESCE(dl.avg_weight_g, 0)    AS avg_weight_g,
            COALESCE(fi.total_feed_kg, 0)   AS total_feed_kg,
            COALESCE(fi.feed_cost, 0)       AS feed_cost,
            COALESCE(mort.total_deaths, 0)  AS total_deaths,
            COALESCE(rev.total_revenue, 0)  AS total_revenue,
            COALESCE(exp.other_expenses, 0) AS other_expenses,
            DATEDIFF(COALESCE(hr.harvest_date, CURDATE()), b.placed_date) AS age_days
        FROM batches b
        JOIN houses h ON b.house_id = h.id
        LEFT JOIN (
            SELECT batch_id, current_count, avg_weight_g
            FROM batch_daily_logs
            WHERE (batch_id, log_date) IN (
                SELECT batch_id, MAX(log_date) FROM batch_daily_logs GROUP BY batch_id
            )
        ) dl ON b.id = dl.batch_id
        LEFT JOIN (
            SELECT fi.batch_id,
                   SUM(fi.qty_kg) AS total_feed_kg,
                   SUM(fi.qty_kg * COALESCE(fp.cost_per_kg, :fallback)) AS feed_cost
            FROM feed_issues fi
            LEFT JOIN (
                SELECT feed_type_id, AVG(cost_per_kg) AS cost_per_kg
                FROM feed_purchases GROUP BY feed_type_id
            ) fp ON fp.feed_type_id = fi.feed_type_id
            GROUP BY fi.batch_id
        ) fi ON b.id = fi.batch_id
        LEFT JOIN (
            SELECT batch_id, SUM(count) AS total_deaths
            FROM mortality_records GROUP BY batch_id
        ) mort ON b.id = mort.batch_id
        LEFT JOIN (
            SELECT batch_id, SUM(total_revenue) AS total_revenue
            FROM (
                SELECT batch_id, SUM(amount) AS total_revenue
                FROM batch_revenues
                WHERE is_voided = FALSE
                GROUP BY batch_id
                UNION ALL
                SELECT so.batch_id, SUM(so.qty_kg * so.price_per_kg) AS total_revenue
                FROM sales_orders so
                LEFT JOIN batch_revenues br
                  ON br.sales_order_id = so.id AND br.is_voided = FALSE
                WHERE so.status != 'cancelled'
                  AND br.id IS NULL
                GROUP BY so.batch_id
            ) revenue_rows
            GROUP BY batch_id
        ) rev ON b.id = rev.batch_id
        LEFT JOIN (
            SELECT batch_id, SUM(amount) AS other_expenses
            FROM batch_expenses
            WHERE is_voided = FALSE
            GROUP BY batch_id
        ) exp ON b.id = exp.batch_id
        LEFT JOIN harvest_records hr ON hr.batch_id = b.id
        WHERE b.farm_id = :farm_id
        ORDER BY b.placed_date DESC
    """), {"farm_id": farm_id, "fallback": FALLBACK_FEED_PRICE}).mappings().all()

    result = []
    for r in rows:
        initial     = int(r["initial_count"])
        current     = int(r["current_count"])
        deaths      = int(r["total_deaths"])
        feed_kg     = float(r["total_feed_kg"])
        feed_cost   = float(r["feed_cost"])
        other_exp   = float(r["other_expenses"])
        revenue     = float(r["total_revenue"])
        avg_w       = int(r["avg_weight_g"])

        survival_pct    = round((current / initial * 100), 2) if initial > 0 else 0
        mortality_pct   = round((deaths / initial * 100), 2) if initial > 0 else 0
        live_weight_kg  = current * avg_w / 1000 if avg_w > 0 else 0
        fcr             = round(feed_kg / live_weight_kg, 3) if live_weight_kg > 0 else 0
        total_expenses  = round(feed_cost + other_exp, 2)
        gross_profit    = round(revenue - total_expenses, 2)

        result.append({
            "batch_id":       r["id"],
            "batch_no":       r["batch_no"],
            "house":          r["house"],
            "placed_date":    str(r["placed_date"]),
            "status":         r["status"],
            "initial_count":  initial,
            "current_count":  current,
            "deaths":         deaths,
            "survival_pct":   survival_pct,
            "mortality_pct":  mortality_pct,
            "total_feed_kg":  round(feed_kg, 1),
            "fcr":            fcr,
            "avg_weight_g":   avg_w,
            "revenue":        round(revenue, 2),
            "feed_cost":      round(feed_cost, 2),
            "other_expenses": round(other_exp, 2),
            "total_expenses": total_expenses,
            "gross_profit":   gross_profit,
        })
    return result


@router.get("/mortality-analysis")
def mortality_analysis(
    farm_id: int = Query(1),
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    farm_id = _verify_farm_access(farm_id, db, current_user)
    rows = db.execute(text("""
        SELECT
            m.cause,
            COUNT(*)          AS incidents,
            SUM(m.count)      AS total_deaths,
            b.id              AS batch_id,
            b.batch_no,
            h.name            AS house
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        JOIN houses  h ON m.house_id = h.id
        WHERE b.farm_id     = :farm_id
          AND m.record_date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
        GROUP BY m.cause, b.id, b.batch_no, h.name
        ORDER BY total_deaths DESC
    """), {"farm_id": farm_id, "days": days}).mappings().all()
    return [dict(r) for r in rows]
