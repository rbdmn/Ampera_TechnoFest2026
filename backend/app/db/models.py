from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def _uuid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class ReadingSource(str, enum.Enum):
    manual_input = "manual_input"
    seed_dataset = "seed_dataset"


class Room(Base):
    __tablename__ = "rooms"

    room_id: Mapped[str] = mapped_column(String(32), primary_key=True)  # e.g. R-101
    floor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tenant_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tenant_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    monthly_limit_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    tariff_per_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=1444.70)

    # Capacity metadata (for sharing)
    max_occupants: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    meter_readings: Mapped[list[MeterReading]] = relationship(back_populates="room")
    consumption_logs: Mapped[list[ConsumptionLog]] = relationship(back_populates="room")
    billing_records: Mapped[list[BillingRecord]] = relationship(back_populates="room")
    alerts: Mapped[list[AlertHistory]] = relationship(back_populates="room")

    occupancies: Mapped[list[RoomOccupancy]] = relationship(back_populates="room")


class Tenant(Base):
    __tablename__ = "tenants"

    tenant_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: _uuid("TEN"))
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    occupancies: Mapped[list[RoomOccupancy]] = relationship(back_populates="tenant")


class OccupancyStatus(str, enum.Enum):
    active = "active"
    ended = "ended"


class RoomOccupancy(Base):
    __tablename__ = "room_occupancies"

    occupancy_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uuid("OCC"))

    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.room_id"), index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.tenant_id"), index=True)

    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[OccupancyStatus] = mapped_column(Enum(OccupancyStatus), default=OccupancyStatus.active, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    room: Mapped[Room] = relationship(back_populates="occupancies")
    tenant: Mapped[Tenant] = relationship(back_populates="occupancies")


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: _uuid("USR"))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user, nullable=False)

    # User links to Tenant, and by business rule a Tenant can only have one active room.
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.tenant_id"), nullable=True)
    tenant: Mapped[Tenant | None] = relationship()

    # Keep room_id nullable; can be derived from active occupancy, but handy for MVP.
    room_id: Mapped[str | None] = mapped_column(ForeignKey("rooms.room_id"), nullable=True)
    room: Mapped[Room | None] = relationship()

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class MeterReading(Base):
    __tablename__ = "meter_readings"
    __table_args__ = (
        UniqueConstraint("room_id", "reading_period_end", name="uq_meter_reading_room_period_end"),
    )

    reading_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uuid("READ"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.room_id"), index=True)

    submitted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    reading_value_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    previous_reading_value_kwh: Mapped[float | None] = mapped_column(Float, nullable=True)
    usage_delta_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    reading_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reading_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    source: Mapped[ReadingSource] = mapped_column(Enum(ReadingSource), default=ReadingSource.manual_input, nullable=False)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus), default=VerificationStatus.pending, nullable=False
    )

    room: Mapped[Room] = relationship(back_populates="meter_readings")


class ConsumptionLog(Base):
    __tablename__ = "consumption_logs"

    log_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uuid("LOG"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.room_id"), index=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    kwh_used: Mapped[float] = mapped_column(Float, nullable=False)
    cumulative_kwh_month: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    source: Mapped[ReadingSource] = mapped_column(Enum(ReadingSource), default=ReadingSource.seed_dataset, nullable=False)

    room: Mapped[Room] = relationship(back_populates="consumption_logs")


class BillingStatus(str, enum.Enum):
    generated = "generated"
    sent = "sent"
    paid = "paid"


class BillingRecord(Base):
    __tablename__ = "billing_records"
    __table_args__ = (
        UniqueConstraint("room_id", "period", name="uq_billing_room_period"),
    )

    billing_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uuid("BILL"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.room_id"), index=True)
    period: Mapped[str] = mapped_column(String(7), index=True)  # YYYY-MM

    total_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    total_amount_idr: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[BillingStatus] = mapped_column(Enum(BillingStatus), default=BillingStatus.generated, nullable=False)

    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    room: Mapped[Room] = relationship(back_populates="billing_records")


class AlertType(str, enum.Enum):
    usage_warning = "usage_warning"
    limit_exceeded = "limit_exceeded"
    anomaly = "anomaly"


class AlertHistory(Base):
    __tablename__ = "alert_history"

    alert_id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uuid("ALT"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.room_id"), index=True)

    alert_type: Mapped[AlertType] = mapped_column(Enum(AlertType), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    room: Mapped[Room] = relationship(back_populates="alerts")
