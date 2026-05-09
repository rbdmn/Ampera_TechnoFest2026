from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    openai_api_key: str | None = None
    enable_scheduler: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
