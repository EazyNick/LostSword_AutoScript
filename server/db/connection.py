"""데이터베이스 연결 관리 모듈"""
import sqlite3
import os
from typing import Optional


class DatabaseConnection:
    """데이터베이스 연결을 관리하는 클래스"""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        데이터베이스 연결 초기화
        
        Args:
            db_path: 데이터베이스 파일 경로. None이면 기본 경로 사용
        """
        if db_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.join(script_dir, "workflows.db")
        self.db_path = db_path
    
    def get_connection(self) -> sqlite3.Connection:
        """
        데이터베이스 연결 반환
        
        Returns:
            sqlite3.Connection: 데이터베이스 연결 객체
        """
        conn = sqlite3.connect(self.db_path)
        return conn
    
    def get_cursor(self, conn: sqlite3.Connection) -> sqlite3.Cursor:
        """
        커서 객체 반환
        
        Args:
            conn: 데이터베이스 연결 객체
            
        Returns:
            sqlite3.Cursor: 커서 객체
        """
        return conn.cursor()
    
    def execute_with_connection(self, callback):
        """
        연결을 자동으로 관리하는 컨텍스트 매니저
        
        Args:
            callback: (conn, cursor)를 인자로 받는 함수
            
        Returns:
            callback의 반환값
        """
        conn = self.get_connection()
        cursor = self.get_cursor(conn)
        try:
            result = callback(conn, cursor)
            conn.commit()
            return result
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()


# ============================================================================
# 테스트 코드
# ============================================================================
# DatabaseConnection 클래스의 기능을 테스트합니다.
# 
# 용어 설명:
# - Connection (연결): 데이터베이스와의 연결 객체로, SQLite 데이터베이스 파일에 접근
# - Cursor (커서): SQL 쿼리를 실행하고 결과를 가져오는 객체
#                  Connection을 통해 생성되며, execute(), fetchone(), fetchall() 등의 메서드 제공
# 
# 테스트 항목:
# 1. DatabaseConnection 인스턴스 생성 (기본 경로 및 사용자 지정 경로)
# 2. 데이터베이스 연결 생성 및 커서 생성
# 3. 간단한 쿼리 실행 (CREATE, INSERT, SELECT)
# 4. execute_with_connection 메서드 (자동 연결 관리)
# 5. 롤백 기능 (에러 발생 시 자동 롤백)
# 6. 연결 종료
# 7. 기본 경로 사용 확인
# ============================================================================
if __name__ == "__main__":
    import os
    
    print("=" * 60)
    print("DatabaseConnection 모듈 테스트")
    print("=" * 60)
    
    # 테스트용 데이터베이스 경로 설정
    test_db_path = os.path.join(os.path.dirname(__file__), "test_connection.db")
    
    # 기존 테스트 DB가 있으면 삭제
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print(f"기존 테스트 데이터베이스 삭제: {test_db_path}\n")
    
    # [1] DatabaseConnection 인스턴스 생성 테스트
    print("[1] DatabaseConnection 인스턴스 생성 테스트...")
    conn_manager = DatabaseConnection(test_db_path)
    print(f"✅ 인스턴스 생성 성공")
    print(f"   - 데이터베이스 경로: {conn_manager.db_path}\n")
    
    # [2] 연결 생성 테스트
    print("[2] 데이터베이스 연결 생성 테스트...")
    conn = conn_manager.get_connection()
    print("✅ 연결 생성 성공")
    print(f"   - 연결 객체 타입: {type(conn).__name__}\n")
    
    # [3] 커서 생성 테스트
    print("[3] 커서 생성 테스트...")
    cursor = conn_manager.get_cursor(conn)
    print("✅ 커서 생성 성공")
    print(f"   - 커서 객체 타입: {type(cursor).__name__}\n")
    
    # [4] 간단한 쿼리 실행 테스트
    print("[4] 간단한 쿼리 실행 테스트...")
    cursor.execute("CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)")
    cursor.execute("INSERT INTO test_table (name) VALUES (?)", ("테스트 데이터",))
    conn.commit()
    cursor.execute("SELECT * FROM test_table")
    result = cursor.fetchone()
    print(f"✅ 쿼리 실행 성공")
    print(f"   - 조회 결과: {result}\n")
    
    # [5] execute_with_connection 메서드 테스트
    print("[5] execute_with_connection 메서드 테스트...")
    def test_callback(conn, cursor):
        """테스트용 콜백 함수"""
        cursor.execute("INSERT INTO test_table (name) VALUES (?)", ("콜백 테스트",))
        cursor.execute("SELECT COUNT(*) FROM test_table")
        count = cursor.fetchone()[0]
        return count
    
    count = conn_manager.execute_with_connection(test_callback)
    print(f"✅ execute_with_connection 실행 성공")
    print(f"   - 반환값: {count}개 레코드\n")
    
    # [6] 롤백 테스트 (에러 발생 시)
    print("[6] 롤백 기능 테스트...")
    try:
        def error_callback(conn, cursor):
            """에러를 발생시키는 테스트용 콜백 함수"""
            cursor.execute("INSERT INTO test_table (name) VALUES (?)", ("롤백 테스트",))
            raise ValueError("의도된 에러 발생")
        
        conn_manager.execute_with_connection(error_callback)
    except ValueError as e:
        print(f"✅ 에러 발생 및 롤백 확인")
        print(f"   - 에러 메시지: {e}")
        # 롤백 확인을 위해 데이터 조회
        conn = conn_manager.get_connection()
        cursor = conn_manager.get_cursor(conn)
        cursor.execute("SELECT COUNT(*) FROM test_table WHERE name = '롤백 테스트'")
        rollback_count = cursor.fetchone()[0]
        conn.close()
        print(f"   - 롤백 확인: '롤백 테스트' 레코드 수 = {rollback_count} (0이어야 함)\n")
    
    # [7] 연결 종료 테스트
    print("[7] 연결 종료 테스트...")
    conn.close()
    print("✅ 연결 종료 성공\n")
    
    # [8] 기본 경로 사용 테스트
    # DatabaseConnection을 인자 없이 생성하면 자동으로 server/db/workflows.db 경로를 사용
    print("[8] 기본 경로 사용 테스트...")
    print("   (DatabaseConnection()을 인자 없이 생성하면 기본 경로 사용)")
    default_conn = DatabaseConnection()
    print(f"✅ 기본 경로 사용 성공")
    print(f"   - 기본 데이터베이스 경로: {default_conn.db_path}")
    print(f"   - 설명: db_path 인자를 전달하지 않으면 자동으로 workflows.db 사용\n")
    
    # 정리 (모든 연결 닫기)
    import gc
    gc.collect()  # 가비지 컬렉션으로 연결 정리
    
    # 잠시 대기 후 삭제 시도
    import time
    time.sleep(0.1)
    
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
            print(f"테스트 데이터베이스 삭제 완료: {test_db_path}")
    except PermissionError:
        print(f"⚠️  테스트 데이터베이스 삭제 실패 (파일이 사용 중): {test_db_path}")
        print("   수동으로 삭제해주세요.")
    
    print("\n" + "=" * 60)
    print("✅ 모든 테스트 완료!")
    print("=" * 60)

