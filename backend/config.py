from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    BAG_API_KEY: str
    BASE_URL: str = "https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/"
    DB_FILE_PATH: str = "/app/db/heatstressmeasures.sqlite"
    EP_ONLINE_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()