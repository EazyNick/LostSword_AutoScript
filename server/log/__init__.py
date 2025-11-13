"""
로그 관리 모듈
싱글톤 패턴으로 설계된 LogManager를 제공합니다.
"""

from .log_manager import LogManager

# 싱글톤 인스턴스를 모듈 레벨에서 export
# 모든 곳에서 동일한 인스턴스를 사용할 수 있도록
_log_manager_instance = None

def get_log_manager(directory=None, max_files=10):
    """
    LogManager 싱글톤 인스턴스를 가져옵니다.
    
    Args:
        directory (str, optional): 로그 파일을 저장할 디렉토리. None이면 기본값 사용
        max_files (int): 유지할 최대 로그 파일 개수 (기본값: 10)
    
    Returns:
        LogManager: LogManager 싱글톤 인스턴스
    """
    global _log_manager_instance
    if _log_manager_instance is None:
        _log_manager_instance = LogManager(directory=directory, max_files=max_files)
    return _log_manager_instance

# 편의를 위한 별칭
log_manager = get_log_manager()

__all__ = ['LogManager', 'get_log_manager', 'log_manager']

