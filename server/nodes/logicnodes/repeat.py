"""
반복 노드
아래에 연결된 노드들을 지정한 횟수만큼 반복 실행하는 노드입니다.
"""

from typing import Any

from log import log_manager
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter

logger = log_manager.logger


class RepeatNode(BaseNode):
    """반복 노드 클래스"""

    @staticmethod
    @NodeExecutor("repeat")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        반복 노드를 실행합니다.
        실제 반복 실행은 워크플로우 실행 엔진에서 처리됩니다.

        Args:
            parameters: 노드 파라미터
                - repeat_count: 반복 횟수

        Returns:
            실행 결과 딕셔너리
            - repeat_count: 설정된 반복 횟수
            - completed: 반복 완료 여부 (항상 True, 실제 반복은 엔진에서 처리)
        """
        # 파라미터 추출
        # repeat_count: 반복 횟수 (기본값: 1)
        repeat_count = get_parameter(parameters, "repeat_count", default=1)

        # 반복 횟수 검증
        # repeat_count가 숫자가 아니거나 1보다 작으면 기본값 1 사용
        if not isinstance(repeat_count, (int, float)) or repeat_count < 1:
            logger.warning(f"[RepeatNode] 잘못된 반복 횟수: {repeat_count}, 기본값 1 사용")
            repeat_count = 1

        # repeat_count를 정수로 변환 (소수점 제거)
        repeat_count = int(repeat_count)

        logger.info(f"[RepeatNode] 반복 노드 실행 - 반복 횟수: {repeat_count}")

        return {
            "action": "repeat",
            "status": "completed",
            "output": {
                "repeat_count": repeat_count,
                "completed": True,
                "iterations": [],  # 실제 반복 결과는 워크플로우 실행 엔진에서 채움
            },
        }
