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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE CASCADE
            )
        ''')
        
        # 연결 테이블 생성 (노드 간 연결)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                script_id INTEGER NOT NULL,
                from_node_id TEXT NOT NULL,
                to_node_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE CASCADE
            )
        ''')
        
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
        
        # 노드들 조회
        cursor.execute('''
            SELECT node_id, node_type, position_x, position_y, node_data 
            FROM nodes 
            WHERE script_id = ? 
            ORDER BY id
        ''', (script_id,))
        
        nodes = []
        for row in cursor.fetchall():
            nodes.append({
                "id": row[0],
                "type": row[1],
                "position": {"x": row[2], "y": row[3]},
                "data": json.loads(row[4])
            })
        
        # 연결들 조회
        cursor.execute('''
            SELECT from_node_id, to_node_id 
            FROM connections 
            WHERE script_id = ?
        ''', (script_id,))
        
        connections = []
        for row in cursor.fetchall():
            connections.append({
                "from": row[0],
                "to": row[1]
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
        """스크립트의 노드와 연결 정보 저장"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 기존 노드와 연결 삭제
            cursor.execute("DELETE FROM nodes WHERE script_id = ?", (script_id,))
            cursor.execute("DELETE FROM connections WHERE script_id = ?", (script_id,))
            
            # 새 노드들 저장
            for node in nodes:
                cursor.execute('''
                    INSERT INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    script_id,
                    node["id"],
                    node["type"],
                    node["position"]["x"],
                    node["position"]["y"],
                    json.dumps(node["data"])
                ))
            
            # 새 연결들 저장
            for connection in connections:
                cursor.execute('''
                    INSERT INTO connections (script_id, from_node_id, to_node_id)
                    VALUES (?, ?, ?)
                ''', (script_id, connection["from"], connection["to"]))
            
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
