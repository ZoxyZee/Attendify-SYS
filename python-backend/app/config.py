from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 5000
    node_env: str = "development"
    mongodb_uri: str = "mongodb://127.0.0.1:27017/attendify"
    allow_memory_db: bool = False
    client_url: str = "http://localhost:5173"
    jwt_secret: str = "replace_with_long_random_secret"
    jwt_expires_in_days: int = 30
    rate_limit_times: int = 200
    rate_limit_seconds: int = 900

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_client_urls(self) -> list[str]:
        return [origin.strip() for origin in self.client_url.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        if self.node_env.lower() not in {"development", "dev", "local"}:
            return None

        return r"^http://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$"

settings = Settings()

    
