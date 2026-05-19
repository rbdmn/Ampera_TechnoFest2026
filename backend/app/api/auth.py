from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import LoginRequest, LoginResponse

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


def _make_dev_token(user_id: str, role: str) -> str:
    digest = hashlib.sha256(f"{user_id}:{role}".encode("utf-8")).hexdigest()[:24]
    return f"dev-{role}-{digest}"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    if not _mvp_verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    return LoginResponse(access_token=_make_dev_token(user.user_id, user.role.value), role=user.role.value)
