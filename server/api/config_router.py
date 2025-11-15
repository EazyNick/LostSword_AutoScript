"""
설정 관련 API 라우터
환경 변수 및 서버 설정 정보 제공
"""

from fastapi import APIRouter
from log import log_manager

router = APIRouter(prefix="/api/config", tags=["config"])
logger = log_manager.logger

# main.py에서 DEV_MODE를 가져오기 위해 import
import os
import sys

# 프로젝트 루트 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def load_env():
    """프로젝트 루트의 .env 파일에서 환경 변수 로드"""
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    env_vars = {}
    
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    return env_vars

@router.get("/")
async def get_config():
    """서버 설정 정보 조회 (.env 파일 기반)"""
    try:
        env_vars = load_env()
        dev_mode = env_vars.get('DEV', 'false').lower() == 'true'
        
        logger.info(f"[API] 설정 조회 요청 - DEV_MODE: {dev_mode}")
        
        return {
            "dev_mode": dev_mode,
            "env": {
                "DEV": env_vars.get('DEV', 'false')
            }
        }
    except Exception as e:
        logger.error(f"[API] 설정 조회 실패: {str(e)}")
        # 에러 발생 시 기본값 반환
        return {
            "dev_mode": False,
            "env": {
                "DEV": "false"
            }
        }

