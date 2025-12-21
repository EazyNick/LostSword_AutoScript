"""
액션 관련 모델들
"""

from typing import Any

from pydantic import BaseModel, Field, field_validator

from config.nodes_config import get_action_node_types


class ActionRequest(BaseModel):
    """액션 실행 요청 모델"""

    action_type: str = Field(..., min_length=1, max_length=100)
    parameters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        """허용된 액션 타입만 허용 (서버 노드 설정 기반)"""
        allowed_actions = get_action_node_types()
        if v not in allowed_actions:
            raise ValueError(f"액션 타입은 다음 중 하나여야 합니다: {', '.join(allowed_actions)}")
        return v


class ActionResponse(BaseModel):
    """액션 실행 응답 모델"""

    success: bool
    message: str
    data: dict[str, Any] | None = None


class NodeExecutionRequest(BaseModel):
    """노드 실행 요청 모델"""

    nodes: list[dict[str, Any]]
    execution_mode: str = "sequential"  # sequential only
    total_nodes: int | None = None  # 전체 노드 개수 (로깅용)
    current_node_index: int | None = None  # 현재 노드 순번 (0부터 시작, 로깅용)
    previous_node_result: dict[str, Any] | None = None  # 이전 노드의 실행 결과 (데이터 전달용)
    repeat_info: dict[str, Any] | None = None  # 반복 노드 정보 (반복 횟수, 현재 반복 번호 등)
    execution_id: str | None = None  # 실행 ID (반복 노드 실행 시 같은 execution_id 사용)
    script_id: int | None = None  # 스크립트 ID (반복 노드 실행 시 같은 script_id 사용)
