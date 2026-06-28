from datetime import date, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session


def check_and_create_inventory_alerts(item, db: Session) -> None:
    """Create low-stock and expiry alerts for an inventory item, deduplicating unread ones."""
    from models import Alert

    farm_id = item.farm_id
    available = item.qty_available

    # Low stock
    if float(item.reorder_level) > 0 and available <= float(item.reorder_level):
        key = f"[INV-LOW:{item.id}]"
        exists = db.query(Alert).filter(
            Alert.farm_id == farm_id,
            Alert.alert_type == "inventory_low",
            Alert.is_read == False,
            Alert.message.contains(key),
        ).first()
        if not exists:
            severity = "danger" if available <= 0 else "warning"
            db.add(Alert(
                farm_id=farm_id,
                alert_type="inventory_low",
                severity=severity,
                message=(
                    f"{item.name} is running low — {available:.1f} {item.unit} available "
                    f"(reorder level: {float(item.reorder_level):.1f}) {key}"
                ),
            ))

    # Expiry
    if item.expiry_date:
        today = date.today()
        days = (item.expiry_date - today).days
        if days <= 30:
            key = f"[INV-EXP:{item.id}]"
            exists = db.query(Alert).filter(
                Alert.farm_id == farm_id,
                Alert.alert_type == "inventory_expiry",
                Alert.is_read == False,
                Alert.message.contains(key),
            ).first()
            if not exists:
                if days < 0:
                    msg = f"{item.name} EXPIRED {abs(days)} days ago ({item.expiry_date}) {key}"
                    severity = "danger"
                elif days == 0:
                    msg = f"{item.name} expires TODAY ({item.expiry_date}) {key}"
                    severity = "danger"
                else:
                    msg = f"{item.name} expires in {days} days ({item.expiry_date}) {key}"
                    severity = "danger" if days <= 7 else "warning"
                db.add(Alert(
                    farm_id=farm_id,
                    alert_type="inventory_expiry",
                    severity=severity,
                    message=msg,
                ))


