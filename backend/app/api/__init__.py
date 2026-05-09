"""API routers."""

from app.api import agent, alerts, auth, billing, consumption, occupancies, rooms, tenants

__all__ = [
    "agent",
    "alerts",
    "auth",
    "billing",
    "consumption",
    "rooms",
    "tenants",
    "occupancies",
]
