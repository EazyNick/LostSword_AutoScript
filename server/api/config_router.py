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

from server_config import settings

@router.get("/")
async def get_config():
    """서버 설정 정보 조회 (server_config 기반)"""
    logger.info(f"[API] 설정 조회 요청 - ENVIRONMENT: {settings.ENVIRONMENT}, DEV_MODE: {settings.DEV_MODE}")
    
    return {
        "dev_mode": settings.DEV_MODE,
        "environment": settings.ENVIRONMENT,
        "env": {
            "ENVIRONMENT": settings.ENVIRONMENT
        }
    }

@router.get("/user-settings")
async def get_user_settings(request: Request):
    """모든 사용자 설정 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 사용자 설정 조회 요청 - 클라이언트 IP: {client_ip}")
    
    try:
        user_settings = db_manager.get_all_user_settings()
        logger.info(f"[API] 사용자 설정 조회 성공 - 설정 개수: {len(user_settings)}개")
        return user_settings
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

