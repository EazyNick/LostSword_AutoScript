"""
종료 노드
워크플로우의 종료점을 나타내는 노드입니다.
"""

import time
from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class EndNode:
    """종료 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        종료 노드를 실행합니다.
        
        종료 노드는 워크플로우의 종료점을 나타내며,
        워크플로우 실행을 종료합니다.
        
        Args:
            parameters: 노드 파라미터 (사용되지 않음)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        return {
            "action": "end",
            "status": "completed",
            "output": {
                "node_type": "end",
                "workflow_completed": True,
                "completed_at": time.time(),
                "message": "워크플로우가 종료되었습니다."
            }
        }

