"""사용자 설정 리포지토리 모듈"""
import os
import sys
from typing import Dict, Optional

# 직접 실행 시와 모듈로 import 시 모두 지원
try:
    from .connection import DatabaseConnection
except ImportError:
    # 직접 실행 시 절대 import 사용
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from db.connection import DatabaseConnection


class UserSettingsRepository:
    """사용자 설정 관련 데이터베이스 작업을 처리하는 클래스"""
    
    def __init__(self, connection: DatabaseConnection):
        """
        UserSettingsRepository 초기화
        
        Args:
            connection: DatabaseConnection 인스턴스
        """
        self.connection = connection
    
    def get_setting(self, setting_key: str, default_value: Optional[str] = None) -> Optional[str]:
        """
        사용자 설정 조회
        
        Args:
            setting_key: 설정 키
            default_value: 기본값
            
        Returns:
            설정 값 또는 기본값
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)
        
        try:
            cursor.execute(
                "SELECT setting_value FROM user_settings WHERE setting_key = ?",
                (setting_key,)
            )
            result = cursor.fetchone()
            
            if result:
                return result[0]
            return default_value
        finally:
            conn.close()
    
    def save_setting(self, setting_key: str, setting_value: str) -> bool:
        """
        사용자 설정 저장
        
        Args:
            setting_key: 설정 키
            setting_value: 설정 값
            
        Returns:
            성공 여부
        """
        return self.connection.execute_with_connection(
            lambda conn, cursor: self._save_setting_impl(cursor, setting_key, setting_value)
        )
    
    def _save_setting_impl(self, cursor, setting_key: str, setting_value: str) -> bool:
        """설정 저장 구현"""
        cursor.execute('''
            INSERT INTO user_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(setting_key) DO UPDATE SET
                setting_value = excluded.setting_value,
                updated_at = CURRENT_TIMESTAMP
        ''', (setting_key, setting_value))
        return True
    
    def get_all_settings(self) -> Dict[str, str]:
        """
        모든 사용자 설정 조회
        
        Returns:
            설정 딕셔너리
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)
        
        try:
            cursor.execute("SELECT setting_key, setting_value FROM user_settings")
            results = cursor.fetchall()
            return {key: value for key, value in results}
        finally:
            conn.close()
    
    def delete_setting(self, setting_key: str) -> bool:
        """
        사용자 설정 삭제
        
        Args:
            setting_key: 설정 키
            
        Returns:
            삭제 성공 여부
        """
        return self.connection.execute_with_connection(
            lambda conn, cursor: self._delete_setting_impl(cursor, setting_key)
        )
    
    def _delete_setting_impl(self, cursor, setting_key: str) -> bool:
        """설정 삭제 구현"""
        cursor.execute("DELETE FROM user_settings WHERE setting_key = ?", (setting_key,))
        return cursor.rowcount > 0


