from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
from schemas.schemas import BatchPnL

router = APIRouter(prefix="/reports", tags=["reports"])

AVG_FEED_PRICE_PER_KG = 25.0   # fallback if no purchase records


def _avg_feed_price(db: Session) -> float:
    """Get average feed cost per kg from purchase records, fall back to default."""
    result = db.execute(text(
        "SELECT AVG(cost_per_kg) FROM feed_purchases WHERE cost_per_kg > 0"
    )).scalar()
    return float(result) if result else AVG_FEED_PRICE_PER_KG


@router.get("/farm-finances")
def farm_finances(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Financial health overview for a single farm."""
    feed_price = _avg_feed_price(db)
    year = db.execute(text("SELECT YEAR(CURDATE())")).scalar()

    rev = db.execute(text("""
        SELECT COALESCE(SUM(so.qty_kg * so.price_per_kg), 0)
        FROM sales_orders so
        JOIN batches b ON so.batch_id = b.id
        WHERE b.farm_id = :fid AND so.status != 'cancelled'
          AND YEAR(so.order_date) = :yr
    """), {"fid": farm_id, "yr": year}).scalar()

    exp = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0) FROM expenses
        WHERE farm_id = :fid AND YEAR(expense_date) = :yr
    """), {"fid": farm_id, "yr": year}).scalar()

    feed_exp = db.execute(text("""
        SELECT COALESCE(SUM(fi.qty_kg), 0) * :fp
        FROM feed_issues fi
        JOIN batches b ON fi.batch_id = b.id
        WHERE b.farm_id = :fid AND YEAR(fi.issue_date) = :yr
    """), {"fid": farm_id, "yr": year, "fp": feed_price}).scalar()

    active = db.execute(text("""
        SELECT COUNT(*) AS cnt,
               COALESCE(SUM(b.initial_count), 0) AS initial_birds
        FROM batches b
        WHERE b.farm_id = :fid AND b.status IN ('active','harvest_soon')
    """), {"fid": farm_id}).mappings().one()

    mortality = db.execute(text("""
        SELECT COALESCE(SUM(m.count), 0) AS total_deaths
        FROM mortality_records m
        JOIN batches b ON m.batch_id = b.id
        WHERE b.farm_id = :fid AND b.status IN ('active','harvest_soon')
    """), {"fid": farm_id}).scalar()

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
    total_exp = float(exp) + float(feed_exp)
    deaths = int(mortality)
    initial = int(active["initial_birds"])
    cost_per_bird = (total_exp / initial) if initial > 0 else 0
    mortality_cost = deaths * cost_per_bird

    return {
        "year":             year,
        "active_batches":   int(active["cnt"]),
        "active_birds":     int(current_birds or 0),
        "initial_birds":    initial,
        "total_deaths":     deaths,
        "mortality_cost":   round(mortality_cost, 2),
        "revenue_ytd":      round(total_rev, 2),
        "expenses_ytd":     round(total_exp, 2),
        "net_profit_ytd":   round(total_rev - total_exp, 2),
        "feed_price_used":  round(feed_price, 2),
    }


@router.get("/mortality-impact")
def mortality_impact(
    farm_id:      int   = Query(1),
    market_price: float = Query(120.0),
    pricing_mode: str   = Query("per_kg"),   # "per_kg" (broiler) or "per_bird" (layer/rtl)
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Per-batch mortality financial impact with profit projection."""
    feed_price = _avg_feed_price(db)

    rows = db.execute(text("""
        SELECT
            b.id               AS batch_id,
            b.batch_no,
            h.name             AS house,
            b.initial_count,
            COALESCE(
                bl.current_count,
                b.initial_count - COALESCE(mort_total.total_deaths, 0)
            )                  AS current_count,
            COALESCE(bl.avg_weight_g, 0)                 AS avg_weight_g,
            COALESCE(fi_agg.total_feed_kg, 0)            AS total_feed_kg,
            COALESCE(exp_agg.other_expenses, 0)          AS other_expenses
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
            SELECT batch_id, SUM(qty_kg) AS total_feed_kg
            FROM feed_issues GROUP BY batch_id
        ) fi_agg ON b.id = fi_agg.batch_id
        LEFT JOIN (
            SELECT batch_id, SUM(amount) AS other_expenses
            FROM expenses WHERE batch_id IS NOT NULL GROUP BY batch_id
        ) exp_agg ON b.id = exp_agg.batch_id
        WHERE b.farm_id = :fid AND b.status IN ('active','harvest_soon')
        ORDER BY b.batch_no
    """), {"fid": farm_id}).mappings().all()

    result = []
    for r in rows:
        initial       = int(r["initial_count"])
        current       = int(r["current_count"])
        deaths        = max(0, initial - current)
        feed_kg       = float(r["total_feed_kg"])
        other_exp     = float(r["other_expenses"])
        avg_w         = int(r["avg_weight_g"])

        total_expenses   = feed_kg * feed_price + other_exp
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
            status = "profitable"          # no costs recorded yet — not a loss
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
    _=Depends(get_current_user),
):
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
    _=Depends(get_current_user),
):
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
    _=Depends(get_current_user),
):
    params = {"farm_id": farm_id, "year": year, "month": month}

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

    revenue = db.execute(text("""
        SELECT COALESCE(SUM(so.qty_kg * so.price_per_kg), 0) AS total
        FROM sales_orders so
        JOIN batches b ON so.batch_id = b.id
        WHERE b.farm_id = :farm_id
          AND so.status != 'cancelled'
          AND YEAR(so.order_date)  = :year
          AND MONTH(so.order_date) = :month
    """), params).scalar()

    expenses = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE farm_id = :farm_id
          AND YEAR(expense_date)  = :year
          AND MONTH(expense_date) = :month
    """), params).scalar()

    return {
        "year":            year,
        "month":           month,
        "total_mortality": int(mortality),
        "feed_used_kg":    float(feed_used),
        "revenue":         float(revenue),
        "expenses":        float(expenses),
        "gross_profit":    float(revenue) - float(expenses),
    }


