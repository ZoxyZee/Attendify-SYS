from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 5000
    node_env: str = "development"
    mongodb_uri: str = "mongodb://127.0.0.1:27017/attendify"
    client_url: str = "http://localhost:5173"
    jwt_secret: str = "replace_with_long_random_secret"
    jwt_expires_in_days: int = 30
    rate_limit_times: int = 200
    rate_limit_seconds: int = 900

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

    