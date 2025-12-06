"""
대시보드 관련 API 라우터
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from db.database import db_manager
from log import log_manager

router = APIRouter(prefix="/api", tags=["dashboard"])
logger = log_manager.logger


@router.get("/dashboard/stats", response_model=dict)
async def get_dashboard_stats(request: Request) -> dict[str, Any]:
    """대시보드 통계 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 대시보드 통계 조회 요청 - 클라이언트 IP: {client_ip}")

    try:
        # 통계 계산 및 업데이트
        stats = db_manager.calculate_and_update_dashboard_stats()
        logger.info(f"[API] 대시보드 통계 조회 성공: {stats}")
        return stats
    except Exception as e:
        logger.error(f"[API] 대시보드 통계 조회 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"대시보드 통계 조회 실패: {e!s}")