@router.get("/inventory-snapshot")
def inventory_snapshot(
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT
            ic.name         AS category,
            COUNT(ii.id)    AS item_count,
            SUM(CASE WHEN ii.qty_on_hand <= 0               THEN 1 ELSE 0 END) AS out_of_stock,
            SUM(CASE WHEN ii.qty_on_hand <= ii.reorder_level
                     AND ii.qty_on_hand > 0                 THEN 1 ELSE 0 END) AS low_stock,
            SUM(CASE WHEN ii.qty_on_hand > ii.reorder_level THEN 1 ELSE 0 END) AS in_stock
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
    _=Depends(get_current_user),
):
    """Compare key KPIs across all batches for a farm."""
    feed_price = _avg_feed_price(db)

    rows = db.execute(text("""
        SELECT
            b.id,
            b.batch_no,
            h.name               AS house,
            b.placed_date,
            b.initial_count,
            b.status,
            b.cycle_length_days,
            COALESCE(dl.current_count, b.initial_count)  AS current_count,
            COALESCE(dl.avg_weight_g, 0)                 AS avg_weight_g,
            COALESCE(fi.total_feed_kg, 0)                AS total_feed_kg,
            COALESCE(mort.total_deaths, 0)               AS total_deaths,
            COALESCE(rev.total_revenue, 0)               AS total_revenue,
            COALESCE(exp.other_expenses, 0)              AS other_expenses,
            DATEDIFF(COALESCE(b.updated_at, CURDATE()), b.placed_date) AS age_days
        FROM batches b
        JOIN houses h ON b.house_id = h.id
        LEFT JOIN (
            SELECT batch_id, current_count, avg_weight_g
            FROM batch_daily_logs
            WHERE (batch_id, log_date) IN (SELECT batch_id, MAX(log_date) FROM batch_daily_logs GROUP BY batch_id)
        ) dl ON b.id = dl.batch_id
        LEFT JOIN (SELECT batch_id, SUM(qty_kg) AS total_feed_kg FROM feed_issues GROUP BY batch_id) fi ON b.id = fi.batch_id
        LEFT JOIN (SELECT batch_id, SUM(count) AS total_deaths FROM mortality_records GROUP BY batch_id) mort ON b.id = mort.batch_id
        LEFT JOIN (SELECT batch_id, SUM(qty_kg * price_per_kg) AS total_revenue FROM sales_orders WHERE status != 'cancelled' GROUP BY batch_id) rev ON b.id = rev.batch_id
        LEFT JOIN (SELECT batch_id, SUM(amount) AS other_expenses FROM expenses WHERE batch_id IS NOT NULL GROUP BY batch_id) exp ON b.id = exp.batch_id
        WHERE b.farm_id = :farm_id
        ORDER BY b.placed_date DESC
    """), {"farm_id": farm_id}).mappings().all()

    result = []
    for r in rows:
        initial     = int(r["initial_count"])
        current     = int(r["current_count"])
        deaths      = int(r["total_deaths"])
        feed_kg     = float(r["total_feed_kg"])
        other_exp   = float(r["other_expenses"])
        revenue     = float(r["total_revenue"])
        avg_w       = int(r["avg_weight_g"])

        survival_pct    = round((current / initial * 100), 2) if initial > 0 else 0
        mortality_pct   = round((deaths / initial * 100), 2) if initial > 0 else 0
        live_weight_kg  = current * avg_w / 1000 if avg_w > 0 else 0
        fcr             = round(feed_kg / live_weight_kg, 3) if live_weight_kg > 0 else 0
        feed_cost       = round(feed_kg * feed_price, 2)
        total_expenses  = round(feed_cost + other_exp, 2)
        gross_profit    = round(revenue - total_expenses, 2)

        result.append({
            "batch_id":      r["id"],
            "batch_no":      r["batch_no"],
            "house":         r["house"],
            "placed_date":   str(r["placed_date"]),
            "status":        r["status"],
            "initial_count": initial,
            "current_count": current,
            "deaths":        deaths,
            "survival_pct":  survival_pct,
            "mortality_pct": mortality_pct,
            "total_feed_kg": round(feed_kg, 1),
            "fcr":           fcr,
            "avg_weight_g":  avg_w,
            "revenue":       round(revenue, 2),
            "feed_cost":     feed_cost,
            "other_expenses": round(other_exp, 2),
            "total_expenses": total_expenses,
            "gross_profit":  gross_profit,
        })
    return result


@router.get("/mortality-analysis")
def mortality_analysis(
    farm_id: int = Query(1),
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
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
