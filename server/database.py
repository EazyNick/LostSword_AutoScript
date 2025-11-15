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
            SELECT node_id, node_type, position_x, position_y, node_data, connected_to, connected_from 
            FROM nodes 
            WHERE script_id = ? 
            ORDER BY id
        ''', (script_id,))
        
        nodes = []
        for row in cursor.fetchall():
            # connected_to와 connected_from을 JSON으로 파싱
            connected_to_raw = row[5] if len(row) > 5 else None
            connected_from_raw = row[6] if len(row) > 6 else None
            
            connected_to = []
            connected_from = []
            
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
            
            nodes.append({
                "id": row[0],
                "type": row[1],
                "position": {"x": row[2], "y": row[3]},
                "data": json.loads(row[4]),
                "connected_to": connected_to,
                "connected_from": connected_from
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
                
                cursor.execute('''
                    INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, connected_to, connected_from)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    script_id,
                    node_id,
                    node["type"],
                    node["position"]["x"],
                    node["position"]["y"],
                    json.dumps(node["data"], ensure_ascii=False),
                    connected_to_json,
                    connected_from_json
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
    
# 전역 데이터베이스 매니저 인스턴스
db_manager = DatabaseManager()
