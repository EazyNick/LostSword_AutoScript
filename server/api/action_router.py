"""
게임 액션 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
from typing import List
import os
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


@router.post("/folder/select")
async def select_folder():
    """
    폴더 선택 다이얼로그를 띄우고 선택된 폴더 경로를 반환합니다.
    """
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        # tkinter 루트 윈도우 생성 (숨김)
        root = tk.Tk()
        root.withdraw()  # 메인 윈도우 숨기기
        root.attributes('-topmost', True)  # 다른 창 위에 표시
        
        # 폴더 선택 다이얼로그
        folder_path = filedialog.askdirectory(
            title="이미지 폴더 선택",
            mustexist=True
        )
        
        root.destroy()  # 루트 윈도우 제거
        
        if not folder_path:
            return {
                "success": False,
                "message": "폴더가 선택되지 않았습니다."
            }
        
        return {
            "success": True,
            "folder_path": folder_path
        }
        
    except Exception as e:
        import traceback
        print(f"[ERROR] 폴더 선택 실패: {e}")
        print(f"[ERROR] 스택 트레이스: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"폴더 선택 실패: {str(e)}")


@router.get("/images/list")
async def get_image_list(folder_path: str):
    """
    특정 폴더의 이미지 파일 목록을 가져옵니다.
    파일 이름 순서대로 정렬하여 반환합니다.
    """
    try:
        if not folder_path:
            raise HTTPException(status_code=400, detail="폴더 경로가 필요합니다.")
        
        if not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail=f"폴더를 찾을 수 없습니다: {folder_path}")
        
        if not os.path.isdir(folder_path):
            raise HTTPException(status_code=400, detail=f"경로가 폴더가 아닙니다: {folder_path}")
        
        # 지원하는 이미지 확장자
        image_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff', '.webp'}
        
        # 이미지 파일 목록 가져오기
        image_files = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                _, ext = os.path.splitext(filename.lower())
                if ext in image_extensions:
                    image_files.append({
                        "filename": filename,
                        "path": file_path,
                        "name": os.path.splitext(filename)[0]  # 확장자 제거한 이름
                    })
        
        # 파일 이름 순서대로 정렬
        image_files.sort(key=lambda x: x["filename"])
        
        return {
            "success": True,
            "folder_path": folder_path,
            "count": len(image_files),
            "images": image_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 목록 조회 실패: {str(e)}")
