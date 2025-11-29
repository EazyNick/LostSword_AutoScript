"""
수집 노드
아이템을 수집하는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class CollectNode:
    """수집 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        아이템을 수집합니다.
        
        Args:
            parameters: 노드 파라미터
                - item_type: 아이템 타입 (선택)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        item_type = parameters.get("item_type")
        
        return {
            "action": "collect",
            "status": "completed",
            "output": {
                "item_type": item_type if item_type else None
            }
        }

