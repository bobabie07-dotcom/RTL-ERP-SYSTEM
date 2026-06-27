from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


# ── Shared ───────────────────────────────────────────────────────────────────

class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(OrmBase):
    id:             int
    full_name:      str
    email:          str
    username:       Optional[str]
    farm_id:        int
    role_id:        int
    department:     Optional[str]
    phone:          Optional[str]
    is_active:      bool
    is_first_login: bool
    created_at:     datetime


class UserCreate(BaseModel):
    full_name:    str
    email:        str
    username:     Optional[str] = None
    role_id:      int = 3
    farm_id:      int = 1
    department:   Optional[str] = None
    phone:        Optional[str] = None
    is_active:    bool = True


class UserUpdate(BaseModel):
    full_name:  Optional[str] = None
    email:      Optional[str] = None
    username:   Optional[str] = None
    role_id:    Optional[int] = None
    department: Optional[str] = None
    phone:      Optional[str] = None
    is_active:  Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str


class FirstPasswordRequest(BaseModel):
    new_password:     str
    confirm_password: str


# ── Support Tickets ───────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject:     str
    category:    str
    priority:    str = "medium"
    description: str


class TicketUpdate(BaseModel):
    status:           Optional[str] = None
    assigned_to:      Optional[int] = None
    resolution_notes: Optional[str] = None
    priority:         Optional[str] = None


class TicketCommentCreate(BaseModel):
    comment:     str
    is_internal: bool = False


class TicketCommentOut(OrmBase):
    id:          int
    ticket_id:   int
    user_id:     int
    comment:     str
    is_internal: bool
    created_at:  datetime
    author_name: Optional[str] = None


class TicketOut(OrmBase):
    id:               int
    ticket_no:        str
    user_id:          int
    farm_id:          int
    subject:          str
    category:         str
    priority:         str
    description:      str
    status:           str
    assigned_to:      Optional[int]
    resolution_notes: Optional[str]
    created_at:       datetime
    updated_at:       datetime
    resolved_at:      Optional[datetime]
    submitter_name:   Optional[str] = None


# ── Dashboard ────────────────────────────────────────────────────────────────

class DashboardKPI(BaseModel):
    total_batches:             int
    active_batches:            int
    harvest_soon:              int
    total_birds:               int
    mortality_rate_7d:         float
    cumulative_mortality_rate: float
    feed_stock_days:           Optional[float]
    pending_vaccinations:      int
    unread_alerts:             int


# ── Farms & Houses ───────────────────────────────────────────────────────────

class FarmOut(OrmBase):
    id:       int
    name:     str
    name_ar:  Optional[str]
    location: Optional[str]


class FarmCreate(BaseModel):
    name:     str
    name_ar:  Optional[str] = None
    location: Optional[str] = None


class FarmUpdate(BaseModel):
    name:     Optional[str] = None
    name_ar:  Optional[str] = None
    location: Optional[str] = None


class HouseOut(OrmBase):
    id:         int
    farm_id:    int
    name:       str
    capacity:   int
    house_type: str
    is_active:  bool


class HouseCreate(BaseModel):
    name:       str
    capacity:   int = 0
    house_type: str = "broiler"


class HouseUpdate(BaseModel):
    name:       Optional[str] = None
    capacity:   Optional[int] = None
    house_type: Optional[str] = None
    is_active:  Optional[bool] = None


# ── Breeds ───────────────────────────────────────────────────────────────────

class BreedOut(OrmBase):
    id:                  int
    name:                str
    type:                str
    target_fcr:          Optional[Decimal]
    target_daily_gain_g: Optional[int]


# ── Batches ──────────────────────────────────────────────────────────────────

class BatchCreate(BaseModel):
    batch_no:          str
    house_id:          int
    farm_id:           int
    breed_id:          Optional[int] = None
    placed_date:       date
    initial_count:     int
    cycle_length_days: int = 42
    notes:             Optional[str] = None


class BatchUpdate(BaseModel):
    house_id:          Optional[int] = None
    breed_id:          Optional[int] = None
    placed_date:       Optional[date] = None
    initial_count:     Optional[int] = None
    cycle_length_days: Optional[int] = None
    status:            Optional[str] = None
    notes:             Optional[str] = None


