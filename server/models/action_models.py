"""
액션 관련 모델들
"""

from typing import Any

from pydantic import BaseModel


class ActionRequest(BaseModel):
    """액션 실행 요청 모델"""

    action_type: str
    parameters: dict[str, Any] | None = {}


class ActionResponse(BaseModel):
    """액션 실행 응답 모델"""

    success: bool
    message: str
    data: dict[str, Any] | None = None


class NodeExecutionRequest(BaseModel):
    """노드 실행 요청 모델"""

    nodes: list[dict[str, Any]]
    execution_mode: str = "sequential"  # sequential, parallel
