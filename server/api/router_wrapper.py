"""
API 라우터 래퍼
공통 에러 처리 및 응답 포맷팅을 제공합니다.
"""

from functools import wraps
from typing import Callable, Any
from fastapi import HTTPException
from log import log_manager

logger = log_manager.logger


def api_handler(func: Callable) -> Callable:
    """
    API 엔드포인트 핸들러를 래핑하는 데코레이터
    
    공통 기능:
    - HTTPException 자동 재발생
    - 일반 예외를 HTTPException으로 변환
    - 에러 로깅
    
    Usage:
        @router.get("/endpoint")
        @api_handler
        async def my_endpoint():
            # 엔드포인트 로직
            return result
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # HTTPException은 그대로 재발생
            raise
        except Exception as e:
            # 일반 예외는 로깅 후 HTTPException으로 변환
            logger.error(f"API 엔드포인트 오류 ({func.__name__}): {e}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")
    
    return wrapper

