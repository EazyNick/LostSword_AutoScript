"""
스크립트 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
from typing import List
from models import ScriptCreateRequest, ScriptUpdateRequest, ScriptResponse, NodeExecutionRequest
from database import db_manager
from services.action_service import ActionService

router = APIRouter(prefix="/api", tags=["scripts"])
action_service = ActionService()


@router.get("/scripts", response_model=List[dict])
async def get_all_scripts():
    """모든 스크립트 목록 조회"""
    try:
        scripts = db_manager.get_all_scripts()
        return scripts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 목록 조회 실패: {str(e)}")


@router.get("/scripts/{script_id}", response_model=ScriptResponse)
async def get_script(script_id: int):
    """특정 스크립트 조회"""
    try:
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        return script
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 조회 실패: {str(e)}")


@router.post("/scripts", response_model=dict)
async def create_script(request: ScriptCreateRequest):
    """새 스크립트 생성"""
    try:
        script_id = db_manager.create_script(request.name, request.description)
        return {"id": script_id, "message": "스크립트가 생성되었습니다."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 생성 실패: {str(e)}")


@router.put("/scripts/{script_id}", response_model=dict)
async def update_script(script_id: int, request: ScriptUpdateRequest):
    """스크립트 업데이트"""
    try:
        # 스크립트 존재 확인
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        # 노드와 연결 정보 저장
        success = db_manager.save_script_data(script_id, request.nodes, request.connections)
        
        if success:
            return {"message": "스크립트가 업데이트되었습니다."}
        else:
            raise HTTPException(status_code=500, detail="스크립트 업데이트 실패")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 업데이트 실패: {str(e)}")


@router.delete("/scripts/{script_id}", response_model=dict)
async def delete_script(script_id: int):
    """스크립트 삭제"""
    try:
        success = db_manager.delete_script(script_id)
        if success:
            return {"message": "스크립트가 삭제되었습니다."}
        else:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 삭제 실패: {str(e)}")


@router.post("/scripts/{script_id}/execute", response_model=dict)
async def execute_script(script_id: int, request: NodeExecutionRequest):
    """스크립트 실행"""
    try:
        # 스크립트 존재 확인
        script = db_manager.get_script(script_id)
        if not script:
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        
        # 실행 로그 기록
        db_manager.log_execution(script_id, "script_start", "started", "스크립트 실행 시작")
        
        # 노드들 순차 실행
        results = []
        for node in request.nodes:
            try:
                # 노드 실행 로그
                db_manager.log_execution(script_id, node.get("id", "unknown"), "executing", "노드 실행 중")
                
                # 실제 노드 실행 로직 (여기에 게임 액션 처리 추가)
                result = await action_service.process_game_action(node.get("type", "unknown"), node.get("data", {}))
                results.append(result)
                
                # 성공 로그
                db_manager.log_execution(script_id, node.get("id", "unknown"), "completed", "노드 실행 완료")
                
            except Exception as e:
                # 실패 로그
                db_manager.log_execution(script_id, node.get("id", "unknown"), "failed", str(e))
                results.append({"error": str(e)})
        
        # 완료 로그
        db_manager.log_execution(script_id, "script_end", "completed", "스크립트 실행 완료")
        
        return {
            "success": True,
            "message": "스크립트 실행 완료",
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 실행 실패: {str(e)}")


@router.get("/scripts/{script_id}/logs", response_model=List[dict])
async def get_execution_logs(script_id: int, limit: int = 100):
    """스크립트 실행 로그 조회"""
    try:
        logs = db_manager.get_execution_logs(script_id, limit)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"실행 로그 조회 실패: {str(e)}")
