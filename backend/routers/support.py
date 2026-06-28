from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import SupportTicket, TicketActivityLog, TicketComment, User
from routers.auth import get_current_user
from schemas.schemas import (
    TicketActivityLogOut, TicketAssign, TicketCommentCreate, TicketCommentOut,
    TicketCreate, TicketDetailOut, TicketOut, TicketStatusChange, TicketUpdate,
)

router = APIRouter(prefix="/support", tags=["support"])

ADMIN_ROLES = {1, 2, 5}  # Administrator, Farm Manager, Owner


def _now():
    return datetime.now(timezone.utc)


def _gen_ticket_no(db: Session) -> str:
    count = db.query(SupportTicket).count()
    return f"TKT-{count + 1:04d}"


def _log(db: Session, ticket_id: int, action: str, actor_id: int, old=None, new=None, notes=None):
    db.add(TicketActivityLog(
        ticket_id=ticket_id,
        action_type=action,
        old_value=str(old) if old is not None else None,
        new_value=str(new) if new is not None else None,
        performed_by=actor_id,
        notes=notes,
    ))


def _ticket_out(ticket: SupportTicket) -> TicketOut:
    out = TicketOut.model_validate(ticket)
    out.submitter_name = ticket.submitter.full_name if ticket.submitter else None
    out.assignee_name  = ticket.assignee.full_name  if ticket.assignee  else None
    return out


def _comment_out(c: TicketComment) -> TicketCommentOut:
    out = TicketCommentOut.model_validate(c)
    out.author_name = c.author.full_name if c.author else None
    return out


def _activity_out(a: TicketActivityLog) -> TicketActivityLogOut:
    return TicketActivityLogOut(
        id=a.id, ticket_id=a.ticket_id, action_type=a.action_type,
        old_value=a.old_value, new_value=a.new_value, performed_by=a.performed_by,
        actor_name=a.actor.full_name if a.actor else None,
        notes=a.notes, created_at=a.created_at,
    )


# ── Tickets ──────────────────────────────────────────────────────────────────

