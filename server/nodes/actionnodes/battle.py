"""
전투 노드
전투를 수행하는 노드입니다.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter


class BattleNode(BaseNode):
    """전투 노드 클래스"""

    @staticmethod
    @NodeExecutor("battle")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        전투를 수행합니다.

        Args:
            parameters: 노드 파라미터
                - enemy_type: 적 타입 (선택)
                - strategy: 전투 전략 (선택)

        Returns:
            실행 결과 딕셔너리
        """
        enemy_type = get_parameter(parameters, "enemy_type")
        strategy = get_parameter(parameters, "strategy")

        return {
            "action": "battle",
            "status": "completed",
            "output": {"enemy_type": enemy_type if enemy_type else None, "strategy": strategy if strategy else None},
        }
