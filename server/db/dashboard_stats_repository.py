"""대시보드 통계 리포지토리 모듈"""

import os
import sqlite3
import sys

# 직접 실행 시와 모듈로 import 시 모두 지원
try:
    from .connection import DatabaseConnection
except ImportError:
    # 직접 실행 시 절대 import 사용
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from db.connection import DatabaseConnection


class DashboardStatsRepository:
    """대시보드 통계 관련 데이터베이스 작업을 처리하는 클래스"""

    def __init__(self, connection: DatabaseConnection) -> None:
        """
        DashboardStatsRepository 초기화

        Args:
            connection: DatabaseConnection 인스턴스
        """
        self.connection = connection

    def get_stat(self, stat_key: str, default_value: int = 0) -> int:
        """
        특정 통계 값 조회

        Args:
            stat_key: 통계 키 (예: 'total_scripts', 'today_executions', 'today_failed', 'inactive_scripts')
            default_value: 기본값 (통계가 없을 경우)

        Returns:
            통계 값
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)

        try:
            cursor.execute(
                "SELECT stat_value FROM dashboard_stats WHERE stat_key = ?",
                (stat_key,),
            )
            row = cursor.fetchone()
            return int(row[0]) if row else default_value
        finally:
            conn.close()

    def set_stat(self, stat_key: str, stat_value: int) -> bool:
        """
        통계 값 설정 (없으면 생성, 있으면 업데이트)

        Args:
            stat_key: 통계 키
            stat_value: 통계 값

        Returns:
            성공 여부
        """
        result: bool = self.connection.execute_with_connection(
            lambda _conn, cursor: self._set_stat_impl(cursor, stat_key, stat_value)
        )
        return result

    def _set_stat_impl(self, cursor: sqlite3.Cursor, stat_key: str, stat_value: int) -> bool:
        """통계 값 설정 구현"""
        cursor.execute(
            """
            INSERT INTO dashboard_stats (stat_key, stat_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(stat_key) DO UPDATE SET
                stat_value = excluded.stat_value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (stat_key, stat_value),
        )
        return True

    def get_all_stats(self) -> dict[str, int]:
        """
        모든 통계 값 조회

        Returns:
            통계 키-값 딕셔너리
        """
        conn = self.connection.get_connection()
        cursor = self.connection.get_cursor(conn)

        try:
            cursor.execute("SELECT stat_key, stat_value FROM dashboard_stats")
            return {row[0]: int(row[1]) for row in cursor.fetchall()}
        finally:
            conn.close()

    def update_all_stats(self, stats: dict[str, int]) -> bool:
        """
        여러 통계 값을 한 번에 업데이트

        Args:
            stats: 통계 키-값 딕셔너리

        Returns:
            성공 여부
        """
        result: bool = self.connection.execute_with_connection(
            lambda _conn, cursor: self._update_all_stats_impl(cursor, stats)
        )
        return result

    def _update_all_stats_impl(self, cursor: sqlite3.Cursor, stats: dict[str, int]) -> bool:
        """여러 통계 값 업데이트 구현"""
        for stat_key, stat_value in stats.items():
            cursor.execute(
                """
                INSERT INTO dashboard_stats (stat_key, stat_value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(stat_key) DO UPDATE SET
                    stat_value = excluded.stat_value,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (stat_key, stat_value),
            )
        return True

