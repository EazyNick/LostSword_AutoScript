"""
대기 노드
지정된 시간만큼 대기하는 노드입니다.
"""

import asyncio
from typing import Any

from log import log_manager
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter

logger = log_manager.logger


class WaitNode(BaseNode):
    """대기 노드 클래스"""

    @staticmethod
    @NodeExecutor("wait")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        지정된 시간만큼 대기합니다.

        Args:
            parameters: 노드 파라미터
                - wait_time: 대기 시간 (초, 기본값: 1)

        Returns:
            실행 결과 딕셔너리
        """
        # wait_time 추출 및 검증
        # wait_time_raw: 원본 대기 시간 값 (다양한 타입 가능)
        wait_time_raw = get_parameter(parameters, "wait_time", default=1)
        # wait_time_raw가 None이면 기본값 1 사용
        if wait_time_raw is None:
            wait_time_raw = 1
        try:
            # wait_time_raw를 float로 변환
            wait_time = float(wait_time_raw)
            # wait_time이 음수이면 0으로 설정 (음수 대기는 불가능)
            if wait_time < 0:
                wait_time = 0
        except (ValueError, TypeError):
            # 변환 실패 시 기본값 1 사용
            wait_time = 1

        # 대기 시작 로그
        logger.info(f"[WaitNode] {wait_time}초 대기 시작")

        # 비동기 대기
        await asyncio.sleep(wait_time)

        # 대기 완료 로그
        logger.info(f"[WaitNode] {wait_time}초 대기 완료")

        return {
            "action": "wait",
            "wait_time": wait_time,
            "status": "completed",
            "message": f"{wait_time}초 대기 완료",
            "output": {"wait_time": wait_time},
        }
