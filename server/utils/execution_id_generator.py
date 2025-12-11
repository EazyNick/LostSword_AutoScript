"""
실행 ID 생성 유틸리티
날짜시간 기반의 읽기 쉬운 실행 ID를 생성합니다.
"""

from datetime import datetime
import secrets


def generate_execution_id() -> str:
    """
    날짜시간 기반의 읽기 쉬운 실행 ID를 생성합니다.

    형식: YYYYMMDD-HHMMSS-{랜덤문자열}
    예시: 20240115-143025-a3f9b2

    Returns:
        str: 실행 ID (예: "20240115-143025-a3f9b2")
    """
    # 현재 날짜시간을 YYYYMMDD-HHMMSS 형식으로 변환
    now = datetime.now()
    date_time_str = now.strftime("%Y%m%d-%H%M%S")

    # 랜덤 문자열 생성 (6자리, 소문자 + 숫자)
    random_str = secrets.token_hex(3)  # 3바이트 = 6자리 hex

    # 실행 ID 조합 및 반환
    return f"{date_time_str}-{random_str}"
