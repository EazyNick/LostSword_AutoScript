"""테이블 생성 및 마이그레이션 관리 모듈"""
import sqlite3
import os
import sys
from typing import Optional

# 직접 실행 시와 모듈로 import 시 모두 지원
try:
    from .connection import DatabaseConnection
except ImportError:
    # 직접 실행 시 절대 import 사용
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from db.connection import DatabaseConnection


class TableManager:
    """데이터베이스 테이블 생성 및 마이그레이션을 관리하는 클래스"""
    
    def __init__(self, connection: DatabaseConnection):
        """
        TableManager 초기화
        
        Args:
            connection: DatabaseConnection 인스턴스
        """
        self.connection = connection
    
    def create_tables(self):
        """모든 테이블 생성"""
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)
        
        try:
            # 스크립트 테이블 생성
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scripts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 노드 테이블 생성
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS nodes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    script_id INTEGER NOT NULL,
                    node_id TEXT NOT NULL,
                    node_type TEXT NOT NULL,
                    position_x REAL NOT NULL,
                    position_y REAL NOT NULL,
                    node_data TEXT NOT NULL,
                    connected_to TEXT DEFAULT '[]',
                    connected_from TEXT DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE CASCADE
                )
            ''')
            
            # 사용자 설정 테이블 생성
            # 사용자별 설정을 키-값 쌍으로 저장
            # 주요 설정 키:
            #   - focused-script-id: 마지막으로 포커스된 스크립트 ID
            #   - script-order: 스크립트 목록 순서 (JSON 배열)
            #   - sidebar-width: 사이드바 너비
            #   - theme: 테마 설정 (dark/light)
            #   - language: 언어 설정
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key TEXT NOT NULL UNIQUE,
                    setting_value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
        finally:
            conn.close()
    
    def migrate_tables(self):
        """기존 테이블에 컬럼 추가 (마이그레이션)"""
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)
        
        try:
            # connected_to 컬럼 추가
            try:
                cursor.execute('ALTER TABLE nodes ADD COLUMN connected_to TEXT DEFAULT \'[]\'')
            except sqlite3.OperationalError:
                pass  # 컬럼이 이미 존재하면 무시
            
            # connected_from 컬럼 추가
            try:
                cursor.execute('ALTER TABLE nodes ADD COLUMN connected_from TEXT DEFAULT \'[]\'')
            except sqlite3.OperationalError:
                pass
            
            # parameters 컬럼 추가
            try:
                cursor.execute('ALTER TABLE nodes ADD COLUMN parameters TEXT DEFAULT \'{}\'')
            except sqlite3.OperationalError:
                pass
            
            # description 컬럼 추가
            try:
                cursor.execute('ALTER TABLE nodes ADD COLUMN description TEXT DEFAULT NULL')
            except sqlite3.OperationalError:
                pass
            
            conn.commit()
        finally:
            conn.close()
    
    def initialize(self):
        """테이블 생성 및 마이그레이션 실행"""
        self.create_tables()
        self.migrate_tables()


# ============================================================================
# 테스트 코드
# ============================================================================
# TableManager 클래스의 기능을 테스트합니다.
# 
# 테스트 항목:
# 1. DatabaseConnection 및 TableManager 인스턴스 생성
# 2. 테이블 생성 (scripts, nodes, user_settings)
# 3. 테이블 구조 확인 (컬럼 정보)
# 4. 마이그레이션 테스트 (기존 테이블에 컬럼 추가)
# 5. initialize 메서드 (전체 초기화 프로세스)
# 6. 외래키 제약조건 테스트 (데이터 무결성 확인)
# ============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("TableManager 모듈 테스트")
    print("=" * 60)
    
    # 테스트용 데이터베이스 경로 설정
    test_db_path = os.path.join(os.path.dirname(__file__), "test_table_manager.db")
    
    # 기존 테스트 DB가 있으면 삭제
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print(f"기존 테스트 데이터베이스 삭제: {test_db_path}\n")
    
    # [1] DatabaseConnection 및 TableManager 인스턴스 생성
    print("[1] DatabaseConnection 및 TableManager 인스턴스 생성...")
    conn = DatabaseConnection(test_db_path)
    table_manager = TableManager(conn)
    print("✅ 인스턴스 생성 성공\n")
    
    # [2] 테이블 생성 테스트
    print("[2] 테이블 생성 테스트...")
    table_manager.create_tables()
    print("✅ 테이블 생성 완료")
    
    # 생성된 테이블 확인
    db_conn = conn.get_connection()
    cursor = conn.get_cursor(db_conn)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    db_conn.close()
    print(f"   - 생성된 테이블: {', '.join(tables)}\n")
    
    # [3] 각 테이블의 구조 확인
    print("[3] 테이블 구조 확인 테스트...")
    db_conn = conn.get_connection()
    cursor = conn.get_cursor(db_conn)
    
    # scripts 테이블 구조 확인
    cursor.execute("PRAGMA table_info(scripts)")
    scripts_columns = cursor.fetchall()
    print("   - scripts 테이블 컬럼:")
    for col in scripts_columns:
        print(f"     * {col[1]} ({col[2]})")
    
    # nodes 테이블 구조 확인
    cursor.execute("PRAGMA table_info(nodes)")
    nodes_columns = cursor.fetchall()
    print("   - nodes 테이블 컬럼:")
    for col in nodes_columns:
        print(f"     * {col[1]} ({col[2]})")
    
    # user_settings 테이블 구조 확인
    cursor.execute("PRAGMA table_info(user_settings)")
    settings_columns = cursor.fetchall()
    print("   - user_settings 테이블 컬럼:")
    for col in settings_columns:
        print(f"     * {col[1]} ({col[2]})")
    
    db_conn.close()
    print()
    
    # [4] 마이그레이션 테스트 (컬럼 추가)
    print("[4] 마이그레이션 테스트 (컬럼 추가)...")
    
    # 먼저 기존 nodes 테이블에서 일부 컬럼 제거 시뮬레이션 (실제로는 하지 않음)
    # 마이그레이션은 이미 존재하는 컬럼에 대해 에러를 무시하므로 안전하게 실행 가능
    table_manager.migrate_tables()
    print("✅ 마이그레이션 실행 완료")
    
    # 마이그레이션 후 컬럼 확인
    db_conn = conn.get_connection()
    cursor = conn.get_cursor(db_conn)
    cursor.execute("PRAGMA table_info(nodes)")
    nodes_columns_after = cursor.fetchall()
    db_conn.close()
    
    # connected_to, connected_from, parameters, description 컬럼 확인
    column_names = [col[1] for col in nodes_columns_after]
    expected_columns = ["connected_to", "connected_from", "parameters", "description"]
    print("   - 마이그레이션 후 nodes 테이블 컬럼 확인:")
    for col_name in expected_columns:
        if col_name in column_names:
            print(f"     ✅ {col_name} 컬럼 존재")
        else:
            print(f"     ❌ {col_name} 컬럼 없음")
    print()
    
    # [5] initialize 메서드 테스트 (전체 초기화)
    print("[5] initialize 메서드 테스트 (전체 초기화)...")
    # 새로운 DB로 테스트
    test_db_path2 = os.path.join(os.path.dirname(__file__), "test_table_manager2.db")
    if os.path.exists(test_db_path2):
        os.remove(test_db_path2)
    
    conn2 = DatabaseConnection(test_db_path2)
    table_manager2 = TableManager(conn2)
    table_manager2.initialize()
    
    # 초기화 확인
    db_conn2 = conn2.get_connection()
    cursor2 = conn2.get_cursor(db_conn2)
    cursor2.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables2 = [row[0] for row in cursor2.fetchall()]
    db_conn2.close()
    
    print("✅ initialize 실행 완료")
    print(f"   - 생성된 테이블: {', '.join(tables2)}\n")
    
    # [6] 데이터 삽입 테스트 (외래키 제약조건 확인)
    print("[6] 데이터 삽입 테스트...")
    db_conn = conn.get_connection()
    cursor = conn.get_cursor(db_conn)
    
    try:
        # 외래키 제약조건 활성화 (SQLite는 기본적으로 비활성화)
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # 스크립트 생성
        cursor.execute("INSERT INTO scripts (name, description) VALUES (?, ?)", 
                       ("테스트 스크립트", "외래키 테스트용"))
        script_id = cursor.lastrowid
        
        # 노드 생성 (정상 케이스)
        cursor.execute('''
            INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (script_id, "node1", "action", 100.0, 200.0, '{"title": "테스트"}'))
        print("✅ 데이터 삽입 성공 (정상 케이스)")
        
        # 잘못된 script_id로 노드 생성 시도 (에러 발생해야 함)
        try:
            cursor.execute('''
                INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (99999, "node2", "action", 100.0, 200.0, '{"title": "테스트"}'))
            print("⚠️  외래키 제약조건이 작동하지 않음 (SQLite 설정 확인 필요)")
        except sqlite3.IntegrityError:
            print("✅ 외래키 제약조건 작동 확인 (에러 발생 정상)")
        
        db_conn.commit()
    finally:
        db_conn.close()
    print()
    
    # 정리 (모든 연결 닫기)
    import gc
    import time
    gc.collect()
    time.sleep(0.1)
    
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
        if os.path.exists(test_db_path2):
            os.remove(test_db_path2)
        print(f"테스트 데이터베이스 정리 완료")
    except PermissionError:
        print(f"⚠️  테스트 데이터베이스 삭제 실패 (파일이 사용 중)")
        print("   수동으로 삭제해주세요.")
    
    print("\n" + "=" * 60)
    print("✅ 모든 테스트 완료!")
    print("=" * 60)

