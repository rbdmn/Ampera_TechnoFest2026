from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AlertHistory, ConsumptionLog, Room, RoomOccupancy, Tenant

router = APIRouter()


def _month_range(now: datetime) -> tuple[datetime, datetime]:
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    return month_start, month_end


def _status_from_usage(usage_kwh: float, limit_kwh: float, has_active: bool) -> str:
    if not has_active:
        return "Vacant"
    if limit_kwh <= 0:
        return "Normal"
    ratio = usage_kwh / limit_kwh
    if ratio >= 1.0:
        return "Exceeded"
    if ratio >= 0.8:
        return "Warning"
    return "Normal"


@router.get("/summary")
def rooms_summary(db: Session = Depends(get_db)) -> dict:
    total_rooms = db.scalar(select(func.count()).select_from(Room)) or 0

    vacant_units = db.scalar(
        select(func.count()).select_from(Room).where(~Room.room_id.in_(select(RoomOccupancy.room_id).where(RoomOccupancy.end_at.is_(None))))
    ) or 0

    # Warning/Critical based on month-to-date usage ratio
    now = datetime.now(timezone.utc)
    month_start, month_end = _month_range(now)

    usage_rows = db.execute(
        select(
            Room.room_id,
            Room.monthly_limit_kwh,
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("mtd_kwh"),
        )
        .select_from(Room)
        .join(ConsumptionLog, ConsumptionLog.room_id == Room.room_id, isouter=True)
        .where(ConsumptionLog.timestamp >= month_start, ConsumptionLog.timestamp < month_end)
        .group_by(Room.room_id, Room.monthly_limit_kwh)
    ).all()

    warnings = 0
    critical = 0
    for r in usage_rows:
        limit = float(r.monthly_limit_kwh or 0.0)
        if limit <= 0:
            continue
        ratio = float(r.mtd_kwh) / limit
        if ratio >= 1.0:
            critical += 1
        elif ratio >= 0.8:
            warnings += 1

    return {
        "total_rooms": int(total_rooms),
        "vacant_units": int(vacant_units),
        "warnings_count": int(warnings),
        "critical_count": int(critical),
    }


