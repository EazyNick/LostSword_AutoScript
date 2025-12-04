"""
실제 노드 종류 관련 API 라우터
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from config.action_node_types import get_action_node_config, get_action_node_types, get_all_action_node_types
from log import log_manager

router = APIRouter(prefix="/api", tags=["action-nodes"])
logger = log_manager.logger


@router.get("/action-node-types")
async def get_action_node_types_api(node_type: str | None = None) -> dict[str, Any]:
    """
    실제 노드 종류 목록을 가져옵니다.

    Args:
        node_type: 노드 타입 (선택적, 지정하면 해당 타입만 반환)

    Returns:
        실제 노드 종류 목록
    """
    try:
        if node_type:
            action_nodes = get_action_node_types(node_type)
            return {"success": True, "node_type": node_type, "action_nodes": action_nodes}
        all_types = get_all_action_node_types()
        return {"success": True, "action_nodes": all_types}
    except Exception as e:
        logger.error(f"실제 노드 종류 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"실제 노드 종류 조회 실패: {e!s}")


@router.get("/action-node-types/{node_type}/{action_node_type}")
async def get_action_node_config_api(node_type: str, action_node_type: str) -> dict[str, Any]:
    """
    특정 실제 노드 종류의 설정을 가져옵니다.

    Args:
        node_type: 노드 타입
        action_node_type: 실제 노드 종류

    Returns:
        노드 설정
    """
    try:
        config = get_action_node_config(node_type, action_node_type)
        if not config:
            raise HTTPException(
                status_code=404, detail=f"실제 노드 종류를 찾을 수 없습니다: {node_type}/{action_node_type}"
            )

        return {"success": True, "config": config}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"실제 노드 종류 설정 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"실제 노드 종류 설정 조회 실패: {e!s}")
