from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    app_name: str = "SharkIQ"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "dev-secret-key"
    allowed_origins: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://sharkiq:sharkiq@localhost:5432/sharkiq"
    database_url_sync: str = "postgresql+psycopg2://sharkiq:sharkiq@localhost:5432/sharkiq"

    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

    chroma_persist_dir: str = "./storage/chroma"
    chroma_host: str = ""
    chroma_port: str = ""

    # --- LangSmith (tracing/debugging for LangChain & LangGraph runs) ---
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "SharkIQ"
    langchain_endpoint: str = "https://api.smith.langchain.com"

    # --- Hugging Face Hub (secondary, open-source model signal) ---
    huggingfacehub_api_token: str = ""
    hf_sentiment_model: str = "distilbert-base-uncased-finetuned-sst-2-english"

    upload_dir: str = "./storage/uploads"
    reports_dir: str = "./storage/reports"
    max_upload_size_mb: int = 25

    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    log_level: str = "INFO"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
