from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import SupportTicket, TicketComment, User
from routers.auth import get_current_user
from schemas.schemas import (
    TicketCommentCreate, TicketCommentOut,
    TicketCreate, TicketOut, TicketUpdate,
)

router = APIRouter(prefix="/support", tags=["support"])

ADMIN_ROLES = {1, 2}


def _gen_ticket_no(db: Session) -> str:
    count = db.query(SupportTicket).count()
    return f"TKT-{count + 1:04d}"


def _ticket_out(ticket: SupportTicket) -> TicketOut:
    out = TicketOut.model_validate(ticket)
    out.submitter_name = ticket.submitter.full_name if ticket.submitter else None
    return out


# ── Tickets ──────────────────────────────────────────────────────────────────

@router.get("/tickets", response_model=list[TicketOut])
def list_tickets(
    status:   Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    farm_id:  Optional[int] = Query(None),
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
    tickets = q.order_by(SupportTicket.created_at.desc()).all()
    return [_ticket_out(t) for t in tickets]


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
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _ticket_out(ticket)


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
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
    return _ticket_out(ticket)


@router.patch("/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int,
    body: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Only admins can update ticket status")
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(ticket, field, value)
    if body.status == "resolved" and not ticket.resolved_at:
        ticket.resolved_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)
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
        q = q.filter(TicketComment.is_internal == False)
    comments = q.order_by(TicketComment.created_at).all()
    result = []
    for c in comments:
        out = TicketCommentOut.model_validate(c)
        out.author_name = c.author.full_name if c.author else None
        result.append(out)
    return result


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
    comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        comment=body.comment,
        is_internal=body.is_internal and current_user.role_id in ADMIN_ROLES,
    )
    db.add(comment)
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    out = TicketCommentOut.model_validate(comment)
    out.author_name = current_user.full_name
    return out
