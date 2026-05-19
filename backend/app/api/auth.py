from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db.models import OccupancyStatus, Room, RoomOccupancy, Tenant, User, UserRole
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ProfileUpdateRequest,
    ProfileResponse,
    ChangePasswordRequest,
)
from app.services.auth_service import create_token

router = APIRouter()


def _verify_password(plain: str, stored: str) -> bool:
    if stored == "demo-password-hash":
        return plain in {"admin", "user"}
    return plain == stored


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    if not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    return LoginResponse(access_token=create_token(user.user_id, user.role.value), role=user.role.value)


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
        password_hash=payload.password,
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


@router.post("/me/photo")
def upload_profile_photo(
    email: str = Query(..., description="User email (MVP identification)."),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    settings = get_settings()

    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="user_not_found")

    # Basic validation
    if file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=415, detail="unsupported_file_type")

    # Size limit (2MB)
    max_bytes = 2 * 1024 * 1024
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail="file_too_large_max_2mb")

    uploads_dir = Path(settings.uploads_dir)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    ext = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
    }.get(file.content_type, "")

    filename = f"avatar-{user.user_id}-{uuid.uuid4().hex}{ext}"
    dst = uploads_dir / filename

    with open(dst, "wb") as f:
        f.write(content)

    public_url = f"{settings.uploads_public_path}/{filename}"
    # Return absolute URL so frontend doesn't resolve it against Next.js (localhost:3000)
    absolute_url = f"{settings.public_base_url}{public_url}"
    user.profile_photo_url = absolute_url
    db.commit()

    return {"profile_photo_url": absolute_url}


@router.get("/me", response_model=ProfileResponse)
def get_me(
    email: str = Query(..., description="User email (MVP identification)."),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="user_not_found")

    photo = getattr(user, "profile_photo_url", None)
    if photo and photo.startswith("/"):
        settings = get_settings()
        photo = f"{settings.public_base_url}{photo}"

    return ProfileResponse(
        user_id=user.user_id,
        email=user.email,
        role=user.role.value,
        full_name=user.full_name,
        room_id=user.room_id,
        profile_photo_url=photo,
    )


@router.patch("/me", response_model=ProfileResponse)
def update_me(
    payload: ProfileUpdateRequest,
    email: str = Query(..., description="User email (MVP identification)."),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="user_not_found")

    if payload.full_name is not None:
        user.full_name = payload.full_name

    db.commit()
    db.refresh(user)

    photo = getattr(user, "profile_photo_url", None)
    if photo and photo.startswith("/"):
        settings = get_settings()
        photo = f"{settings.public_base_url}{photo}"

    return ProfileResponse(
        user_id=user.user_id,
        email=user.email,
        role=user.role.value,
        full_name=user.full_name,
        room_id=user.room_id,
        profile_photo_url=photo,
    )


@router.post("/me/change-password")
def change_password(
    payload: ChangePasswordRequest,
    email: str = Query(..., description="User email (MVP identification)."),
    db: Session = Depends(get_db),
) -> dict:
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="user_not_found")

    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=422, detail="password_mismatch")

    if not _verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_current_password")

    user.password_hash = payload.new_password
    db.commit()

    return {"status": "ok"}
