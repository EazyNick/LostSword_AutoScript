"""통합 데이터베이스 관리자 모듈"""

import logging
import os
import sys
from typing import Any

# 직접 실행 시와 모듈로 import 시 모두 지원
try:
    from .connection import DatabaseConnection
    from .dashboard_stats_repository import DashboardStatsRepository
    from .node_repository import NodeRepository
    from .script_repository import ScriptRepository
    from .table_manager import TableManager
    from .user_settings_repository import UserSettingsRepository
except ImportError:
    # 직접 실행 시 절대 import 사용
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from db.connection import DatabaseConnection
    from db.dashboard_stats_repository import DashboardStatsRepository
    from db.node_repository import NodeRepository
    from db.script_repository import ScriptRepository
    from db.table_manager import TableManager
    from db.user_settings_repository import UserSettingsRepository


class DatabaseManager:
    """통합 데이터베이스 관리자 클래스"""

    def __init__(self, db_path: str | None = None) -> None:
        """
        DatabaseManager 초기화

        Args:
            db_path: 데이터베이스 파일 경로. None이면 기본 경로 사용
        """
        # 연결 관리
        self.connection = DatabaseConnection(db_path)

        # 테이블 관리
        self.table_manager = TableManager(self.connection)

        # 리포지토리들
        self.user_settings = UserSettingsRepository(self.connection)
        self.scripts = ScriptRepository(self.connection)
        self.nodes = NodeRepository(self.connection)
        self.dashboard_stats = DashboardStatsRepository(self.connection)

        # 데이터베이스 초기화
        self.init_database()

    def init_database(self) -> None:
        """데이터베이스 초기화"""
        self.table_manager.initialize()

    # 사용자 설정 메서드들 (기존 API 호환성 유지)
    def get_user_setting(self, setting_key: str, default_value: str | None = None) -> str | None:
        """사용자 설정 조회"""
        return self.user_settings.get_setting(setting_key, default_value)

    def save_user_setting(self, setting_key: str, setting_value: str) -> bool:
        """사용자 설정 저장"""
        return self.user_settings.save_setting(setting_key, setting_value)

    def get_all_user_settings(self) -> dict[str, str]:
        """모든 사용자 설정 조회"""
        return self.user_settings.get_all_settings()

    def delete_user_setting(self, setting_key: str) -> bool:
        """사용자 설정 삭제"""
        return self.user_settings.delete_setting(setting_key)

    # 스크립트 메서드들 (기존 API 호환성 유지)
    def create_script(self, name: str, description: str = "") -> int:
        """새 스크립트 생성"""
        return self.scripts.create_script(name, description)

    def get_all_scripts(self) -> list[dict[str, Any]]:
        """모든 스크립트 목록 조회"""
        return self.scripts.get_all_scripts()

    def get_script(self, script_id: int) -> dict[str, Any] | None:
        """특정 스크립트 조회 (노드 및 연결 정보 포함)"""
        # 기본 스크립트 정보 조회
        script_info = self.scripts.get_script(script_id)
        if not script_info:
            return None

        # 노드 정보 조회
        nodes = self.nodes.get_nodes_by_script_id(script_id)

        # 중복 경계 노드 정리
        nodes = self.nodes.cleanup_duplicate_boundary_nodes(script_id, nodes)

        # 연결 정보 생성
        connections = self.nodes.build_connections_from_nodes(nodes)

        return {**script_info, "nodes": nodes, "connections": connections}

    def save_script_data(self, script_id: int, nodes: list[dict[str, Any]], connections: list[dict[str, Any]]) -> bool:
        """스크립트의 노드와 연결 정보 저장"""
        # 노드 저장
        success = self.nodes.save_nodes(script_id, nodes, connections)

        if success:
            # 업데이트 시간 갱신
            self.scripts.update_script_timestamp(script_id)

        return success

    def delete_script(self, script_id: int) -> bool:
        """스크립트 삭제"""
        return self.scripts.delete_script(script_id)

    def update_script_active(self, script_id: int, active: bool) -> bool:
        """스크립트 활성/비활성 상태 업데이트"""
        return self.scripts.update_script_active(script_id, active)

    def update_script_order(self, script_orders: list[dict[str, int]]) -> bool:
        """스크립트 순서 업데이트"""
        return self.scripts.update_script_order(script_orders)

    # 대시보드 통계 메서드들
    def get_dashboard_stats(self) -> dict[str, int]:
        """대시보드 통계 조회"""
        return self.dashboard_stats.get_all_stats()

    def update_dashboard_stats(self, stats: dict[str, int]) -> bool:
        """대시보드 통계 업데이트"""
        return self.dashboard_stats.update_all_stats(stats)

    def calculate_and_update_dashboard_stats(self) -> dict[str, int]:
        """
        대시보드 통계 계산 및 업데이트
        - 전체 스크립트 개수
        - 오늘 실행 횟수
        - 오늘 실패한 스크립트 개수
        - 비활성 스크립트 개수
        """
        # 전체 스크립트 개수
        all_scripts = self.get_all_scripts()
        total_scripts = len(all_scripts)

        # 비활성 스크립트 개수
        inactive_scripts = sum(1 for script in all_scripts if not script.get("active", True))

        # 오늘 실행 횟수 및 실패한 스크립트 개수
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)

        try:
            # script_executions 테이블이 존재하는지 확인
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='script_executions'"
            )
            table_exists = cursor.fetchone() is not None

            if table_exists:
                # 오늘 실행 횟수 (SQLite datetime 함수 사용)
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM script_executions
                    WHERE date(started_at) = date('now')
                    """
                )
                today_executions = cursor.fetchone()[0] or 0

                # 오늘 실패한 스크립트 개수
                cursor.execute(
                    """
                    SELECT COUNT(DISTINCT script_id) FROM script_executions
                    WHERE date(started_at) = date('now') AND status = 'error'
                    """
                )
                today_failed = cursor.fetchone()[0] or 0
            else:
                # 테이블이 없으면 0으로 설정
                today_executions = 0
                today_failed = 0
        finally:
            conn.close()

        stats = {
            "total_scripts": total_scripts,
            "today_executions": today_executions,
            "today_failed": today_failed,
            "inactive_scripts": inactive_scripts,
        }

        # 통계 업데이트
        self.update_dashboard_stats(stats)

        return stats

    def seed_example_data(self, logger: logging.Logger | None = None) -> None:
        """
        예시 데이터 생성

        Args:
            logger: 로거 객체 (선택사항). None이면 print 사용
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)

        # 로거가 없으면 print 사용
        log_func = logger.info if logger else print

        try:
            # 기존 데이터 확인
            cursor.execute("SELECT COUNT(*) FROM scripts")
            existing_count = cursor.fetchone()[0]

            if existing_count > 0:
                msg = f"이미 {existing_count}개의 스크립트가 존재합니다. 예시 데이터 생성을 건너뜁니다."
                if logger:
                    logger.info(msg)
                else:
                    print(msg)
                conn.close()
                return

            log_func("예시 데이터 생성 시작...")

            # 스크립트 1: 로그인 테스트
            script1_id = self.scripts.create_script("로그인 테스트", "사용자 로그인 프로세스 검증")
            log_func(f"스크립트 1 생성: ID={script1_id}")

            script1_nodes = [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0.0, "y": 0.0},
                    "data": {"title": "시작"},
                    "parameters": {},
                    "description": None,
                },
                {
                    "id": "node1",
                    "type": "action",
                    "position": {"x": 300.0, "y": 0.0},
                    "data": {"title": "페이지 이동", "url": "https://example.com/login"},
                    "parameters": {},
                    "description": "로그인 페이지로 이동",
                },
                {
                    "id": "node2",
                    "type": "action",
                    "position": {"x": 600.0, "y": 0.0},
                    "data": {"title": "아이디 입력", "selector": "#username", "value": "testuser"},
                    "parameters": {},
                    "description": "사용자 아이디 입력",
                },
                {
                    "id": "node3",
                    "type": "condition",
                    "position": {"x": 300.0, "y": 150.0},
                    "data": {"title": "로그인 성공 확인"},
                    "parameters": {"condition": "check_login_success"},
                    "description": "로그인 성공 여부 확인",
                },
                {
                    "id": "node4",
                    "type": "action",
                    "position": {"x": 900.0, "y": 0.0},
                    "data": {"title": "대시보드 이동", "url": "https://example.com/dashboard"},
                    "parameters": {},
                    "description": "로그인 성공 시 대시보드로 이동",
                },
                {
                    "id": "node5",
                    "type": "action",
                    "position": {"x": 1200.0, "y": 0.0},
                    "data": {"title": "에러 처리", "message": "로그인 실패"},
                    "parameters": {},
                    "description": "로그인 실패 시 에러 처리",
                },
                {
                    "id": "end",
                    "type": "end",
                    "position": {"x": 1500.0, "y": 0.0},
                    "data": {"title": "종료"},
                    "parameters": {},
                },
            ]

            script1_connections = [
                {"from": "start", "to": "node1", "outputType": None},
                {"from": "node1", "to": "node2", "outputType": None},
                {"from": "node2", "to": "node3", "outputType": None},
                {"from": "node3", "to": "node4", "outputType": "true"},
                {"from": "node3", "to": "node5", "outputType": "false"},
                {"from": "node4", "to": "end", "outputType": None},
                {"from": "node5", "to": "end", "outputType": None},
            ]

            self.nodes.save_nodes(script1_id, script1_nodes, script1_connections)
            self.scripts.update_script_timestamp(script1_id)
            log_func(f"스크립트 1에 {len(script1_nodes)}개의 노드 추가 완료")

            # 스크립트 2: 결제 프로세스 테스트
            script2_id = self.scripts.create_script("결제 프로세스 테스트", "온라인 결제 과정 검증")
            log_func(f"스크립트 2 생성: ID={script2_id}")

            script2_nodes = [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0.0, "y": 0.0},
                    "data": {"title": "시작"},
                    "parameters": {},
                },
                {
                    "id": "node1",
                    "type": "action",
                    "position": {"x": 300.0, "y": 0.0},
                    "data": {"title": "결제 페이지 이동", "url": "https://example.com/payment"},
                    "parameters": {},
                    "description": "결제 페이지로 이동",
                },
                {
                    "id": "node2",
                    "type": "action",
                    "position": {"x": 600.0, "y": 0.0},
                    "data": {"title": "결제 정보 입력", "card_number": "1234-5678-9012-3456"},
                    "parameters": {},
                    "description": "카드 정보 입력",
                },
                {
                    "id": "node3",
                    "type": "wait",
                    "position": {"x": 300.0, "y": 150.0},
                    "data": {"title": "결제 처리 대기"},
                    "parameters": {"wait_time": 3.0},
                },
                {
                    "id": "node4",
                    "type": "condition",
                    "position": {"x": 900.0, "y": 0.0},
                    "data": {"title": "결제 성공 확인"},
                    "parameters": {"condition": "check_payment_success"},
                    "description": "결제 성공 여부 확인",
                },
                {
                    "id": "end",
                    "type": "end",
                    "position": {"x": 1200.0, "y": 0.0},
                    "data": {"title": "종료"},
                    "parameters": {},
                },
            ]

            script2_connections = [
                {"from": "start", "to": "node1", "outputType": None},
                {"from": "node1", "to": "node2", "outputType": None},
                {"from": "node2", "to": "node3", "outputType": None},
                {"from": "node3", "to": "node4", "outputType": None},
                {"from": "node4", "to": "end", "outputType": "true"},
            ]

            self.nodes.save_nodes(script2_id, script2_nodes, script2_connections)
            self.scripts.update_script_timestamp(script2_id)
            log_func(f"스크립트 2에 {len(script2_nodes)}개의 노드 추가 완료")

            # 스크립트 3: 이미지 터치 테스트
            script3_id = self.scripts.create_script("이미지 터치 테스트", "이미지 터치 노드를 사용한 자동화 테스트")
            log_func(f"스크립트 3 생성: ID={script3_id}")

            script3_nodes = [
                {
                    "id": "start",
                    "type": "start",
                    "position": {"x": 0.0, "y": 0.0},
                    "data": {"title": "시작"},
                    "parameters": {},
                },
                {
                    "id": "node1",
                    "type": "image-touch",
                    "position": {"x": 300.0, "y": 0.0},
                    "data": {"title": "이미지 터치"},
                    "parameters": {"folder_path": "C:/Users/User/Desktop/images", "image_count": 5},
                },
                {
                    "id": "node2",
                    "type": "wait",
                    "position": {"x": 600.0, "y": 0.0},
                    "data": {"title": "대기"},
                    "parameters": {"wait_time": 2.0},
                },
                {
                    "id": "end",
                    "type": "end",
                    "position": {"x": 900.0, "y": 0.0},
                    "data": {"title": "종료"},
                    "parameters": {},
                },
            ]

            script3_connections = [
                {"from": "start", "to": "node1", "outputType": None},
                {"from": "node1", "to": "node2", "outputType": None},
                {"from": "node2", "to": "end", "outputType": None},
            ]

            self.nodes.save_nodes(script3_id, script3_nodes, script3_connections)
            self.scripts.update_script_timestamp(script3_id)
            log_func(f"스크립트 3에 {len(script3_nodes)}개의 노드 추가 완료")

            # 사용자 설정 예시 데이터 추가
            self.user_settings.save_setting("theme", "dark")
            self.user_settings.save_setting("language", "ko")
            self.user_settings.save_setting("auto_save", "true")

            # 기본 UI 설정값 추가
            import json

            self.user_settings.save_setting("sidebar-width", "300")  # 기본 사이드바 너비
            script_order = json.dumps([script1_id, script2_id, script3_id], ensure_ascii=False)
            self.user_settings.save_setting("script-order", script_order)  # 스크립트 순서

            log_func("사용자 설정 예시 데이터 추가 완료")

            total_nodes = len(script1_nodes) + len(script2_nodes) + len(script3_nodes)
            log_func("✅ 예시 데이터 생성 완료!")
            log_func("   - 스크립트: 3개")
            log_func(f"   - 노드: {total_nodes}개")
            log_func("   - 사용자 설정: 3개")
            log_func(f"   - 데이터베이스 경로: {self.connection.db_path}")

        except Exception as e:
            error_msg = f"❌ 예시 데이터 생성 실패: {e}"
            if logger:
                logger.error(error_msg)
            else:
                print(error_msg)
            raise e
        finally:
            conn.close()


