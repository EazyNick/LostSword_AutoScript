"""
조건 노드
조건을 확인하고 결과를 반환하는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class ConditionNode:
    """조건 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        조건을 확인합니다.
        
        Args:
            parameters: 노드 파라미터
                - condition: 조건 문자열 (선택)
                - result: 조건 결과 (기본값: True)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        condition = parameters.get("condition")
        result = parameters.get("result", True)
        
        return {
            "action": "condition",
            "status": "completed",
            "output": {
                "condition": condition if condition else None,
                "result": result
            }
        }

