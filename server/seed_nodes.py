"""
SQLite 데이터베이스에 샘플 노드 데이터를 추가하는 스크립트
"""

import json
import os
import sqlite3
import sys

# database.py의 DatabaseManager를 사용하기 위해 경로 추가
sys.path.insert(0, os.path.dirname(__file__))
from db.database import DatabaseManager


def seed_database(db_path: str | None = None) -> None:
    """데이터베이스에 샘플 데이터 추가"""
    # db_path가 없으면 server/db/workflows.db 사용
    if db_path is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        db_dir = os.path.join(script_dir, "db")
        # db 폴더가 없으면 생성
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)
        db_path = os.path.join(db_dir, "workflows.db")

    print(f"데이터베이스 경로: {db_path}")

    # 데이터베이스 초기화 (테이블 생성)
    DatabaseManager(db_path).init_database()

    # 새로운 연결 생성
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"연결 타입: {type(conn)}")

    try:
        # 1. 샘플 스크립트 생성
        scripts_data = [
            {"name": "로그인 테스트", "description": "사용자 로그인 프로세스 검증"},
            {"name": "결제 프로세스 테스트", "description": "온라인 결제 과정 검증"},
        ]

        script_ids = []
        for script_data in scripts_data:
            # 스크립트가 이미 존재하는지 확인
            cursor.execute("SELECT id FROM scripts WHERE name = ?", (script_data["name"],))
            existing = cursor.fetchone()

            if existing:
                script_ids.append(existing[0])
                print(f"스크립트 '{script_data['name']}' 이미 존재 (ID: {existing[0]})")
            else:
                cursor.execute(
                    "INSERT INTO scripts (name, description) VALUES (?, ?)",
                    (script_data["name"], script_data["description"]),
                )
                script_id = cursor.lastrowid
                script_ids.append(script_id)
                print(f"스크립트 '{script_data['name']}' 생성됨 (ID: {script_id})")

        # 2. 첫 번째 스크립트에 노드 추가
        script1_id = script_ids[0]

        # 기존 노드 삭제 (새로 시작)
        cursor.execute("DELETE FROM nodes WHERE script_id = ?", (script1_id,))
        cursor.execute("DELETE FROM connections WHERE script_id = ?", (script1_id,))

        # 노드 데이터 정의
        nodes_data = [
            {
                "id": "start",
                "type": "start",
                "position": {"x": 49800, "y": 49900},
                "data": {"title": "시작"},
            },
            {
                "id": "node1",
                "type": "action",
                "position": {"x": 50000, "y": 49900},
                "data": {"title": "페이지 이동", "url": "https://example.com/login"},
            },
            {
                "id": "node2",
                "type": "action",
                "position": {"x": 50200, "y": 49900},
                "data": {"title": "아이디 입력", "selector": "#username", "value": "testuser"},
            },
            {
                "id": "node3",
                "type": "condition",
                "position": {"x": 50400, "y": 49900},
                "data": {"title": "로그인 성공 확인", "condition": "check_login_success"},
            },
            {
                "id": "node4",
                "type": "action",
                "position": {"x": 50600, "y": 49700},
                "data": {"title": "대시보드 이동", "url": "https://example.com/dashboard"},
            },
            {
                "id": "node5",
                "type": "action",
                "position": {"x": 50600, "y": 50100},
                "data": {"title": "에러 처리", "message": "로그인 실패"},
            },
            {
                "id": "end",
                "type": "end",
                "position": {"x": 50800, "y": 49900},
                "data": {"title": "종료"},
            },
        ]

        # 노드 삽입
        for node in nodes_data:
            cursor.execute(
                """
                INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    script1_id,
                    node["id"],
                    node["type"],
                    node["position"]["x"],
                    node["position"]["y"],
                    json.dumps(node["data"], ensure_ascii=False),
                ),
            )
            print(f"노드 '{node['id']}' 추가됨")

        # 연결 데이터 정의
        connections_data = [
            {"from": "start", "to": "node1"},
            {"from": "node1", "to": "node2"},
            {"from": "node2", "to": "node3"},
            {"from": "node3", "to": "node4"},  # True 경로
            {"from": "node3", "to": "node5"},  # False 경로
            {"from": "node4", "to": "end"},
            {"from": "node5", "to": "end"},
        ]

        # 연결 삽입
        for connection in connections_data:
            cursor.execute(
                """
                INSERT INTO connections (script_id, from_node_id, to_node_id)
                VALUES (?, ?, ?)
            """,
                (script1_id, connection["from"], connection["to"]),
            )
            print(f"연결 '{connection['from']}' → '{connection['to']}' 추가됨")

        # 3. 두 번째 스크립트에 노드 추가
        script2_id = script_ids[1]

        # 기존 노드 삭제
        cursor.execute("DELETE FROM nodes WHERE script_id = ?", (script2_id,))
        cursor.execute("DELETE FROM connections WHERE script_id = ?", (script2_id,))

        # 두 번째 스크립트의 노드 데이터
        nodes_data_2 = [
            {
                "id": "start",
                "type": "start",
                "position": {"x": 49800, "y": 49900},
                "data": {"title": "시작"},
            },
            {
                "id": "node1",
                "type": "action",
                "position": {"x": 50000, "y": 49900},
                "data": {"title": "결제 페이지 이동", "url": "https://example.com/payment"},
            },
            {
                "id": "node2",
                "type": "action",
                "position": {"x": 50200, "y": 49900},
                "data": {"title": "결제 정보 입력", "card_number": "1234-5678-9012-3456"},
            },
            {
                "id": "node3",
                "type": "wait",
                "position": {"x": 50400, "y": 49900},
                "data": {"title": "결제 처리 대기", "duration": 3000},
            },
            {
                "id": "node4",
                "type": "condition",
                "position": {"x": 50600, "y": 49900},
                "data": {"title": "결제 성공 확인", "condition": "check_payment_success"},
            },
            {
                "id": "end",
                "type": "end",
                "position": {"x": 50800, "y": 49900},
                "data": {"title": "종료"},
            },
        ]

        # 노드 삽입
        for node in nodes_data_2:
            cursor.execute(
                """
                INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (
                    script2_id,
                    node["id"],
                    node["type"],
                    node["position"]["x"],
                    node["position"]["y"],
                    json.dumps(node["data"], ensure_ascii=False),
                ),
            )
            print(f"스크립트 2 - 노드 '{node['id']}' 추가됨")

        # 연결 데이터
        connections_data_2 = [
            {"from": "start", "to": "node1"},
            {"from": "node1", "to": "node2"},
            {"from": "node2", "to": "node3"},
            {"from": "node3", "to": "node4"},
            {"from": "node4", "to": "end"},
        ]

        # 연결 삽입
        for connection in connections_data_2:
            cursor.execute(
                """
                INSERT INTO connections (script_id, from_node_id, to_node_id)
                VALUES (?, ?, ?)
            """,
                (script2_id, connection["from"], connection["to"]),
            )
            print(f"스크립트 2 - 연결 '{connection['from']}' → '{connection['to']}' 추가됨")

        # 업데이트 시간 갱신
        for script_id in script_ids:
            cursor.execute("UPDATE scripts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (script_id,))

        conn.commit()
        print("\n샘플 데이터 추가 완료!")
        print(f"   - 스크립트 1 (ID: {script1_id}): {len(nodes_data)}개 노드, {len(connections_data)}개 연결")
        print(f"   - 스크립트 2 (ID: {script2_id}): {len(nodes_data_2)}개 노드, {len(connections_data_2)}개 연결")

    except Exception as e:
        conn.rollback()
        print(f"오류 발생: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    print("SQLite 데이터베이스에 샘플 노드 데이터 추가 중...\n")
    seed_database()
    print("\n완료!")
