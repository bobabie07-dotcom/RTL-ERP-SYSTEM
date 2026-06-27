from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, JSON, Numeric, SmallInteger, String, Text,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


# ── Auth & Organisation ──────────────────────────────────────────────────────

class Role(Base):
    __tablename__ = "roles"

    id          = Column(SmallInteger, primary_key=True, autoincrement=True)
    name        = Column(String(50), nullable=False, unique=True)
    name_ar     = Column(String(100), nullable=False)
    permissions = Column(JSON, nullable=False, default=dict)

    users: list[User] = relationship("User", back_populates="role")


class Farm(Base):
    __tablename__ = "farms"

    id         = Column(SmallInteger, primary_key=True, autoincrement=True)
    name       = Column(String(100), nullable=False)
    name_ar    = Column(String(200))
    location   = Column(String(255))
    created_at = Column(DateTime, default=func.now())

    users:   list[User]   = relationship("User",  back_populates="farm")
    houses:  list[House]  = relationship("House", back_populates="farm")
    batches: list[Batch]  = relationship("Batch", back_populates="farm")


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    farm_id         = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    role_id         = Column(SmallInteger, ForeignKey("roles.id"), nullable=False)
    full_name       = Column(String(150), nullable=False)
    email           = Column(String(150), nullable=False, unique=True)
    username        = Column(String(50), unique=True, nullable=True)
    password_hash   = Column(String(255), nullable=False)
    department      = Column(String(100), nullable=True)
    phone           = Column(String(50), nullable=True)
    is_active       = Column(Boolean, nullable=False, default=True)
    is_first_login  = Column(Boolean, nullable=False, default=False)
    created_at      = Column(DateTime, default=func.now())

    farm: Farm = relationship("Farm", back_populates="users")
    role: Role = relationship("Role", back_populates="users")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    ticket_no        = Column(String(20), unique=True, nullable=False)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    farm_id          = Column(Integer, nullable=True)
    subject          = Column(String(255), nullable=False)
    category         = Column(Enum("bug", "access_request", "feature_request", "general"), nullable=False, default="general")
    priority         = Column(Enum("low", "medium", "high", "critical"), nullable=False, default="medium")
    description      = Column(Text, nullable=False)
    status           = Column(Enum("open", "in_progress", "waiting_on_user", "resolved", "closed"), nullable=False, default="open")
    assigned_to      = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())
    resolved_at      = Column(DateTime, nullable=True)

    submitter = relationship("User", foreign_keys=[user_id])
    assignee  = relationship("User", foreign_keys=[assigned_to])
    comments  = relationship("TicketComment", back_populates="ticket", order_by="TicketComment.created_at")


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id   = Column(Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment     = Column(Text, nullable=False)
    is_internal = Column(Boolean, nullable=False, default=False)
    created_at  = Column(DateTime, default=func.now())

    ticket = relationship("SupportTicket", back_populates="comments")
    author = relationship("User")


# ── Flocks / Batches ─────────────────────────────────────────────────────────

class House(Base):
    __tablename__ = "houses"

    id         = Column(SmallInteger, primary_key=True, autoincrement=True)
    farm_id    = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    name       = Column(String(50), nullable=False)
    capacity   = Column(Integer, nullable=False, default=0)
    house_type = Column(Enum("layer", "broiler", "breeder", "dekalb_white"), nullable=False, default="broiler")
    is_active  = Column(Boolean, nullable=False, default=True)

    farm:              Farm              = relationship("Farm",    back_populates="houses")
    batches:           list[Batch]       = relationship("Batch",   back_populates="house")
    maintenance_logs:  list["MaintenanceLog"] = relationship("MaintenanceLog", back_populates="house")


class Breed(Base):
    __tablename__ = "breeds"

    id                  = Column(SmallInteger, primary_key=True, autoincrement=True)
    name                = Column(String(100), nullable=False)
    type                = Column(Enum("broiler", "layer", "dual"), nullable=False)
    target_fcr          = Column(Numeric(4, 2))
    target_daily_gain_g = Column(SmallInteger)
    laying_peak_pct     = Column(Numeric(5, 2))

    batches: list[Batch] = relationship("Batch", back_populates="breed")


class Batch(Base):
    __tablename__ = "batches"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    batch_no          = Column(String(30), nullable=False, unique=True)
    house_id          = Column(SmallInteger, ForeignKey("houses.id"), nullable=False)
    farm_id           = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    breed_id          = Column(SmallInteger, ForeignKey("breeds.id"))
    placed_date       = Column(Date, nullable=False)
    initial_count     = Column(Integer, nullable=False)
    cycle_length_days = Column(SmallInteger, nullable=False, default=42)
    status            = Column(
        Enum("active", "harvest_soon", "harvested", "terminated"),
        nullable=False, default="active",
    )
    notes      = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    house:      House              = relationship("House",  back_populates="batches")
    farm:       Farm               = relationship("Farm",   back_populates="batches")
    breed:      Optional[Breed]    = relationship("Breed",  back_populates="batches")
    daily_logs: list[BatchDailyLog] = relationship("BatchDailyLog", back_populates="batch", order_by="BatchDailyLog.log_date")
    feed_issues: list[FeedIssue]   = relationship("FeedIssue",  back_populates="batch")
    mortality:  list[MortalityRecord] = relationship("MortalityRecord", back_populates="batch")
    vaccinations: list[VaccinationSchedule] = relationship("VaccinationSchedule", back_populates="batch")
    health_events: list[HealthEvent] = relationship("HealthEvent", back_populates="batch")
    treatments: list[Treatment]    = relationship("Treatment", back_populates="batch")
    sales:      list[SalesOrder]   = relationship("SalesOrder", back_populates="batch")
    expenses:   list[Expense]      = relationship("Expense", back_populates="batch")
    harvest_record: Optional['HarvestRecord'] = relationship("HarvestRecord", back_populates="batch", uselist=False)


class BatchDailyLog(Base):
    __tablename__ = "batch_daily_logs"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    batch_id        = Column(Integer, ForeignKey("batches.id"), nullable=False)
    log_date        = Column(Date, nullable=False)
    current_count   = Column(Integer, nullable=False)
    mortality_count = Column(SmallInteger, nullable=False, default=0)
    avg_weight_g    = Column(SmallInteger)
    culls           = Column(SmallInteger, nullable=False, default=0)
    notes           = Column(Text)
    recorded_by     = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime, default=func.now())

    batch: Batch = relationship("Batch", back_populates="daily_logs")