class BatchOut(OrmBase):
    id:                int
    batch_no:          str
    house_id:          int
    farm_id:           int
    breed_id:          Optional[int]
    placed_date:       date
    initial_count:     int
    cycle_length_days: int
    status:            str
    notes:             Optional[str]
    created_at:        datetime


class BatchSummaryRow(BaseModel):
    """Row from v_batch_summary view."""
    id:               int
    batch_no:         str
    house_id:         int
    breed_id:         Optional[int]
    house:            str
    farm:             str
    breed:            Optional[str]
    placed_date:      date
    initial_count:    int
    age_days:         int
    cycle_length_days: int
    status:           str
    current_count:    int
    mortality_pct:    float
    total_feed_kg:    float
    fcr:              float
    avg_weight_g:     Optional[int]


# ── Daily Logs ───────────────────────────────────────────────────────────────

class DailyLogCreate(BaseModel):
    log_date:        date
    current_count:   int
    mortality_count: int = 0
    avg_weight_g:    Optional[int] = None
    culls:           int = 0
    notes:           Optional[str] = None


class DailyLogOut(OrmBase):
    id:              int
    batch_id:        int
    log_date:        date
    current_count:   int
    mortality_count: int
    avg_weight_g:    Optional[int]
    culls:           int
    notes:           Optional[str]
    created_at:      datetime
    recorded_by:     Optional[int] = None


class DailyLogUpdate(BaseModel):
    log_date:        Optional[date] = None
    current_count:   Optional[int] = None
    mortality_count: Optional[int] = None
    avg_weight_g:    Optional[int] = None
    culls:           Optional[int] = None
    notes:           Optional[str] = None


# ── Feed ─────────────────────────────────────────────────────────────────────

class FeedTypeOut(OrmBase):
    id:                int
    name:              str
    name_ar:           Optional[str]
    protein_pct:       Optional[Decimal]
    energy_kcal:       Optional[int]
    unit:              str
    inventory_item_id: Optional[int] = None


class FeedStockRow(BaseModel):
    """Row from v_feed_stock_status view joined with feed_types."""
    id:                      int
    name:                    str
    name_ar:                 Optional[str]
    qty_on_hand_kg:          float
    reorder_qty_kg:          float
    avg_daily_kg:            float
    days_remaining:          Optional[int]
    stock_status:            str
    inventory_item_id:       Optional[int]   = None
    inventory_item_name:     Optional[str]   = None


class FeedTypeCreate(BaseModel):
    name:        str
    unit:        str = "kg"
    protein_pct: Optional[Decimal] = None
    energy_kcal: Optional[int] = None


class FeedTypePatch(BaseModel):
    inventory_item_id: Optional[int] = None


class FeedPurchaseCreate(BaseModel):
    feed_type_id:  int
    supplier_id:   Optional[int] = None
    purchase_date: date
    qty_kg:        Decimal
    cost_per_kg:   Decimal
    received_date: Optional[date] = None
    invoice_no:    Optional[str]  = None
    notes:         Optional[str]  = None


class FeedPurchaseOut(OrmBase):
    id:            int
    feed_type_id:  int
    purchase_date: date
    qty_kg:        Decimal
    cost_per_kg:   Decimal
    invoice_no:    Optional[str]
    created_at:    datetime


class FeedPurchaseRow(BaseModel):
    id:            int
    purchase_date: date
    feed_type:     str
    supplier:      Optional[str]
    qty_kg:        float
    cost_per_kg:   float
    total_cost:    float
    invoice_no:    Optional[str]


class FeedIssueCreate(BaseModel):
    batch_id:     int
    house_id:     int
    feed_type_id: int
    issue_date:   date
    qty_kg:       Decimal
    fcr_snapshot: Optional[Decimal] = None


class FeedIssueOut(OrmBase):
    id:           int
    batch_id:     int
    house_id:     int
    feed_type_id: int
    issue_date:   date
    qty_kg:       Decimal
    fcr_snapshot: Optional[Decimal]
    created_at:   datetime


