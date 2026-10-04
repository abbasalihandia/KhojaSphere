"""Application configuration. Everything comes from environment variables / .env."""
from __future__ import annotations

import logging
import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
log = logging.getLogger("khojasphere.config")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"  # development | test | production
    database_url: str = f"sqlite:///{BASE_DIR / 'khojasphere.db'}"

    # Auth
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    password_reset_expire_minutes: int = 30
    bcrypt_rounds: int = 12

    # URLs / CORS (FRONTEND_URL may be a comma separated list)
    frontend_url: str = "http://localhost:8443,http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Uploads
    storage_backend: str = "local"
    upload_dir: str = str(BASE_DIR / "uploads")
    max_upload_mb: int = 5
    max_image_dimension: int = 1600

    # AI / Ollama (all optional)
    ai_enabled: bool = True
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_timeout_seconds: float = 25.0
    semantic_search_enabled: bool = True

    # Email (optional). Without SMTP the dev outbox is used outside production.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "KhojaSphere <no-reply@khojasphere.local>"
    dev_outbox_dir: str = str(BASE_DIR / "dev_outbox")

    # Rate limiting (in-memory; use a shared store if you run several instances)
    rate_limit_enabled: bool = True

    # Seed script inputs (never hardcoded)
    admin_email: str = ""
    admin_password: str = ""
    seed_password: str = ""

    @field_validator("database_url")
    @classmethod
    def _normalise_db_url(cls, v: str) -> str:
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            v = "postgresql+psycopg://" + v[len("postgresql://"):]
        return v

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_url.split(",") if o.strip()]

    @property
    def primary_frontend_url(self) -> str:
        return (self.cors_origins or ["http://localhost:8443"])[0]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    def model_post_init(self, __context) -> None:
        if not self.jwt_secret:
            if self.is_production:
                raise RuntimeError("JWT_SECRET must be set when APP_ENV=production")
            object.__setattr__(self, "jwt_secret", secrets.token_urlsafe(48))
            log.warning("JWT_SECRET not set: using an ephemeral secret. Logins will not survive a restart.")
        elif self.is_production and len(self.jwt_secret) < 32:
            raise RuntimeError("JWT_SECRET must be at least 32 characters in production")


@lru_cache
def get_settings() -> Settings:
    return Settings()
