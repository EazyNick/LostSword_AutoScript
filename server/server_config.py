import os
from dotenv import load_dotenv
from pathlib import Path

# 프로젝트 루트 디렉토리의 .env 파일 경로 지정
# server/server_config.py에서 루트 디렉토리로 이동 (상위 디렉토리)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    # 환경 설정
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "prd").lower()
    DEV_MODE: bool = os.getenv("ENVIRONMENT", "prd").lower() == "dev"
    
    # API 설정
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # 애플리케이션 설정
    WINDOW_TITLE: str = os.getenv("WINDOW_TITLE", "")
    SCREEN_WIDTH: int = int(os.getenv("SCREEN_WIDTH", "1920"))
    SCREEN_HEIGHT: int = int(os.getenv("SCREEN_HEIGHT", "1080"))
    
    # 자동화 설정
    AUTO_CLICK_DELAY: float = float(os.getenv("AUTO_CLICK_DELAY", "0.5"))
    AUTO_MOVE_DELAY: float = float(os.getenv("AUTO_MOVE_DELAY", "1.0"))
    SCREENSHOT_INTERVAL: float = float(os.getenv("SCREENSHOT_INTERVAL", "0.1"))
    
    # 로그 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR: str = os.getenv("LOG_DIR", "log/logs")

settings = Settings()
