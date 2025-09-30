"""
게임 액션 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
from typing import List
from models import ActionRequest, ActionResponse, NodeExecutionRequest
from services.action_service import ActionService

router = APIRouter(prefix="/api", tags=["actions"])
action_service = ActionService()


@router.post("/action", response_model=ActionResponse)
async def execute_action(request: ActionRequest):
    """
    단일 게임 액션을 실행합니다.
    """
    try:
        result = await action_service.process_game_action(request.action_type, request.parameters)
        
        return ActionResponse(
            success=True,
            message=f"액션 '{request.action_type}' 실행 완료",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute-nodes", response_model=ActionResponse)
async def execute_nodes(request: NodeExecutionRequest):
    """
    노드 기반 워크플로우를 실행합니다.
    """
    print(f"[DEBUG] execute_nodes 호출됨 - 요청 데이터: {request}")
    
    try:
        print(f"[DEBUG] 실행 모드: {request.execution_mode}")
        print(f"[DEBUG] 노드 개수: {len(request.nodes)}")
        
        results = []
        
        if request.execution_mode == "sequential":
            print("[DEBUG] 순차 실행 시작")
            for i, node in enumerate(request.nodes):
                print(f"[DEBUG] 노드 {i+1} 실행 중: {node}")
                try:
                    result = await action_service.process_node(node)
                    results.append(result)
                    print(f"[DEBUG] 노드 {i+1} 실행 완료: {result}")
                except Exception as node_error:
                    print(f"[ERROR] 노드 {i+1} 실행 실패: {node_error}")
                    results.append({"error": str(node_error), "node_id": node.get("id", "unknown")})
        elif request.execution_mode == "parallel":
            print("[ERROR] 병렬 실행은 아직 지원되지 않음")
            # 병렬 실행 로직 (향후 구현)
            raise HTTPException(status_code=501, detail="병렬 실행은 아직 지원되지 않습니다.")
        
        print(f"[DEBUG] 모든 노드 실행 완료 - 결과: {results}")
        
        return ActionResponse(
            success=True,
            message=f"{len(request.nodes)}개 노드 실행 완료",
            data={"results": results}
        )
    except HTTPException as http_error:
        print(f"[ERROR] HTTP 에러 발생: {http_error}")
        raise http_error
    except Exception as e:
        print(f"[ERROR] 예상치 못한 에러 발생: {e}")
        print(f"[ERROR] 에러 타입: {type(e)}")
        import traceback
        print(f"[ERROR] 스택 트레이스: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")