def generate_farm_alerts(farm_id: int, db: Session) -> int:
    """
    Scan current farm data and create missing unread alerts.
    Returns the number of new alerts created.
    Returns 0 if anything fails (non-critical).
    """
    from models import Alert
    created = 0

    try:
        # ── Mortality high rate (last 7 days) ─────────────────────────────────
        rows = db.execute(text("""
            SELECT
                b.id          AS batch_id,
                b.batch_no,
                b.initial_count,
                COALESCE(SUM(m.count), 0) AS deaths_7d
            FROM batches b
            JOIN houses h ON b.house_id = h.id
            LEFT JOIN mortality_records m
                ON m.batch_id = b.id
                AND m.record_date >= :cutoff
            WHERE b.status IN ('Active','Harvest Soon')
              AND h.farm_id = :farm_id
            GROUP BY b.id, b.batch_no, b.initial_count
        """), {"farm_id": farm_id, "cutoff": date.today() - timedelta(days=7)}).mappings().all()

        for r in rows:
            initial = r["initial_count"] or 0
            if initial <= 0:
                continue
            rate = (r["deaths_7d"] / initial) * 100
            if rate >= 5:
                key = f"[MORT-HIGH:{r['batch_id']}]"
                exists = db.query(Alert).filter(
                    Alert.farm_id == farm_id,
                    Alert.alert_type == "mortality_high",
                    Alert.is_read == False,
                    Alert.message.contains(key),
                ).first()
                if not exists:
                    severity = "danger" if rate >= 10 else "warning"
                    db.add(Alert(
                        farm_id=farm_id,
                        alert_type="mortality_high",
                        severity=severity,
                        batch_id=r["batch_id"],
                        message=(
                            f"High mortality in {r['batch_no']}: "
                            f"{int(r['deaths_7d'])} deaths in last 7 days "
                            f"({rate:.1f}% of flock) {key}"
                        ),
                    ))
                    created += 1

        # ── Batch harvest due (placed_date + target_days within 5 days) ───────
        rows = db.execute(text("""
            SELECT
                b.id        AS batch_id,
                b.batch_no,
                b.placed_date,
                bp.target_age_days,
                DATEDIFF(CURDATE(), b.placed_date) AS age_days
            FROM batches b
            JOIN houses h ON b.house_id = h.id
            LEFT JOIN batch_plans bp ON bp.batch_id = b.id
            WHERE b.status IN ('Active','Harvest Soon')
              AND h.farm_id = :farm_id
              AND bp.target_age_days IS NOT NULL
        """), {"farm_id": farm_id}).mappings().all()

        for r in rows:
            age = r["age_days"] or 0
            target = r["target_age_days"] or 0
            if target > 0 and (target - age) <= 5 and age <= target + 7:
                key = f"[HARVEST:{r['batch_id']}]"
                exists = db.query(Alert).filter(
                    Alert.farm_id == farm_id,
                    Alert.alert_type == "batch_harvest",
                    Alert.is_read == False,
                    Alert.message.contains(key),
                ).first()
                if not exists:
                    days_left = target - age
                    if days_left <= 0:
                        msg = f"{r['batch_no']} is overdue for harvest (day {age}/{target}) {key}"
                        severity = "danger"
                    else:
                        msg = f"{r['batch_no']} harvest due in {days_left} day(s) (day {age}/{target}) {key}"
                        severity = "warning"
                    db.add(Alert(
                        farm_id=farm_id,
                        alert_type="batch_harvest",
                        severity=severity,
                        batch_id=r["batch_id"],
                        message=msg,
                    ))
                    created += 1

        # ── Feed stock low ────────────────────────────────────────────────────
        rows = db.execute(text("""
            SELECT
                ft.id   AS feed_type_id,
                ft.name AS feed_name,
                COALESCE(SUM(fp.qty_kg), 0) - COALESCE(SUM(fi.qty_kg), 0) AS stock_kg
            FROM feed_types ft
            LEFT JOIN feed_purchases fp ON fp.feed_type_id = ft.id AND fp.farm_id = :farm_id
            LEFT JOIN feed_issues    fi ON fi.feed_type_id = ft.id AND fi.farm_id = :farm_id
            WHERE ft.farm_id = :farm_id OR ft.farm_id IS NULL
            GROUP BY ft.id, ft.name
            HAVING stock_kg <= 200
        """), {"farm_id": farm_id}).mappings().all()

        for r in rows:
            stock = float(r["stock_kg"] or 0)
            if stock < 0:
                stock = 0
            key = f"[FEED-LOW:{r['feed_type_id']}]"
            exists = db.query(Alert).filter(
                Alert.farm_id == farm_id,
                Alert.alert_type == "feed_low",
                Alert.is_read == False,
                Alert.message.contains(key),
            ).first()
            if not exists:
                severity = "danger" if stock <= 50 else "warning"
                db.add(Alert(
                    farm_id=farm_id,
                    alert_type="feed_low",
                    severity=severity,
                    message=f"{r['feed_name']} stock is low: {stock:.1f} kg remaining {key}",
                ))
                created += 1

        # ── Vaccination due ───────────────────────────────────────────────────
        rows = db.execute(text("""
            SELECT
                hr.id          AS record_id,
                b.id           AS batch_id,
                b.batch_no,
                hr.vaccine_name,
                hr.next_due_date
            FROM health_records hr
            JOIN batches b ON hr.batch_id = b.id
            JOIN houses  h ON b.house_id  = h.id
            WHERE b.status IN ('Active','Harvest Soon')
              AND h.farm_id = :farm_id
              AND hr.next_due_date IS NOT NULL
              AND hr.next_due_date <= :soon
        """), {"farm_id": farm_id, "soon": date.today() + timedelta(days=3)}).mappings().all()

        for r in rows:
            key = f"[VAX-DUE:{r['record_id']}]"
            exists = db.query(Alert).filter(
                Alert.farm_id == farm_id,
                Alert.alert_type == "vaccination_due",
                Alert.is_read == False,
                Alert.message.contains(key),
            ).first()
            if not exists:
                due = r["next_due_date"]
                today = date.today()
                days_left = (due - today).days if due else 0
                if days_left < 0:
                    msg = f"Overdue vaccination for {r['batch_no']}: {r['vaccine_name']} was due {abs(days_left)} day(s) ago {key}"
                    severity = "danger"
                elif days_left == 0:
                    msg = f"Vaccination due TODAY for {r['batch_no']}: {r['vaccine_name']} {key}"
                    severity = "danger"
                else:
                    msg = f"Upcoming vaccination for {r['batch_no']}: {r['vaccine_name']} due in {days_left} day(s) {key}"
                    severity = "warning"
                db.add(Alert(
                    farm_id=farm_id,
                    alert_type="vaccination_due",
                    severity=severity,
                    batch_id=r["batch_id"],
                    message=msg,
                ))
                created += 1

        if created > 0:
            db.commit()

    except Exception:
        db.rollback()

    return created