class FeedIssueRow(BaseModel):
    id:           int
    date:         date
    batch:        str
    house:        str
    feed_type:    str
    qty_kg:       float
    fcr_snapshot: Optional[float]
    recorded_by:  Optional[str]


# ── Mortality ────────────────────────────────────────────────────────────────

class MortalityCreate(BaseModel):
    batch_id:          int
    house_id:          int
    record_date:       date
    count:             int   = 1
    chicken_weight_kg: Optional[float] = None
    cause:             str   = "unknown"
    cause_notes:       Optional[str] = None


class MortalityUpdate(BaseModel):
    record_date:       Optional[date]  = None
    count:             Optional[int]   = None
    chicken_weight_kg: Optional[float] = None
    cause:             Optional[str]   = None
    cause_notes:       Optional[str]   = None


class MortalityOut(OrmBase):
    id:                int
    batch_id:          int
    house_id:          int
    record_date:       date
    count:             int
    chicken_weight_kg: Optional[float]
    cause:             str
    cause_notes:       Optional[str]
    created_at:        datetime


class MortalityRow(BaseModel):
    id:                int
    batch_id:          int
    date:              date
    batch:             str
    house:             str
    count:             int
    chicken_weight_kg: Optional[float]
    cause:             str
    cause_notes:       Optional[str]
    recorded_by:       Optional[str]


class MortalityRate7d(BaseModel):
    batch_id:          int
    batch_no:          str
    house:             str
    total_deaths_7d:   int
    current_count:     Optional[int]
    mortality_rate_pct: float


# ── Health ───────────────────────────────────────────────────────────────────

class MedicationOut(OrmBase):
    id:              int
    name:            str
    name_ar:         Optional[str]
    category:        str
    unit:            str
    withdrawal_days: int


class VaccinationCreate(BaseModel):
    batch_id:       int
    vaccine_id:     int
    scheduled_date: date
    route:          str = "water"
    dose_per_bird:  Optional[str] = None
    notes:          Optional[str] = None


class VaccinationOut(OrmBase):
    id:             int
    batch_id:       int
    vaccine_id:     int
    scheduled_date: date
    completed_date: Optional[date]
    route:          str
    status:         str
    dose_per_bird:  Optional[str]
    notes:          Optional[str]
    created_by:     Optional[int] = None


class VaccinationStatusUpdate(BaseModel):
    status:         str
    completed_date: Optional[date] = None


class VaccinationUpdate(BaseModel):
    vaccine_id:     Optional[int]  = None
    scheduled_date: Optional[date] = None
    route:          Optional[str]  = None
    dose_per_bird:  Optional[str]  = None
    notes:          Optional[str]  = None
    status:         Optional[str]  = None
    completed_date: Optional[date] = None


class HealthEventCreate(BaseModel):
    batch_id:    int
    event_type:  str
    event_date:  date
    description: Optional[str] = None
    status:      str = "done"
    notes:       Optional[str] = None


class HealthEventOut(OrmBase):
    id:          int
    batch_id:    int
    event_type:  str
    event_date:  date
    description: Optional[str]
    status:      str
    notes:       Optional[str]
    created_at:  datetime


class TreatmentCreate(BaseModel):
    batch_id:            int
    medication_id:       int
    start_date:          date
    end_date:            Optional[date] = None
    dosage_per_bird:     Optional[str] = None
    withdrawal_end_date: Optional[date] = None
    diagnosis:           Optional[str] = None
    prescribed_by:       Optional[str] = None
    notes:               Optional[str] = None


class TreatmentOut(OrmBase):
    id:                  int
    batch_id:            int
    medication_id:       int
    start_date:          date
    end_date:            Optional[date]
    dosage_per_bird:     Optional[str]
    withdrawal_end_date: Optional[date]
    diagnosis:           Optional[str]
    prescribed_by:       Optional[str]


class UpcomingVaccination(BaseModel):
    id:             int
    batch_no:       str
    house:          str
    vaccine:        str
    scheduled_date: date
    days_until:     int
    route:          str
    status:         str


# ── Inventory ────────────────────────────────────────────────────────────────

