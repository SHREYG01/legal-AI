from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    upload_dir: str = "./uploads"
    max_upload_mb: int = 15
    database_url: str = ""
    chroma_persist_dir: str = "./chroma_db"
    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-5"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: int = 800
    chunk_overlap: int = 100
    classification_model: str = "facebook/bart-large-mnli"
    fine_tuned_model_path: str = ""
    risk_model_path: str = ""  # future: path to a trained risk-classification model, if any

    class Config:
        env_file = ".env"


settings = Settings()
