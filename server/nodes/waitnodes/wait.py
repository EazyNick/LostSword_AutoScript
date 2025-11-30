"""
대기 노드
지정된 시간만큼 대기하는 노드입니다.
"""

import asyncio
from typing import Dict, Any
from log import log_manager

logger = log_manager.logger


class WaitNode:
    """대기 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        지정된 시간만큼 대기합니다.
        
        Args:
            parameters: 노드 파라미터
                - wait_time: 대기 시간 (초, 기본값: 1)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        wait_time = parameters.get("wait_time", 1)
        
        # wait_time이 숫자가 아니면 기본값 1초 사용
        try:
            wait_time = float(wait_time)
            if wait_time < 0:
                wait_time = 0
        except (ValueError, TypeError):
            wait_time = 1
        
        # 비동기 대기
        await asyncio.sleep(wait_time)
        
        return {
            "action": "wait",
            "wait_time": wait_time,
            "status": "completed",
            "message": f"{wait_time}초 대기 완료",
            "output": {"wait_time": wait_time}
        }

