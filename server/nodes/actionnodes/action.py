"""
기본 액션 노드
범용 액션을 수행하는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class ActionNode:
    """기본 액션 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        기본 액션을 수행합니다.
        
        Args:
            parameters: 노드 파라미터
                - action: 액션 이름 (선택)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        action_name = parameters.get("action")
        
        return {
            "action": "action",
            "status": "completed",
            "output": {
                "name": action_name if action_name else None
            }
        }

