from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Batch, Farm, House, User
from routers.auth import get_current_user, require_permission
from schemas.schemas import FarmCreate, FarmOut, FarmUpdate, HouseCreate, HouseOut, HouseUpdate

router = APIRouter(prefix="/farms", tags=["farms"])


def _get_farm_or_404(farm_id: int, db: Session, current_user) -> Farm:
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    if current_user.role_id not in (6,) and farm.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Access denied to this farm")
    return farm


# ── Farms ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[FarmOut])
def list_farms(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    q = db.query(Farm).options(joinedload(Farm.company))
    if current_user.role_id not in (6,):
        q = q.filter(Farm.company_id == current_user.company_id)

    if current_user.role_id in (1, 5, 6):
        return q.order_by(Farm.id).all()
    else:
        return q.filter(Farm.id == current_user.farm_id).all()


@router.post("", response_model=FarmOut, status_code=status.HTTP_201_CREATED)
def create_farm(
    body: FarmCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("write", "farms")),
):
    # Super admins may specify company_id explicitly; everyone else gets their own company
    company_id = (
        body.company_id
        if body.company_id and current_user.role_id == 6
        else current_user.company_id
    )
    farm = Farm(**body.model_dump(exclude={"company_id"}), company_id=company_id)
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("delete")),
):
    farm = _get_farm_or_404(farm_id, db, current_user)

    active_users = db.query(User).filter(User.farm_id == farm_id).count()
    if active_users:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete farm — {active_users} user(s) are still assigned to it.",
        )

    active_batches = db.query(Batch).filter(Batch.farm_id == farm_id).count()
    if active_batches:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete farm — {active_batches} batch(es) still exist under this farm.",
        )

    # Delete houses first (FK constraint), then the farm
    db.query(House).filter(House.farm_id == farm_id).delete()
    db.delete(farm)
    db.commit()


@router.patch("/{farm_id}", response_model=FarmOut)
def update_farm(
    farm_id: int,
    body: FarmUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("write", "farms")),
):
    farm = _get_farm_or_404(farm_id, db, current_user)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(farm, field, value)
    db.commit()
    db.refresh(farm)
    return farm


# ── Houses ────────────────────────────────────────────────────────────────────

@router.get("/{farm_id}/houses", response_model=list[HouseOut])
def list_houses(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _get_farm_or_404(farm_id, db, current_user)
    if current_user.role_id not in (1, 5, 6) and farm_id != current_user.farm_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return db.query(House).filter(House.farm_id == farm_id).order_by(House.name).all()


@router.post("/{farm_id}/houses", response_model=HouseOut, status_code=status.HTTP_201_CREATED)
def create_house(
    farm_id: int,
    body: HouseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "farms")),
):
    _get_farm_or_404(farm_id, db, current_user)
    house = House(**{**body.model_dump(), "farm_id": farm_id})
    db.add(house)
    db.commit()
    db.refresh(house)
    return house


@router.patch("/{farm_id}/houses/{house_id}", response_model=HouseOut)
def update_house(
    farm_id: int,
    house_id: int,
    body: HouseUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("write", "farms")),
):
    _get_farm_or_404(farm_id, db, current_user)
    house = db.get(House, house_id)
    if not house or house.farm_id != farm_id:
        raise HTTPException(status_code=404, detail="House not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(house, field, value)
    db.commit()
    db.refresh(house)
    return house


@router.delete("/{farm_id}/houses/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house(
    farm_id: int,
    house_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("delete")),
):
    _get_farm_or_404(farm_id, db, current_user)
    house = db.get(House, house_id)
    if not house or house.farm_id != farm_id:
        raise HTTPException(status_code=404, detail="House not found")
    db.delete(house)
    db.commit()
