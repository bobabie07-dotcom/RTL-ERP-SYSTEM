from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import LoginHistory, User, Company
from schemas.schemas import (
    ChangePasswordRequest, FirstPasswordRequest, LoginRequest, TokenResponse,
    UserCreate, UserOut, UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])

bearer = HTTPBearer()

DEFAULT_PASSWORD = "Welcome@123"
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 30


def _verify(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def _check_perm(perms: dict, action: str, resource: str = None) -> bool:
    if perms.get("all"):
        return True
    if action == "read":
        return bool(perms.get("read"))
    if action == "delete":
        return bool(perms.get("delete"))
    if action == "write":
        w = perms.get("write")
        if w is True:
            return True
        if isinstance(w, list):
            return resource in w if resource else False
    return False


def _can(user: User, action: str, resource: str = None) -> bool:
    # Check primary role
    if user.role and _check_perm(user.role.permissions or {}, action, resource):
        return True
    # Check all additional roles (union permissions)
    for ur in (user.extra_roles or []):
        if ur.role and _check_perm(ur.role.permissions or {}, action, resource):
            return True
    return False


def require_permission(action: str, resource: str = None):
    def dep(current_user: User = Depends(get_current_user)) -> User:
        if not _can(current_user, action, resource):
            detail = f"Your role does not have '{action}' permission"
            if resource:
                detail += f" on '{resource}'"
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail + ".")
        return current_user
    return dep


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.company_id:
        company = db.get(Company, user.company_id)
        if company and company.status == "suspended":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company subscription is suspended. Contact system administrator.")

    st = getattr(user, "status", "active")
    if st == "inactive":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    if st == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended. Contact your administrator.")
    if st == "locked":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is locked. Contact your administrator.")
    if st == "archived":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account has been archived")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account disabled")
    return user


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    identifier = body.email.strip()
    user = db.query(User).filter(
        (User.email == identifier) | (User.username == identifier)
    ).first()

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]

    def _fail(reason: str):
        if user:
            user.failed_login_count = (user.failed_login_count or 0) + 1
            if user.failed_login_count >= MAX_FAILED_ATTEMPTS:
                user.status   = "locked"
                user.is_active = False
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            db.add(LoginHistory(
                user_id=user.id, success=False,
                ip_address=ip, user_agent=ua, failure_reason=reason,
            ))
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=reason)

    if not user or not _verify(body.password, user.password_hash):
        _fail("Invalid credentials")

    # Auto-unlock after lockout period expires
    if getattr(user, "status", "active") == "locked":
        locked_until = getattr(user, "locked_until", None)
        if locked_until and locked_until > datetime.now(timezone.utc):
            mins = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            _fail(f"Account locked — try again in {mins} minute(s) or contact admin")
        else:
            user.status             = "active"
            user.is_active          = True
            user.failed_login_count = 0
            user.locked_until       = None

    st = getattr(user, "status", "active")
    if st == "inactive":
        _fail("Account is inactive. Contact your administrator.")
    if st == "suspended":
        _fail("Account is suspended. Contact your administrator.")
    if st == "archived":
        _fail("Account has been archived.")
    if not user.is_active:
        _fail("Account disabled.")

    # Success
    user.failed_login_count = 0
    user.last_login_at      = datetime.now(timezone.utc)
    db.add(LoginHistory(user_id=user.id, success=True, ip_address=ip, user_agent=ua))
    db.commit()

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    extra_ids = [ur.role_id for ur in (getattr(current_user, 'extra_roles', None) or []) if ur.role]
    all_ids   = [current_user.role_id] + [rid for rid in extra_ids if rid != current_user.role_id]
    return {
        "id":             current_user.id,
        "company_id":     current_user.company_id,
        "full_name":      current_user.full_name,
        "email":          current_user.email,
        "username":       current_user.username,
        "farm_id":        current_user.farm_id,
        "role_id":        current_user.role_id,
        "department":     current_user.department,
        "phone":          current_user.phone,
        "is_active":      current_user.is_active,
        "is_first_login": current_user.is_first_login,
        "status":         getattr(current_user, 'status', 'active'),
        "created_at":     current_user.created_at,
        "all_role_ids":   all_ids,
    }


@router.put("/first-password")
def set_first_password(
    body: FirstPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_first_login:
        raise HTTPException(status_code=400, detail="Password already set")
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    current_user.password_hash          = _hash(body.new_password)
    current_user.is_first_login         = False
    current_user.last_password_change_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Password updated successfully"}


@router.put("/password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _verify(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.password_hash          = _hash(body.new_password)
    current_user.last_password_change_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Password updated successfully"}


# ── Legacy user endpoints (kept for backward compat) ─────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_users(
    farm_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(User).filter(User.deleted_at == None)  # noqa: E711
    if current_user.role_id not in (6,):  # Non-super admins only see their own company's users
        q = q.filter(User.company_id == current_user.company_id)
    if farm_id:
        q = q.filter(User.farm_id == farm_id)
    return q.order_by(User.full_name).all()


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    current_user: User = Depends(require_permission("delete")),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.username and db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    company_id = body.company_id if (current_user.role_id == 6 and body.company_id) else current_user.company_id
    user = User(
        full_name=body.full_name,
        email=body.email,
        username=body.username or None,
        password_hash=_hash(DEFAULT_PASSWORD),
        role_id=body.role_id,
        company_id=company_id,
        farm_id=body.farm_id,
        department=body.department or None,
        phone=body.phone or None,
        is_active=body.is_active,
        status="active" if body.is_active else "inactive",
        is_first_login=True,
        created_by=current_user.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id":             user.id,
        "full_name":      user.full_name,
        "email":          user.email,
        "username":       user.username,
        "role_id":        user.role_id,
        "farm_id":        user.farm_id,
        "department":     user.department,
        "phone":          user.phone,
        "is_active":      user.is_active,
        "is_first_login": user.is_first_login,
        "created_at":     user.created_at,
        "temp_password":  DEFAULT_PASSWORD,
    }


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(require_permission("delete")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = body.model_dump(exclude_none=True)
    for f in ("username", "department", "phone", "position", "employee_id"):
        if f in data and data[f] == "":
            data[f] = None
    if data.get("username"):
        conflict = db.query(User).filter(User.username == data["username"], User.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Username already taken")
    # Sync is_active → status
    if "is_active" in data:
        data["status"] = "active" if data["is_active"] else "inactive"
    for field, value in data.items():
        setattr(user, field, value)
    user.updated_by = current_user.id
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    current_user: User = Depends(require_permission("delete")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Use the change password form to update your own password")
    user.password_hash          = _hash(DEFAULT_PASSWORD)
    user.is_first_login         = True
    user.last_password_change_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Password reset successfully", "temp_password": DEFAULT_PASSWORD}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission("delete")),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
