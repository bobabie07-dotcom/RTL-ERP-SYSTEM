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
    company_id:     Optional[int] = None
    full_name:      str
    email:          str
    username:       Optional[str]
    farm_id:        Optional[int]
    role_id:        int
    department:     Optional[str]
    phone:          Optional[str]
    is_active:      bool
    is_first_login: bool
    status:         str = "active"
    created_at:     datetime
    all_role_ids:   list[int] = []


class UserCreate(BaseModel):
    full_name:    str
    email:        str
    username:     Optional[str] = None
    role_id:      int = 3
    company_id:   Optional[int] = 1
    farm_ids:     List[int] = []
    department:   Optional[str] = None
    position:     Optional[str] = None
    phone:        Optional[str] = None
    is_active:    bool = True


class UserUpdate(BaseModel):
    full_name:   Optional[str] = None
    email:       Optional[str] = None
    username:    Optional[str] = None
    employee_id: Optional[str] = None
    role_id:     Optional[int] = None
    company_id:  Optional[int] = None
    farm_ids:    Optional[List[int]] = None
    department:  Optional[str] = None
    position:    Optional[str] = None
    phone:       Optional[str] = None
    is_active:   Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str


class FirstPasswordRequest(BaseModel):
    new_password:     str
    confirm_password: str


# ── User Management Extended ──────────────────────────────────────────────────

class RoleOut(OrmBase):
    id:          int
    name:        str
    name_ar:     str
    description: Optional[str]
    permissions: dict
    is_active:   bool
    created_at:  Optional[datetime]


class RoleCreate(BaseModel):
    name:        str
    name_ar:     str
    description: Optional[str] = None
    permissions: dict = {}
    is_active:   bool = True


class RoleUpdate(BaseModel):
    name:        Optional[str] = None
    name_ar:     Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[dict] = None
    is_active:   Optional[bool] = None


class UserRoleAssign(BaseModel):
    role_ids: list[int]


class StatusChangePayload(BaseModel):
    status: str
    notes:  Optional[str] = None


class LoginHistoryOut(OrmBase):
    id:             int
    user_id:        int
    success:        bool
    ip_address:     Optional[str]
    user_agent:     Optional[str]
    failure_reason: Optional[str]
    created_at:     datetime


class UserAuditLogOut(OrmBase):
    id:             int
    target_user_id: int
    action_type:    str
    old_value:      Optional[str]
    new_value:      Optional[str]
    performed_by:   int
    actor_name:     Optional[str] = None
    ip_address:     Optional[str]
    notes:          Optional[str]
    created_at:     datetime


class UserDetailOut(OrmBase):
    id:                      int
    employee_id:             Optional[str]
    full_name:               str
    email:                   str
    username:                Optional[str]
    farm_id:                 Optional[int]
    role_id:                 int
    department:              Optional[str]
    position:                Optional[str]
    phone:                   Optional[str]
    status:                  str
    is_active:               bool
    is_first_login:          bool
    failed_login_count:      int = 0
    last_login_at:           Optional[datetime]
    last_password_change_at: Optional[datetime]
    created_at:              datetime
    updated_at:              Optional[datetime]
    created_by:              Optional[int]
    updated_by:              Optional[int]
    role_name:               Optional[str] = None
    all_role_ids:            list[int] = []
    all_role_names:          list[str] = []
    farm_ids:                List[int] = []


# ── Support Tickets ───────────────────────────────────────────────────────────

TICKET_CATEGORIES = [
    "login_problem", "account_issue", "inventory_issue", "procurement_issue",
    "sales_issue", "report_issue", "dashboard_issue", "button_not_working",
    "data_not_saving", "calculation_issue", "permission_issue", "system_error",
    "feature_request", "other",
    # legacy values kept for backward compat
    "bug", "access_request", "general",
]

TICKET_STATUSES = [
    "new", "assigned", "in_progress", "waiting_for_user",
    "resolved", "closed", "reopened", "cancelled", "escalated",
    # legacy
    "open", "waiting_on_user",
]


class TicketCreate(BaseModel):
    subject:         str
    category:        str = "other"
    priority:        str = "medium"
    description:     str
    affected_module: Optional[str] = None
    contact_info:    Optional[str] = None
    department:      Optional[str] = None


class TicketUpdate(BaseModel):
    status:           Optional[str] = None
    assigned_to:      Optional[int] = None
    resolution_notes: Optional[str] = None
    priority:         Optional[str] = None
    escalation_notes: Optional[str] = None


