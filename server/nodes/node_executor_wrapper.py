"""
노드 실행 래퍼
노드 실행 시 공통 처리(에러 처리, 로깅, 파라미터 검증 등)를 담당합니다.

사용 예시:
    # 예시 1: 기본 사용법
    class ClickNode(BaseNode):
        @staticmethod
        @NodeExecutor("click")
        async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
            x = parameters.get("x", 0)
            y = parameters.get("y", 0)
            return {
                "action": "click",
                "status": "completed",
                "output": {"x": x, "y": y}
            }

    # 예시 2: 파라미터가 None이어도 자동으로 빈 딕셔너리로 변환됨
    result = await ClickNode.execute(None)  # 자동으로 {}로 변환되어 처리됨

    # 예시 3: 에러 발생 시 자동으로 에러 결과 반환
    class MyNode(BaseNode):
        @staticmethod
        @NodeExecutor("my-action")
        async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
            # 에러가 발생하면 자동으로 에러 결과 반환
            raise ValueError("에러 발생!")
            # 반환: {"action": "my-action", "status": "failed", "message": "...", ...}

    # 예시 4: 결과가 None이거나 dict가 아니어도 자동으로 정규화됨
    class SimpleNode(BaseNode):
        @staticmethod
        @NodeExecutor("simple")
        async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
            return None  # 자동으로 {"action": "simple", "status": "completed", "output": None}로 변환
"""

from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar

from log import log_manager
from utils import create_failed_result, normalize_result, validate_parameters

logger = log_manager.logger

P = ParamSpec("P")
R = TypeVar("R")


class NodeExecutor:
    """
    노드 execute 메서드를 래핑하는 클래스 기반 데코레이터

    공통 기능:
    - 파라미터 검증 및 정규화 (None이면 빈 딕셔너리로 변환)
    - 에러 처리 및 로깅 (에러 발생 시 자동으로 실패 결과 반환)
    - 결과 정규화 (None이거나 dict가 아니면 자동으로 표준 형식으로 변환)

    사용 예시:
        # 기본 사용법
        class ClickNode(BaseNode):
            @staticmethod
            @NodeExecutor("click")
            async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
                x = parameters.get("x", 0)
                y = parameters.get("y", 0)
                return {
                    "action": "click",
                    "status": "completed",
                    "output": {"x": x, "y": y}
                }

        # 파라미터가 None이어도 자동 처리
        result = await ClickNode.execute(None)  # 자동으로 {}로 변환

        # 에러 발생 시 자동으로 에러 결과 반환
        # 에러가 발생하면 {"action": "click", "status": "failed", ...} 형식으로 반환
    """

    def __init__(self, action_name: str) -> None:
        """
        NodeExecutor 초기화

        Args:
            action_name: 액션 이름 (결과에 포함됨)
        """
        self.action_name = action_name

    def __call__(self, func: Callable[[dict[str, Any]], Any]) -> Callable[[dict[str, Any] | None], Any]:
        """
        데코레이터로 사용될 때 호출되는 메서드

        Args:
            func: 래핑할 함수 (노드의 execute 메서드)

        Returns:
            래핑된 함수
        """

        @wraps(func)
        async def wrapper(parameters: dict[str, Any] | None) -> dict[str, Any]:
            # 파라미터 검증 및 정규화
            validated_params = validate_parameters(parameters)

            try:
                logger.debug(f"[{self.action_name}] 노드 실행 시작 - 파라미터: {validated_params}")

                # 노드 실행
                result = await func(validated_params)

                # 결과 정규화
                normalized_result = normalize_result(result, self.action_name)

                logger.debug(f"[{self.action_name}] 노드 실행 완료 - 결과: {normalized_result}")

                return normalized_result

            except Exception as e:
                logger.error(f"[{self.action_name}] 노드 실행 실패: {e}")
                import traceback

                logger.error(f"[{self.action_name}] 스택 트레이스: {traceback.format_exc()}")

                # 에러 결과 반환
                return create_failed_result(
                    action=self.action_name,
                    reason="execution_error",
                    message=f"노드 실행 중 오류 발생: {e!s}",
                    output={"error": str(e)},
                )

        return wrapper
