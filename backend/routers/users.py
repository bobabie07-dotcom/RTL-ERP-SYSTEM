from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import LoginHistory, Role, User, UserAuditLog, UserRole
from routers.auth import DEFAULT_PASSWORD, _hash, get_current_user, require_permission
from schemas.schemas import (
    LoginHistoryOut, RoleCreate, RoleOut, RoleUpdate, StatusChangePayload,
    UserAuditLogOut, UserCreate, UserDetailOut, UserRoleAssign, UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

ADMIN_ROLES = {1, 2, 5}


def _now():
    return datetime.now(timezone.utc)


def _require_admin(user: User):
    if user.role_id not in ADMIN_ROLES:
        raise HTTPException(403, "Admin access required")


def _audit(db: Session, target_id: int, action: str, by_id: int,
           old=None, new=None, notes=None, ip=None):
    db.add(UserAuditLog(
        target_user_id=target_id,
        action_type=action,
        old_value=str(old) if old is not None else None,
        new_value=str(new) if new is not None else None,
        performed_by=by_id,
        ip_address=ip,
        notes=notes,
    ))


def _build_detail(user: User) -> dict:
    primary_role_id   = user.role_id
    primary_role_name = user.role.name if user.role else None
    extra_role_ids    = [ur.role_id  for ur in (user.extra_roles or []) if ur.role]
    extra_role_names  = [ur.role.name for ur in (user.extra_roles or []) if ur.role]
    all_ids   = [primary_role_id]   + [rid for rid in extra_role_ids   if rid   != primary_role_id]
    all_names = [primary_role_name] + [n   for n   in extra_role_names if n     != primary_role_name]
    all_ids   = [x for x in all_ids   if x is not None]
    all_names = [x for x in all_names if x is not None]
    return {
        "id":                      user.id,
        "employee_id":             user.employee_id,
        "full_name":               user.full_name,
        "email":                   user.email,
        "username":                user.username,
        "farm_id":                 user.farm_id,
        "role_id":                 user.role_id,
        "department":              user.department,
        "position":                getattr(user, "position", None),
        "phone":                   user.phone,
        "status":                  getattr(user, "status", "active"),
        "is_active":               user.is_active,
        "is_first_login":          user.is_first_login,
        "failed_login_count":      getattr(user, "failed_login_count", 0),
        "last_login_at":           getattr(user, "last_login_at", None),
        "last_password_change_at": getattr(user, "last_password_change_at", None),
        "created_at":              user.created_at,
        "updated_at":              getattr(user, "updated_at", None),
        "created_by":              getattr(user, "created_by", None),
        "updated_by":              getattr(user, "updated_by", None),
        "role_name":               primary_role_name,
        "all_role_ids":            all_ids,
        "all_role_names":          all_names,
    }


# ── User List & Detail ────────────────────────────────────────────────────────

@router.get("")
def list_users(
    search:     Optional[str] = Query(None),
    status:     Optional[str] = Query(None),
    role_id:    Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    farm_id:    Optional[int] = Query(None),
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    q = db.query(User)
    if current_user.role_id not in (6,):
        q = q.filter(User.company_id == current_user.company_id)
    if not include_archived:
        q = q.filter(User.deleted_at == None)  # noqa: E711
    if farm_id:
        q = q.filter(User.farm_id == farm_id)
    if role_id:
        q = q.filter(User.role_id == role_id)
    if department:
        q = q.filter(User.department == department)
    if status:
        q = q.filter(User.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            User.full_name.ilike(like) |
            User.email.ilike(like) |
            User.username.ilike(like) |
            User.employee_id.ilike(like)
        )
    return [_build_detail(u) for u in q.order_by(User.full_name).all()]


@router.get("/stats")
def user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    users = db.query(User).filter(User.deleted_at == None).all()  # noqa: E711
    by_status = {}
    by_role   = {}
    by_dept   = {}
    for u in users:
        s = getattr(u, "status", "active")
        by_status[s] = by_status.get(s, 0) + 1
        role_name = u.role.name if u.role else "unknown"
        by_role[role_name] = by_role.get(role_name, 0) + 1
        dept = u.department or "Unassigned"
        by_dept[dept] = by_dept.get(dept, 0) + 1
    return {
        "total":            len(users),
        "active":           by_status.get("active", 0),
        "inactive":         by_status.get("inactive", 0),
        "suspended":        by_status.get("suspended", 0),
        "locked":           by_status.get("locked", 0),
        "pending":          sum(1 for u in users if u.is_first_login),
        "by_status":        by_status,
        "by_role":          by_role,
        "by_department":    by_dept,
    }


@router.get("/{user_id}")
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES and current_user.id != user_id:
        raise HTTPException(403, "Access denied")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return _build_detail(user)


# ── Create / Update ───────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_user(
    body: UserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    if body.username and db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already taken")
    if body.employee_id and db.query(User).filter(User.employee_id == body.employee_id).first():
        raise HTTPException(400, "Employee ID already exists")

    user = User(
        employee_id=body.employee_id or None,
        full_name=body.full_name,
        email=body.email,
        username=body.username or None,
        password_hash=_hash(DEFAULT_PASSWORD),
        role_id=body.role_id,
        company_id=current_user.company_id,
        farm_id=body.farm_id,
        department=body.department or None,
        position=getattr(body, "position", None),
        phone=body.phone or None,
        is_active=True,
        status="active",
        is_first_login=True,
        created_by=current_user.id,
    )
    db.add(user)
    db.flush()
    _audit(db, user.id, "user_created", current_user.id,
           new=user.email,
           notes=f"Created by {current_user.full_name}",
           ip=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    result = _build_detail(user)
    result["temp_password"] = DEFAULT_PASSWORD
    return result


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(404, "User not found")

    data = body.model_dump(exclude_none=True)
    for f in ("username", "department", "phone", "position", "employee_id"):
        if f in data and data[f] == "":
            data[f] = None
    if data.get("username"):
        conflict = db.query(User).filter(User.username == data["username"], User.id != user_id).first()
        if conflict:
            raise HTTPException(400, "Username already taken")
    if data.get("employee_id"):
        conflict = db.query(User).filter(User.employee_id == data["employee_id"], User.id != user_id).first()
        if conflict:
            raise HTTPException(400, "Employee ID already taken")

    old_snapshot = {k: str(getattr(user, k, None)) for k in data}
    for field, value in data.items():
        setattr(user, field, value)
    user.updated_by = current_user.id

    _audit(db, user.id, "user_updated", current_user.id,
           old=str(old_snapshot), new=str(data),
           ip=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return _build_detail(user)


# ── Status Management ─────────────────────────────────────────────────────────

@router.patch("/{user_id}/status")
def change_status(
    user_id: int,
    body: StatusChangePayload,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id and body.status in ("inactive", "suspended", "archived", "locked"):
        raise HTTPException(400, "Cannot change your own account to that status")

    VALID = {"active", "inactive", "suspended", "locked", "archived"}
    if body.status not in VALID:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(VALID)}")

    old_status = getattr(user, "status", "active")
    user.status    = body.status
    user.is_active = body.status == "active"
    if body.status == "active":
        user.failed_login_count = 0
        user.locked_until       = None
    if body.status == "archived":
        user.deleted_at = _now()

    user.updated_by = current_user.id
    _audit(db, user.id, f"status_{body.status}", current_user.id,
           old=old_status, new=body.status, notes=body.notes,
           ip=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return _build_detail(user)


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Use the change password form to update your own password")
    user.password_hash          = _hash(DEFAULT_PASSWORD)
    user.is_first_login         = True
    user.last_password_change_at = _now()
    user.updated_by              = current_user.id
    _audit(db, user.id, "password_reset", current_user.id,
           notes=f"Reset by {current_user.full_name}",
           ip=request.client.host if request.client else None)
    db.commit()
    return {"message": "Password reset successfully", "temp_password": DEFAULT_PASSWORD}


# ── Role Assignment ───────────────────────────────────────────────────────────

@router.get("/{user_id}/roles")
def get_user_roles(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    primary = {"role_id": user.role_id, "role_name": user.role.name if user.role else None, "is_primary": True}
    extras  = [
        {"role_id": ur.role_id, "role_name": ur.role.name if ur.role else None, "is_primary": False,
         "assigned_by": ur.assigned_by, "assigned_at": ur.assigned_at}
        for ur in (user.extra_roles or [])
    ]
    return {"primary": primary, "extra": extras}


@router.post("/{user_id}/roles")
def assign_roles(
    user_id: int,
    body: UserRoleAssign,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    # Validate all role IDs exist
    for rid in body.role_ids:
        if not db.get(Role, rid):
            raise HTTPException(400, f"Role {rid} not found")

    old_roles = [ur.role_id for ur in (user.extra_roles or [])]

    # Clear and replace extra roles
    for ur in list(user.extra_roles):
        db.delete(ur)
    db.flush()

    for rid in body.role_ids:
        if rid != user.role_id:  # Skip if same as primary
            db.add(UserRole(user_id=user_id, role_id=rid, assigned_by=current_user.id))

    _audit(db, user.id, "roles_assigned", current_user.id,
           old=str(old_roles), new=str(body.role_ids),
           ip=request.client.host if request.client else None)
    db.commit()
    db.refresh(user)
    return _build_detail(user)


@router.delete("/{user_id}/roles/{role_id}", status_code=204)
def remove_role(
    user_id: int,
    role_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    ur = db.query(UserRole).filter(
        UserRole.user_id == user_id, UserRole.role_id == role_id
    ).first()
    if not ur:
        raise HTTPException(404, "Role assignment not found")
    db.delete(ur)
    _audit(db, user_id, "role_removed", current_user.id,
           old=str(role_id),
           ip=request.client.host if request.client else None)
    db.commit()


# ── Login History & Audit Logs ────────────────────────────────────────────────

@router.get("/{user_id}/login-history")
def get_login_history(
    user_id: int,
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id not in ADMIN_ROLES and current_user.id != user_id:
        raise HTTPException(403, "Access denied")
    rows = (db.query(LoginHistory)
              .filter(LoginHistory.user_id == user_id)
              .order_by(LoginHistory.created_at.desc())
              .limit(limit)
              .all())
    return rows


@router.get("/{user_id}/audit-logs")
def get_user_audit_logs(
    user_id: int,
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    rows = (db.query(UserAuditLog)
              .filter(UserAuditLog.target_user_id == user_id)
              .order_by(UserAuditLog.created_at.desc())
              .limit(limit)
              .all())
    return [
        {
            "id":             r.id,
            "target_user_id": r.target_user_id,
            "action_type":    r.action_type,
            "old_value":      r.old_value,
            "new_value":      r.new_value,
            "performed_by":   r.performed_by,
            "actor_name":     r.actor.full_name if r.actor else None,
            "ip_address":     r.ip_address,
            "notes":          r.notes,
            "created_at":     r.created_at,
        }
        for r in rows
    ]


@router.get("/audit-logs/all")
def get_all_audit_logs(
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    rows = (db.query(UserAuditLog)
              .order_by(UserAuditLog.created_at.desc())
              .limit(limit)
              .all())
    return [
        {
            "id":             r.id,
            "target_user_id": r.target_user_id,
            "target_name":    r.target.full_name if r.target else None,
            "action_type":    r.action_type,
            "old_value":      r.old_value,
            "new_value":      r.new_value,
            "performed_by":   r.performed_by,
            "actor_name":     r.actor.full_name if r.actor else None,
            "ip_address":     r.ip_address,
            "notes":          r.notes,
            "created_at":     r.created_at,
        }
        for r in rows
    ]


# ── Role Management ───────────────────────────────────────────────────────────

@router.get("/roles/all")
def list_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roles = db.query(Role).order_by(Role.id).all()
    # Count active users per role in one query to avoid N+1 lazy loads
    user_counts: dict[int, int] = dict(
        db.query(User.role_id, func.count(User.id))
          .filter(User.deleted_at == None)  # noqa: E711
          .group_by(User.role_id)
          .all()
    )
    return [
        {
            "id":          r.id,
            "name":        r.name,
            "name_ar":     r.name_ar,
            "description": getattr(r, "description", None),
            "permissions": r.permissions or {},
            "is_active":   getattr(r, "is_active", True),
            "user_count":  user_counts.get(r.id, 0),
            "created_at":  getattr(r, "created_at", None),
        }
        for r in roles
    ]


@router.post("/roles/all", status_code=201)
def create_role(
    body: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    if db.query(Role).filter(Role.name == body.name).first():
        raise HTTPException(400, "Role name already exists")
    role = Role(
        name=body.name,
        name_ar=body.name_ar,
        description=body.description,
        permissions=body.permissions,
        is_active=body.is_active,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.patch("/roles/all/{role_id}")
def update_role(
    role_id: int,
    body: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    data = body.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(role, field, value)
    db.commit()
    db.refresh(role)
    return role