class InventoryCategoryCreate(BaseModel):
    name:    str
    name_ar: Optional[str] = None

class InventoryCategoryOut(OrmBase):
    id:      int
    name:    str
    name_ar: Optional[str]


class InventoryItemCreate(BaseModel):
    farm_id:       int
    category_id:   int
    name:          str
    name_ar:       Optional[str] = None
    sku:           Optional[str] = None
    unit:          str = "pcs"
    qty_on_hand:   Decimal = Decimal("0")
    reorder_level: Decimal = Decimal("0")
    cost_per_unit: Optional[Decimal] = None
    expiry_date:   Optional[date] = None
    brand:         Optional[str] = None
    remarks:       Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name:          Optional[str] = None
    qty_on_hand:   Optional[Decimal] = None
    reorder_level: Optional[Decimal] = None
    cost_per_unit: Optional[Decimal] = None
    expiry_date:   Optional[date] = None
    brand:         Optional[str] = None
    remarks:       Optional[str] = None


class InventoryItemOut(OrmBase):
    id:            int
    farm_id:       int
    category_id:   int
    name:          str
    name_ar:       Optional[str]
    sku:           Optional[str]
    unit:          str
    qty_on_hand:   Decimal
    qty_reserved:  Decimal
    qty_available: float
    reorder_level: Decimal
    cost_per_unit: Optional[Decimal]
    expiry_date:   Optional[date]
    brand:         Optional[str]
    remarks:       Optional[str]
    last_updated:  Optional[datetime]
    status:        str


class ReservePayload(BaseModel):
    qty:    Decimal
    reason: Optional[str] = None


class MovementCreate(BaseModel):
    item_id:        int
    movement_type:  str
    qty:            Decimal
    reference_type: str
    notes:          Optional[str] = None


class MovementOut(OrmBase):
    id:             int
    item_id:        int
    movement_type:  str
    qty:            Decimal
    reference_type: str
    notes:          Optional[str]
    created_at:     datetime


# ── Suppliers ────────────────────────────────────────────────────────────────

class SupplierOut(OrmBase):
    id:           int
    name:         str
    name_ar:      Optional[str]
    contact_name: Optional[str]
    phone:        Optional[str]
    is_active:    bool


class SupplierCreate(BaseModel):
    name:         str
    contact_name: Optional[str] = None
    phone:        Optional[str] = None
    email:        Optional[str] = None
    address:      Optional[str] = None


# ── Sales ────────────────────────────────────────────────────────────────────

class BuyerCreate(BaseModel):
    name:         str
    name_ar:      Optional[str] = None
    contact_name: Optional[str] = None
    phone:        Optional[str] = None
    email:        Optional[str] = None
    address:      Optional[str] = None


class BuyerOut(OrmBase):
    id:           int
    name:         str
    name_ar:      Optional[str]
    contact_name: Optional[str]
    phone:        Optional[str]
    is_active:    bool


class SalesOrderCreate(BaseModel):
    order_no:      str
    batch_id:      int
    buyer_id:      Optional[int] = None
    order_date:    date
    delivery_date: Optional[date] = None
    qty_kg:        Decimal
    price_per_kg:  Decimal
    notes:         Optional[str] = None


class SalesOrderUpdate(BaseModel):
    status:         Optional[str] = None
    payment_status: Optional[str] = None
    delivery_date:  Optional[date] = None


class SalesOrderOut(OrmBase):
    id:             int
    order_no:       str
    batch_id:       int
    buyer_id:       Optional[int]
    order_date:     date
    delivery_date:  Optional[date]
    qty_kg:         Decimal
    price_per_kg:   Decimal
    total_amount:   Decimal
    status:         str
    payment_status: str
    notes:          Optional[str]
    created_at:     datetime


class SalesOrderRow(BaseModel):
    id:               int
    batch_id:         int
    order_no:         str
    date:             date
    batch:            str
    buyer:            Optional[str]
    qty_kg:           float
    price_per_kg:     float
    total_amount:     float
    status:           str
    payment_status:   str
    approved_by_name: Optional[str]


class ApprovalAction(BaseModel):
    rejection_reason: Optional[str] = None


