"""
동적 파라미터 파싱
표현식 파싱 ({{$json.field}}, {{$node["Node Name"].json.field}} 등)
"""

import re
from typing import TYPE_CHECKING, Any

from log import log_manager

if TYPE_CHECKING:
    from services.node_execution_context import NodeExecutionContext

logger = log_manager.logger


class ExpressionParser:
    """
    표현식 파서 클래스
    동적 파라미터를 파싱하고 값을 반환합니다.
    """

    # 표현식 패턴: {{$json.field}} 또는 {{$node["Node Name"].json.field}}
    EXPRESSION_PATTERN = re.compile(r"\{\{([^}]+)\}\}")

    # 노드 참조 패턴: $node["Node Name"] 또는 $node['Node Name']
    NODE_REF_PATTERN = re.compile(r'\$node\[["\']([^"\']+)["\']\]')

    # JSON 참조 패턴: $json.field 또는 $json["field"]
    JSON_REF_PATTERN = re.compile(r'\$json(?:\.([a-zA-Z_][a-zA-Z0-9_]*)|\["([^"]+)"\])')

    # 숫자/인덱스 참조 패턴: $json[0] 또는 $json.field[0]
    INDEX_REF_PATTERN = re.compile(r"\[(\d+)\]")

    @staticmethod
    def parse_expression(expression: str, context: "NodeExecutionContext") -> Any:
        """
        표현식을 파싱하고 값을 반환합니다.

        Args:
            expression: 파싱할 표현식 (예: "{{$json.field}}")
            context: 노드 실행 컨텍스트

        Returns:
            파싱된 값
        """
        if not expression or not isinstance(expression, str):
            return expression

        # 표현식이 포함되어 있는지 확인
        matches = ExpressionParser.EXPRESSION_PATTERN.findall(expression)

        if not matches:
            # 표현식이 없으면 원본 반환
            return expression

        result = expression

        for match in matches:
            expr = match.strip()
            value = ExpressionParser._evaluate_expression(expr, context)

            # 전체 표현식이 하나의 표현식인 경우 (예: "{{$json.field}}")
            if expression.strip() == f"{{{{{expr}}}}}":
                return value

            # 문자열 내에 표현식이 포함된 경우 (예: "Value: {{$json.field}}")
            result = result.replace(f"{{{{{expr}}}}}", str(value))

        return result

    @staticmethod
    def _evaluate_expression(expr: str, context: "NodeExecutionContext") -> Any:
        """
        표현식을 평가합니다.

        Args:
            expr: 평가할 표현식 (예: "$json.field")
            context: 노드 실행 컨텍스트

        Returns:
            평가된 값
        """
        expr = expr.strip()

        # 노드 참조가 있는 경우: $node["Node Name"].json.field
        node_match = ExpressionParser.NODE_REF_PATTERN.match(expr)
        if node_match:
            node_name = node_match.group(1)
            node_result = context.get_node_result_by_name(node_name)

            if node_result is None:
                logger.warning(f"노드 '{node_name}'의 결과를 찾을 수 없습니다.")
                return None

            # 나머지 경로 파싱
            remaining = expr[node_match.end() :]
            if remaining.startswith("."):
                remaining = remaining[1:]

            return ExpressionParser._get_nested_value(node_result, remaining)

        # JSON 참조: $json.field
        json_match = ExpressionParser.JSON_REF_PATTERN.match(expr)
        if json_match:
            # 이전 노드의 결과 가져오기
            prev_result = context.get_previous_node_result()

            if prev_result is None:
                logger.warning("이전 노드의 결과를 찾을 수 없습니다.")
                return None

            # 필드 이름 추출
            field_name = json_match.group(1) or json_match.group(2)

            # 나머지 경로 파싱 (중첩된 필드나 인덱스)
            remaining = expr[json_match.end() :]

            if remaining:
                # 중첩된 경로가 있는 경우
                if remaining.startswith("."):
                    remaining = remaining[1:]
                return ExpressionParser._get_nested_value(prev_result, remaining, start_key=field_name)
            # 단순 필드 접근
            return prev_result.get(field_name) if isinstance(prev_result, dict) else None

        # 직접 값 참조 (예: $json)
        if expr == "$json":
            return context.get_previous_node_result()

        # 표현식을 인식할 수 없는 경우 원본 반환
        logger.warning(f"인식할 수 없는 표현식: {expr}")
        return None

    @staticmethod
    def _get_nested_value(obj: Any, path: str, start_key: str | None = None) -> Any:
        """
        중첩된 객체에서 값을 가져옵니다.

        Args:
            obj: 대상 객체
            path: 경로 (예: "field.subfield[0]")
            start_key: 시작 키 (선택적)

        Returns:
            값 또는 None
        """
        if start_key:
            if isinstance(obj, dict):
                obj = obj.get(start_key)
            else:
                return None

        if not path:
            return obj

        current = obj

        # 경로를 파싱 (점으로 구분된 필드와 인덱스)
        parts = re.split(r"(\.|\[)", path)
        parts = [p for p in parts if p]  # 빈 문자열 제거

        i = 0
        while i < len(parts):
            if parts[i] == ".":
                i += 1
                if i >= len(parts):
                    break
                key = parts[i]
                if isinstance(current, dict):
                    current = current.get(key)
                else:
                    return None
            elif parts[i] == "[":
                i += 1
                if i >= len(parts):
                    break
                index_str = parts[i]
                if index_str.isdigit():
                    index = int(index_str)
                    if isinstance(current, (list, tuple)):
                        if 0 <= index < len(current):
                            current = current[index]
                        else:
                            return None
                    else:
                        return None
                else:
                    # 문자열 키인 경우
                    if isinstance(current, dict):
                        current = current.get(index_str)
                    else:
                        return None
                i += 1  # ']' 건너뛰기
                if i < len(parts) and parts[i] == "]":
                    i += 1
            else:
                # 필드 이름
                key = parts[i]
                if isinstance(current, dict):
                    current = current.get(key)
                else:
                    return None

            i += 1

        return current

    @staticmethod
    def parse_parameters(parameters: dict[str, Any], context: "NodeExecutionContext") -> dict[str, Any]:
        """
        파라미터 딕셔너리의 모든 값을 파싱합니다.

        Args:
            parameters: 파라미터 딕셔너리
            context: 노드 실행 컨텍스트

        Returns:
            파싱된 파라미터 딕셔너리
        """
        parsed = {}

        for key, value in parameters.items():
            if isinstance(value, str):
                # 문자열인 경우 표현식 파싱
                parsed[key] = ExpressionParser.parse_expression(value, context)
            elif isinstance(value, dict):
                # 딕셔너리인 경우 재귀적으로 파싱
                parsed[key] = ExpressionParser.parse_parameters(value, context)
            elif isinstance(value, list):
                # 리스트인 경우 각 항목 파싱
                parsed[key] = [
                    ExpressionParser.parse_expression(item, context) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                # 그 외의 경우 원본 유지
                parsed[key] = value

        return parsed
