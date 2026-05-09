from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import OccupancyStatus, Room, RoomOccupancy, Tenant
from app.schemas.occupancy import CheckInRequest, CheckOutRequest, OccupancyOut

router = APIRouter()


@router.post("/rooms/{room_id}/checkin", response_model=OccupancyOut)
def checkin(room_id: str, payload: CheckInRequest, db: Session = Depends(get_db)) -> OccupancyOut:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")

    tenant = db.get(Tenant, payload.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="tenant_not_found")

    # Rule (opsi A): 1 tenant hanya boleh punya 1 occupancy aktif
    active_for_tenant = db.scalar(
        select(RoomOccupancy).where(
            RoomOccupancy.tenant_id == payload.tenant_id,
            RoomOccupancy.end_at.is_(None),
        )
    )
    if active_for_tenant:
        raise HTTPException(status_code=409, detail="tenant_already_has_active_room")

    # Sharing rule: room cannot exceed max_occupants
    active_count = db.scalar(
        select(RoomOccupancy).where(RoomOccupancy.room_id == room_id, RoomOccupancy.end_at.is_(None)).count()
    )
    # SQLAlchemy .count() on Select is not supported; do simple count via scalars list
    active_count = len(
        list(
            db.scalars(
                select(RoomOccupancy.occupancy_id).where(
                    RoomOccupancy.room_id == room_id,
                    RoomOccupancy.end_at.is_(None),
                )
            ).all()
        )
    )
    if active_count >= int(room.max_occupants):
        raise HTTPException(status_code=409, detail="room_is_full")

    start_at = payload.start_at or datetime.now(timezone.utc)
    occ = RoomOccupancy(room_id=room_id, tenant_id=payload.tenant_id, start_at=start_at, end_at=None)
    occ.status = OccupancyStatus.active

    db.add(occ)
    db.commit()
    db.refresh(occ)
    return occ


@router.post("/occupancies/{occupancy_id}/checkout", response_model=OccupancyOut)
def checkout(occupancy_id: str, payload: CheckOutRequest, db: Session = Depends(get_db)) -> OccupancyOut:
    occ = db.get(RoomOccupancy, occupancy_id)
    if not occ:
        raise HTTPException(status_code=404, detail="occupancy_not_found")

    if occ.end_at is not None:
        raise HTTPException(status_code=409, detail="occupancy_already_ended")

    occ.end_at = payload.end_at or datetime.now(timezone.utc)
    occ.status = OccupancyStatus.ended

    db.commit()
    db.refresh(occ)
    return occ


@router.get("/rooms/{room_id}", response_model=list[OccupancyOut])
def list_room_history(room_id: str, db: Session = Depends(get_db)) -> list[OccupancyOut]:
    return list(
        db.scalars(
            select(RoomOccupancy)
            .where(RoomOccupancy.room_id == room_id)
            .order_by(RoomOccupancy.start_at.desc())
        ).all()
    )
