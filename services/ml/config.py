"""
Configuration settings for ML Service
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Environment
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3005",
        "https://documentiulia.ro",
        "https://www.documentiulia.ro",
    ]

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://accountech_app:AccTech2025Prod%40Secure@127.0.0.1:5432/documentiulia_v2"
    )

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # S3/MinIO Storage
    S3_ENDPOINT: str = os.getenv("S3_ENDPOINT", "http://localhost:9000")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "minioadmin")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "minioadmin")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "documentiulia")

    # OCR Settings
    TESSERACT_LANG: str = "ron+eng"  # Romanian + English
    OCR_CONFIDENCE_THRESHOLD: float = 0.7
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB

    # ML Model Settings
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "/var/www/documentiulia.ro/services/ml/models")
    RECEIPT_MODEL: str = "microsoft/layoutlmv3-base"

    # API Keys (for external services)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
