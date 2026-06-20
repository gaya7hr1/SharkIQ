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

    # --- Groq (chat model provider; swapped in to avoid OpenAI quota limits) ---
    groq_api_key: str = ""
    groq_chat_model: str = "llama-3.1-8b-instant"
    # Minimum seconds between outbound Groq calls, shared by every LangChain agent call
    # in the workflow (6 per run). Confirmed empirically (from real 429 bodies) that on
    # this account llama-3.1-8b-instant is capped at 6000 TPM — *lower* than
    # llama-3.3-70b-versatile's 12000 TPM, despite being the smaller model. At ~1500-1700
    # tokens/call that's a sustainable rate of ~1 call every 16-17s; 16.0 leaves a small
    # margin. Re-tune if you change models or Groq adjusts your account's limits.
    groq_min_request_interval_seconds: float = 16.0

    # --- Local embeddings (Hugging Face sentence-transformers, runs on CPU, no API key/quota) ---
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

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
