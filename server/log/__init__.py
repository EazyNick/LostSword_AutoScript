import os
from pathlib import Path

from config.server_config import settings

from .log_manager import LogManager

# server_config에서 로그 디렉토리 설정 가져오기 (server 폴더 기준 상대 경로)
log_dir = settings.LOG_DIR

# server 폴더 기준으로 절대 경로 변환
# server/log/__init__.py에서 server 폴더로 이동
server_dir = Path(__file__).resolve().parent.parent
log_directory = str(server_dir / log_dir)

# 디렉토리가 없으면 생성
os.makedirs(log_directory, exist_ok=True)

log_manager = LogManager(directory=log_directory)

__all__ = ["log_manager"]