# ── Feed ─────────────────────────────────────────────────────────────────────

class FeedType(Base):
    __tablename__ = "feed_types"

    id                 = Column(SmallInteger, primary_key=True, autoincrement=True)
    name               = Column(String(100), nullable=False)
    name_ar            = Column(String(200))
    protein_pct        = Column(Numeric(5, 2))
    energy_kcal        = Column(SmallInteger)
    unit               = Column(Enum("kg", "ton"), nullable=False, default="kg")
    notes              = Column(Text)
    inventory_item_id  = Column(Integer, nullable=True)

    stock:     Optional[FeedStock]   = relationship("FeedStock",    back_populates="feed_type", uselist=False)
    purchases: list[FeedPurchase]    = relationship("FeedPurchase", back_populates="feed_type")
    issues:    list[FeedIssue]       = relationship("FeedIssue",    back_populates="feed_type")


class Supplier(Base):
    __tablename__ = "suppliers"

    id           = Column(SmallInteger, primary_key=True, autoincrement=True)
    name         = Column(String(150), nullable=False)
    name_ar      = Column(String(300))
    contact_name = Column(String(100))
    phone        = Column(String(30))
    email        = Column(String(150))
    address      = Column(Text)
    is_active    = Column(Boolean, nullable=False, default=True)
    created_at   = Column(DateTime, default=func.now())

    purchases: list[FeedPurchase]   = relationship("FeedPurchase",  back_populates="supplier")
    orders:    list[PurchaseOrder]  = relationship("PurchaseOrder", back_populates="supplier")


