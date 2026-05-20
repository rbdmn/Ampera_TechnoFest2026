from __future__ import annotations

import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Room, User
from app.services.auth_service import get_current_user

router = APIRouter()


def _parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("/user-history.pdf")
def export_user_history_pdf(
    email: str | None = Query(default=None, description="User email (admin can export for any user)."),
    start: str | None = Query(default=None, description="ISO datetime"),
    end: str | None = Query(default=None, description="ISO datetime"),
    interval: str = Query(default="day", pattern="^(hour|day)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export the same data as /dashboard/user/overview into a simple PDF.

    MVP: no fancy charts, just summary + table of series.
    """

    # Admin can export by providing email; user exports only their own.
    if current_user.role.value == "admin" and email:
        user = db.scalar(select(User).where(User.email == email))
    else:
        user = current_user

    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="user_not_found")

    room_id = user.room_id
    room = db.get(Room, room_id) if room_id else None

    now = datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(start) if start else (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0))
    end_dt = _parse_iso_datetime(end) if end else now

    # Reuse internal logic by calling the python function directly would be messy;
    # so do minimal aggregation in-place based on existing dashboard queries.
    # NOTE: dashboard calculates series grouped by date_trunc on ConsumptionLog.
    from sqlalchemy import func
    from app.db.models import ConsumptionLog

    if not room_id:
        series_rows = []
        total_kwh = 0.0
    else:
        if interval == "hour":
            bucket_expr = func.date_trunc("hour", ConsumptionLog.timestamp)
        else:
            bucket_expr = func.date_trunc("day", ConsumptionLog.timestamp)

        total_kwh = (
            db.scalar(
                select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
                    ConsumptionLog.room_id == room_id,
                    ConsumptionLog.timestamp >= start_dt,
                    ConsumptionLog.timestamp < end_dt,
                )
            )
            or 0.0
        )

        series_rows = db.execute(
            select(
                bucket_expr.label("bucket"),
                func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("kwh"),
                func.coalesce(func.max(ConsumptionLog.kwh_used), 0.0).label("peak_kwh"),
            )
            .where(
                ConsumptionLog.room_id == room_id,
                ConsumptionLog.timestamp >= start_dt,
                ConsumptionLog.timestamp < end_dt,
            )
            .group_by("bucket")
            .order_by("bucket")
        ).all()

    rate = float(room.tariff_per_kwh) if room else 0.0
    bill = float(total_kwh) * rate

    # --- Build PDF ---
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title="Consumption History")
    styles = getSampleStyleSheet()

    elements = []
    elements.append(Paragraph("Ampera AI — Consumption History", styles["Title"]))
    elements.append(Spacer(1, 8))

    info_rows = [
        ["User", user.full_name or "-"],
        ["Email", user.email],
        ["Room", room_id or "-"],
        ["Period", f"{start_dt.isoformat()} → {end_dt.isoformat()}"],
        ["Interval", interval],
        ["Tariff (per kWh)", f"{rate:,.2f}"],
        ["Total kWh", f"{float(total_kwh):,.2f}"],
        ["Estimated Bill", f"{float(bill):,.2f}"],
    ]

    info_table = Table(info_rows, colWidths=[120, 390])
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
            ]
        )
    )
    elements.append(info_table)
    elements.append(Spacer(1, 14))

    series_data = [["Timestamp", "kWh", "Peak kW (approx)"]]
    for r in series_rows:
        series_data.append([r.bucket.isoformat(), f"{float(r.kwh):,.3f}", f"{float(r.peak_kwh):,.3f}"])

    series_table = Table(series_data, colWidths=[230, 140, 140], repeatRows=1)
    series_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    elements.append(Paragraph("Series", styles["Heading2"]))
    elements.append(series_table)

    doc.build(elements)
    buf.seek(0)

    safe_room = (room_id or "no-room").replace("/", "-")
    filename = f"consumption-history_{safe_room}_{start_dt.date().isoformat()}_{end_dt.date().isoformat()}.pdf"

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
