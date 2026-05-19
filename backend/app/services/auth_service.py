from __future__ import annotations

import base64
import hmac
import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db.models import User

_bearer = HTTPBearer(auto_error=False)


def create_token(user_id: str, role: str) -> str:
    secret = get_settings().secret_key
    payload = f"{user_id}:{role}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return f"{b64}.{sig}"


def _decode_token(token: str) -> tuple[str, str]:
    try:
        b64, sig = token.rsplit(".", 1)
        padding = "=" * (-len(b64) % 4)
        payload = base64.urlsafe_b64decode((b64 + padding).encode()).decode()
        user_id, role = payload.split(":", 1)
        secret = get_settings().secret_key
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        return user_id, role
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not_authenticated")
    user_id, _ = _decode_token(credentials.credentials)
    user = db.scalar(select(User).where(User.user_id == user_id, User.is_active.is_(True)))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_only")
    return current_user
