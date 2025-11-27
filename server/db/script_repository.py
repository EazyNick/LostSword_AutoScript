"""스크립트 리포지토리 모듈"""
import os
import sys
from typing import List, Dict, Optional

# 직접 실행 시와 모듈로 import 시 모두 지원
try:
    from .connection import DatabaseConnection
except ImportError:
    # 직접 실행 시 절대 import 사용
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from db.connection import DatabaseConnection


class ScriptRepository:
    """스크립트 관련 데이터베이스 작업을 처리하는 클래스"""
    
    def __init__(self, connection: DatabaseConnection):
        """
        ScriptRepository 초기화
        
        Args:
            connection: DatabaseConnection 인스턴스
        """
        self.connection = connection
    
    def create_script(self, name: str, description: str = "") -> int:
        """
        새 스크립트 생성
        
        Args:
            name: 스크립트 이름
            description: 스크립트 설명
            
        Returns:
            생성된 스크립트 ID
            
        Raises:
            ValueError: 스크립트 이름이 이미 존재하는 경우
        """
        try:
            return self.connection.execute_with_connection(
                lambda conn, cursor: self._create_script_impl(cursor, name, description)
            )
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise ValueError(f"스크립트 '{name}'이 이미 존재합니다.")
            raise e
    
    def _create_script_impl(self, cursor, name: str, description: str) -> int:
        """스크립트 생성 구현"""
        cursor.execute(
            "INSERT INTO scripts (name, description) VALUES (?, ?)",
            (name, description)
        )
        return cursor.lastrowid
    
    def get_all_scripts(self) -> List[Dict]:
        """
        모든 스크립트 목록 조회
        
        Returns:
            스크립트 목록
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)
        
        try:
            cursor.execute('''
                SELECT id, name, description, created_at, updated_at 
                FROM scripts 
                ORDER BY updated_at DESC
            ''')
            
            scripts = []
            for row in cursor.fetchall():
                scripts.append({
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "created_at": row[3],
                    "updated_at": row[4]
                })
            
            return scripts
        finally:
            conn.close()
    
    def get_script(self, script_id: int) -> Optional[Dict]:
        """
        특정 스크립트 조회
        
        Args:
            script_id: 스크립트 ID
            
        Returns:
            스크립트 정보 또는 None
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)
        
        try:
            # 스크립트 정보 조회
            cursor.execute(
                "SELECT id, name, description, created_at, updated_at FROM scripts WHERE id = ?",
                (script_id,)
            )
            script_row = cursor.fetchone()
            
            if not script_row:
                return None
            
            # 노드 정보는 NodeRepository에서 가져옴
            # 여기서는 기본 정보만 반환
            return {
                "id": script_row[0],
                "name": script_row[1],
                "description": script_row[2],
                "created_at": script_row[3],
                "updated_at": script_row[4]
            }
        finally:
            conn.close()
    
    def update_script_timestamp(self, script_id: int) -> bool:
        """
        스크립트 업데이트 시간 갱신
        
        Args:
            script_id: 스크립트 ID
            
        Returns:
            성공 여부
        """
        return self.connection.execute_with_connection(
            lambda conn, cursor: self._update_timestamp_impl(cursor, script_id)
        )
    
    def _update_timestamp_impl(self, cursor, script_id: int) -> bool:
        """타임스탬프 업데이트 구현"""
        cursor.execute(
            "UPDATE scripts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (script_id,)
        )
        return True
    
    def delete_script(self, script_id: int) -> bool:
        """
        스크립트 삭제
        
        Args:
            script_id: 스크립트 ID
            
        Returns:
            삭제 성공 여부
        """
        return self.connection.execute_with_connection(
            lambda conn, cursor: self._delete_script_impl(cursor, script_id)
        )
    
    def _delete_script_impl(self, cursor, script_id: int) -> bool:
        """스크립트 삭제 구현"""
        cursor.execute("DELETE FROM scripts WHERE id = ?", (script_id,))
        return cursor.rowcount > 0


