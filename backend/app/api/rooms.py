from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Room, RoomOccupancy
from app.schemas.room import RoomOut

router = APIRouter()


@router.get("/", response_model=list[RoomOut])
def list_rooms(db: Session = Depends(get_db)) -> list[RoomOut]:
    return list(db.scalars(select(Room).order_by(Room.room_id)).all())


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: str = Path(..., pattern=r"^R-[A-Za-z0-9_-]+$"), db: Session = Depends(get_db)) -> RoomOut:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")
    return room


@router.get("/{room_id}/active-occupants")
def active_occupants(room_id: str = Path(..., pattern=r"^R-[A-Za-z0-9_-]+$"), db: Session = Depends(get_db)) -> dict:
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")

    active_ids = list(
        db.scalars(
            select(RoomOccupancy.occupancy_id).where(
                RoomOccupancy.room_id == room_id,
                RoomOccupancy.end_at.is_(None),
            )
        ).all()
    )

    return {
        "room_id": room_id,
        "active_occupants": len(active_ids),
        "max_occupants": int(room.max_occupants),
    }
