from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    secret_key: str  # Required — set SECRET_KEY in .env
    sqlite_path: str = "./data/homelab.db"
    config_path: str = "./config.yml"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # JWT
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h


settings = Settings()
