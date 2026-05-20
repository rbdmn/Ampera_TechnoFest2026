from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "Ampera AI"
    app_version: str = "0.1.0"
    environment: str = "development"

    # --- Database ---
    database_url: str | None = None  # e.g. postgresql+psycopg://user:pass@localhost:5432/ampera

    # --- Auth / Secrets ---
    secret_key: str = "change-me"

    # --- CORS ---
    # Pisah dengan koma jika lebih dari satu, contoh: https://app.vercel.app,http://localhost:3000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # --- Business defaults ---
    tariff_per_kwh: float = 1444.70
    default_limit_kwh: float = 50.0

    # --- LLM/Agent (Groq) ---
    llm_model: str = "openai/gpt-oss-120b"
    groq_api_key: str | None = None
    llm_temperature: float = 0.0
    enable_scheduler: bool = False

    # --- Uploads (profile photo) ---
    # Store uploads inside backend dir to avoid cwd-dependent paths.
    uploads_dir: str = str((BACKEND_DIR / "uploads").resolve())
    uploads_public_path: str = "/static"

    # Base URL used when returning absolute URLs to clients (so Next.js doesn't try localhost:3000).
    public_base_url: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("llm_model", mode="before")
    @classmethod
    def _fallback_llm_model(cls, value: str | None):
        if isinstance(value, str):
            value = value.strip()
        if value:
            return value
        return "openai/gpt-oss-120b"

    @field_validator("uploads_dir", mode="before")
    @classmethod
    def _normalize_uploads_dir(cls, value: str | None):
        # Allow env to override with relative/absolute; normalize relative to backend dir.
        if not value:
            return str((BACKEND_DIR / "uploads").resolve())
        p = Path(str(value))
        if not p.is_absolute():
            p = (BACKEND_DIR / p).resolve()
        return str(p)

    @field_validator("public_base_url", mode="before")
    @classmethod
    def _normalize_public_base_url(cls, value: str | None):
        if not value:
            return "http://localhost:8000"
        v = str(value).strip().rstrip("/")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