@router.get("/tickets", response_model=list[TicketOut])
def list_tickets(
    status:      Optional[str] = Query(None),
    priority:    Optional[str] = Query(None),
    category:    Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    farm_id:     Optional[int] = Query(None),
    search:      Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(SupportTicket)
    if current_user.role_id not in ADMIN_ROLES:
        q = q.filter(SupportTicket.user_id == current_user.id)
    if farm_id:
        q = q.filter(SupportTicket.farm_id == farm_id)
    if status:
        q = q.filter(SupportTicket.status == status)
    if priority:
        q = q.filter(SupportTicket.priority == priority)
    if category:
        q = q.filter(SupportTicket.category == category)
    if assigned_to is not None:
        if assigned_to == 0:
            q = q.filter(SupportTicket.assigned_to == None)  # noqa: E711
        else:
            q = q.filter(SupportTicket.assigned_to == assigned_to)
    if search:
        like = f"%{search}%"
        q = q.filter(
            SupportTicket.subject.ilike(like) |
            SupportTicket.ticket_no.ilike(like) |
            SupportTicket.description.ilike(like)
        )
    return [_ticket_out(t) for t in q.order_by(SupportTicket.created_at.desc()).all()]


@router.post("/tickets", response_model=TicketOut, status_code=201)
def create_ticket(
    body: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = SupportTicket(
        ticket_no=_gen_ticket_no(db),
        user_id=current_user.id,
        farm_id=current_user.farm_id,
        subject=body.subject,
        category=body.category,
        priority=body.priority,
        description=body.description,
        affected_module=body.affected_module,
        contact_info=body.contact_info,
        department=body.department or getattr(current_user, 'department', None),
        status="new",
    )
    db.add(ticket)
    db.flush()
    _log(db, ticket.id, "created", current_user.id,
         notes=f"Ticket submitted by {current_user.full_name}")
    db.commit()
    db.refresh(ticket)
    return _ticket_out(ticket)


@router.get("/tickets/{ticket_id}", response_model=TicketDetailOut)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if current_user.role_id not in ADMIN_ROLES and ticket.user_id != current_user.id:
        raise HTTPException(403, "Access denied")

    out = TicketDetailOut.model_validate(ticket)
    out.submitter_name = ticket.submitter.full_name if ticket.submitter else None
    out.assignee_name  = ticket.assignee.full_name  if ticket.assignee  else None

    visible_comments = ticket.comments
    if current_user.role_id not in ADMIN_ROLES:
        visible_comments = [c for c in visible_comments if not c.is_internal]
    out.comments = [_comment_out(c) for c in visible_comments]

    if current_user.role_id in ADMIN_ROLES:
        out.activity = [_activity_out(a) for a in ticket.activity_logs]

    return out


@router.patch("/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int,
    body: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Only admins can update tickets")
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    changes = body.model_dump(exclude_none=True)
    for field, value in changes.items():
        old = getattr(ticket, field, None)
        if str(old) != str(value):
            _log(db, ticket.id, f"{field}_changed", current_user.id, old=old, new=value)
        setattr(ticket, field, value)

    if body.status == "resolved" and not ticket.resolved_at:
        ticket.resolved_at = _now()
    if body.status == "closed" and not ticket.closed_at:
        ticket.closed_at = _now()
    ticket.updated_at = _now()
    db.commit()
    db.refresh(ticket)
    return _ticket_out(ticket)


@router.post("/tickets/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: int,
    body: TicketAssign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Only admins can assign tickets")
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    old = ticket.assigned_to
    ticket.assigned_to = body.user_id
    if body.user_id and ticket.status == "new":
        ticket.status = "assigned"
    elif not body.user_id and ticket.status == "assigned":
        ticket.status = "new"
    ticket.updated_at = _now()

    assignee_name = None
    if body.user_id:
        u = db.get(User, body.user_id)
        assignee_name = u.full_name if u else None

    _log(db, ticket.id, "assigned", current_user.id, old=old, new=body.user_id,
         notes=f"Assigned to {assignee_name}" if assignee_name else "Unassigned")
    db.commit()
    db.refresh(ticket)
    return _ticket_out(ticket)


@router.post("/tickets/{ticket_id}/status", response_model=TicketOut)
def change_status(
    ticket_id: int,
    body: TicketStatusChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    if current_user.role_id not in ADMIN_ROLES:
        if ticket.user_id != current_user.id:
            raise HTTPException(403, "Access denied")
        if body.status not in ("reopened",):
            raise HTTPException(403, "Users can only reopen tickets")

    old_status = ticket.status
    ticket.status = body.status
    ticket.updated_at = _now()

    now = _now()
    if body.status == "resolved" and not ticket.resolved_at:
        ticket.resolved_at = now
        if body.notes:
            ticket.resolution_notes = body.notes
    if body.status == "closed" and not ticket.closed_at:
        ticket.closed_at = now
    if body.status == "escalated" and not ticket.escalated_at:
        ticket.escalated_at = now
        if body.notes:
            ticket.escalation_notes = body.notes
    if body.status == "reopened":
        ticket.resolved_at = None
        ticket.closed_at = None

    _log(db, ticket.id, "status_changed", current_user.id,
         old=old_status, new=body.status, notes=body.notes)
    db.commit()
    db.refresh(ticket)
    return _ticket_out(ticket)


# ── Comments ─────────────────────────────────────────────────────────────────

@router.get("/tickets/{ticket_id}/comments", response_model=list[TicketCommentOut])
def get_comments(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if current_user.role_id not in ADMIN_ROLES and ticket.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    q = db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id)
    if current_user.role_id not in ADMIN_ROLES:
        q = q.filter(TicketComment.is_internal == False)  # noqa: E712
    return [_comment_out(c) for c in q.order_by(TicketComment.created_at).all()]


@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentOut, status_code=201)
def add_comment(
    ticket_id: int,
    body: TicketCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if current_user.role_id not in ADMIN_ROLES and ticket.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if ticket.status in ("closed", "cancelled"):
        raise HTTPException(400, "Cannot reply to a closed or cancelled ticket")

    is_internal = body.is_internal and current_user.role_id in ADMIN_ROLES
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        comment=body.comment,
        is_internal=is_internal,
    )
    db.add(comment)
    ticket.updated_at = _now()

    # Auto-progress status when admin first replies
    if current_user.role_id in ADMIN_ROLES and ticket.status in ("new", "assigned") and not is_internal:
        ticket.status = "in_progress"
        _log(db, ticket.id, "status_changed", current_user.id, old="new", new="in_progress",
             notes="Auto-progressed on first reply")

    action = "internal_note" if is_internal else (
        "support_replied" if current_user.role_id in ADMIN_ROLES else "user_replied"
    )
    _log(db, ticket.id, action, current_user.id)
    db.flush()
    db.commit()
    db.refresh(comment)
    out = TicketCommentOut.model_validate(comment)
    out.author_name = current_user.full_name
    return out


# ── Activity Log ──────────────────────────────────────────────────────────────

@router.get("/tickets/{ticket_id}/activity", response_model=list[TicketActivityLogOut])
def get_activity(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Admin only")
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    return [_activity_out(a) for a in ticket.activity_logs]


# ── Dashboard & Staff ─────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    farm_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Admin only")
    q = db.query(SupportTicket)
    if farm_id:
        q = q.filter(SupportTicket.farm_id == farm_id)
    tickets = q.all()

    by_status: dict = {}
    by_priority: dict = {}
    by_category: dict = {}
    for t in tickets:
        by_status[t.status]     = by_status.get(t.status, 0) + 1
        by_priority[t.priority] = by_priority.get(t.priority, 0) + 1
        by_category[t.category] = by_category.get(t.category, 0) + 1

    open_statuses = {"new", "assigned", "in_progress", "open"}
    return {
        "total":      len(tickets),
        "open":       sum(v for k, v in by_status.items() if k in open_statuses),
        "waiting":    by_status.get("waiting_for_user", 0) + by_status.get("waiting_on_user", 0),
        "resolved":   by_status.get("resolved", 0),
        "closed":     by_status.get("closed", 0),
        "escalated":  by_status.get("escalated", 0),
        "critical":   by_priority.get("critical", 0),
        "by_status":   by_status,
        "by_priority": by_priority,
        "by_category": by_category,
    }


@router.get("/staff")
def list_staff(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Admin only")
    users = db.query(User).filter(User.role_id.in_(ADMIN_ROLES)).order_by(User.full_name).all()
    return [{"id": u.id, "full_name": u.full_name, "role_id": u.role_id} for u in users]


# ── AI Suggestion ─────────────────────────────────────────────────────────────

@router.get("/tickets/{ticket_id}/ai-suggest")
def ai_suggest(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from config import settings
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    if current_user.role_id not in ADMIN_ROLES and ticket.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(503, "AI suggestions are not configured on this server")

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = (
            "You are a helpful IT support assistant for RTL Poultry Farming ERP — "
            "a web-based system used by poultry farms to manage batches, mortality, "
            "feed, inventory, sales, procurement, and reports.\n\n"
            "A user has submitted the following support ticket:\n\n"
            f"Subject: {ticket.subject}\n"
            f"Category: {ticket.category.replace('_', ' ').title()}\n"
            f"Priority: {ticket.priority.title()}\n"
            f"Affected Module: {ticket.affected_module or 'Not specified'}\n"
            f"Description:\n{ticket.description}\n\n"
            "Please provide a concise, practical response with:\n"
            "1. **Likely Cause** — what probably triggered this issue\n"
            "2. **Quick Fixes** — step-by-step things the user can try right now "
            "(e.g. refresh, clear cache, re-login, check permissions)\n"
            "3. **If It Persists** — what details the IT team will need to investigate\n\n"
            "Keep it friendly and easy to follow. Use short bullet points."
        )
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"suggestion": message.content[0].text}
    except Exception as e:
        raise HTTPException(502, f"AI service error: {str(e)}")
