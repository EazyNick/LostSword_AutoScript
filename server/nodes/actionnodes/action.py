"""
기본 액션 노드
범용 액션을 수행하는 노드입니다.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter


class ActionNode(BaseNode):
    """기본 액션 노드 클래스"""

    @staticmethod
    @NodeExecutor("action")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        기본 액션을 수행합니다.

        Args:
            parameters: 노드 파라미터
                - action: 액션 이름 (선택)

        Returns:
            실행 결과 딕셔너리
        """
        action_name = get_parameter(parameters, "action")

        return {"action": "action", "status": "completed", "output": {"name": action_name if action_name else None}}
