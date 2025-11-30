"""
전투 노드
전투를 수행하는 노드입니다.
"""

from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class BattleNode:
    """전투 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        전투를 수행합니다.
        
        Args:
            parameters: 노드 파라미터
                - enemy_type: 적 타입 (선택)
                - strategy: 전투 전략 (선택)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        enemy_type = parameters.get("enemy_type")
        strategy = parameters.get("strategy")
        
        return {
            "action": "battle",
            "status": "completed",
            "output": {
                "enemy_type": enemy_type if enemy_type else None,
                "strategy": strategy if strategy else None
            }
        }

