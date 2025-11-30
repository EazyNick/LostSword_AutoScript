"""
네비게이션 노드
목적지로 이동하는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class NavigateNode:
    """네비게이션 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        목적지로 이동합니다.
        
        Args:
            parameters: 노드 파라미터
                - destination: 목적지 (선택)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        destination = parameters.get("destination")
        
        return {
            "action": "navigate",
            "status": "completed",
            "output": {
                "destination": destination if destination else None
            }
        }

