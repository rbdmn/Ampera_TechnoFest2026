from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import BillingRecord, BillingStatus, ConsumptionLog, Room, User
from app.services.auth_service import get_current_user, require_admin

router = APIRouter()


def _parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


def _format_kwh(value: float) -> str:
    return f"{value:,.2f}".replace(",", ".")


def _pdf_response(buf: io.BytesIO, filename: str) -> StreamingResponse:
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/admin-energy.pdf")
def export_admin_energy_pdf(
    view_mode: str = Query(default="daily", pattern="^(daily|monthly)$"),
    date_range: str = Query(default="30", pattern="^(7|30|all)$"),
    selected_month: str = Query(default="all"),
    status: str = Query(default="all", pattern="^(all|normal|warning)$"),
    sort_by: str = Query(default="date", pattern="^(date|consumption|peakDemand)$"),
    start: str | None = Query(default=None, description="Optional ISO datetime override"),
    end: str | None = Query(default=None, description="Optional ISO datetime override"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin Energy Monitoring PDF, using the same filter concepts as the UI."""

    now = datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(start) if start else datetime(2020, 1, 1, tzinfo=timezone.utc)
    end_dt = _parse_iso_datetime(end) if end else now

    if selected_month != "all":
        year, month = [int(part) for part in selected_month.split("-", 1)]
        start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_dt = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_dt = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    bucket_expr = func.date_trunc("day" if view_mode == "daily" else "month", ConsumptionLog.timestamp)
    rows = db.execute(
        select(
            bucket_expr.label("bucket"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("kwh"),
            func.coalesce(func.max(ConsumptionLog.kwh_used), 0.0).label("peak_kw"),
        )
        .where(ConsumptionLog.timestamp >= start_dt, ConsumptionLog.timestamp < end_dt)
        .group_by("bucket")
        .order_by("bucket")
    ).all()

    data = []
    for row in rows:
        consumption = float(row.kwh)
        peak_kw = float(row.peak_kw)
        label, status_key = _status_from_energy(consumption, view_mode)
        if status != "all" and status_key != status:
            continue
        data.append(
            {
                "bucket": row.bucket,
                "label": row.bucket.strftime("%d %b %Y") if view_mode == "daily" else row.bucket.strftime("%B %Y"),
                "kwh": consumption,
                "peak_kw": peak_kw,
                "status": label,
            }
        )

    reverse = True
    if sort_by == "consumption":
        data.sort(key=lambda item: item["kwh"], reverse=True)
    elif sort_by == "peakDemand":
        data.sort(key=lambda item: item["peak_kw"], reverse=True)
    else:
        data.sort(key=lambda item: item["bucket"], reverse=True)

    if selected_month == "all":
        if view_mode == "daily" and date_range in {"7", "30"}:
            data = data[: int(date_range)]
        elif view_mode == "monthly" and date_range == "7":
            data = data[:3]
        elif view_mode == "monthly" and date_range == "30":
            data = data[:6]

    total_kwh = sum(item["kwh"] for item in data)
    avg_kwh = total_kwh / len(data) if data else 0.0
    peak = max((item["peak_kw"] for item in data), default=0.0)
    peak_label = next((item["label"] for item in data if item["peak_kw"] == peak), "-")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="Admin Energy Monitoring",
    )
    styles = _brand_styles()
    elements = _header(
        "Energy Monitoring Report",
        "Filtered operational export for building-wide electricity consumption.",
        f"{view_mode.title()} | {start_dt.date().isoformat()} to {end_dt.date().isoformat()}",
    )
    elements.append(
        _metric_cards(
            [
                ("TOTAL CONSUMPTION", f"{_format_kwh(total_kwh)} kWh", f"{len(data)} rows in current filter"),
                ("AVERAGE USE", f"{_format_kwh(avg_kwh)} kWh", view_mode),
                ("PEAK DEMAND", f"{_format_kwh(peak)} kW", f"Recorded on {peak_label}"),
            ]
        )
    )
    elements.append(Spacer(1, 14))
    elements.append(Paragraph("Filtered Daily Log" if view_mode == "daily" else "Filtered Monthly Log", styles["section"]))

    table_rows = [["Period", "Consumption (kWh)", "Peak Demand (kW)", "Status"]]
    for item in data:
        table_rows.append([item["label"], _format_kwh(item["kwh"]), _format_kwh(item["peak_kw"]), item["status"]])

    if len(table_rows) == 1:
        table_rows.append(["No data", "0.00", "0.00", "-"])

    table = Table(table_rows, colWidths=[175, 115, 120, 90], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ALIGN", (1, 1), (2, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Filters: status={status}, sort_by={sort_by}, selected_month={selected_month}, date_range={date_range}", styles["small"]))

    doc.build(elements)
    suffix = selected_month if selected_month != "all" else f"{start_dt.date().isoformat()}_{end_dt.date().isoformat()}"
    return _pdf_response(buf, f"ampera-energy-monitoring_{view_mode}_{suffix}.pdf")


@router.get("/admin-billing.pdf")
def export_admin_billing_pdf(
    period: str = Query(..., description="YYYY-MM"),
    status: str = Query(default="all", pattern="^(all|paid|pending|unpaid)$"),
    search: str = Query(default=""),
    sort_by: str = Query(default="none", pattern="^(none|kwh_used|amount)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin monthly billing PDF, based on billing_records for the selected period."""

    rows = db.execute(
        select(BillingRecord, Room)
        .join(Room, Room.room_id == BillingRecord.room_id)
        .where(BillingRecord.period == period)
        .order_by(BillingRecord.room_id)
    ).all()

    invoices = []
    for record, room in rows:
        ui_status = _billing_status_value(record.status)
        room_no = str(record.room_id).replace("R-", "")
        if status != "all" and ui_status != status:
            continue
        if search and search.lower() not in room_no.lower() and search.lower() not in record.room_id.lower():
            continue
        invoices.append(
            {
                "invoice_id": record.billing_id,
                "room_id": record.room_id,
                "room_no": room_no,
                "tenant": room.tenant_name or "Belum ada penghuni",
                "kwh": float(record.total_kwh),
                "rate": float(room.tariff_per_kwh),
                "amount": float(record.total_amount_idr),
                "status": ui_status,
            }
        )

    if sort_by == "kwh_used":
        invoices.sort(key=lambda item: item["kwh"], reverse=True)
    elif sort_by == "amount":
        invoices.sort(key=lambda item: item["amount"], reverse=True)

    total_kwh = sum(item["kwh"] for item in invoices)
    total_amount = sum(item["amount"] for item in invoices)
    collected = sum(item["amount"] for item in invoices if item["status"] == "paid")
    paid_count = sum(1 for item in invoices if item["status"] == "paid")
    pending_count = sum(1 for item in invoices if item["status"] == "pending")
    unpaid_count = sum(1 for item in invoices if item["status"] == "unpaid")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="Admin Monthly Billing Report",
    )
    styles = _brand_styles()
    elements = _header(
        "Monthly Billing Report",
        "Invoice register generated from billing_records and room tariff data.",
        f"Period {period}",
    )
    elements.append(
        _metric_cards(
            [
                ("TOTAL USAGE", f"{_format_kwh(total_kwh)} kWh", f"{len(invoices)} invoices"),
                ("EXPECTED REVENUE", _format_idr(total_amount), "selected filter"),
                ("COLLECTED", _format_idr(collected), f"{paid_count} paid rooms"),
            ]
        )
    )
    elements.append(Spacer(1, 12))

    status_table = Table(
        [["Paid", "Pending", "Unpaid"], [str(paid_count), str(pending_count), str(unpaid_count)]],
        colWidths=[166, 166, 166],
    )
    status_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.append(KeepTogether([Paragraph("Collection Snapshot", styles["section"]), status_table]))
    elements.append(Spacer(1, 10))

    table_rows = [["Room", "Tenant", "kWh", "Rate", "Amount", "Status"]]
    for item in invoices:
        table_rows.append(
            [
                item["room_no"],
                item["tenant"][:30],
                _format_kwh(item["kwh"]),
                _format_idr(item["rate"]),
                _format_idr(item["amount"]),
                item["status"].title(),
            ]
        )

    if len(table_rows) == 1:
        table_rows.append(["-", "No invoice data", "0.00", _format_idr(0), _format_idr(0), "-"])

    invoice_table = Table(table_rows, colWidths=[45, 135, 70, 75, 95, 70], repeatRows=1)
    invoice_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (2, 1), (4, -1), "RIGHT"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    elements.append(Paragraph("Invoice Register", styles["section"]))
    elements.append(invoice_table)
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Filters: status={status}, search={search or '-'}, sort_by={sort_by}", styles["small"]))

    doc.build(elements)
    return _pdf_response(buf, f"ampera-monthly-billing_{period}.pdf")


def _brand_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "AmperaTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "AmperaSubtitle",
            parent=styles["BodyText"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#475569"),
        ),
        "section": ParagraphStyle(
            "AmperaSection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "AmperaSmall",
            parent=styles["BodyText"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748b"),
        ),
    }


def _header(title: str, subtitle: str, meta: str) -> list:
    styles = _brand_styles()
    stripe = Table(
        [[Paragraph("AMPERA AI", styles["small"]), Paragraph(meta, styles["small"])]],
        colWidths=[110, 390],
    )
    stripe.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e0f2fe")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#075985")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return [
        stripe,
        Spacer(1, 10),
        Paragraph(title, styles["title"]),
        Paragraph(subtitle, styles["subtitle"]),
        Spacer(1, 12),
    ]


def _metric_cards(cards: list[tuple[str, str, str]]) -> Table:
    data = []
    row = []
    for label, value, note in cards:
        row.append(Paragraph(f"<b>{label}</b><br/><font size='15'>{value}</font><br/><font size='7'>{note}</font>", _brand_styles()["subtitle"]))
    data.append(row)
    table = Table(data, colWidths=[166, 166, 166])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def _status_from_energy(consumption: float, view_mode: str) -> tuple[str, str]:
    threshold = 1300.0 if view_mode == "monthly" else 65.0
    if consumption > threshold:
        return "Warning", "warning"
    return "Normal", "normal"


def _billing_status_value(status: BillingStatus | str) -> str:
    raw = status.value if hasattr(status, "value") else str(status)
    return {"generated": "unpaid", "sent": "pending"}.get(raw, raw)


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