# 전역 데이터베이스 매니저 인스턴스
db_manager = DatabaseManager()


# ============================================================================
# 테스트 코드
# ============================================================================
# DatabaseManager 클래스의 통합 기능을 테스트합니다.
#
# 테스트 항목:
# 1. DatabaseManager 초기화 (모든 리포지토리 통합)
# 2. 테이블 생성 확인 (scripts, nodes, user_settings)
# 3. 예시 데이터 생성 (3개 스크립트, 17개 노드, 3개 사용자 설정)
# 4. 데이터 검증 (스크립트, 노드, 연결 정보 확인)
# 5. 사용자 설정 CRUD 테스트
# 6. 스크립트 CRUD 테스트
# 7. 노드 저장 및 조회 테스트
# 8. 통합 기능 테스트 (모든 모듈이 함께 작동하는지 확인)
# ============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("데이터베이스 초기화 및 테스트")
    print("=" * 60)

    # 테스트용 데이터베이스 경로 설정
    test_db_path = os.path.join(os.path.dirname(__file__), "test_workflows.db")

    # 기존 테스트 DB가 있으면 삭제
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        print(f"기존 테스트 데이터베이스 삭제: {test_db_path}")

    # DatabaseManager 인스턴스 생성
    print("\n[1] DatabaseManager 초기화 중...")
    db = DatabaseManager(test_db_path)
    print("✅ 데이터베이스 초기화 완료")

    # 테이블 생성 확인
    print("\n[2] 테이블 생성 확인 중...")
    conn = db.connection.get_connection()
    cursor = db.connection.get_cursor(conn)
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"✅ 생성된 테이블: {', '.join(tables)}")
    finally:
        conn.close()

    # 예시 데이터 생성
    print("\n[3] 예시 데이터 생성 중...")
    db.seed_example_data()

    # 데이터 검증
    print("\n[4] 데이터 검증 중...")

    # 스크립트 목록 확인
    scripts = db.get_all_scripts()
    print(f"✅ 스크립트 개수: {len(scripts)}개")
    for script in scripts:
        print(f"   - ID: {script['id']}, 이름: {script['name']}, 설명: {script['description']}")

    # 각 스크립트의 노드 확인
    for script in scripts:
        script_data = db.get_script(script["id"])
        if script_data:
            print(f"\n   스크립트 '{script['name']}':")
            print(f"   - 노드 개수: {len(script_data['nodes'])}개")
            print(f"   - 연결 개수: {len(script_data['connections'])}개")
            for node in script_data["nodes"]:
                print(f"     * {node['id']} ({node['type']}): {node.get('description', '설명 없음')}")

    # 사용자 설정 확인
    settings = db.get_all_user_settings()
    print(f"\n✅ 사용자 설정 개수: {len(settings)}개")
    for key, value in settings.items():
        print(f"   - {key}: {value}")

    # 개별 설정 조회 테스트
    print("\n[5] 개별 설정 조회 테스트...")
    theme = db.get_user_setting("theme", "light")
    print(f"✅ 테마 설정: {theme}")

    # 설정 저장 테스트
    print("\n[6] 설정 저장 테스트...")
    db.save_user_setting("test_key", "test_value")
    test_value = db.get_user_setting("test_key")
    print(f"✅ 테스트 설정 저장 및 조회: {test_value}")

    # 설정 삭제 테스트
    print("\n[7] 설정 삭제 테스트...")
    deleted = db.delete_user_setting("test_key")
    print(f"✅ 테스트 설정 삭제: {deleted}")

    # 스크립트 생성 테스트
    print("\n[8] 스크립트 생성 테스트...")
    new_script_id = db.create_script("테스트 스크립트", "테스트용 스크립트입니다")
    print(f"✅ 새 스크립트 생성: ID={new_script_id}")

    # 노드 저장 테스트
    print("\n[9] 노드 저장 테스트...")
    test_nodes = [
        {
            "id": "start",
            "type": "start",
            "position": {"x": 0.0, "y": 0.0},
            "data": {"title": "시작"},
            "parameters": {},
        },
        {
            "id": "test_node",
            "type": "action",
            "position": {"x": 300.0, "y": 0.0},
            "data": {"title": "테스트 액션"},
            "parameters": {},
            "description": "테스트용 노드",
        },
        {
            "id": "end",
            "type": "end",
            "position": {"x": 600.0, "y": 0.0},
            "data": {"title": "종료"},
            "parameters": {},
        },
    ]

    test_connections = [
        {"from": "start", "to": "test_node", "outputType": None},
        {"from": "test_node", "to": "end", "outputType": None},
    ]

    db.save_script_data(new_script_id, test_nodes, test_connections)
    print(f"✅ 노드 저장 완료: {len(test_nodes)}개 노드, {len(test_connections)}개 연결")

    # 저장된 스크립트 조회 테스트
    print("\n[10] 저장된 스크립트 조회 테스트...")
    saved_script = db.get_script(new_script_id)
    if saved_script:
        print(f"✅ 스크립트 조회 성공: {saved_script['name']}")
        print(f"   - 노드 개수: {len(saved_script['nodes'])}개")
        print(f"   - 연결 개수: {len(saved_script['connections'])}개")

    print("\n" + "=" * 60)
    print("✅ 모든 테스트 완료!")
    print(f"테스트 데이터베이스 경로: {test_db_path}")
    print("=" * 60)