class TicketAssign(BaseModel):
    user_id: Optional[int] = None


class TicketStatusChange(BaseModel):
    status: str
    notes:  Optional[str] = None


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


class TicketActivityLogOut(BaseModel):
    id:           int
    ticket_id:    int
    action_type:  str
    old_value:    Optional[str]
    new_value:    Optional[str]
    performed_by: int
    actor_name:   Optional[str] = None
    notes:        Optional[str]
    created_at:   datetime


class TicketOut(OrmBase):
    id:               int
    ticket_no:        str
    user_id:          int
    farm_id:          Optional[int]
    subject:          str
    category:         str
    priority:         str
    description:      str
    status:           str
    affected_module:  Optional[str]
    contact_info:     Optional[str]
    department:       Optional[str]
    assigned_to:      Optional[int]
    resolution_notes: Optional[str]
    escalation_notes: Optional[str]
    created_at:       datetime
    updated_at:       datetime
    resolved_at:      Optional[datetime]
    closed_at:        Optional[datetime]
    escalated_at:     Optional[datetime]
    submitter_name:   Optional[str] = None
    assignee_name:    Optional[str] = None


class TicketDetailOut(TicketOut):
    comments: list[TicketCommentOut]       = []
    activity: list[TicketActivityLogOut]   = []


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
    farm_type: str


class FarmCreate(BaseModel):
    name:     str
    name_ar:  Optional[str] = None
    location: Optional[str] = None
    farm_type: str = "broiler"


class FarmUpdate(BaseModel):
    name:     Optional[str] = None
    name_ar:  Optional[str] = None
    location: Optional[str] = None
    farm_type: Optional[str] = None


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
    batch_no:            str
    house_id:            int
    farm_id:             int
    breed_id:            Optional[int]   = None
    placed_date:         date
    initial_count:       int
    cycle_length_days:   int             = 42
    chick_cost_per_head: Optional[float] = None
    chick_supplier_id:   Optional[int]   = None
    notes:               Optional[str]   = None


class BatchUpdate(BaseModel):
    house_id:            Optional[int]   = None
    breed_id:            Optional[int]   = None
    placed_date:         Optional[date]  = None
    initial_count:       Optional[int]   = None
    cycle_length_days:   Optional[int]   = None
    chick_cost_per_head: Optional[float] = None
    chick_supplier_id:   Optional[int]   = None
    status:              Optional[str]   = None
    notes:               Optional[str]   = None


class BatchOut(OrmBase):
    id:                  int
    batch_no:            str
    house_id:            int
    farm_id:             int
    breed_id:            Optional[int]
    placed_date:         date
    initial_count:       int
    cycle_length_days:   int
    chick_cost_per_head: Optional[float]
    chick_supplier_id:   Optional[int]
    status:              str
    notes:               Optional[str]
    created_at:          datetime


class BatchSummaryRow(BaseModel):
    """Row from v_batch_summary view."""
    id:                  int
    batch_no:            str
    house_id:            int
    breed_id:            Optional[int]
    house:               str
    farm:                str
    breed:               Optional[str]
    placed_date:         date
    initial_count:       int
    age_days:            int
    cycle_length_days:   int
    chick_cost_per_head: Optional[float] = None
    chick_supplier_id:   Optional[int]   = None
    status:              str
    current_count:       int
    mortality_pct:       float
    total_feed_kg:       float
    fcr:                 float
    avg_weight_g:        Optional[float]


# ── Daily Logs ───────────────────────────────────────────────────────────────

class DailyLogCreate(BaseModel):
    log_date:        date
    current_count:   int
    mortality_count: int = 0
    avg_weight_g:    Optional[float] = None
    culls:           int = 0
    notes:           Optional[str] = None


class DailyLogOut(OrmBase):
    id:              int
    batch_id:        int
    log_date:        date
    current_count:   int
    mortality_count: int
    avg_weight_g:    Optional[float]
    culls:           int
    notes:           Optional[str]
    created_at:      datetime
    recorded_by:     Optional[int] = None


class DailyLogUpdate(BaseModel):
    log_date:        Optional[date] = None
    current_count:   Optional[int] = None
    mortality_count: Optional[int] = None
    avg_weight_g:    Optional[float] = None
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
    feed_type:     Optional[str]
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
    batch_id:     int
    house_id:     int
    feed_type_id: int
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

