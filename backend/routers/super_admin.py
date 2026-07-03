from datetime import datetime, timedelta, timezone
from io import StringIO
import csv

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Batch, Company, Farm, LoginHistory, Role,
    Subscription, SupportTicket, SystemAnnouncement, User, UserAuditLog,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/super-admin", tags=["super-admin"])

# ── Schemas ────────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    plan_name: str = "standard"
    expires_at: datetime
    business_model: str = "broiler"


class CompanyUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    business_model: str | None = None


class SubscriptionUpdate(BaseModel):
    plan_name: str | None = None
    expires_at: datetime | None = None
    status: str | None = None


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    target: str = "all"
    company_id: int | None = None
    expires_at: datetime | None = None


class TicketUpdate(BaseModel):
    status: str | None = None
    assigned_to: int | None = None
    priority: str | None = None
    resolution_notes: str | None = None


# ── Auth guard ────────────────────────────────────────────────────────────────

def _require_super_admin(current_user: User):
    if current_user.role_id != 6:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admin access only.")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ── Companies ─────────────────────────────────────────────────────────────────

@router.get("/companies")
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    companies = db.query(Company).order_by(Company.id).all()
    subs      = {s.company_id: s for s in db.query(Subscription).all()}
    u_counts  = dict(
        db.query(User.company_id, func.count(User.id))
        .filter(User.deleted_at.is_(None))
        .group_by(User.company_id).all()
    )
    f_counts  = dict(db.query(Farm.company_id, func.count(Farm.id)).group_by(Farm.company_id).all())
    return [
        {
            "id":             c.id,
            "name":           c.name,
            "status":         c.status,
            "business_model": c.business_model or "broiler",
            "created_at":     c.created_at,
            "subscription":   _sub_dict(subs.get(c.id)),
            "user_count":     u_counts.get(c.id, 0),
            "farm_count":     f_counts.get(c.id, 0),
        }
        for c in companies
    ]


def _sub_dict(sub):
    if not sub:
        return None
    return {
        "id": sub.id, "company_id": sub.company_id,
        "plan_name": sub.plan_name, "status": sub.status, "expires_at": sub.expires_at,
    }