class FeedPurchase(Base):
    __tablename__ = "feed_purchases"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    feed_type_id  = Column(SmallInteger, ForeignKey("feed_types.id"), nullable=False)
    supplier_id   = Column(SmallInteger, ForeignKey("suppliers.id"))
    purchase_date = Column(Date, nullable=False)
    qty_kg        = Column(Numeric(10, 2), nullable=False)
    cost_per_kg   = Column(Numeric(8, 4), nullable=False)
    received_date = Column(Date)
    expiry_date   = Column(Date)
    invoice_no    = Column(String(50))
    notes         = Column(Text)
    created_by    = Column(Integer, ForeignKey("users.id"))
    created_at    = Column(DateTime, default=func.now())

    feed_type: FeedType         = relationship("FeedType",  back_populates="purchases")
    supplier:  Optional[Supplier] = relationship("Supplier", back_populates="purchases")


class FeedStock(Base):
    __tablename__ = "feed_stock"

    feed_type_id    = Column(SmallInteger, ForeignKey("feed_types.id"), primary_key=True)
    qty_on_hand_kg  = Column(Numeric(12, 2), nullable=False, default=0)
    reorder_qty_kg  = Column(Numeric(10, 2), nullable=False, default=0)
    updated_at      = Column(DateTime, default=func.now(), onupdate=func.now())

    feed_type: FeedType = relationship("FeedType", back_populates="stock")


class FeedIssue(Base):
    __tablename__ = "feed_issues"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    batch_id      = Column(Integer, ForeignKey("batches.id"), nullable=False)
    house_id      = Column(SmallInteger, ForeignKey("houses.id"), nullable=False)
    feed_type_id  = Column(SmallInteger, ForeignKey("feed_types.id"), nullable=False)
    issue_date    = Column(Date, nullable=False)
    qty_kg        = Column(Numeric(10, 2), nullable=False)
    fcr_snapshot  = Column(Numeric(5, 3))
    recorded_by   = Column(Integer, ForeignKey("users.id"))
    created_at    = Column(DateTime, default=func.now())

    batch:     Batch              = relationship("Batch",    back_populates="feed_issues")
    house:     House              = relationship("House")
    feed_type: FeedType           = relationship("FeedType", back_populates="issues")


# ── Health & Veterinary ──────────────────────────────────────────────────────

class Medication(Base):
    __tablename__ = "medications"

    id               = Column(SmallInteger, primary_key=True, autoincrement=True)
    name             = Column(String(150), nullable=False)
    name_ar          = Column(String(300))
    category         = Column(
        Enum("antibiotic", "vaccine", "vitamin", "antifungal", "antiparasitic", "other"),
        nullable=False,
    )
    unit             = Column(String(20), nullable=False, default="ml")
    withdrawal_days  = Column(SmallInteger, nullable=False, default=0)
    notes            = Column(Text)

    vaccinations: list[VaccinationSchedule] = relationship("VaccinationSchedule", back_populates="vaccine")
    treatments:   list[Treatment]           = relationship("Treatment", back_populates="medication")


class VaccinationSchedule(Base):
    __tablename__ = "vaccination_schedules"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    batch_id       = Column(Integer, ForeignKey("batches.id"), nullable=False)
    vaccine_id     = Column(SmallInteger, ForeignKey("medications.id"), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    completed_date = Column(Date)
    dose_per_bird  = Column(String(50))
    route          = Column(
        Enum("water", "spray", "injection", "eye_drop", "wing_web"),
        nullable=False, default="water",
    )
    performed_by   = Column(Integer, ForeignKey("users.id"))
    created_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    status         = Column(
        Enum("upcoming", "done", "missed"), nullable=False, default="upcoming"
    )
    notes          = Column(Text)

    batch:   Batch      = relationship("Batch",      back_populates="vaccinations")
    vaccine: Medication = relationship("Medication", back_populates="vaccinations")


class HealthEvent(Base):
    __tablename__ = "health_events"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    batch_id     = Column(Integer, ForeignKey("batches.id"), nullable=False)
    event_type   = Column(
        Enum("vaccination", "medication", "weighing", "vet_visit", "observation", "culling"),
        nullable=False,
    )
    event_date   = Column(Date, nullable=False)
    description  = Column(String(500))
    status       = Column(
        Enum("upcoming", "done", "missed"), nullable=False, default="done"
    )
    performed_by = Column(Integer, ForeignKey("users.id"))
    notes        = Column(Text)
    created_at   = Column(DateTime, default=func.now())

    batch: Batch = relationship("Batch", back_populates="health_events")


class Treatment(Base):
    __tablename__ = "treatments"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    batch_id            = Column(Integer, ForeignKey("batches.id"), nullable=False)
    medication_id       = Column(SmallInteger, ForeignKey("medications.id"), nullable=False)
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date)
    dosage_per_bird     = Column(String(100))
    withdrawal_end_date = Column(Date)
    diagnosis           = Column(String(500))
    prescribed_by       = Column(String(150))
    recorded_by         = Column(Integer, ForeignKey("users.id"))
    notes               = Column(Text)

    batch:      Batch      = relationship("Batch",      back_populates="treatments")
    medication: Medication = relationship("Medication", back_populates="treatments")