class MedicationCreate(BaseModel):
    name:            str
    category:        str = "vaccine"
    unit:            str = "ml"
    withdrawal_days: int = 0
    notes:           Optional[str] = None


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
    route:          str            = "water"
    dose_per_bird:  Optional[str]  = None
    cost_per_dose:  Optional[float] = None
    total_cost:     Optional[float] = None
    notes:          Optional[str]  = None


class VaccinationOut(OrmBase):
    id:             int
    batch_id:       int
    vaccine_id:     int
    scheduled_date: date
    completed_date: Optional[date]
    route:          str
    status:         str
    dose_per_bird:  Optional[str]
    cost_per_dose:  Optional[float] = None
    total_cost:     Optional[float] = None
    notes:          Optional[str]
    created_by:     Optional[int] = None


class VaccinationStatusUpdate(BaseModel):
    status:         str
    completed_date: Optional[date] = None


class VaccinationUpdate(BaseModel):
    vaccine_id:     Optional[int]   = None
    scheduled_date: Optional[date]  = None
    route:          Optional[str]   = None
    dose_per_bird:  Optional[str]   = None
    cost_per_dose:  Optional[float] = None
    total_cost:     Optional[float] = None
    notes:          Optional[str]   = None
    status:         Optional[str]   = None
    completed_date: Optional[date]  = None


class HealthEventCreate(BaseModel):
    batch_id:    int
    event_type:  str
    event_date:  date
    description: Optional[str]   = None
    cost:        Optional[float]  = None
    status:      str              = "done"
    notes:       Optional[str]   = None


class HealthEventOut(OrmBase):
    id:          int
    batch_id:    int
    event_type:  str
    event_date:  date
    description: Optional[str]
    cost:        Optional[float] = None
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
    supplier_id:   Optional[int]     = None
    batch_id:      Optional[int]     = None
    order_date:    date
    expected_date: Optional[date]    = None
    total_amount:  Optional[Decimal] = None
    notes:         Optional[str]     = None
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
    batch_id:         Optional[int]  = None
    batch:            Optional[str]  = None
    total_amount:     Optional[float]
    status:           str
    approved_by_name: Optional[str]
    notes:            Optional[str]


# ── Batch Finance ─────────────────────────────────────────────────────────────

class BatchExpenseCreate(BaseModel):
    expense_date:  date
    category_code: str
    amount:        float
    qty:           Optional[float] = None
    unit:          Optional[str]   = None
    unit_cost:     Optional[float] = None
    description:   Optional[str]  = None


class BatchExpenseRow(BaseModel):
    id:            int
    batch_id:      int
    expense_date:  date
    category_code: str
    category_name: str
    amount:        float
    qty:           Optional[float]
    unit:          Optional[str]
    unit_cost:     Optional[float]
    description:   Optional[str]
    source_module: Optional[str]
    source_ref:    Optional[str]
    is_voided:     bool
    void_reason:   Optional[str]
    created_at:    datetime


class BatchRevenueCreate(BaseModel):
    revenue_date: date
    category:     str   = "SALES"
    amount:       float
    qty_kg:       Optional[float] = None
    qty_birds:    Optional[int]   = None
    price_per_kg: Optional[float] = None
    description:  Optional[str]  = None


class BatchRevenueRow(BaseModel):
    id:             int
    batch_id:       int
    revenue_date:   date
    category:       str
    amount:         float
    qty_kg:         Optional[float]
    qty_birds:      Optional[int]
    price_per_kg:   Optional[float]
    description:    Optional[str]
    sales_order_id: Optional[int]
    is_voided:      bool
    created_at:     datetime


# ── Egg Schemas ──────────────────────────────────────────────────────────────

class EggCollectionCreate(BaseModel):
    batch_id: int
    house_id: int
    collect_date: date
    total_collected: int
    cracked_count: int = 0
    defect_summary: Optional[dict] = None  # {good,cracked,soft_shell,double_yolk,dirty,misshaped}
    feed_water_log: Optional[dict] = None  # {feed_kg,water_liters,temperature,humidity}
    notes: Optional[str] = None


class EggCollectionOut(OrmBase):
    id: int
    company_id: int
    farm_id: int
    batch_id: int
    house_id: int
    collect_date: date
    total_collected: int
    cracked_count: int
    defect_summary: Optional[dict] = None
    feed_water_log: Optional[dict] = None
    notes: Optional[str]
    created_at: datetime


