import sqlite3
import json
import os
from typing import List, Dict, Optional
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_path: str = None):
        # db_path가 없으면 server/db/workflows.db 사용
        if db_path is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            db_dir = os.path.join(script_dir, "db")
            # db 폴더가 없으면 생성
            if not os.path.exists(db_dir):
                os.makedirs(db_dir)
            db_path = os.path.join(db_dir, "workflows.db")
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """데이터베이스 초기화"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
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
        
        # 기존 테이블에 컬럼이 없으면 추가 (마이그레이션)
        try:
            cursor.execute('ALTER TABLE nodes ADD COLUMN connected_to TEXT DEFAULT \'[]\'')
        except sqlite3.OperationalError:
            pass  # 컬럼이 이미 존재하면 무시
        
        try:
            cursor.execute('ALTER TABLE nodes ADD COLUMN connected_from TEXT DEFAULT \'[]\'')
        except sqlite3.OperationalError:
            pass  # 컬럼이 이미 존재하면 무시
        
        try:
            cursor.execute('ALTER TABLE nodes ADD COLUMN parameters TEXT DEFAULT \'{}\'')
        except sqlite3.OperationalError:
            pass  # 컬럼이 이미 존재하면 무시
        
        try:
            cursor.execute('ALTER TABLE nodes ADD COLUMN description TEXT DEFAULT NULL')
        except sqlite3.OperationalError:
            pass  # 컬럼이 이미 존재하면 무시
        
        # 연결 테이블은 더 이상 사용하지 않음 (nodes 테이블의 connected_to/connected_from 사용)
        # 기존 connections 테이블이 있다면 삭제하지 않고 그대로 둠 (하위 호환성)
        
        conn.commit()
        conn.close()
    
    def create_script(self, name: str, description: str = "") -> int:
        """새 스크립트 생성"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO scripts (name, description) VALUES (?, ?)",
                (name, description)
            )
            script_id = cursor.lastrowid
            conn.commit()
            return script_id
        except sqlite3.IntegrityError:
            raise ValueError(f"스크립트 '{name}'이 이미 존재합니다.")
        finally:
            conn.close()
    
    def get_all_scripts(self) -> List[Dict]:
        """모든 스크립트 목록 조회"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
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
        
        conn.close()
        return scripts
    
    def get_script(self, script_id: int) -> Optional[Dict]:
        """특정 스크립트 조회"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 스크립트 정보 조회
        cursor.execute(
            "SELECT id, name, description, created_at, updated_at FROM scripts WHERE id = ?",
            (script_id,)
        )
        script_row = cursor.fetchone()
        
        if not script_row:
            conn.close()
            return None
        
        # 노드들 조회 (연결 정보 포함)
        cursor.execute('''
            SELECT node_id, node_type, position_x, position_y, node_data, connected_to, connected_from, 
                COALESCE(parameters, '{}') as parameters, description
            FROM nodes 
            WHERE script_id = ? 
            ORDER BY id
        ''', (script_id,))
        
        nodes = []
        for row in cursor.fetchall():
            # connected_to와 connected_from을 JSON으로 파싱
            connected_to_raw = row[5] if len(row) > 5 else None
            connected_from_raw = row[6] if len(row) > 6 else None
            parameters_raw = row[7] if len(row) > 7 else None
            description = row[8] if len(row) > 8 else None
            
            connected_to = []
            connected_from = []
            parameters = {}
            
            # connected_to 파싱
            if connected_to_raw:
                try:
                    if isinstance(connected_to_raw, str):
                        connected_to = json.loads(connected_to_raw) if connected_to_raw.strip() else []
                    else:
                        connected_to = connected_to_raw if isinstance(connected_to_raw, list) else []
                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Warning: connected_to 파싱 실패 (node_id: {row[0]}): {e}")
                    connected_to = []
            
            # connected_from 파싱
            if connected_from_raw:
                try:
                    if isinstance(connected_from_raw, str):
                        connected_from = json.loads(connected_from_raw) if connected_from_raw.strip() else []
                    else:
                        connected_from = connected_from_raw if isinstance(connected_from_raw, list) else []
                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Warning: connected_from 파싱 실패 (node_id: {row[0]}): {e}")
                    connected_from = []
            
            # parameters 파싱
            if parameters_raw:
                try:
                    if isinstance(parameters_raw, str):
                        parameters = json.loads(parameters_raw) if parameters_raw.strip() else {}
                    else:
                        parameters = parameters_raw if isinstance(parameters_raw, dict) else {}
                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Warning: parameters 파싱 실패 (node_id: {row[0]}): {e}")
                    parameters = {}
            
            nodes.append({
                "id": row[0],
                "type": row[1],
                "position": {"x": row[2], "y": row[3]},
                "data": json.loads(row[4]),
                "connected_to": connected_to,
                "connected_from": connected_from,
                "parameters": parameters,
                "description": description
            })
        
        # 연결 정보는 nodes 테이블의 connected_to/connected_from에서 생성
        # 각 노드의 connected_to를 기반으로 connections 배열 생성
        connections = []
        for node in nodes:
            if node.get("connected_to") and len(node["connected_to"]) > 0:
                for to_node_id in node["connected_to"]:
                    connections.append({
                        "from": node["id"],
                        "to": to_node_id
                    })
        
        conn.close()
        
        return {
            "id": script_row[0],
            "name": script_row[1],
            "description": script_row[2],
            "created_at": script_row[3],
            "updated_at": script_row[4],
            "nodes": nodes,
            "connections": connections
        }
    
    def save_script_data(self, script_id: int, nodes: List[Dict], connections: List[Dict]) -> bool:
        """스크립트의 노드와 연결 정보 저장
        connections 배열을 기반으로 각 노드의 connected_to/connected_from을 계산하여 저장
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 기존 노드 삭제 (CASCADE로 연결도 자동 삭제됨)
            cursor.execute("DELETE FROM nodes WHERE script_id = ?", (script_id,))
            
            # connections 배열을 기반으로 각 노드의 connected_to/connected_from 계산
            # 노드별 connected_to와 connected_from 맵 생성
            node_connected_to = {}
            node_connected_from = {}
            
            # 모든 노드 ID 초기화
            for node in nodes:
                node_id = node["id"]
                node_connected_to[node_id] = []
                node_connected_from[node_id] = []
            
            # connections 배열을 순회하며 각 노드의 연결 정보 구성
            for connection in connections:
                from_node_id = connection.get("from")
                to_node_id = connection.get("to")
                
                if from_node_id and to_node_id:
                    # from 노드의 connected_to에 to 노드 추가
                    if from_node_id in node_connected_to:
                        if to_node_id not in node_connected_to[from_node_id]:
                            node_connected_to[from_node_id].append(to_node_id)
                    
                    # to 노드의 connected_from에 from 노드 추가
                    if to_node_id in node_connected_from:
                        if from_node_id not in node_connected_from[to_node_id]:
                            node_connected_from[to_node_id].append(from_node_id)
            
            # 새 노드들 저장 (연결 정보 포함)
            for node in nodes:
                node_id = node["id"]
                connected_to_json = json.dumps(node_connected_to.get(node_id, []), ensure_ascii=False)
                connected_from_json = json.dumps(node_connected_from.get(node_id, []), ensure_ascii=False)
                
                # parameters 추출 (없으면 빈 객체)
                parameters = node.get("parameters", {})
                parameters_json = json.dumps(parameters, ensure_ascii=False)
                
                # description 추출
                description = node.get("description") or None
                
                cursor.execute('''
                    INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, connected_to, connected_from, parameters, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    script_id,
                    node_id,
                    node["type"],
                    node["position"]["x"],
                    node["position"]["y"],
                    json.dumps(node["data"], ensure_ascii=False),
                    connected_to_json,
                    connected_from_json,
                    parameters_json,
                    description
                ))
            
            # 업데이트 시간 갱신
            cursor.execute(
                "UPDATE scripts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (script_id,)
            )
            
            conn.commit()
            return True
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def delete_script(self, script_id: int) -> bool:
        """스크립트 삭제"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("DELETE FROM scripts WHERE id = ?", (script_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
    
    def seed_example_data(self):
        """예시 데이터 생성"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 기존 데이터 확인
            cursor.execute("SELECT COUNT(*) FROM scripts")
            existing_count = cursor.fetchone()[0]
            
            if existing_count > 0:
                print(f"이미 {existing_count}개의 스크립트가 존재합니다. 예시 데이터 생성을 건너뜁니다.")
                conn.close()
                return
            
            print("예시 데이터 생성 시작...")
            
            # 스크립트 1: 로그인 테스트
            cursor.execute(
                "INSERT INTO scripts (name, description) VALUES (?, ?)",
                ("로그인 테스트", "사용자 로그인 프로세스 검증")
            )
            script1_id = cursor.lastrowid
            print(f"스크립트 1 생성: ID={script1_id}")
            
            # 스크립트 1의 노드들
            script1_nodes = [
                {
                    "node_id": "start",
                    "node_type": "start",
                    "position_x": 0.0,
                    "position_y": 0.0,
                    "node_data": {"title": "시작", "color": "green"},
                    "connected_to": ["node1"],
                    "connected_from": [],
                    "parameters": {}
                },
                {
                    "node_id": "node1",
                    "node_type": "action",
                    "position_x": 300.0,
                    "position_y": 0.0,
                    "node_data": {"title": "페이지 이동", "color": "blue", "url": "https://example.com/login"},
                    "connected_to": ["node2"],
                    "connected_from": ["start"],
                    "parameters": {},
                    "description": "로그인 페이지로 이동"
                },
                {
                    "node_id": "node2",
                    "node_type": "action",
                    "position_x": 600.0,
                    "position_y": 0.0,
                    "node_data": {"title": "아이디 입력", "color": "blue", "selector": "#username", "value": "testuser"},
                    "connected_to": ["node3"],
                    "connected_from": ["node1"],
                    "parameters": {},
                    "description": "사용자 아이디 입력"
                },
                {
                    "node_id": "node3",
                    "node_type": "condition",
                    "position_x": 300.0,
                    "position_y": 150.0,
                    "node_data": {"title": "로그인 성공 확인", "color": "orange"},
                    "connected_to": ["node4", "node5"],
                    "connected_from": ["node2"],
                    "parameters": {"condition": "check_login_success"},
                    "description": None
                },
                {
                    "node_id": "node4",
                    "node_type": "action",
                    "position_x": 900.0,
                    "position_y": 0.0,
                    "node_data": {"title": "대시보드 이동", "color": "blue", "url": "https://example.com/dashboard"},
                    "connected_to": ["end"],
                    "connected_from": ["node3"],
                    "parameters": {},
                    "description": "로그인 성공 시 대시보드로 이동"
                },
                {
                    "node_id": "node5",
                    "node_type": "action",
                    "position_x": 1200.0,
                    "position_y": 0.0,
                    "node_data": {"title": "에러 처리", "color": "red", "message": "로그인 실패"},
                    "connected_to": ["end"],
                    "connected_from": ["node3"],
                    "parameters": {},
                    "description": "로그인 실패 시 에러 처리"
                },
                {
                    "node_id": "end",
                    "node_type": "end",
                    "position_x": 1500.0,
                    "position_y": 0.0,
                    "node_data": {"title": "종료", "color": "gray"},
                    "connected_to": [],
                    "connected_from": ["node4", "node5"],
                    "parameters": {}
                }
            ]
            
            for node in script1_nodes:
                cursor.execute('''
                    INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, connected_to, connected_from, parameters, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    script1_id,
                    node["node_id"],
                    node["node_type"],
                    node["position_x"],
                    node["position_y"],
                    json.dumps(node["node_data"], ensure_ascii=False),
                    json.dumps(node["connected_to"], ensure_ascii=False),
                    json.dumps(node["connected_from"], ensure_ascii=False),
                    json.dumps(node["parameters"], ensure_ascii=False),
                    node.get("description")
                ))
            
            print(f"스크립트 1에 {len(script1_nodes)}개의 노드 추가 완료")
            
            # 스크립트 2: 결제 프로세스 테스트
            cursor.execute(
                "INSERT INTO scripts (name, description) VALUES (?, ?)",
                ("결제 프로세스 테스트", "온라인 결제 과정 검증")
            )
            script2_id = cursor.lastrowid
            print(f"스크립트 2 생성: ID={script2_id}")
            
            # 스크립트 2의 노드들
            script2_nodes = [
                {
                    "node_id": "start",
                    "node_type": "start",
                    "position_x": 0.0,
                    "position_y": 0.0,
                    "node_data": {"title": "시작", "color": "green"},
                    "connected_to": ["node1"],
                    "connected_from": [],
                    "parameters": {}
                },
                {
                    "node_id": "node1",
                    "node_type": "action",
                    "position_x": 300.0,
                    "position_y": 0.0,
                    "node_data": {"title": "결제 페이지 이동", "color": "blue", "url": "https://example.com/payment"},
                    "connected_to": ["node2"],
                    "connected_from": ["start"],
                    "parameters": {},
                    "description": "결제 페이지로 이동"
                },
                {
                    "node_id": "node2",
                    "node_type": "action",
                    "position_x": 600.0,
                    "position_y": 0.0,
                    "node_data": {"title": "결제 정보 입력", "color": "blue", "card_number": "1234-5678-9012-3456"},
                    "connected_to": ["node3"],
                    "connected_from": ["node1"],
                    "parameters": {},
                    "description": "카드 정보 입력"
                },
                {
                    "node_id": "node3",
                    "node_type": "wait",
                    "position_x": 300.0,
                    "position_y": 150.0,
                    "node_data": {"title": "결제 처리 대기", "color": "purple"},
                    "connected_to": ["node4"],
                    "connected_from": ["node2"],
                    "parameters": {"wait_time": 3.0}
                },
                {
                    "node_id": "node4",
                    "node_type": "condition",
                    "position_x": 900.0,
                    "position_y": 0.0,
                    "node_data": {"title": "결제 성공 확인", "color": "orange"},
                    "connected_to": ["end"],
                    "connected_from": ["node3"],
                    "parameters": {"condition": "check_payment_success"}
                },
                {
                    "node_id": "end",
                    "node_type": "end",
                    "position_x": 1200.0,
                    "position_y": 0.0,
                    "node_data": {"title": "종료", "color": "gray"},
                    "connected_to": [],
                    "connected_from": ["node4"],
                    "parameters": {}
                }
            ]
            
            for node in script2_nodes:
                cursor.execute('''
                    INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, connected_to, connected_from, parameters, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    script2_id,
                    node["node_id"],
                    node["node_type"],
                    node["position_x"],
                    node["position_y"],
                    json.dumps(node["node_data"], ensure_ascii=False),
                    json.dumps(node["connected_to"], ensure_ascii=False),
                    json.dumps(node["connected_from"], ensure_ascii=False),
                    json.dumps(node["parameters"], ensure_ascii=False),
                    node.get("description")
                ))
            
            print(f"스크립트 2에 {len(script2_nodes)}개의 노드 추가 완료")
            
            # 스크립트 3: 이미지 터치 테스트 (새로운 노드 타입 예시)
            cursor.execute(
                "INSERT INTO scripts (name, description) VALUES (?, ?)",
                ("이미지 터치 테스트", "이미지 터치 노드를 사용한 자동화 테스트")
            )
            script3_id = cursor.lastrowid
            print(f"스크립트 3 생성: ID={script3_id}")
            
            # 스크립트 3의 노드들
            script3_nodes = [
                {
                    "node_id": "start",
                    "node_type": "start",
                    "position_x": 0.0,
                    "position_y": 0.0,
                    "node_data": {"title": "시작", "color": "green"},
                    "connected_to": ["node1"],
                    "connected_from": [],
                    "parameters": {}
                },
                {
                    "node_id": "node1",
                    "node_type": "image-touch",
                    "position_x": 300.0,
                    "position_y": 0.0,
                    "node_data": {"title": "이미지 터치", "color": "blue"},
                    "connected_to": ["node2"],
                    "connected_from": ["start"],
                    "parameters": {
                        "folder_path": "C:/Users/User/Desktop/images",
                        "image_count": 5
                    }
                },
                {
                    "node_id": "node2",
                    "node_type": "wait",
                    "position_x": 600.0,
                    "position_y": 0.0,
                    "node_data": {"title": "대기", "color": "purple"},
                    "connected_to": ["end"],
                    "connected_from": ["node1"],
                    "parameters": {"wait_time": 2.0}
                },
                {
                    "node_id": "end",
                    "node_type": "end",
                    "position_x": 900.0,
                    "position_y": 0.0,
                    "node_data": {"title": "종료", "color": "gray"},
                    "connected_to": [],
                    "connected_from": ["node2"],
                    "parameters": {}
                }
            ]
            
            for node in script3_nodes:
                cursor.execute('''
                    INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, connected_to, connected_from, parameters, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    script3_id,
                    node["node_id"],
                    node["node_type"],
                    node["position_x"],
                    node["position_y"],
                    json.dumps(node["node_data"], ensure_ascii=False),
                    json.dumps(node["connected_to"], ensure_ascii=False),
                    json.dumps(node["connected_from"], ensure_ascii=False),
                    json.dumps(node["parameters"], ensure_ascii=False),
                    node.get("description")
                ))
            
            print(f"스크립트 3에 {len(script3_nodes)}개의 노드 추가 완료")
            
            conn.commit()
            print("✅ 예시 데이터 생성 완료!")
            print(f"   - 스크립트: 3개")
            print(f"   - 노드: {len(script1_nodes) + len(script2_nodes) + len(script3_nodes)}개")
            print(f"   - 데이터베이스 경로: {self.db_path}")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ 예시 데이터 생성 실패: {e}")
            raise e
        finally:
            conn.close()


# 전역 데이터베이스 매니저 인스턴스
db_manager = DatabaseManager()


# 직접 실행 시 예시 데이터 생성
if __name__ == "__main__":
    print("=" * 60)
    print("데이터베이스 초기화 및 예시 데이터 생성")
    print("=" * 60)
    
    # DatabaseManager 인스턴스 생성 (이미 전역 인스턴스가 있지만 새로 생성)
    db = DatabaseManager()
    
    # 예시 데이터 생성
    db.seed_example_data()
    
    print("\n" + "=" * 60)
    print("완료! 이제 애플리케이션을 실행할 수 있습니다.")
    print("=" * 60)
