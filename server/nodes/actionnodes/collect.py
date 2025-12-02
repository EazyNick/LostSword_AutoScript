"""
수집 노드
아이템을 수집하는 노드입니다.
"""

from typing import Dict, Any
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import node_executor
from utils import get_parameter


class CollectNode(BaseNode):
    """수집 노드 클래스"""
    
    @staticmethod
    @node_executor("collect")
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        아이템을 수집합니다.
        
        Args:
            parameters: 노드 파라미터
                - item_type: 아이템 타입 (선택)
        
        Returns:
            실행 결과 딕셔너리
        """
        item_type = get_parameter(parameters, "item_type")
        
        return {
            "action": "collect",
            "status": "completed",
            "output": {
                "item_type": item_type if item_type else None
            }
        }

