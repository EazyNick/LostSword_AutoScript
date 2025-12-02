"""
파라미터 검증 및 추출 유틸리티
"""

from typing import Dict, Any, Optional, TypeVar, Callable

# TypeVar는 Python의 타입 힌팅에서 제네릭(Generic) 타입을 정의할 때 사용합니다.
# T는 "어떤 타입이든 될 수 있는" 제네릭 타입 변수입니다.
# 예를 들어, get_parameter 함수에서 default가 int면 T는 int가 되고,
# default가 str이면 T는 str이 됩니다.
# 
# 전역변수(모듈 레벨)에 둔 이유:
# - TypeVar는 모듈 레벨에서 정의되어야 Python 타입 체커(mypy, pyright 등)가 제대로 인식합니다
# - 함수 내부에서 정의하면 타입 체커가 제네릭 타입을 추론하지 못합니다
# - 여러 함수에서 같은 제네릭 타입을 공유할 수 있습니다
T = TypeVar('T')


def validate_parameters(parameters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    파라미터가 None이면 빈 딕셔너리로 변환합니다.
    
    Args:
        parameters: 검증할 파라미터 딕셔너리
    
    Returns:
        검증된 파라미터 딕셔너리 (None이면 빈 딕셔너리)
    """
    if parameters is None:
        return {}
    return parameters


def get_parameter(parameters: Dict[str, Any], key: str, default: T = None, 
                validator: Optional[Callable[[Any], T]] = None) -> T:
    """
    파라미터에서 값을 안전하게 추출합니다.
    
    Args:
        parameters: 파라미터 딕셔너리
        key: 키 이름
        default: 기본값 (기본값: None)
            - None인 이유: 파라미터에 키가 없을 때 반환할 기본값을 지정하지 않으면 None을 반환
            - 실제 사용 시에는 명시적으로 기본값을 지정하는 것을 권장
            - 예: get_parameter(params, "age", default=0)  # int 타입
            - 예: get_parameter(params, "name", default="")  # str 타입
        validator: 값 검증 함수 (선택)
    
    Returns:
        추출된 값 또는 기본값 (기본값이 None이면 None 반환 가능)
    
    Note:
        default의 기본값이 None인 이유:
        - 파라미터에 키가 없을 때 반환할 값을 명시하지 않으면 None을 반환하는 것이 Python의 일반적인 관례
        - 하지만 실제 사용 시에는 타입에 맞는 기본값을 명시적으로 지정하는 것이 좋습니다
        - 예: get_parameter(params, "count", default=0)  # None 대신 0 사용
    """
    value = parameters.get(key, default)
    
    if validator and value is not None:
        try:
            return validator(value)
        except (ValueError, TypeError):
            return default
    
    return value

