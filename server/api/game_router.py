"""
게임 상태 관련 API 라우터
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["game"])


@router.get("/game-state")
async def get_game_state():
    """
    현재 게임 상태를 반환합니다.
    """
    return {
        "game_running": True,
        "current_scene": "main_menu",
        "player_level": 1,
        "inventory_count": 0
    }
