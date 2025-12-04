"""
노드 실행 결과 포맷팅 유틸리티
"""

from typing import Any


def create_success_result(action: str, output: Any = None, message: str | None = None) -> dict[str, Any]:
    """
    성공 결과 딕셔너리를 생성합니다.

    Args:
        action: 액션 이름
        output: 출력 데이터 (기본값: None)
        message: 메시지 (선택)

    Returns:
        표준화된 결과 딕셔너리
    """
    result = {"action": action, "status": "completed", "output": output}

    if message:
        result["message"] = message

    return result


def create_failed_result(
    action: str, reason: str, message: str | None = None, output: dict[str, Any] | None = None
) -> dict[str, Any]:
    """
    실패 결과 딕셔너리를 생성합니다.

    Args:
        action: 액션 이름
        reason: 실패 이유
        message: 메시지 (선택)
        output: 출력 데이터 (선택)

    Returns:
        표준화된 실패 결과 딕셔너리
    """
    result = {"action": action, "status": "failed", "output": output or {"success": False, "reason": reason}}

    if message:
        result["message"] = message

    return result


def normalize_result(result: Any, action: str, default_output: Any = None) -> dict[str, Any]:
    """
    결과를 표준화된 딕셔너리 형식으로 변환합니다.

    Args:
        result: 원본 결과 (dict, None, 또는 기타 타입)
        action: 액션 이름
        default_output: 기본 출력값 (result가 None일 때 사용)

    Returns:
        표준화된 결과 딕셔너리
    """
    if result is None:
        return create_success_result(action, default_output)

    if isinstance(result, dict):
        # 이미 dict인 경우, 필수 필드 확인 및 보완
        if "action" not in result:
            result["action"] = action
        if "status" not in result:
            result["status"] = "completed"
        if "output" not in result:
            result["output"] = default_output
        return result

    # dict가 아닌 경우 dict로 래핑
    return create_success_result(action, result)
