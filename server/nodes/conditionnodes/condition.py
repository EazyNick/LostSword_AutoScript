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
        # 파라미터 추출
        # condition_type: 조건 타입 (equals, contains, greater_than 등)
        condition_type = get_parameter(parameters, "condition_type", default="equals")
        # field_path: 이전 노드 출력에서 비교할 필드 경로 (예: "output.value", "output.status")
        field_path = get_parameter(parameters, "field_path", default="")
        # compare_value: 비교할 값 (문자열, 숫자 등)
        compare_value = get_parameter(parameters, "compare_value", default="")
        # previous_output: 이전 노드의 출력 (자동으로 주입됨)
        previous_output = get_parameter(parameters, "previous_output", default=None)

        # 조건 평가 시작 로그
        logger.info(
            f"[ConditionNode] 조건 평가 시작 - 타입: {condition_type}, 필드 경로: {field_path or '(전체 출력)'}, "
            f"비교값: {compare_value}"
        )

        # 이전 노드 출력이 없으면 False 반환
        # 이전 노드의 출력이 없으면 조건 평가 불가능하므로 False 반환
        if previous_output is None:
            logger.warning("[ConditionNode] 이전 노드의 출력이 없습니다. 조건 평가 결과: False")
            return {
                "action": "condition",
                "status": "completed",
                "output": {"result": False, "reason": "이전 노드의 출력이 없습니다."},
            }

        # 필드 경로가 있으면 해당 필드의 값을 가져옴
        # actual_value: 실제 비교할 값 (필드 경로를 따라 추출한 값 또는 전체 출력)
        actual_value = previous_output
        # field_path가 있으면 중첩된 딕셔너리에서 값을 추출
        if field_path:
            try:
                # 필드 경로를 점(.)으로 분리하여 중첩된 딕셔너리 접근
                # 예: "output.value" -> ["output", "value"]
                keys = field_path.split(".")
                # 각 키를 순회하며 중첩된 딕셔너리에서 값을 추출
                for key in keys:
                    # actual_value가 dict이면 해당 키의 값을 가져옴
                    if isinstance(actual_value, dict):
                        actual_value = actual_value.get(key)
                    else:
                        # dict가 아니면 더 이상 접근 불가능하므로 None으로 설정하고 중단
                        actual_value = None
                        break
            except Exception:
                # 예외 발생 시 None으로 설정 (필드 경로가 잘못되었거나 접근 불가능한 경우)
                actual_value = None

        # 조건 평가
        # _evaluate_condition 메서드를 호출하여 조건을 평가하고 결과(True/False)를 받음
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
        # 조건 타입에 따라 조건 평가 수행
        # equals: 같음 비교 (문자열로 변환하여 비교)
        if condition_type == "equals":
            return str(actual_value) == str(compare_value)
        # not_equals: 다름 비교 (문자열로 변환하여 비교)
        if condition_type == "not_equals":
            return str(actual_value) != str(compare_value)
        # contains: 포함 여부 확인 (compare_value가 actual_value에 포함되는지)
        if condition_type == "contains":
            return str(compare_value) in str(actual_value)
        # not_contains: 포함되지 않음 확인 (compare_value가 actual_value에 포함되지 않는지)
        if condition_type == "not_contains":
            return str(compare_value) not in str(actual_value)
        # greater_than: 더 큼 비교 (숫자로 변환하여 비교)
        if condition_type == "greater_than":
            try:
                # float로 변환하여 비교 (변환 실패 시 False 반환)
                return float(actual_value) > float(compare_value)
            except (ValueError, TypeError):
                # 숫자로 변환할 수 없으면 False 반환
                return False
        # less_than: 더 작음 비교 (숫자로 변환하여 비교)
        elif condition_type == "less_than":
            try:
                # float로 변환하여 비교 (변환 실패 시 False 반환)
                return float(actual_value) < float(compare_value)
            except (ValueError, TypeError):
                # 숫자로 변환할 수 없으면 False 반환
                return False
        # greater_or_equal: 크거나 같음 비교 (숫자로 변환하여 비교)
        elif condition_type == "greater_or_equal":
            try:
                # float로 변환하여 비교 (변환 실패 시 False 반환)
                return float(actual_value) >= float(compare_value)
            except (ValueError, TypeError):
                # 숫자로 변환할 수 없으면 False 반환
                return False
        # less_or_equal: 작거나 같음 비교 (숫자로 변환하여 비교)
        elif condition_type == "less_or_equal":
            try:
                # float로 변환하여 비교 (변환 실패 시 False 반환)
                return float(actual_value) <= float(compare_value)
            except (ValueError, TypeError):
                # 숫자로 변환할 수 없으면 False 반환
                return False
        # is_empty: 비어있음 확인 (None, 빈 문자열, 빈 리스트/딕셔너리)
        elif condition_type == "is_empty":
            return (
                actual_value is None  # None인 경우
                or actual_value == ""  # 빈 문자열인 경우
                or (isinstance(actual_value, (list, dict)) and len(actual_value) == 0)  # 빈 리스트/딕셔너리인 경우
            )
        # is_not_empty: 비어있지 않음 확인 (None이 아니고, 빈 문자열이 아니고, 빈 리스트/딕셔너리가 아님)
        elif condition_type == "is_not_empty":
            return (
                actual_value is not None  # None이 아닌 경우
                and actual_value != ""  # 빈 문자열이 아닌 경우
                and not (
                    isinstance(actual_value, (list, dict)) and len(actual_value) == 0
                )  # 빈 리스트/딕셔너리가 아닌 경우
            )
        else:
            # 알 수 없는 조건 타입은 False 반환 (안전한 기본값)
            return False