@router.post("/companies", status_code=201)
def create_company(
    body: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    company = Company(name=body.name, status="active", business_model=body.business_model)
    db.add(company)
    db.flush()
    sub = Subscription(company_id=company.id, plan_name=body.plan_name, status="active", expires_at=body.expires_at)
    db.add(sub)
    db.commit()
    db.refresh(company)
    return {
        "id": company.id, "name": company.name, "status": company.status,
        "business_model": company.business_model, "created_at": company.created_at,
        "subscription": _sub_dict(sub), "user_count": 0, "farm_count": 0,
    }


@router.patch("/companies/{company_id}")
def update_company(
    company_id: int,
    body: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if body.name           is not None: company.name           = body.name
    if body.status         is not None: company.status         = body.status
    if body.business_model is not None: company.business_model = body.business_model
    db.commit()
    db.refresh(company)
    return company


@router.delete("/companies/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    force: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    user_count = db.query(func.count(User.id)).filter(User.company_id == company_id).scalar() or 0
    if user_count and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Company has {user_count} user(s). Pass ?force=true to delete anyway, or suspend the company instead.",
        )
    active_batches = (
        db.query(func.count(Batch.id))
        .join(Farm, Batch.farm_id == Farm.id)
        .filter(Farm.company_id == company_id, Batch.status == "active")
        .scalar() or 0
    )
    if active_batches:
        raise HTTPException(
            status_code=400,
            detail=f"Company has {active_batches} active batch(es). Close them before deleting.",
        )
    db.delete(company)
    db.commit()


@router.get("/companies/{company_id}/subscription")
def get_company_subscription(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.patch("/companies/{company_id}/subscription")
def update_company_subscription(
    company_id: int,
    body: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if body.plan_name is not None:
        sub.plan_name = body.plan_name
    if body.expires_at is not None:
        sub.expires_at = body.expires_at
        exp = body.expires_at.replace(tzinfo=None) if body.expires_at.tzinfo else body.expires_at
        sub.status = "active" if exp >= _now_naive() else "expired"
    if body.status is not None:
        sub.status = body.status
    db.commit()
    db.refresh(sub)
    return sub


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_all_users(
    search:     str | None = Query(None),
    company_id: int | None = Query(None),
    role_id:    int | None = Query(None),
    usr_status: str | None = Query(None, alias="status"),
    skip:       int        = Query(0, ge=0),
    limit:      int        = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    q = db.query(User).filter(User.deleted_at.is_(None))
    if company_id:  q = q.filter(User.company_id == company_id)
    if role_id:     q = q.filter(User.role_id == role_id)
    if usr_status:  q = q.filter(User.status == usr_status)
    if search:
        like = f"%{search}%"
        q = q.filter((User.full_name.ilike(like)) | (User.email.ilike(like)))
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    comp_map = dict(db.query(Company.id, Company.name).all())
    role_map = dict(db.query(Role.id, Role.name).all())
    return {
        "total": total,
        "items": [
            {
                "id":            u.id,
                "full_name":     u.full_name,
                "email":         u.email,
                "company_id":    u.company_id,
                "company_name":  comp_map.get(u.company_id),
                "role_id":       u.role_id,
                "role_name":     role_map.get(u.role_id),
                "status":        u.status,
                "is_active":     u.is_active,
                "last_login_at": u.last_login_at,
                "created_at":    u.created_at,
            }
            for u in users
        ],
    }


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
def list_audit_logs(
    company_id:  int | None = Query(None),
    action_type: str | None = Query(None),
    skip:        int        = Query(0, ge=0),
    limit:       int        = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    q = db.query(UserAuditLog)
    if company_id:
        target_ids = [r[0] for r in db.query(User.id).filter(User.company_id == company_id).all()]
        if not target_ids:
            return {"total": 0, "items": []}
        q = q.filter(UserAuditLog.target_user_id.in_(target_ids))
    if action_type:
        q = q.filter(UserAuditLog.action_type == action_type)
    total = q.count()
    logs  = q.order_by(UserAuditLog.created_at.desc()).offset(skip).limit(limit).all()

    user_ids = set()
    for log in logs:
        user_ids.add(log.target_user_id)
        user_ids.add(log.performed_by)
    user_ids.discard(None)
    name_map = {}
    if user_ids:
        name_map = dict(db.query(User.id, User.full_name).filter(User.id.in_(user_ids)).all())

    return {
        "total": total,
        "items": [
            {
                "id":             log.id,
                "target_user_id": log.target_user_id,
                "target_name":    name_map.get(log.target_user_id),
                "action_type":    log.action_type,
                "old_value":      log.old_value,
                "new_value":      log.new_value,
                "performed_by":   log.performed_by,
                "actor_name":     name_map.get(log.performed_by),
                "notes":          log.notes,
                "ip_address":     log.ip_address,
                "created_at":     log.created_at,
            }
            for log in logs
        ],
    }


# ── System Health ─────────────────────────────────────────────────────────────

@router.get("/health")
def system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    now = _now_naive()

    total_companies  = db.query(func.count(Company.id)).scalar() or 0
    active_companies = db.query(func.count(Company.id)).filter(Company.status == "active").scalar() or 0
    total_users      = db.query(func.count(User.id)).filter(User.deleted_at.is_(None)).scalar() or 0
    active_users     = db.query(func.count(User.id)).filter(User.status == "active", User.deleted_at.is_(None)).scalar() or 0
    total_farms      = db.query(func.count(Farm.id)).scalar() or 0
    active_batches   = db.query(func.count(Batch.id)).filter(Batch.status == "active").scalar() or 0

    expiring_soon = (
        db.query(func.count(Subscription.id))
        .filter(
            Subscription.status == "active",
            Subscription.expires_at >= now,
            Subscription.expires_at <= now + timedelta(days=30),
        )
        .scalar() or 0
    )
    expired_active = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.expires_at < now, Subscription.status == "active")
        .scalar() or 0
    )
    logins_24h = (
        db.query(func.count(LoginHistory.id))
        .filter(LoginHistory.created_at >= now - timedelta(hours=24), LoginHistory.success == True)  # noqa: E712
        .scalar() or 0
    )
    open_tickets = (
        db.query(func.count(SupportTicket.id))
        .filter(SupportTicket.status.notin_(["closed", "resolved"]))
        .scalar() or 0
    )

    return {
        "companies":     {"total": total_companies, "active": active_companies, "suspended": total_companies - active_companies},
        "users":         {"total": total_users, "active": active_users},
        "farms":         {"total": total_farms},
        "batches":       {"active": active_batches},
        "subscriptions": {"expiring_soon_30d": expiring_soon, "expired_but_active": expired_active},
        "activity":      {"logins_24h": logins_24h, "open_tickets": open_tickets},
    }


# ── Roles ─────────────────────────────────────────────────────────────────────

@router.get("/roles")
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    roles = db.query(Role).order_by(Role.id).all()
    return [
        {"id": r.id, "name": r.name, "description": r.description, "is_active": r.is_active}
        for r in roles
    ]


# ── Export ────────────────────────────────────────────────────────────────────

@router.get("/export/companies")
def export_companies_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    companies = db.query(Company).order_by(Company.id).all()
    subs      = {s.company_id: s for s in db.query(Subscription).all()}
    u_counts  = dict(
        db.query(User.company_id, func.count(User.id))
        .filter(User.deleted_at.is_(None))
        .group_by(User.company_id).all()
    )
    f_counts  = dict(db.query(Farm.company_id, func.count(Farm.id)).group_by(Farm.company_id).all())

    out = StringIO()
    writer = csv.writer(out)
    writer.writerow(["ID", "Company Name", "Business Model", "Status", "Plan", "Sub Status", "Expires At", "Users", "Farms", "Created At"])
    for c in companies:
        sub = subs.get(c.id)
        writer.writerow([
            c.id,
            c.name,
            c.business_model or "broiler",
            c.status,
            sub.plan_name if sub else "",
            sub.status    if sub else "",
            sub.expires_at.date().isoformat() if sub and sub.expires_at else "",
            u_counts.get(c.id, 0),
            f_counts.get(c.id, 0),
            c.created_at.date().isoformat() if c.created_at else "",
        ])

    return Response(
        content=out.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=companies.csv"},
    )


# ── Announcements ─────────────────────────────────────────────────────────────

@router.get("/announcements")
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    anns = db.query(SystemAnnouncement).order_by(SystemAnnouncement.created_at.desc()).all()
    comp_map = dict(db.query(Company.id, Company.name).all()) if anns else {}
    return [
        {
            "id":         a.id,
            "title":      a.title,
            "body":       a.body,
            "target":     a.target,
            "company_id": a.company_id,
            "company_name": comp_map.get(a.company_id) if a.company_id else None,
            "created_by": a.created_by,
            "created_at": a.created_at,
            "expires_at": a.expires_at,
        }
        for a in anns
    ]


@router.post("/announcements", status_code=201)
def create_announcement(
    body: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    ann = SystemAnnouncement(
        title=body.title,
        body=body.body,
        target=body.target,
        company_id=body.company_id,
        created_by=current_user.id,
        expires_at=body.expires_at,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return {"id": ann.id, "title": ann.title, "body": ann.body, "target": ann.target,
            "company_id": ann.company_id, "created_by": ann.created_by,
            "created_at": ann.created_at, "expires_at": ann.expires_at}


@router.delete("/announcements/{ann_id}", status_code=204)
def delete_announcement(
    ann_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    ann = db.get(SystemAnnouncement, ann_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()


# ── Support Tickets ───────────────────────────────────────────────────────────

@router.get("/support-tickets")
def list_support_tickets(
    tkt_status: str | None = Query(None, alias="status"),
    priority:   str | None = Query(None),
    company_id: int | None = Query(None),
    skip:       int        = Query(0, ge=0),
    limit:      int        = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    q = db.query(SupportTicket)
    if tkt_status: q = q.filter(SupportTicket.status == tkt_status)
    if priority:   q = q.filter(SupportTicket.priority == priority)
    if company_id: q = q.filter(SupportTicket.company_id == company_id)
    total   = q.count()
    tickets = q.order_by(SupportTicket.created_at.desc()).offset(skip).limit(limit).all()

    comp_map = dict(db.query(Company.id, Company.name).all())
    user_ids = set()
    for t in tickets:
        user_ids.add(t.user_id)
        if t.assigned_to:
            user_ids.add(t.assigned_to)
    user_ids.discard(None)
    name_map = dict(db.query(User.id, User.full_name).filter(User.id.in_(user_ids)).all()) if user_ids else {}

    return {
        "total": total,
        "items": [
            {
                "id":               t.id,
                "ticket_no":        t.ticket_no,
                "company_id":       t.company_id,
                "company_name":     comp_map.get(t.company_id),
                "user_id":          t.user_id,
                "submitter_name":   name_map.get(t.user_id),
                "subject":          t.subject,
                "category":         t.category,
                "priority":         t.priority,
                "status":           t.status,
                "assigned_to":      t.assigned_to,
                "assignee_name":    name_map.get(t.assigned_to),
                "affected_module":  t.affected_module,
                "resolution_notes": t.resolution_notes,
                "created_at":       t.created_at,
                "updated_at":       t.updated_at,
            }
            for t in tickets
        ],
    }


@router.patch("/support-tickets/{ticket_id}")
def update_support_ticket(
    ticket_id: int,
    body: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if body.status is not None:
        ticket.status = body.status
        if body.status in ("resolved", "closed"):
            ticket.resolved_at = _now_naive()
            ticket.closed_at   = _now_naive() if body.status == "closed" else ticket.closed_at
    if body.assigned_to      is not None: ticket.assigned_to      = body.assigned_to
    if body.priority         is not None: ticket.priority         = body.priority
    if body.resolution_notes is not None: ticket.resolution_notes = body.resolution_notes
    db.commit()
    db.refresh(ticket)
    return {
        "id":               ticket.id,
        "status":           ticket.status,
        "assigned_to":      ticket.assigned_to,
        "priority":         ticket.priority,
        "resolution_notes": ticket.resolution_notes,
    }
