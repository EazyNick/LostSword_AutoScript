"""
노드 실행 결과 표준화 유틸리티

모든 노드는 표준 출력 형식을 따릅니다:
{
    "status": "completed" | "failed",
    "output": {
        "key1": "value1",
        "key2": "value2",
        ...
    },
    "error": {...} (실패 시만),
    "meta": {...} (선택)
}

이 형식을 통해 프론트엔드에서 이전 노드의 출력 변수들을 일관되게 표시하고 선택할 수 있습니다.
"""

from typing import Any


def ensure_output_is_dict(output: Any) -> dict[str, Any]:
    """
    output이 dict 형식인지 확인하고, 아니면 dict로 변환합니다.

    Args:
        output: 출력 데이터

    Returns:
        dict 형식의 출력 데이터

    예시:
        >>> ensure_output_is_dict("hello")
        {"value": "hello"}
        >>> ensure_output_is_dict({"x": 100, "y": 200})
        {"x": 100, "y": 200}
        >>> ensure_output_is_dict(None)
        {}
    """
    if output is None:
        return {}

    if isinstance(output, dict):
        return output

    # dict가 아니면 value 키로 래핑
    return {"value": output}


def create_success_result(
    action: str, output: dict[str, Any] | None = None, message: str | None = None
) -> dict[str, Any]:
    """
    성공 결과 딕셔너리를 생성합니다.

    Args:
        action: 액션 이름
        output: 출력 데이터 (dict 형식, 키-값 쌍으로 구성)
        message: 메시지 (선택)

    Returns:
        표준화된 결과 딕셔너리

    예시:
        >>> create_success_result("click", {"x": 100, "y": 200})
        {
            "action": "click",
            "status": "completed",
            "output": {"x": 100, "y": 200}
        }
    """
    # ensure_output_is_dict를 사용하여 output을 dict로 보장
    output = ensure_output_is_dict(output)

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
        output: 출력 데이터 (선택, 에러 정보 포함)

    Returns:
        표준화된 실패 결과 딕셔너리

    예시:
        >>> create_failed_result("click", "element_not_found", "요소를 찾을 수 없습니다")
        {
            "action": "click",
            "status": "failed",
            "output": {"success": False, "reason": "element_not_found"},
            "error": {
                "reason": "element_not_found",
                "message": "요소를 찾을 수 없습니다"
            }
        }
    """
    # output이 None이면 기본 에러 정보로 초기화
    if output is None:
        output = {"success": False, "reason": reason}

    # ensure_output_is_dict를 사용하여 output을 dict로 보장
    output = ensure_output_is_dict(output)

    return {
        "action": action,
        "status": "failed",
        "output": output,
        "error": {"reason": reason, "message": message or f"액션 '{action}' 실행 실패: {reason}"},
    }


def normalize_result(result: Any, action: str, default_output: Any = None) -> dict[str, Any]:
    """
    결과를 표준화된 딕셔너리 형식으로 변환합니다.

    모든 노드의 출력은 다음 형식을 따릅니다:
    {
        "action": str,
        "status": "completed" | "failed",
        "output": dict[str, Any]  # 키-값 쌍으로 구성된 실제 데이터
    }

    output 필드는 반드시 dict 형식이어야 하며, 각 키는 프론트엔드에서
    변수로 표시되어 사용자가 선택할 수 있습니다.

    Args:
        result: 원본 결과 (dict, None, 또는 기타 타입)
        action: 액션 이름
        default_output: 기본 출력값 (result가 None일 때 사용)

    Returns:
        표준화된 결과 딕셔너리

    변환 규칙:
    1. result가 None이면: {"action": action, "status": "completed", "output": {}}
    2. result가 dict이고 이미 표준 형식이면: 그대로 반환 (action, status, output이 모두 있고 output이 dict)
    3. result가 dict이지만 표준 형식이 아니면: result의 내용을 output 필드로 래핑
       예시:
       - 입력: {"x": 100, "y": 200}
       - 출력: {"action": action, "status": "completed", "output": {"x": 100, "y": 200}}

       - 입력: {"data": {"name": "test"}, "count": 5}
       - 출력: {"action": action, "status": "completed", "output": {"data": {"name": "test"}, "count": 5}}

       - 입력: {"output": "string_value"}  # output이 dict가 아님
       - 출력: {"action": action, "status": "completed", "output": {"value": "string_value"}}
    4. result가 dict가 아니면: {"action": action, "status": "completed", "output": {"value": result}}
    """
    if result is None:
        # None이면 빈 output dict 반환
        return create_success_result(action, {})

    if isinstance(result, dict):
        # 표준 형식인지 확인 (action, status, output 필드가 모두 있고, output이 dict인지)
        has_action = "action" in result
        has_status = "status" in result
        has_output = "output" in result
        is_standard_format = has_action and has_status and has_output and isinstance(result.get("output"), dict)

        if is_standard_format:
            # 이미 표준 형식이면 그대로 반환 (action이 없으면 추가)
            if not has_action:
                result["action"] = action
            return result

        # 표준 형식이 아니면 output 필드로 래핑
        output_data = None

        if not has_output:
            # output 필드가 없으면 result의 모든 내용을 output으로 사용
            # 단, 표준 필드(action, status, error, message, meta)는 제외
            standard_fields = {"action", "status", "output", "error", "message", "meta"}
            output_data = {k: v for k, v in result.items() if k not in standard_fields}

            # 실제 데이터가 없으면 default_output을 dict로 변환
            if not output_data:
                output_data = ensure_output_is_dict(default_output)
        else:
            # output 필드가 있으면 ensure_output_is_dict로 dict 형식 보장
            output_data = ensure_output_is_dict(result.get("output"))

        # 표준 형식으로 변환
        return {
            "action": result.get("action", action),
            "status": result.get("status", "completed"),
            "output": output_data,
        }

    # dict가 아닌 경우 output으로 래핑 (ensure_output_is_dict 사용)
    return create_success_result(action, ensure_output_is_dict(result))
