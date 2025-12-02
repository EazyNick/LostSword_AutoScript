"""
시간 관련 유틸리티
"""

from datetime import datetime
import pytz


def get_korea_time_str() -> str:
    """
    대한민국 시간대(UTC+9)의 현재 시간을 문자열로 반환합니다.
    
    Returns:
        'YYYY-MM-DD HH:MM:SS' 형식의 시간 문자열
    """
    korea_tz = pytz.timezone('Asia/Seoul')
    korea_time = datetime.now(korea_tz)
    return korea_time.strftime('%Y-%m-%d %H:%M:%S')

