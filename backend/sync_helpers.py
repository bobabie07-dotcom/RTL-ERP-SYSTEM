"""
Bidirectional sync between mortality_records and batch_daily_logs.

Rules:
- Mortality Tracker → Daily Logs: always authoritative. Any CUD on
  mortality_records recomputes the total deaths for that batch+date and
  writes it into batch_daily_logs.mortality_count (creating the log row
  if it doesn't exist yet).

- Daily Logs → Mortality Tracker: only when no manually-entered mortality
  records exist for that batch+date. A sentinel record (cause_notes ==
  _SENTINEL) is created/updated/deleted to mirror the daily log entry.
  As soon as a real mortality record is added for the same date, the
  sentinel is deleted and the Mortality Tracker becomes authoritative.
"""

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

_SENTINEL = "__AUTOSYNC__"


def _is_manual(MortalityRecord):
    """SQLAlchemy filter clause: record is NOT the autosync sentinel."""
    return or_(
        MortalityRecord.cause_notes != _SENTINEL,
        MortalityRecord.cause_notes.is_(None),
    )


def _delete_sentinel(db: Session, batch_id: int, on_date):
    from models import MortalityRecord
    db.query(MortalityRecord).filter(
        MortalityRecord.batch_id == batch_id,
        MortalityRecord.record_date == on_date,
        MortalityRecord.cause_notes == _SENTINEL,
    ).delete(synchronize_session=False)


def sync_mortality_to_log(db: Session, batch_id: int, on_date):
    """After any CUD on mortality_records: mirror total into daily log."""
    from models import BatchDailyLog, MortalityRecord, Batch

    # Sum only manual (non-sentinel) records for this batch+date
    total = (
        db.query(func.coalesce(func.sum(MortalityRecord.count), 0))
        .filter(
            MortalityRecord.batch_id == batch_id,
            MortalityRecord.record_date == on_date,
            _is_manual(MortalityRecord),
        )
        .scalar()
    )

    log = (
        db.query(BatchDailyLog)
        .filter(
            BatchDailyLog.batch_id == batch_id,
            BatchDailyLog.log_date == on_date,
        )
        .first()
    )

    if log:
        log.mortality_count = total
    elif total > 0:
        # Auto-create a daily log row.
        # Derive current_count = initial_count − cumulative deaths up to this date.
        batch = db.get(Batch, batch_id)
        cum = (
            db.query(func.coalesce(func.sum(MortalityRecord.count), 0))
            .filter(
                MortalityRecord.batch_id == batch_id,
                MortalityRecord.record_date <= on_date,
                _is_manual(MortalityRecord),
            )
            .scalar()
        )
        current = max(0, (batch.initial_count or 0) - cum)
        db.add(BatchDailyLog(
            batch_id=batch_id,
            log_date=on_date,
            current_count=current,
            mortality_count=total,
        ))

    db.flush()


def sync_log_to_mortality(
    db: Session,
    batch_id: int,
    on_date,
    mortality_count: int,
    recorded_by: int,
):
    """After daily log create/update: if no manual records exist, upsert a sentinel."""
    from models import MortalityRecord, Batch

    # If any manually-entered record already exists, don't touch it.
    manual = (
        db.query(MortalityRecord)
        .filter(
            MortalityRecord.batch_id == batch_id,
            MortalityRecord.record_date == on_date,
            _is_manual(MortalityRecord),
        )
        .first()
    )
    if manual:
        return

    sentinel = (
        db.query(MortalityRecord)
        .filter(
            MortalityRecord.batch_id == batch_id,
            MortalityRecord.record_date == on_date,
            MortalityRecord.cause_notes == _SENTINEL,
        )
        .first()
    )

    if mortality_count > 0:
        if sentinel:
            sentinel.count = mortality_count
        else:
            batch = db.get(Batch, batch_id)
            db.add(MortalityRecord(
                batch_id=batch_id,
                house_id=batch.house_id,
                record_date=on_date,
                count=mortality_count,
                cause="other",
                cause_notes=_SENTINEL,
                recorded_by=recorded_by,
            ))
    else:
        if sentinel:
            db.delete(sentinel)

    db.flush()


def cleanup_sentinel_on_log_delete(db: Session, batch_id: int, on_date):
    """When a daily log is deleted, remove its corresponding sentinel if present."""
    _delete_sentinel(db, batch_id, on_date)
    db.flush()
