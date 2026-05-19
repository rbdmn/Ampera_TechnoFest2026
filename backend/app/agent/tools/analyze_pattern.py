from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from statistics import mean, pstdev

from app.agent.tools.query_consumption import query_consumption


def analyze_pattern(room_id: str, limit: int = 168, z_threshold: float = 2.0, monthly_limit_kwh: float | None = None) -> dict:
    """Detect anomaly and simple time-based consumption patterns.

    The function still uses z-score for the latest hourly value, but now also
    derives human-readable time insight such as:
    - night spikes
    - peak hours
    - daily trend direction
    """

    data = query_consumption(room_id=room_id, limit=limit)
    logs = data.get("logs", [])
    if len(logs) < 10:
        return {"status": "insufficient_data", "room_id": room_id, "count": len(logs)}

    def _parse_ts(value: str) -> datetime:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    ordered_logs = sorted(logs, key=lambda item: item["timestamp"])
    values = [float(x["kwh_used"]) for x in ordered_logs]
    latest = float(ordered_logs[-1]["kwh_used"])
    baseline = values[:-1]

    mu = mean(baseline)
    sigma = pstdev(baseline) or 1e-9
    z = (latest - mu) / sigma

    cumulative = float(ordered_logs[-1]["cumulative_kwh_month"])

    hourly_totals: dict[int, list[float]] = defaultdict(list)
    daily_totals: dict[str, float] = defaultdict(float)
    night_values: list[float] = []
    for log in ordered_logs:
        ts = _parse_ts(str(log["timestamp"]))
        kwh = float(log["kwh_used"])
        hourly_totals[ts.hour].append(kwh)
        daily_totals[ts.date().isoformat()] += kwh
        if 0 <= ts.hour <= 5:
            night_values.append(kwh)

    hourly_avgs = sorted(
        (
            {
                "hour": hour,
                "avg_kwh": round(mean(values_by_hour), 4),
                "samples": len(values_by_hour),
            }
            for hour, values_by_hour in hourly_totals.items()
            if values_by_hour
        ),
        key=lambda item: item["avg_kwh"],
        reverse=True,
    )
    peak_hours = hourly_avgs[:3]
    avg_night_kwh = round(mean(night_values), 4) if night_values else 0.0

    daily_sorted = sorted(daily_totals.items())
    daily_values = [value for _, value in daily_sorted]
    daily_trend = "stabil"
    daily_trend_ratio = 1.0
    if len(daily_values) >= 6:
        first_half = mean(daily_values[: max(3, len(daily_values) // 2)])
        last_half = mean(daily_values[-max(3, len(daily_values) // 2):])
        if first_half > 0:
            daily_trend_ratio = round(last_half / first_half, 3)
            if daily_trend_ratio >= 1.15:
                daily_trend = "naik"
            elif daily_trend_ratio <= 0.85:
                daily_trend = "turun"

    if avg_night_kwh >= max(mu * 1.25, mu + 0.1):
        time_pattern = "spike dini hari"
        time_pattern_detail = "Konsumsi tengah malam sampai subuh terlihat lebih tinggi dari biasanya."
    elif peak_hours and peak_hours[0]["avg_kwh"] >= mu * 1.35:
        top_hour = peak_hours[0]["hour"]
        time_pattern = f"puncak pemakaian jam {top_hour:02d}:00"
        time_pattern_detail = "Ada jam tertentu yang konsumsinya jauh lebih tinggi daripada jam lain."
    elif daily_trend == "naik":
        time_pattern = "tren harian naik"
        time_pattern_detail = "Pemakaian harian cenderung meningkat dibanding awal periode."
    else:
        time_pattern = "pola stabil"
        time_pattern_detail = "Tidak ada lonjakan waktu yang menonjol dari data terakhir."

    result: dict = {
        "status": "ok",
        "room_id": room_id,
        "latest_kwh": latest,
        "mean_kwh": mu,
        "std_kwh": sigma,
        "z": z,
        "is_anomaly": z >= float(z_threshold),
        "cumulative_kwh_month": cumulative,
        "time_pattern": time_pattern,
        "time_pattern_detail": time_pattern_detail,
        "peak_hours": peak_hours,
        "avg_night_kwh": avg_night_kwh,
        "daily_trend": daily_trend,
        "daily_trend_ratio": daily_trend_ratio,
    }

    if monthly_limit_kwh and monthly_limit_kwh > 0:
        pct = cumulative / monthly_limit_kwh
        result["monthly_limit_kwh"] = monthly_limit_kwh
        result["pct_of_limit"] = round(pct * 100, 1)
        if pct >= 1.0:
            result["limit_alert_type"] = "limit_exceeded"
        elif pct >= 0.8:
            result["limit_alert_type"] = "usage_warning"
        else:
            result["limit_alert_type"] = None
    else:
        result["monthly_limit_kwh"] = None
        result["pct_of_limit"] = 0.0
        result["limit_alert_type"] = None

    return result