# ── Mortality ────────────────────────────────────────────────────────────────

class MortalityRecord(Base):
    __tablename__ = "mortality_records"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    batch_id          = Column(Integer, ForeignKey("batches.id"), nullable=False)
    house_id          = Column(SmallInteger, ForeignKey("houses.id"), nullable=False)
    record_date       = Column(Date, nullable=False)
    count             = Column(SmallInteger, nullable=False, default=1)
    chicken_weight_kg = Column(Numeric(6, 3), nullable=True)
    cause             = Column(
        Enum("heat_stress", "disease", "injury", "culling", "unknown", "other"),
        nullable=False, default="unknown",
    )
    cause_notes  = Column(String(500))
    recorded_by  = Column(Integer, ForeignKey("users.id"))
    created_at   = Column(DateTime, default=func.now())

    batch: Batch = relationship("Batch", back_populates="mortality")
    house: House = relationship("House")


# ── Inventory ────────────────────────────────────────────────────────────────

class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id      = Column(SmallInteger, primary_key=True, autoincrement=True)
    name    = Column(String(50), nullable=False, unique=True)
    name_ar = Column(String(100))

    items: list[InventoryItem] = relationship("InventoryItem", back_populates="category")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    farm_id       = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    category_id   = Column(SmallInteger, ForeignKey("inventory_categories.id"), nullable=False)
    name          = Column(String(150), nullable=False)
    name_ar       = Column(String(300))
    sku           = Column(String(50))
    unit          = Column(String(20), nullable=False, default="pcs")
    qty_on_hand   = Column(Numeric(12, 2), nullable=False, default=0)
    qty_reserved  = Column(Numeric(12, 2), nullable=False, default=0)
    reorder_level = Column(Numeric(12, 2), nullable=False, default=0)
    cost_per_unit = Column(Numeric(10, 4))
    expiry_date   = Column(Date)
    brand         = Column(String(100))
    remarks       = Column(Text)
    last_updated  = Column(DateTime, default=func.now(), onupdate=func.now())

    farm:      Farm              = relationship("Farm")
    category:  InventoryCategory = relationship("InventoryCategory", back_populates="items")
    movements: list[InventoryMovement] = relationship("InventoryMovement", back_populates="item")

    @property
    def qty_available(self) -> float:
        return max(0.0, float(self.qty_on_hand) - float(self.qty_reserved))

    @property
    def status(self) -> str:
        available = self.qty_available
        if available <= 0:
            return "out_of_stock"
        if available <= float(self.reorder_level):
            return "low_stock"
        return "in_stock"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    item_id        = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    movement_type  = Column(Enum("in", "out", "adjustment"), nullable=False)
    qty            = Column(Numeric(12, 2), nullable=False)
    reference_type = Column(
        Enum("purchase", "issue", "adjustment", "sale", "return"), nullable=False
    )
    reference_id   = Column(Integer)
    notes          = Column(Text)
    created_by     = Column(Integer, ForeignKey("users.id"))
    created_at     = Column(DateTime, default=func.now())

    item: InventoryItem = relationship("InventoryItem", back_populates="movements")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    po_no         = Column(String(30), unique=True)
    farm_id       = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    supplier_id   = Column(SmallInteger, ForeignKey("suppliers.id"))
    order_date    = Column(Date, nullable=False)
    expected_date = Column(Date)
    status        = Column(
        Enum("pending_approval", "draft", "ordered", "partial", "received", "cancelled"),
        nullable=False, default="pending_approval",
    )
    total_amount     = Column(Numeric(12, 2))
    notes            = Column(Text)
    rejection_reason = Column(String(500))
    approved_by      = Column(Integer, ForeignKey("users.id"))
    approved_at      = Column(DateTime)
    created_by       = Column(Integer, ForeignKey("users.id"))
    created_at       = Column(DateTime, default=func.now())

    supplier: Optional[Supplier]          = relationship("Supplier", back_populates="orders")
    items:    list[PurchaseOrderItem]      = relationship("PurchaseOrderItem", back_populates="order")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    po_id        = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    item_id      = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    qty_ordered  = Column(Numeric(12, 2), nullable=False)
    qty_received = Column(Numeric(12, 2), nullable=False, default=0)
    unit_price   = Column(Numeric(10, 4), nullable=False)

    order: PurchaseOrder = relationship("PurchaseOrder", back_populates="items")
    item:  InventoryItem = relationship("InventoryItem")


