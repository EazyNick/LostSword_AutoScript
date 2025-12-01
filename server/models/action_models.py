"""
액션 관련 모델들
"""

from pydantic import BaseModel
from typing import List, Optional


class ActionRequest(BaseModel):
    """액션 실행 요청 모델"""
    action_type: str
    parameters: Optional[dict] = {}


class ActionResponse(BaseModel):
    """액션 실행 응답 모델"""
    success: bool
    message: str
    data: Optional[dict] = None


class NodeExecutionRequest(BaseModel):
    """노드 실행 요청 모델"""
    nodes: List[dict]
    execution_mode: str = "sequential"  # sequential, parallel