@router.get("/admin/room-status")
def room_status(db: Session = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    month_start, month_end = _month_range(now)

    # usage per room (MTD)
    usage_subq = (
        select(
            ConsumptionLog.room_id.label("room_id"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("mtd_kwh"),
        )
        .where(ConsumptionLog.timestamp >= month_start, ConsumptionLog.timestamp < month_end)
        .group_by(ConsumptionLog.room_id)
        .subquery()
    )

    # active tenant per room (via occupancy join)
    active_occ = (
        select(RoomOccupancy.room_id.label("room_id"), RoomOccupancy.tenant_id.label("tenant_id"))
        .where(RoomOccupancy.end_at.is_(None))
        .subquery()
    )

    rows = db.execute(
        select(
            Room.room_id,
            Room.monthly_limit_kwh,
            Room.tenant_name,
            Tenant.full_name,
            func.coalesce(usage_subq.c.mtd_kwh, 0.0).label("mtd_kwh"),
        )
        .select_from(Room)
        .join(usage_subq, usage_subq.c.room_id == Room.room_id, isouter=True)
        .join(active_occ, active_occ.c.room_id == Room.room_id, isouter=True)
        .join(Tenant, Tenant.tenant_id == active_occ.c.tenant_id, isouter=True)
        .order_by(Room.room_id)
    ).all()

    data = []
    for r in rows:
        tenant_name = r.full_name or r.tenant_name
        usage_kwh = float(r.mtd_kwh or 0.0)
        limit = float(r.monthly_limit_kwh or 0.0)
        has_active = tenant_name is not None
        status = "normal"
        ratio = (usage_kwh / limit) if limit > 0 else 0.0
        if not has_active:
            status = "vacant"
        elif ratio >= 1.0:
            status = "exceeded"
        elif ratio >= 0.8:
            status = "warning"

        data.append(
            {
                "room_id": r.room_id,
                "tenant_name": tenant_name,
                "kwh_usage_mtd": usage_kwh,
                "status": status,
            }
        )

    return {"data": data}


@router.post("/")
def create_room(payload: dict, db: Session = Depends(get_db)) -> dict:
    room_no = payload.get("room_no")
    floor = payload.get("floor")
    max_occupants = payload.get("max_occupants", 1)

    if not room_no:
        return {"error": "room_no_required"}

    room_id = room_no if str(room_no).startswith("R-") else f"R-{room_no}"

    existing = db.get(Room, room_id)
    if existing:
        raise HTTPException(status_code=409, detail="room_already_exists")

    room = Room(room_id=room_id, floor=int(floor) if floor is not None else None, max_occupants=int(max_occupants))
    db.add(room)
    db.commit()
    db.refresh(room)

    return {
        "room_id": room.room_id,
        "floor": room.floor,
        "max_occupants": room.max_occupants,
    }


@router.patch("/{room_id}/limit")
def update_room_limit(room_id: str, payload: dict, db: Session = Depends(get_db)) -> dict:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")

    if "monthly_limit_kwh" not in payload:
        return {"error": "monthly_limit_kwh_required"}

    room.monthly_limit_kwh = float(payload["monthly_limit_kwh"])
    db.commit()
    db.refresh(room)

    return {"room_id": room.room_id, "monthly_limit_kwh": float(room.monthly_limit_kwh)}


@router.get("/{room_id}/detail")
def room_detail_enriched(room_id: str, db: Session = Depends(get_db)) -> dict:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")

    now = datetime.now(timezone.utc)
    month_start, month_end = _month_range(now)

    usage_kwh = (
        db.scalar(
            select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
                ConsumptionLog.room_id == room_id,
                ConsumptionLog.timestamp >= month_start,
                ConsumptionLog.timestamp < month_end,
            )
        )
        or 0.0
    )

    estimated_cost = float(usage_kwh) * float(room.tariff_per_kwh)
    limit = float(room.monthly_limit_kwh)
    usage_percentage = int(round((float(usage_kwh) / limit) * 100)) if limit > 0 else 0

    return {
        "room_id": room.room_id,
        "floor": room.floor,
        "tenant_name": room.tenant_name,
        "monthly_limit_kwh": float(room.monthly_limit_kwh),
        "current_month": {
            "usage_kwh": float(usage_kwh),
            "estimated_cost": float(estimated_cost),
            "usage_percentage": usage_percentage,
            "remaining_kwh": float(max(limit - float(usage_kwh), 0.0)),
        },
    }


@router.get("/table")
def rooms_table(
    floor: int | None = Query(default=None),
    status: str | None = Query(default=None, description="Normal|Warning|Exceeded|Vacant"),
    search: str | None = Query(default=None, description="Search by room id or tenant name"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)
    month_start, month_end = _month_range(now)

    usage_subq = (
        select(
            ConsumptionLog.room_id.label("room_id"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("mtd_kwh"),
        )
        .where(ConsumptionLog.timestamp >= month_start, ConsumptionLog.timestamp < month_end)
        .group_by(ConsumptionLog.room_id)
        .subquery()
    )

    active_occ = (
        select(RoomOccupancy.room_id.label("room_id"), RoomOccupancy.tenant_id.label("tenant_id"))
        .where(RoomOccupancy.end_at.is_(None))
        .subquery()
    )

    base = (
        select(
            Room.room_id,
            Room.floor,
            Room.monthly_limit_kwh,
            Room.tariff_per_kwh,
            Room.tenant_name,
            Tenant.full_name.label("tenant_full_name"),
            func.coalesce(usage_subq.c.mtd_kwh, 0.0).label("mtd_kwh"),
            active_occ.c.tenant_id.label("active_tenant_id"),
        )
        .select_from(Room)
        .join(usage_subq, usage_subq.c.room_id == Room.room_id, isouter=True)
        .join(active_occ, active_occ.c.room_id == Room.room_id, isouter=True)
        .join(Tenant, Tenant.tenant_id == active_occ.c.tenant_id, isouter=True)
    )

    if floor is not None:
        base = base.where(Room.floor == floor)

    if search:
        like = f"%{search}%"
        base = base.where((Room.room_id.ilike(like)) | (Tenant.full_name.ilike(like)) | (Room.tenant_name.ilike(like)))

    rows = db.execute(base).all()

    # compute status + estimated cost and then filter/paginate in-memory (simple MVP)
    table_rows: list[dict] = []
    for r in rows:
        resident_name = r.tenant_full_name or r.tenant_name
        has_active = resident_name is not None
        mtd_kwh = float(r.mtd_kwh or 0.0)
        limit_kwh = float(r.monthly_limit_kwh or 0.0)
        status_val = _status_from_usage(mtd_kwh, limit_kwh, has_active)
        estimated_cost = mtd_kwh * float(r.tariff_per_kwh or 0.0)

        table_rows.append(
            {
                "room_no": str(r.room_id).replace("R-", ""),
                "room_id": r.room_id,
                "floor": r.floor,
                "resident_name": resident_name,
                "monthly_kwh": mtd_kwh,
                "estimated_cost": float(estimated_cost),
                "status": status_val,
            }
        )

    if status:
        table_rows = [row for row in table_rows if str(row["status"]).lower() == status.lower()]

    total_items = len(table_rows)
    offset = (page - 1) * limit
    data = table_rows[offset : offset + limit]

    return {"data": data, "meta": {"total_items": int(total_items), "current_page": int(page)}}
