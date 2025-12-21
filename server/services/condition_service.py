"""
조건 노드 처리 서비스
조건 노드 실행 전 전처리 로직을 담당합니다.
"""

from typing import Any

from log import log_manager
from services.node_execution_context import NodeExecutionContext

logger = log_manager.logger


class ConditionService:
    """조건 노드 처리 서비스 클래스"""

    @staticmethod
    def prepare_condition_node_data(node_data: dict[str, Any], context: NodeExecutionContext | None) -> dict[str, Any]:
        """
        조건 노드 실행 전 데이터를 준비합니다.
        이전 노드의 출력을 파라미터에 추가합니다.

        Args:
            node_data: 노드 데이터 딕셔너리
            context: 노드 실행 컨텍스트

        Returns:
            준비된 노드 데이터 딕셔너리
        """
        # 컨텍스트가 없으면 이전 노드 출력을 가져올 수 없으므로 그대로 반환
        if not context:
            logger.debug("[ConditionService] 컨텍스트가 없어 이전 노드 출력을 가져올 수 없습니다.")
            return node_data

        # 이전 노드의 출력을 파라미터에 추가
        # previous_result: 이전 노드의 실행 결과 (표준 형식: {action, status, output})
        previous_result = context.get_previous_node_result()
        # 이전 노드 결과가 있으면 처리
        if previous_result:
            # 이전 노드의 output 필드를 previous_output으로 추가
            # output 필드가 있으면 그것을 사용, 없으면 전체 결과를 사용
            node_data["previous_output"] = previous_result.get("output", previous_result)
            logger.debug(f"[ConditionService] 조건 노드에 이전 노드 출력 주입: {node_data.get('previous_output')}")
        else:
            # 이전 노드 결과가 없으면 경고 출력 (조건 평가 시 False 반환됨)
            logger.warning("[ConditionService] 이전 노드의 결과를 찾을 수 없습니다.")

        return node_data
