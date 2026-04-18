from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    db_server: str = Field(alias="DB_SERVER")
    db_database: str = Field(alias="DB_DATABASE")
    db_driver: str = Field(alias="DB_DRIVER")

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding='utf-8',
        extra='ignore' 
    )

settings = Settings()