# 테스트 코드
if __name__ == "__main__":
    from db.table_manager import TableManager
    
    print("=" * 60)
    print("ScriptRepository 모듈 테스트")
    print("=" * 60)
    
    # 테스트용 데이터베이스 경로 설정
    test_db_path = os.path.join(os.path.dirname(__file__), "test_script_repository.db")
    
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
    
    # [2] ScriptRepository 인스턴스 생성
    print("[2] ScriptRepository 인스턴스 생성...")
    script_repo = ScriptRepository(conn)
    print("✅ 인스턴스 생성 성공\n")
    
    # [3] 스크립트 생성 테스트
    print("[3] 스크립트 생성 테스트...")
    script1_id = script_repo.create_script("테스트 스크립트 1", "첫 번째 테스트 스크립트입니다")
    script2_id = script_repo.create_script("테스트 스크립트 2", "두 번째 테스트 스크립트입니다")
    script3_id = script_repo.create_script("테스트 스크립트 3", "세 번째 테스트 스크립트입니다")
    
    print(f"✅ 스크립트 생성 완료")
    print(f"   - 스크립트 1 ID: {script1_id}")
    print(f"   - 스크립트 2 ID: {script2_id}")
    print(f"   - 스크립트 3 ID: {script3_id}\n")
    
    # [4] 중복 스크립트 생성 시도 테스트 (에러 발생해야 함)
    print("[4] 중복 스크립트 생성 시도 테스트...")
    try:
        script_repo.create_script("테스트 스크립트 1", "중복된 이름")
        print("❌ 중복 체크 실패 (에러가 발생해야 함)")
    except ValueError as e:
        print(f"✅ 중복 체크 작동 확인")
        print(f"   - 에러 메시지: {e}\n")
    
    # [5] 모든 스크립트 조회 테스트
    print("[5] 모든 스크립트 조회 테스트...")
    all_scripts = script_repo.get_all_scripts()
    print(f"✅ 모든 스크립트 조회 완료")
    print(f"   - 총 {len(all_scripts)}개 스크립트:")
    for script in all_scripts:
        print(f"     * ID: {script['id']}, 이름: {script['name']}, 설명: {script['description']}")
        print(f"       생성일: {script['created_at']}, 수정일: {script['updated_at']}")
    print()
    
    # [6] 특정 스크립트 조회 테스트
    print("[6] 특정 스크립트 조회 테스트...")
    script1 = script_repo.get_script(script1_id)
    if script1:
        print(f"✅ 스크립트 조회 완료")
        print(f"   - ID: {script1['id']}")
        print(f"   - 이름: {script1['name']}")
        print(f"   - 설명: {script1['description']}")
        print(f"   - 생성일: {script1['created_at']}")
        print(f"   - 수정일: {script1['updated_at']}\n")
    else:
        print("❌ 스크립트 조회 실패\n")
    
    # [7] 존재하지 않는 스크립트 조회 테스트
    print("[7] 존재하지 않는 스크립트 조회 테스트...")
    not_exist_script = script_repo.get_script(99999)
    if not_exist_script is None:
        print(f"✅ None 반환 확인 (정상)\n")
    else:
        print(f"❌ None이 아닌 값 반환 (비정상)\n")
    
    # [8] 스크립트 타임스탬프 업데이트 테스트
    print("[8] 스크립트 타임스탬프 업데이트 테스트...")
    # 업데이트 전 시간 조회
    script_before = script_repo.get_script(script1_id)
    import time
    time.sleep(1)  # 1초 대기하여 시간 차이 확인
    
    # 타임스탬프 업데이트
    script_repo.update_script_timestamp(script1_id)
    
    # 업데이트 후 시간 조회
    script_after = script_repo.get_script(script1_id)
    
    print(f"✅ 타임스탬프 업데이트 완료")
    print(f"   - 업데이트 전: {script_before['updated_at']}")
    print(f"   - 업데이트 후: {script_after['updated_at']}")
    if script_before['updated_at'] != script_after['updated_at']:
        print(f"   - 타임스탬프 변경 확인됨 (정상)\n")
    else:
        print(f"   - 타임스탬프 변경되지 않음 (비정상)\n")
    
    # [9] 스크립트 삭제 테스트
    print("[9] 스크립트 삭제 테스트...")
    deleted = script_repo.delete_script(script3_id)
    print(f"✅ 스크립트 삭제 완료")
    print(f"   - 삭제 성공: {deleted}")
    
    # 삭제 확인
    deleted_script = script_repo.get_script(script3_id)
    remaining_scripts = script_repo.get_all_scripts()
    
    if deleted_script is None and len(remaining_scripts) == 2:
        print(f"   - 삭제 확인: 스크립트가 제거되고 남은 스크립트는 {len(remaining_scripts)}개 (정상)\n")
    else:
        print(f"   - 삭제 확인 실패\n")
    
    # [10] 존재하지 않는 스크립트 삭제 테스트
    print("[10] 존재하지 않는 스크립트 삭제 테스트...")
    deleted_not_exist = script_repo.delete_script(99999)
    print(f"✅ 삭제 시도 완료")
    print(f"   - 삭제 결과: {deleted_not_exist} (False가 정상)\n")
    
    # [11] 최종 상태 확인
    print("[11] 최종 상태 확인...")
    final_scripts = script_repo.get_all_scripts()
    print(f"✅ 최종 상태 확인 완료")
    print(f"   - 남아있는 스크립트 개수: {len(final_scripts)}개")
    for script in final_scripts:
        print(f"     * ID: {script['id']}, 이름: {script['name']}")
    print()
    
    # 정리
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print(f"테스트 데이터베이스 정리 완료: {test_db_path}")
    
    print("\n" + "=" * 60)
    print("✅ 모든 테스트 완료!")
    print("=" * 60)

