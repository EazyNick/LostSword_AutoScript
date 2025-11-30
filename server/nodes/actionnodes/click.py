"""
클릭 노드
화면의 특정 좌표를 클릭하는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class ClickNode:
    """클릭 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        화면의 특정 좌표를 클릭합니다.
        
        Args:
            parameters: 노드 파라미터
                - x: X 좌표 (기본값: 0)
                - y: Y 좌표 (기본값: 0)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        x = parameters.get("x", 0)
        y = parameters.get("y", 0)
        
        return {
            "action": "click",
            "status": "completed",
            "output": {
                "x": x,
                "y": y
            }
        }

