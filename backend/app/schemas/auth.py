from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=128)
    room_id: str = Field(..., min_length=1, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


class RegisterResponse(BaseModel):
    user_id: str
    tenant_id: str
    room_id: str
    email: EmailStr
    role: str


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=128)


class ProfileResponse(BaseModel):
    user_id: str
    email: EmailStr
    role: str
    full_name: str | None = None
    room_id: str | None = None
    profile_photo_url: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)
    confirm_new_password: str = Field(..., min_length=6)
