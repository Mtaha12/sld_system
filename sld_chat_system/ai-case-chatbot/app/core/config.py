from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Legal Case Chatbot API"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    ENABLE_DOCS: bool = True
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "sld_system"
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = 5000
    MONGODB_CONNECT_TIMEOUT_MS: int = 10000
    MONGODB_MAX_POOL_SIZE: int = 100
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_MAX_IDLE_TIME_MS: int = 120000
    
    # Security
    AUTH_ENABLED: bool = False
    API_KEYS: list[str] = []
    
    # CORS
    CORS_ALLOW_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_REQUESTS: int = 120
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    CHAT_RATE_LIMIT_REQUESTS: int = 20
    CHAT_RATE_LIMIT_WINDOW_SECONDS: int = 60
    
    # LLM Configuration
    LLM_PROVIDER: str = "groq"  # "groq", "gemini", "mock"
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    @field_validator("API_KEYS", "CORS_ALLOW_ORIGINS", mode="before")
    @classmethod
    def parse_csv_values(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value
    
    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
