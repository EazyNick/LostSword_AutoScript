"""
스크립트 관련 모델들
"""

from typing import Any

from pydantic import BaseModel


class ScriptCreateRequest(BaseModel):
    """스크립트 생성 요청 모델"""

    name: str
    description: str | None = ""


class ScriptUpdateRequest(BaseModel):
    """스크립트 업데이트 요청 모델"""

    name: str | None = None
    description: str | None = None
    nodes: list[dict[str, Any]]
    connections: list[dict[str, Any]]


class ScriptResponse(BaseModel):
    """스크립트 응답 모델"""

    id: int
    name: str
    description: str
    created_at: str
    updated_at: str
    nodes: list[dict[str, Any]]
    connections: list[dict[str, Any]]
