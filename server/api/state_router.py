"""
애플리케이션 상태 관련 API 라우터
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["state"])


@router.get("/state")
async def get_application_state() -> dict[str, Any]:
    """
    현재 애플리케이션 상태를 반환합니다.
    """
    return {"application_running": True, "current_scene": "main_menu", "status": "active"}
