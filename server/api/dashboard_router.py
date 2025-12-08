"""
대시보드 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException, Request

from api.response_helpers import success_response
from db.database import db_manager
from log import log_manager
from models.response_models import SuccessResponse

router = APIRouter(prefix="/api", tags=["dashboard"])
logger = log_manager.logger


@router.get("/dashboard/stats", response_model=SuccessResponse)
async def get_dashboard_stats(request: Request) -> SuccessResponse:
    """대시보드 통계 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 대시보드 통계 조회 요청 - 클라이언트 IP: {client_ip}")

    try:
        # 통계 계산 및 업데이트
        stats = db_manager.calculate_and_update_dashboard_stats()
        logger.info(f"[API] 대시보드 통계 조회 성공: {stats}")
        return success_response(stats, "대시보드 통계 조회 완료")
    except Exception as e:
        logger.error(f"[API] 대시보드 통계 조회 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"대시보드 통계 조회 실패: {e!s}")
