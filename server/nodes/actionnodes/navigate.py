"""
네비게이션 노드
목적지로 이동하는 노드입니다.
"""

from typing import Dict, Any
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import node_executor
from utils import get_parameter


class NavigateNode(BaseNode):
    """네비게이션 노드 클래스"""
    
    @staticmethod
    @node_executor("navigate")
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        목적지로 이동합니다.
        
        Args:
            parameters: 노드 파라미터
                - destination: 목적지 (선택)
        
        Returns:
            실행 결과 딕셔너리
        """
        destination = get_parameter(parameters, "destination")
        
        return {
            "action": "navigate",
            "status": "completed",
            "output": {
                "destination": destination if destination else None
            }
        }

