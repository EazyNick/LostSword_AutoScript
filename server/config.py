import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API 설정
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # 애플리케이션 설정
    GAME_WINDOW_TITLE: str = os.getenv("GAME_WINDOW_TITLE", "")
    GAME_SCREEN_WIDTH: int = int(os.getenv("GAME_SCREEN_WIDTH", "1920"))
    GAME_SCREEN_HEIGHT: int = int(os.getenv("GAME_SCREEN_HEIGHT", "1080"))
    
    # 자동화 설정
    AUTO_CLICK_DELAY: float = float(os.getenv("AUTO_CLICK_DELAY", "0.5"))
    AUTO_MOVE_DELAY: float = float(os.getenv("AUTO_MOVE_DELAY", "1.0"))
    SCREENSHOT_INTERVAL: float = float(os.getenv("SCREENSHOT_INTERVAL", "0.1"))
    
    # 로그 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/automation.log")

settings = Settings()
