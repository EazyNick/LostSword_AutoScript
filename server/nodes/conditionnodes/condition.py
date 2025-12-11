"""
조건 노드
이전 노드의 출력을 받아서 조건을 평가하고 결과를 반환하는 노드입니다.
"""

from typing import Any

from log import log_manager
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter

logger = log_manager.logger


class ConditionNode(BaseNode):
    """조건 노드 클래스"""

    @staticmethod
    @NodeExecutor("condition")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        이전 노드의 출력을 받아서 조건을 평가합니다.

        Args:
            parameters: 노드 파라미터
                - condition_type: 조건 타입 (equals, contains, greater_than 등)
                - field_path: 이전 노드 출력에서 비교할 필드 경로 (예: "output.value", "output.status")
                - compare_value: 비교할 값
                - previous_output: 이전 노드의 출력 (자동으로 주입됨)

        Returns:
            실행 결과 딕셔너리
            - result: True 또는 False
        """
        condition_type = get_parameter(parameters, "condition_type", default="equals")
        field_path = get_parameter(parameters, "field_path", default="")
        compare_value = get_parameter(parameters, "compare_value", default="")
        previous_output = get_parameter(parameters, "previous_output", default=None)

        # 조건 평가 시작 로그
        logger.info(
            f"[ConditionNode] 조건 평가 시작 - 타입: {condition_type}, 필드 경로: {field_path or '(전체 출력)'}, "
            f"비교값: {compare_value}"
        )

        # 이전 노드 출력이 없으면 False 반환
        if previous_output is None:
            logger.warning("[ConditionNode] 이전 노드의 출력이 없습니다. 조건 평가 결과: False")
            return {
                "action": "condition",
                "status": "completed",
                "output": {"result": False, "reason": "이전 노드의 출력이 없습니다."},
            }

        # 필드 경로가 있으면 해당 필드의 값을 가져옴
        actual_value = previous_output
        if field_path:
            try:
                # 필드 경로를 점(.)으로 분리하여 중첩된 딕셔너리 접근
                keys = field_path.split(".")
                for key in keys:
                    if isinstance(actual_value, dict):
                        actual_value = actual_value.get(key)
                    else:
                        actual_value = None
                        break
            except Exception:
                actual_value = None

        # 조건 평가
        result = ConditionNode._evaluate_condition(condition_type, actual_value, compare_value)

        # 조건 평가 결과 로그
        logger.info(
            f"[ConditionNode] 조건 평가 완료 - 입력값: {actual_value}, 비교값: {compare_value}, "
            f"결과: {result} ({'True' if result else 'False'})"
        )

        return {
            "action": "condition",
            "status": "completed",
            "output": {
                "result": result,
                "condition_type": condition_type,
                "field_path": field_path,
                "actual_value": actual_value,
                "compare_value": compare_value,
            },
        }

    @staticmethod
    def _evaluate_condition(condition_type: str, actual_value: Any, compare_value: Any) -> bool:
        """
        조건을 평가합니다.

        Args:
            condition_type: 조건 타입
            actual_value: 실제 값 (이전 노드 출력에서 추출한 값)
            compare_value: 비교할 값

        Returns:
            조건을 만족하면 True, 아니면 False
        """
        if condition_type == "equals":
            return str(actual_value) == str(compare_value)
        if condition_type == "not_equals":
            return str(actual_value) != str(compare_value)
        if condition_type == "contains":
            return str(compare_value) in str(actual_value)
        if condition_type == "not_contains":
            return str(compare_value) not in str(actual_value)
        if condition_type == "greater_than":
            try:
                return float(actual_value) > float(compare_value)
            except (ValueError, TypeError):
                return False
        elif condition_type == "less_than":
            try:
                return float(actual_value) < float(compare_value)
            except (ValueError, TypeError):
                return False
        elif condition_type == "greater_or_equal":
            try:
                return float(actual_value) >= float(compare_value)
            except (ValueError, TypeError):
                return False
        elif condition_type == "less_or_equal":
            try:
                return float(actual_value) <= float(compare_value)
            except (ValueError, TypeError):
                return False
        elif condition_type == "is_empty":
            return (
                actual_value is None
                or actual_value == ""
                or (isinstance(actual_value, (list, dict)) and len(actual_value) == 0)
            )
        elif condition_type == "is_not_empty":
            return (
                actual_value is not None
                and actual_value != ""
                and not (isinstance(actual_value, (list, dict)) and len(actual_value) == 0)
            )
        else:
            # 알 수 없는 조건 타입은 False 반환
            return False