# ── Sales & Finance ──────────────────────────────────────────────────────────

class Buyer(Base):
    __tablename__ = "buyers"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    name         = Column(String(150), nullable=False)
    name_ar      = Column(String(300))
    contact_name = Column(String(100))
    phone        = Column(String(30))
    email        = Column(String(150))
    address      = Column(Text)
    is_active    = Column(Boolean, nullable=False, default=True)
    created_at   = Column(DateTime, default=func.now())

    orders: list[SalesOrder] = relationship("SalesOrder", back_populates="buyer")


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    order_no       = Column(String(30), nullable=False, unique=True)
    batch_id       = Column(Integer, ForeignKey("batches.id"), nullable=False)
    buyer_id       = Column(Integer, ForeignKey("buyers.id"))
    order_date     = Column(Date, nullable=False)
    delivery_date  = Column(Date)
    qty_kg         = Column(Numeric(10, 2), nullable=False)
    price_per_kg   = Column(Numeric(8, 4), nullable=False)
    status         = Column(
        Enum("pending_approval", "pending", "delivered", "completed", "cancelled"),
        nullable=False, default="pending_approval",
    )
    payment_status = Column(
        Enum("unpaid", "partial", "paid"), nullable=False, default="unpaid"
    )
    notes            = Column(Text)
    rejection_reason = Column(String(500))
    approved_by      = Column(Integer, ForeignKey("users.id"))
    approved_at      = Column(DateTime)
    created_by       = Column(Integer, ForeignKey("users.id"))
    created_at       = Column(DateTime, default=func.now())

    batch: Batch          = relationship("Batch", back_populates="sales")
    buyer: Optional[Buyer] = relationship("Buyer", back_populates="orders")

    @property
    def total_amount(self) -> Decimal:
        return self.qty_kg * self.price_per_kg


class Expense(Base):
    __tablename__ = "expenses"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    batch_id     = Column(Integer, ForeignKey("batches.id"))
    farm_id      = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    category     = Column(
        Enum("labor", "utilities", "maintenance", "transport", "chicks", "other"),
        nullable=False,
    )
    amount       = Column(Numeric(12, 2), nullable=False)
    expense_date = Column(Date, nullable=False)
    description  = Column(String(500))
    recorded_by  = Column(Integer, ForeignKey("users.id"))
    created_at   = Column(DateTime, default=func.now())

    batch: Optional[Batch] = relationship("Batch", back_populates="expenses")


# ── Maintenance Logs ─────────────────────────────────────────────────────────

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    house_id         = Column(SmallInteger, ForeignKey("houses.id"), nullable=False)
    farm_id          = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    log_date         = Column(Date, nullable=False)
    category         = Column(
        Enum("roofing", "plumbing", "structural", "gutter", "electrical", "dismantling", "other"),
        nullable=False, default="other",
    )
    description      = Column(String(500))
    cost             = Column(Numeric(12, 2), nullable=False, default=0)
    status           = Column(
        Enum("pending", "in_progress", "completed"),
        nullable=False, default="pending",
    )
    batch_allocated  = Column(Boolean, nullable=False, default=False)
    batch_id         = Column(Integer, ForeignKey("batches.id"), nullable=True)
    expense_id       = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    recorded_by      = Column(Integer, ForeignKey("users.id"))
    created_at       = Column(DateTime, default=func.now())

    house: House = relationship("House", back_populates="maintenance_logs")


