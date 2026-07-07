from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "development"
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "poultry_erp"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    # Aiven CA certificate — paste the full PEM text as an env var on Render
    DB_SSL_CA: str = ""

    JWT_SECRET: str = "dev_secret_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: str = "*"
    ANTHROPIC_API_KEY: str = ""
    RUN_STARTUP_MIGRATIONS: bool = True

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if not origins or origins == ["*"]:
            return ["*"]
        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"prod", "production"}

    def validate_runtime(self) -> None:
        if not self.is_production:
            return
        if self.JWT_SECRET == "dev_secret_change_in_production":
            raise RuntimeError("JWT_SECRET must be set to a secure value in production")
        if self.cors_origins_list == ["*"]:
            raise RuntimeError("CORS_ORIGINS must list trusted frontend origins in production")


settings = Settings()
