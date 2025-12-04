"""
이동 노드
캐릭터를 이동시키는 노드입니다.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter


class MoveNode(BaseNode):
    """이동 노드 클래스"""

    @staticmethod
    @NodeExecutor("move")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        캐릭터를 이동시킵니다.

        Args:
            parameters: 노드 파라미터
                - direction: 이동 방향 (기본값: "forward")
                - distance: 이동 거리 (기본값: 1)

        Returns:
            실행 결과 딕셔너리
        """
        direction = get_parameter(parameters, "direction", default="forward")
        distance = get_parameter(parameters, "distance", default=1)

        return {
            "action": "move",
            "status": "completed",
            "output": {"direction": direction if direction else None, "distance": distance if distance else None},
        }
