"""
시작 노드
워크플로우의 시작점을 나타내는 노드입니다.
"""

from datetime import datetime
from typing import Dict, Any
from log import log_manager
import pytz

logger = log_manager.logger


class StartNode:
    """시작 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        시작 노드를 실행합니다.
        
        시작 노드는 워크플로우의 시작점을 나타내며,
        다음 노드에 워크플로우 시작 신호를 전달합니다.
        
        Args:
            parameters: 노드 파라미터 (사용되지 않음)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        # 대한민국 시간대 (UTC+9)
        korea_tz = pytz.timezone('Asia/Seoul')
        korea_time = datetime.now(korea_tz)
        time_str = korea_time.strftime('%Y-%m-%d %H:%M:%S')
        
        return {
            "action": "start",
            "status": "completed",
            "output": {
                "time": time_str,
                "message": "워크플로우가 시작되었습니다."
            }
        }

