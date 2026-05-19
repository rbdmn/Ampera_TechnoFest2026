from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import OccupancyStatus, Room, RoomOccupancy, Tenant, User, UserRole
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, RegisterResponse

router = APIRouter()


def _mvp_verify_password(plain_password: str, password_hash: str) -> bool:
    """MVP password verification.

    Current seed dataset uses placeholder 'demo-password-hash'.
    For now we accept either an exact match (plain stored in DB) or that placeholder.

    Replace this with bcrypt/passlib + JWT when ready.
    """
    if password_hash == "demo-password-hash":
        # For seeded demo accounts. Treat 'admin'/'user' as valid passwords.
        return plain_password in {"admin", "user"}

    # If dataset later stores plain passwords (not recommended), allow exact match.
    if plain_password == password_hash:
        return True

    return False


def _hash_password_mvp(plain_password: str) -> str:
    # MVP only: store sha256 for non-seed users (better than plain, but not ideal).
    return "sha256$" + hashlib.sha256(plain_password.encode("utf-8")).hexdigest()


def _make_dev_token(user_id: str, role: str) -> str:
    digest = hashlib.sha256(f"{user_id}:{role}".encode("utf-8")).hexdigest()[:24]
    return f"dev-{role}-{digest}"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    # Accept sha256$... (new registrations)
    if user.password_hash.startswith("sha256$"):
        ok = user.password_hash == _hash_password_mvp(payload.password)
    else:
        ok = _mvp_verify_password(payload.password, user.password_hash)

    if not ok:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    return LoginResponse(access_token=_make_dev_token(user.user_id, user.role.value), role=user.role.value)


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="password_mismatch")

    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(status_code=409, detail="email_already_registered")

    room = db.get(Room, payload.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")

    # Create or reuse tenant by email
    tenant = db.scalar(select(Tenant).where(Tenant.email == payload.email))
    if not tenant:
        tenant = Tenant(full_name=payload.full_name, email=str(payload.email))
        db.add(tenant)
        db.flush()  # get tenant_id

    # Enforce 1 active occupancy per tenant
    active_for_tenant = db.scalar(
        select(RoomOccupancy).where(RoomOccupancy.tenant_id == tenant.tenant_id, RoomOccupancy.end_at.is_(None))
    )
    if active_for_tenant and active_for_tenant.room_id != payload.room_id:
        raise HTTPException(status_code=409, detail="tenant_already_has_active_room")

    # Enforce room capacity
    active_count = len(
        list(
            db.scalars(
                select(RoomOccupancy.occupancy_id).where(
                    RoomOccupancy.room_id == payload.room_id,
                    RoomOccupancy.end_at.is_(None),
                )
            ).all()
        )
    )
    if active_count >= int(room.max_occupants):
        raise HTTPException(status_code=409, detail="room_is_full")

    # Create user
    user = User(
        email=str(payload.email),
        full_name=payload.full_name,
        password_hash=_hash_password_mvp(payload.password),
        role=UserRole.user,
        tenant_id=tenant.tenant_id,
        room_id=payload.room_id,
        is_active=True,
    )
    db.add(user)

    # Ensure an active occupancy exists for this tenant-room
    occupancy = db.scalar(
        select(RoomOccupancy).where(
            RoomOccupancy.tenant_id == tenant.tenant_id,
            RoomOccupancy.room_id == payload.room_id,
            RoomOccupancy.end_at.is_(None),
        )
    )
    if not occupancy:
        from datetime import datetime, timezone

        occupancy = RoomOccupancy(
            room_id=payload.room_id,
            tenant_id=tenant.tenant_id,
            start_at=datetime.now(timezone.utc),
            end_at=None,
            status=OccupancyStatus.active,
        )
        db.add(occupancy)

    db.commit()
    db.refresh(user)

    return RegisterResponse(
        user_id=user.user_id,
        tenant_id=str(user.tenant_id or ""),
        room_id=str(user.room_id or ""),
        email=user.email,
        role=user.role.value,
    )
