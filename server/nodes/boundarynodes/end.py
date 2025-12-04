"""
종료 노드
워크플로우의 종료점을 나타내는 노드입니다.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_korea_time_str


class EndNode(BaseNode):
    """종료 노드 클래스"""

    @staticmethod
    @NodeExecutor("end")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        종료 노드를 실행합니다.

        종료 노드는 워크플로우의 종료점을 나타내며,
        워크플로우 실행을 종료합니다.

        Args:
            parameters: 노드 파라미터 (사용되지 않음)

        Returns:
            실행 결과 딕셔너리
        """
        time_str = get_korea_time_str()

        return {
            "action": "end",
            "status": "completed",
            "output": {"time": time_str, "message": "워크플로우가 종료되었습니다."},
        }
