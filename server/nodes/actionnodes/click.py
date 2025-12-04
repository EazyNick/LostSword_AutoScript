"""
클릭 노드
화면의 특정 좌표를 클릭하는 노드입니다.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter


class ClickNode(BaseNode):
    """클릭 노드 클래스"""

    @staticmethod
    @NodeExecutor("click")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        화면의 특정 좌표를 클릭합니다.

        Args:
            parameters: 노드 파라미터
                - x: X 좌표 (기본값: 0)
                - y: Y 좌표 (기본값: 0)

        Returns:
            실행 결과 딕셔너리
        """
        x = get_parameter(parameters, "x", default=0)
        y = get_parameter(parameters, "y", default=0)

        return {"action": "click", "status": "completed", "output": {"x": x, "y": y}}
