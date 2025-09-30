"""
API 패키지 초기화 파일
"""

from .action_router import router as action_router
from .script_router import router as script_router
from .game_router import router as game_router

__all__ = [
    "action_router",
    "script_router", 
    "game_router"
]
