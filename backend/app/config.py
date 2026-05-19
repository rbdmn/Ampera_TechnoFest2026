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

    # --- Business defaults ---
    tariff_per_kwh: float = 1444.70
    default_limit_kwh: float = 50.0

    # --- LLM/Agent ---
    ollama_model: str = "llama3"
    ollama_base_url: str = "http://localhost:11434"
    ollama_api_key: str | None = None
    ollama_temperature: float = 0.0
    enable_scheduler: bool = False

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("ollama_base_url", "ollama_model", mode="before")
    @classmethod
    def _fallback_ollama_settings(cls, value: str | None, info):
        """Normalize missing or blank Ollama settings to safe local defaults."""
        if isinstance(value, str):
            value = value.strip()
        if value:
            return value

        if info.field_name == "ollama_base_url":
            return "http://localhost:11434"
        return "llama3"


@lru_cache
def get_settings() -> Settings:
    return Settings()
