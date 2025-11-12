"""
노드 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from database import db_manager
import json

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("/script/{script_id}")
async def get_nodes_by_script(script_id: int):
    """특정 스크립트의 모든 노드 조회"""
    try:
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        return {
            "script_id": script_id,
            "nodes": script.get("nodes", []),
            "connections": script.get("connections", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"노드 조회 실패: {str(e)}")


@router.post("/script/{script_id}")
async def create_node(script_id: int, node_data: dict):
    """새 노드 생성"""
    try:
        # 스크립트 존재 확인
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        # 노드 데이터 검증
        required_fields = ["id", "type", "position", "data"]
        for field in required_fields:
            if field not in node_data:
                raise HTTPException(status_code=400, detail=f"필수 필드 '{field}'가 없습니다.")
        
        # 기존 노드 목록 가져오기
        nodes = script.get("nodes", [])
        
        # 새 노드 추가
        nodes.append({
            "id": node_data["id"],
            "type": node_data["type"],
            "position": node_data["position"],
            "data": node_data["data"]
        })
        
        # 데이터베이스에 저장
        connections = script.get("connections", [])
        success = db_manager.save_script_data(script_id, nodes, connections)
        
        if success:
            return {
                "message": "노드가 생성되었습니다.",
                "node": node_data
            }
        else:
            raise HTTPException(status_code=500, detail="노드 생성 실패")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"노드 생성 실패: {str(e)}")


@router.put("/script/{script_id}/batch")
async def update_nodes_batch(script_id: int, nodes: List[dict], connections: List[dict] = None):
    """여러 노드를 일괄 업데이트"""
    try:
        # 스크립트 존재 확인
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        # 연결 정보가 없으면 기존 연결 유지
        if connections is None:
            connections = script.get("connections", [])
        
        # 데이터베이스에 저장
        success = db_manager.save_script_data(script_id, nodes, connections)
        
        if success:
            return {
                "message": "노드들이 업데이트되었습니다.",
                "node_count": len(nodes),
                "connection_count": len(connections)
            }
        else:
            raise HTTPException(status_code=500, detail="노드 업데이트 실패")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"노드 업데이트 실패: {str(e)}")


@router.delete("/script/{script_id}/node/{node_id}")
async def delete_node(script_id: int, node_id: str):
    """노드 삭제"""
    try:
        # 스크립트 존재 확인
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        # 노드 목록에서 해당 노드 제거
        nodes = script.get("nodes", [])
        nodes = [n for n in nodes if n["id"] != node_id]
        
        # 연결 목록에서 해당 노드 관련 연결 제거
        connections = script.get("connections", [])
        connections = [
            c for c in connections 
            if c["from"] != node_id and c["to"] != node_id
        ]
        
        # 데이터베이스에 저장
        success = db_manager.save_script_data(script_id, nodes, connections)
        
        if success:
            return {
                "message": "노드가 삭제되었습니다.",
                "node_id": node_id
            }
        else:
            raise HTTPException(status_code=500, detail="노드 삭제 실패")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"노드 삭제 실패: {str(e)}")


@router.put("/script/{script_id}/node/{node_id}")
async def update_node(script_id: int, node_id: str, node_data: dict):
    """노드 업데이트"""
    try:
        # 스크립트 존재 확인
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        # 노드 목록에서 해당 노드 찾아서 업데이트
        nodes = script.get("nodes", [])
        node_found = False
        
        for i, node in enumerate(nodes):
            if node["id"] == node_id:
                # 노드 데이터 업데이트
                nodes[i] = {
                    "id": node_id,
                    "type": node_data.get("type", node["type"]),
                    "position": node_data.get("position", node["position"]),
                    "data": node_data.get("data", node["data"])
                }
                node_found = True
                break
        
        if not node_found:
            raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다.")
        
        # 데이터베이스에 저장
        connections = script.get("connections", [])
        success = db_manager.save_script_data(script_id, nodes, connections)
        
        if success:
            return {
                "message": "노드가 업데이트되었습니다.",
                "node": nodes[i] if node_found else None
            }
        else:
            raise HTTPException(status_code=500, detail="노드 업데이트 실패")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"노드 업데이트 실패: {str(e)}")

