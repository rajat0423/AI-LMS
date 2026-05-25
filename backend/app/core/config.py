# /app/core/config.py
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Groq AI settings
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_TIMEOUT_SECONDS: float = 30.0

    # Optional per-feature model overrides
    EMAIL_GROQ_MODEL: str = ""
    EMAIL_GROQ_TEMPERATURE: float = 0.5
    EMAIL_GROQ_MAX_TOKENS: int = 400
    EMAIL_ASSIST_GROQ_MODEL: str = ""
    EMAIL_ASSIST_GROQ_TEMPERATURE: float = 0.35
    EMAIL_ASSIST_GROQ_MAX_TOKENS: int = 650
    BLOG_GROQ_MODEL: str = ""
    BLOG_GROQ_TEMPERATURE: float = 0.4
    BLOG_GROQ_MAX_TOKENS: int = 900
    CHAT_GROQ_MODEL: str = ""
    CHAT_GROQ_TEMPERATURE: float = 0.7
    CHAT_GROQ_MAX_TOKENS: int = 800

    CAREER_UPLOAD_DIR: str = str(BASE_DIR / "uploads" / "career")
    CAREER_UPLOAD_MAX_BYTES: int = 5 * 1024 * 1024
    STRIPE_API_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
