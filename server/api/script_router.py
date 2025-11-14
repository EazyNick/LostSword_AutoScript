"""
스크립트 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List
from models import ScriptCreateRequest, ScriptUpdateRequest, ScriptResponse, NodeExecutionRequest
from database import db_manager
from services.action_service import ActionService
from log import log_manager

router = APIRouter(prefix="/api", tags=["scripts"])
action_service = ActionService()
logger = log_manager.logger


@router.get("/scripts", response_model=List[dict])
async def get_all_scripts(request: Request):
    """모든 스크립트 목록 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 스크립트 목록 조회 요청 받음 - 클라이언트 IP: {client_ip}")
    
    try:
        logger.info("[DB 조회] 모든 스크립트 목록 조회 시작")
        scripts = db_manager.get_all_scripts()
        logger.info(f"[DB 조회] 스크립트 목록 조회 완료 - 스크립트 개수: {len(scripts)}개")
        logger.debug(f"[DB 조회] 스크립트 목록 상세: {[{'id': s.get('id'), 'name': s.get('name')} for s in scripts]}")
        logger.info(f"[API] 스크립트 목록 조회 성공 - 스크립트 개수: {len(scripts)}개")
        return scripts
    except Exception as e:
        logger.error(f"[API] 스크립트 목록 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"스크립트 목록 조회 실패: {str(e)}")


@router.get("/scripts/{script_id}", response_model=ScriptResponse)
async def get_script(script_id: int, request: Request):
    """특정 스크립트 조회"""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"[API] 스크립트 조회 요청 받음 - 스크립트 ID: {script_id}, 클라이언트 IP: {client_ip}")
    
    try:
        logger.info(f"[DB 조회] 스크립트 조회 시작 - 스크립트 ID: {script_id}")
        script = db_manager.get_script(script_id)
        if not script:
            logger.warning(f"[DB 조회] 스크립트를 찾을 수 없음 - 스크립트 ID: {script_id}")
            logger.warning(f"[API] 스크립트를 찾을 수 없음 - 스크립트 ID: {script_id}")
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        logger.info(f"[DB 조회] 스크립트 조회 완료 - 스크립트 ID: {script_id}, 이름: {script.get('name', 'N/A')}")
        logger.info(f"[API] 스크립트 조회 성공 - 스크립트 ID: {script_id}, 이름: {script.get('name', 'N/A')}")
        return script
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] 스크립트 조회 실패 - 스크립트 ID: {script_id}, 에러: {str(e)}")
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
        logger.info(f"[DB 조회] 스크립트 조회 시작 - 스크립트 ID: {script_id}")
        script = db_manager.get_script(script_id)
        if not script:
            logger.warning(f"[DB 조회] 스크립트를 찾을 수 없음 - 스크립트 ID: {script_id}")
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        logger.info(f"[DB 조회] 스크립트 조회 완료 - 스크립트 ID: {script_id}")
        
        # 노드와 연결 정보 저장
        logger.info(f"[DB 저장] 스크립트 데이터 저장 시작 - 스크립트 ID: {script_id}, 노드 개수: {len(request.nodes)}, 연결 개수: {len(request.connections)}")
        success = db_manager.save_script_data(script_id, request.nodes, request.connections)
        logger.info(f"[DB 저장] 스크립트 데이터 저장 완료 - 스크립트 ID: {script_id}")
        
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
        logger.info(f"[DB 조회] 스크립트 조회 시작 - 스크립트 ID: {script_id}")
        script = db_manager.get_script(script_id)
        if not script:
            logger.warning(f"[DB 조회] 스크립트를 찾을 수 없음 - 스크립트 ID: {script_id}")
            raise HTTPException(status_code=404, detail="스크립트를 찾을 수 없습니다.")
        logger.info(f"[DB 조회] 스크립트 조회 완료 - 스크립트 ID: {script_id}, 이름: {script.get('name', 'N/A')}")
        
        # 노드들 순차 실행
        results = []
        for node in request.nodes:
            try:
                # 실제 노드 실행 로직 (여기에 게임 액션 처리 추가)
                result = await action_service.process_game_action(node.get("type", "unknown"), node.get("data", {}))
                results.append(result)
                
            except Exception as e:
                results.append({"error": str(e)})
        
        return {
            "success": True,
            "message": "스크립트 실행 완료",
            "results": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크립트 실행 실패: {str(e)}")
