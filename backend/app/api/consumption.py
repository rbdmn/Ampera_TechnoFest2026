from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.consumption import ConsumptionLogOut, ConsumptionSummaryOut
from app.services.consumption_service import get_latest_logs, get_summary_month

router = APIRouter()


@router.get("/summary", response_model=ConsumptionSummaryOut)
def summary(db: Session = Depends(get_db)) -> ConsumptionSummaryOut:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)

    total = get_summary_month(db, month_start, month_end)
    return ConsumptionSummaryOut(total_kwh_month=total, rooms_count=0)


@router.get("/rooms/{room_id}", response_model=list[ConsumptionLogOut])
def latest_for_room(room_id: str, db: Session = Depends(get_db)) -> list[ConsumptionLogOut]:
    logs = get_latest_logs(db, room_id)
    return logs