# ── Expenses ─────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    batch_id:     Optional[int] = None
    farm_id:      int
    category:     str
    amount:       Decimal
    expense_date: date
    description:  Optional[str] = None


class ExpenseOut(OrmBase):
    id:           int
    batch_id:     Optional[int]
    farm_id:      int
    category:     str
    amount:       Decimal
    expense_date: date
    description:  Optional[str]
    created_at:   datetime


# ── Maintenance Logs ─────────────────────────────────────────────────────────

class MaintenanceLogCreate(BaseModel):
    house_id:        int
    farm_id:         int
    log_date:        date
    category:        str
    description:     Optional[str] = None
    cost:            Decimal = Decimal("0")
    status:          str = "pending"
    batch_allocated: bool = False


class MaintenanceLogUpdate(BaseModel):
    log_date:        Optional[date] = None
    category:        Optional[str]  = None
    description:     Optional[str]  = None
    cost:            Optional[Decimal] = None
    status:          Optional[str]  = None
    batch_allocated: Optional[bool] = None


class MaintenanceLogOut(OrmBase):
    id:              int
    house_id:        int
    farm_id:         int
    log_date:        date
    category:        str
    description:     Optional[str]
    cost:            Decimal
    status:          str
    batch_allocated: bool
    batch_id:        Optional[int]
    expense_id:      Optional[int]
    created_at:      datetime


# ── Alerts ───────────────────────────────────────────────────────────────────

class AlertOut(OrmBase):
    id:         int
    farm_id:    int
    alert_type: str
    severity:   str
    batch_id:   Optional[int]
    message:    str
    is_read:    bool
    created_at: datetime


# ── Reports ──────────────────────────────────────────────────────────────────

class BatchPnL(BaseModel):
    batch_id:       int
    batch_no:       str
    house:          str
    total_revenue:  float
    feed_cost:      float
    other_expenses: float
    gross_profit:   float


# ── Harvest ───────────────────────────────────────────────────────────────────

class HarvestCreate(BaseModel):
    harvest_date:    date
    birds_harvested: int
    total_weight_kg: float
    price_per_kg:    float
    buyer_name:      Optional[str] = None
    notes:           Optional[str] = None


class HarvestUpdate(BaseModel):
    harvest_date:    Optional[date]  = None
    birds_harvested: Optional[int]   = None
    total_weight_kg: Optional[float] = None
    price_per_kg:    Optional[float] = None
    buyer_name:      Optional[str]   = None
    notes:           Optional[str]   = None


class HarvestOut(OrmBase):
    id:              int
    batch_id:        int
    harvest_date:    date
    birds_harvested: int
    total_weight_kg: float
    price_per_kg:    float
    total_revenue:   float
    buyer_name:      Optional[str]
    notes:           Optional[str]
    created_at:      datetime


class HarvestPnL(BaseModel):
    harvest:             HarvestOut
    revenue:             float
    total_expenses:      float
    expense_detail:      dict
    mortality_deaths:    int
    mortality_weight_kg: float


# ── Purchase Orders ───────────────────────────────────────────────────────────

class POItemCreate(BaseModel):
    item_id:     int
    qty_ordered: Decimal
    unit_price:  Decimal


class PurchaseOrderCreate(BaseModel):
    farm_id:       int
    supplier_id:   Optional[int] = None
    order_date:    date
    expected_date: Optional[date] = None
    total_amount:  Optional[Decimal] = None
    notes:         Optional[str] = None
    items:         List[POItemCreate] = []


class SyncInventoryPayload(BaseModel):
    items: List[POItemCreate]


class PurchaseOrderUpdate(BaseModel):
    supplier_id:   Optional[int] = None
    expected_date: Optional[date] = None
    total_amount:  Optional[Decimal] = None
    notes:         Optional[str] = None
    status:        Optional[str] = None


class PurchaseOrderRow(BaseModel):
    id:               int
    po_no:            Optional[str]
    order_date:       date
    expected_date:    Optional[date]
    supplier:         Optional[str]
    total_amount:     Optional[float]
    status:           str
    approved_by_name: Optional[str]
    notes:            Optional[str]