# ============================================================================
# 테스트 코드
# ============================================================================
# UserSettingsRepository 클래스의 기능을 테스트합니다.
# 
# 테스트 항목:
# 1. 데이터베이스 초기화 및 테이블 생성
# 2. UserSettingsRepository 인스턴스 생성
# 3. 사용자 설정 저장 (INSERT 및 UPDATE)
# 4. 사용자 설정 조회 (단일 설정 및 기본값 처리)
# 5. 모든 사용자 설정 조회
# 6. 사용자 설정 업데이트 (같은 키로 재저장)
# 7. 사용자 설정 삭제
# 8. 존재하지 않는 사용자 설정 삭제 (에러 처리)
# 9. 최종 상태 확인
# ============================================================================
if __name__ == "__main__":
    from db.table_manager import TableManager
    
    print("=" * 60)
    print("UserSettingsRepository 모듈 테스트")
    print("=" * 60)
    
    # 테스트용 데이터베이스 경로 설정
    test_db_path = os.path.join(os.path.dirname(__file__), "test_user_settings.db")
    
    # 기존 테스트 DB가 있으면 삭제
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print(f"기존 테스트 데이터베이스 삭제: {test_db_path}\n")
    
    # [1] 데이터베이스 초기화
    print("[1] 데이터베이스 초기화...")
    conn = DatabaseConnection(test_db_path)
    table_manager = TableManager(conn)
    table_manager.initialize()
    print("✅ 데이터베이스 초기화 완료\n")
    
    # [2] UserSettingsRepository 인스턴스 생성
    print("[2] UserSettingsRepository 인스턴스 생성...")
    settings_repo = UserSettingsRepository(conn)
    print("✅ 인스턴스 생성 성공\n")
    
    # [3] 설정 저장 테스트
    print("[3] 설정 저장 테스트...")
    result1 = settings_repo.save_setting("theme", "dark")
    result2 = settings_repo.save_setting("language", "ko")
    result3 = settings_repo.save_setting("auto_save", "true")
    print(f"✅ 설정 저장 완료")
    print(f"   - theme 저장: {result1}")
    print(f"   - language 저장: {result2}")
    print(f"   - auto_save 저장: {result3}\n")
    
    # [4] 설정 조회 테스트
    print("[4] 설정 조회 테스트...")
    theme = settings_repo.get_setting("theme")
    language = settings_repo.get_setting("language")
    auto_save = settings_repo.get_setting("auto_save")
    not_exist = settings_repo.get_setting("not_exist", "default_value")
    
    print(f"✅ 설정 조회 완료")
    print(f"   - theme: {theme}")
    print(f"   - language: {language}")
    print(f"   - auto_save: {auto_save}")
    print(f"   - not_exist (기본값): {not_exist}\n")
    
    # [5] 모든 설정 조회 테스트
    print("[5] 모든 설정 조회 테스트...")
    all_settings = settings_repo.get_all_settings()
    print(f"✅ 모든 설정 조회 완료")
    print(f"   - 총 {len(all_settings)}개 설정:")
    for key, value in all_settings.items():
        print(f"     * {key}: {value}")
    print()
    
    # [6] 설정 업데이트 테스트 (같은 키로 저장)
    print("[6] 설정 업데이트 테스트...")
    settings_repo.save_setting("theme", "light")  # dark -> light로 변경
    updated_theme = settings_repo.get_setting("theme")
    print(f"✅ 설정 업데이트 완료")
    print(f"   - theme 변경 전: dark")
    print(f"   - theme 변경 후: {updated_theme}\n")
    
    # [7] 설정 삭제 테스트
    print("[7] 설정 삭제 테스트...")
    deleted = settings_repo.delete_setting("auto_save")
    print(f"✅ 설정 삭제 완료")
    print(f"   - 삭제 성공: {deleted}")
    
    # 삭제 확인
    deleted_setting = settings_repo.get_setting("auto_save")
    if deleted_setting is None:
        print(f"   - 삭제 확인: auto_save 설정이 존재하지 않음 (정상)\n")
    else:
        print(f"   - 삭제 확인 실패: auto_save 설정이 여전히 존재\n")
    
    # [8] 존재하지 않는 설정 삭제 테스트
    print("[8] 존재하지 않는 설정 삭제 테스트...")
    deleted_not_exist = settings_repo.delete_setting("not_exist_key")
    print(f"✅ 삭제 시도 완료")
    print(f"   - 삭제 결과: {deleted_not_exist} (False가 정상)\n")
    
    # [9] 최종 상태 확인
    print("[9] 최종 상태 확인...")
    final_settings = settings_repo.get_all_settings()
    print(f"✅ 최종 상태 확인 완료")
    print(f"   - 남아있는 설정 개수: {len(final_settings)}개")
    for key, value in final_settings.items():
        print(f"     * {key}: {value}")
    print()
    
    # 정리
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print(f"테스트 데이터베이스 정리 완료: {test_db_path}")
    
    print("\n" + "=" * 60)
    print("✅ 모든 테스트 완료!")
    print("=" * 60)

