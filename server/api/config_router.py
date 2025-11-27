"""
설정 관련 API 라우터
환경 변수 및 서버 설정 정보 제공
사용자 설정 저장/로드 기능 포함
"""

from fastapi import APIRouter, HTTPException, Request, Body
from typing import Dict, Any
from db.database import db_manager
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

@router.get("/user-settings")
async def get_user_settings(request: Request):
    """모든 사용자 설정 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 사용자 설정 조회 요청 - 클라이언트 IP: {client_ip}")
    
    try:
        settings = db_manager.get_all_user_settings()
        logger.info(f"[API] 사용자 설정 조회 성공 - 설정 개수: {len(settings)}개")
        return settings
    except Exception as e:
        logger.error(f"[API] 사용자 설정 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사용자 설정 조회 실패: {str(e)}")

@router.get("/user-settings/{setting_key}")
async def get_user_setting(setting_key: str, request: Request):
    """특정 사용자 설정 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 사용자 설정 조회 요청 - 키: {setting_key}, 클라이언트 IP: {client_ip}")
    
    try:
        value = db_manager.get_user_setting(setting_key)
        if value is None:
            # 설정이 없는 것은 정상적인 경우이므로 info 레벨로 로깅
            logger.info(f"[API] 사용자 설정을 찾을 수 없음 (처음 사용 시) - 키: {setting_key}")
            raise HTTPException(status_code=404, detail=f"설정 '{setting_key}'를 찾을 수 없습니다.")
        
        logger.info(f"[API] 사용자 설정 조회 성공 - 키: {setting_key}")
        return {"key": setting_key, "value": value}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] 사용자 설정 조회 실패 - 키: {setting_key}, 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사용자 설정 조회 실패: {str(e)}")

@router.put("/user-settings/{setting_key}")
async def save_user_setting(setting_key: str, request: Request, body: Dict[str, Any] = Body(...)):
    """사용자 설정 저장"""
    client_ip = request.client.host if request.client else "unknown"
    setting_value = body.get("value", "")
    
    logger.info(f"[API] 사용자 설정 저장 요청 - 키: {setting_key}, 값: {setting_value}, 클라이언트 IP: {client_ip}")
    
    try:
        # 값이 문자열이 아니면 JSON으로 변환
        if not isinstance(setting_value, str):
            import json
            setting_value = json.dumps(setting_value, ensure_ascii=False)
        
        success = db_manager.save_user_setting(setting_key, setting_value)
        if success:
            logger.info(f"[API] 사용자 설정 저장 성공 - 키: {setting_key}")
            return {"message": "설정이 저장되었습니다.", "key": setting_key, "value": setting_value}
        else:
            raise HTTPException(status_code=500, detail="설정 저장 실패")
    except Exception as e:
        logger.error(f"[API] 사용자 설정 저장 실패 - 키: {setting_key}, 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사용자 설정 저장 실패: {str(e)}")

@router.delete("/user-settings/{setting_key}")
async def delete_user_setting(setting_key: str, request: Request):
    """사용자 설정 삭제"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 사용자 설정 삭제 요청 - 키: {setting_key}, 클라이언트 IP: {client_ip}")
    
    try:
        success = db_manager.delete_user_setting(setting_key)
        if success:
            logger.info(f"[API] 사용자 설정 삭제 성공 - 키: {setting_key}")
            return {"message": "설정이 삭제되었습니다.", "key": setting_key}
        else:
            raise HTTPException(status_code=404, detail=f"설정 '{setting_key}'를 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] 사용자 설정 삭제 실패 - 키: {setting_key}, 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=f"사용자 설정 삭제 실패: {str(e)}")

