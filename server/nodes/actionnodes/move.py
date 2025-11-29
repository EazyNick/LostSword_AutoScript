"""
이동 노드
캐릭터를 이동시키는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class MoveNode:
    """이동 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        캐릭터를 이동시킵니다.
        
        Args:
            parameters: 노드 파라미터
                - direction: 이동 방향 (기본값: "forward")
                - distance: 이동 거리 (기본값: 1)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        direction = parameters.get("direction", "forward")
        distance = parameters.get("distance", 1)
        
        return {
            "action": "move",
            "status": "completed",
            "output": {
                "direction": direction if direction else None,
                "distance": distance if distance else None
            }
        }

