"""
스크립트 관련 모델들
"""

from pydantic import BaseModel
from typing import List, Optional


class ScriptCreateRequest(BaseModel):
    """스크립트 생성 요청 모델"""
    name: str
    description: Optional[str] = ""


class ScriptUpdateRequest(BaseModel):
    """스크립트 업데이트 요청 모델"""
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: List[dict]
    connections: List[dict]


class ScriptResponse(BaseModel):
    """스크립트 응답 모델"""
    id: int
    name: str
    description: str
    created_at: str
    updated_at: str
    nodes: List[dict]
    connections: List[dict]
