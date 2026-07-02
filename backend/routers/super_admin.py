from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Company, Subscription, User, Role
from routers.auth import get_current_user
from schemas.schemas import UserOut

router = APIRouter(prefix="/super-admin", tags=["super-admin"])


class CompanyOut(BaseModel):
    id: int
    name: str
    status: str
    business_model: str = "broiler"
    created_at: datetime

    class Config:
        from_attributes = True


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


class SubscriptionOut(BaseModel):
    id: int
    company_id: int
    plan_name: str
    status: str
    expires_at: datetime

    class Config:
        from_attributes = True


def _require_super_admin(current_user: User):
    if current_user.role_id != 6:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access only."
        )


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    return db.query(Company).order_by(Company.id).all()


@router.post("/companies", response_model=CompanyOut, status_code=201)
def create_company(
    body: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    company = Company(name=body.name, status="active", business_model=body.business_model)
    db.add(company)
    db.flush()

    subscription = Subscription(
        company_id=company.id,
        plan_name=body.plan_name,
        status="active",
        expires_at=body.expires_at
    )
    db.add(subscription)
    db.commit()
    db.refresh(company)
    return company


@router.patch("/companies/{company_id}", response_model=CompanyOut)
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
    
    if body.name is not None:
        company.name = body.name
    if body.status is not None:
        company.status = body.status
    if body.business_model is not None:
        company.business_model = body.business_model

    db.commit()
    db.refresh(company)
    return company


@router.delete("/companies/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_super_admin(current_user)
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()


@router.patch("/companies/{company_id}/subscription", response_model=SubscriptionOut)
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
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/companies/{company_id}/subscription", response_model=SubscriptionOut)
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
