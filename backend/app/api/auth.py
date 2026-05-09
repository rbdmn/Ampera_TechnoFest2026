from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    # MVP placeholder (no JWT yet)
    if payload.email.endswith("@admin.com") and payload.password == "admin":
        return LoginResponse(access_token="dev-admin-token", role="admin")
    if payload.password == "user":
        return LoginResponse(access_token="dev-user-token", role="user")

    raise HTTPException(status_code=401, detail="invalid_credentials")