class EggGradingCreate(BaseModel):
    collection_id: int
    size_peewee: int = 0
    size_s: int = 0
    size_m: int = 0
    size_l: int = 0
    size_xl: int = 0
    size_jumbo: int = 0
    dirty_count: int = 0
    graded_date: date


class EggGradingOut(OrmBase):
    id: int
    company_id: int
    farm_id: int
    collection_id: int
    size_peewee: int = 0
    size_s: int
    size_m: int
    size_l: int
    size_xl: int
    size_jumbo: int
    dirty_count: int
    graded_date: date
    created_at: datetime


class EggInventoryOut(OrmBase):
    id: int
    company_id: int
    farm_id: int
    size: str
    stock_qty: int
    updated_at: datetime


class EggSalesOrderCreate(BaseModel):
    buyer_id: Optional[int] = None
    order_date: date
    size: str
    qty_packages: int
    package_type: str = "tray"
    price_per_package: float
    notes: Optional[str] = None


class EggSalesOrderOut(OrmBase):
    id: int
    company_id: int
    farm_id: int
    order_no: str
    buyer_id: Optional[int]
    order_date: date
    size: str
    qty_packages: int
    package_type: str
    total_eggs: int
    price_per_package: float
    total_amount: float
    status: str
    payment_status: str
    notes: Optional[str]
    created_by: Optional[int]
    created_at: datetime



class VoidRequest(BaseModel):
    void_reason: Optional[str] = None


# ── Spent Hen Schemas ─────────────────────────────────────────────────────────

class SpentHenSaleCreate(BaseModel):
    sale_date:      date
    buyer_id:       Optional[int] = None
    batch_id:       Optional[int] = None
    birds_sold:     int
    avg_weight_kg:  Optional[float] = None
    price_per_kg:   float
    transport_cost: float = 0.0
    payment_status: str = "unpaid"
    notes:          Optional[str] = None


class SpentHenSaleUpdate(BaseModel):
    sale_date:      Optional[date] = None
    buyer_id:       Optional[int] = None
    birds_sold:     Optional[int] = None
    avg_weight_kg:  Optional[float] = None
    price_per_kg:   Optional[float] = None
    transport_cost: Optional[float] = None
    payment_status: Optional[str] = None
    notes:          Optional[str] = None


class SpentHenSaleOut(OrmBase):
    id:              int
    company_id:      int
    farm_id:         int
    batch_id:        Optional[int]
    sale_date:       date
    buyer_id:        Optional[int]
    birds_sold:      int
    avg_weight_kg:   Optional[float]
    total_weight_kg: Optional[float]
    price_per_kg:    float
    transport_cost:  Optional[float]
    total_amount:    float
    payment_status:  str
    notes:           Optional[str]
    created_by:      Optional[int]
    created_at:      datetime


# ── Layer Dashboard KPI ───────────────────────────────────────────────────────

class LayerDashboardKPI(BaseModel):
    # Flock summary
    total_flocks:         int
    active_flocks:        int
    initial_birds:        int
    total_live_birds:     int
    spent_hen_count:      int

    # Mortality & livability
    mortality_count:      int
    mortality_pct:        float
    culling_count:        int
    culling_pct:          float
    livability_pct:       float
    mortality_rate_7d:    float

    # Today's egg production
    today_eggs:           int
    today_saleable:       int
    today_trays:          float
    hen_day_pct:          float
    hen_housed_pct:       float
    avg_eggs_per_hen:     float

    # Feed & Water (today)
    feed_consumed_kg:     Optional[float]
    water_consumed_l:     Optional[float]
    feed_per_bird:        Optional[float]
    water_per_bird:       Optional[float]

    # Production trends
    avg_7d_eggs:          float
    avg_30d_eggs:         float

    # Defect metrics (7-day window)
    defect_rate:          float

    # Grade & defect distributions (7-day, percentages)
    grade_distribution:   dict
    defect_distribution:  dict

    # Inventory
    total_egg_inventory:  int

    # Sales
    month_sales_amount:   float
    today_sales_revenue:  float
    spent_hen_revenue:    float

    # Feed stock
    feed_stock_days:      Optional[float]

    # Alerts
    pending_vaccinations: int
    unread_alerts:        int
