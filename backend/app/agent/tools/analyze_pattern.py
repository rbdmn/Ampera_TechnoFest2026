from __future__ import annotations

from statistics import mean, pstdev

from app.agent.tools.query_consumption import query_consumption


def analyze_pattern(room_id: str, limit: int = 168, z_threshold: float = 2.0) -> dict:
    """Very simple anomaly detection using z-score over the last `limit` hourly points."""

    data = query_consumption(room_id=room_id, limit=limit)
    logs = data.get("logs", [])
    if len(logs) < 10:
        return {"status": "insufficient_data", "room_id": room_id, "count": len(logs)}

    # logs are in DESC order
    values = [float(x["kwh_used"]) for x in logs]
    latest = values[0]
    baseline = values[1:]

    mu = mean(baseline)
    sigma = pstdev(baseline) or 1e-9
    z = (latest - mu) / sigma

    return {
        "status": "ok",
        "room_id": room_id,
        "latest_kwh": latest,
        "mean_kwh": mu,
        "std_kwh": sigma,
        "z": z,
        "is_anomaly": z >= float(z_threshold),
    }