# ── Batch Financial Plan ─────────────────────────────────────────────────────

class BatchFinancialPlan(Base):
    __tablename__ = "batch_financial_plans"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    batch_id                = Column(Integer, ForeignKey("batches.id"), nullable=False, unique=True)
    bird_cost_per_head      = Column(Numeric(10, 2), nullable=False, default=0)
    delivery_cost_per_head  = Column(Numeric(10, 2), nullable=False, default=0)
    infrastructure_cost     = Column(Numeric(12, 2), nullable=False, default=0)
    contract_price_per_head = Column(Numeric(10, 2))
    expected_price_per_kg   = Column(Numeric(10, 2))
    supplier_name           = Column(String(150))
    notes                   = Column(Text)
    created_at              = Column(DateTime, default=func.now())
    updated_at              = Column(DateTime, default=func.now(), onupdate=func.now())

    batch:         "Batch"               = relationship("Batch")
    feed_phases:   list["BatchFeedPhase"]    = relationship(
        "BatchFeedPhase",  back_populates="plan",
        cascade="all, delete-orphan", order_by="BatchFeedPhase.phase_order",
    )
    expense_items: list["BatchExpenseItem"] = relationship(
        "BatchExpenseItem", back_populates="plan",
        cascade="all, delete-orphan",
    )


class BatchFeedPhase(Base):
    __tablename__ = "batch_feed_phases"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    plan_id         = Column(Integer, ForeignKey("batch_financial_plans.id"), nullable=False)
    phase_order     = Column(SmallInteger, default=0)
    feed_type_name  = Column(String(100), nullable=False)
    grams_per_day   = Column(SmallInteger, nullable=False, default=0)
    duration_days   = Column(SmallInteger, nullable=False, default=0)
    cost_per_50kg   = Column(Numeric(10, 2), nullable=False, default=0)

    plan: BatchFinancialPlan = relationship("BatchFinancialPlan", back_populates="feed_phases")


class BatchExpenseItem(Base):
    __tablename__ = "batch_expense_items"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    plan_id   = Column(Integer, ForeignKey("batch_financial_plans.id"), nullable=False)
    category  = Column(String(100), nullable=False)
    qty       = Column(Numeric(10, 2), default=0)
    period    = Column(String(50))
    unit_cost = Column(Numeric(10, 2), nullable=False, default=0)
    notes     = Column(String(255))

    plan: BatchFinancialPlan = relationship("BatchFinancialPlan", back_populates="expense_items")


# ── Alerts ───────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    farm_id    = Column(SmallInteger, ForeignKey("farms.id"), nullable=False)
    alert_type = Column(
        Enum("mortality_high", "feed_low", "vaccination_due", "withdrawal_active",
             "batch_harvest", "inventory_low", "inventory_expiry", "other"),
        nullable=False,
    )
    severity   = Column(
        Enum("info", "warning", "danger"), nullable=False, default="warning"
    )
    batch_id   = Column(Integer, ForeignKey("batches.id"))
    message    = Column(String(500), nullable=False)
    is_read    = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=func.now())

    farm:  Farm          = relationship("Farm")
    batch: Optional[Batch] = relationship("Batch")


# ── Harvest Record ───────────────────────────────────────────────────────────

class HarvestRecord(Base):
    __tablename__ = "harvest_records"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    batch_id        = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, unique=True)
    harvest_date    = Column(Date, nullable=False)
    birds_harvested = Column(Integer, nullable=False)
    total_weight_kg = Column(Numeric(10, 2), nullable=False)
    price_per_kg    = Column(Numeric(8, 4), nullable=False)
    buyer_name      = Column(String(150))
    notes           = Column(Text)
    recorded_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at      = Column(DateTime, default=func.now())

    batch: Batch = relationship("Batch", back_populates="harvest_record")

    @property
    def total_revenue(self) -> float:
        return float(self.total_weight_kg) * float(self.price_per_kg)
