from datetime import date
from sqlalchemy.orm import Session


def check_and_create_inventory_alerts(item, db: Session) -> None:
    """Create low-stock and expiry alerts for an inventory item, deduplicating unread ones."""
    from models import Alert  # local import avoids circular imports

    farm_id = item.farm_id
    available = item.qty_available  # uses max(0, on_hand - reserved) from model property

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
