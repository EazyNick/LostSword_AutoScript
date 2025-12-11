"""
시작 노드
워크플로우의 시작점을 나타내는 노드입니다.
"""

from typing import Any

from log import log_manager
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_korea_time_str

logger = log_manager.logger


class StartNode(BaseNode):
    """시작 노드 클래스"""

    @staticmethod
    @NodeExecutor("start")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        시작 노드를 실행합니다.

        시작 노드는 워크플로우의 시작점을 나타내며,
        다음 노드에 워크플로우 시작 신호를 전달합니다.

        Args:
            parameters: 노드 파라미터 (사용되지 않음)

        Returns:
            실행 결과 딕셔너리
        """
        time_str = get_korea_time_str()

        # 시작 노드 실행 로그
        logger.info(f"[StartNode] 워크플로우 시작 - 시작 시간: {time_str}")

        return {
            "action": "start",
            "status": "completed",
            "output": {"time": time_str, "message": "워크플로우가 시작되었습니다."},
        }
