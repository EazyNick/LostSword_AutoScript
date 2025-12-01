"""
액션 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException
from typing import List
import os
from models import ActionRequest, ActionResponse, NodeExecutionRequest
from services.action_service import ActionService
from services.node_execution_context import NodeExecutionContext
from log import log_manager

router = APIRouter(prefix="/api", tags=["actions"])
action_service = ActionService()
logger = log_manager.logger


@router.post("/action", response_model=ActionResponse)
async def execute_action(request: ActionRequest):
    """
    단일 액션을 실행합니다.
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
    노드 간 데이터 전달을 지원합니다.
    """
    logger.debug(f"execute_nodes 호출됨 - 요청 데이터: {request}")
    
    try:
        logger.debug(f"실행 모드: {request.execution_mode}")
        logger.debug(f"노드 개수: {len(request.nodes)}")
        
        # 노드 실행 컨텍스트 생성 (데이터 전달)
        context = NodeExecutionContext()
        
        results = []
        
        if request.execution_mode == "sequential":
            logger.debug("순차 실행 시작")
            for i, node in enumerate(request.nodes):
                logger.debug(f"노드 {i+1} 실행 중: {node}")
                try:
                    # 실행 컨텍스트와 함께 노드 실행
                    result = await action_service.process_node(node, context)
                    
                    # 결과가 None이면 기본값으로 변환
                    if result is None:
                        result = {
                            "action": node.get("type", "unknown"),
                            "status": "completed",
                            "output": None
                        }
                    
                    # 결과가 dict가 아니면 dict로 변환
                    if not isinstance(result, dict):
                        result = {
                            "action": node.get("type", "unknown"),
                            "status": "completed",
                            "output": result
                        }
                    
                    results.append(result)
                    logger.debug(f"노드 {i+1} 실행 완료: {result}")
                except Exception as node_error:
                    logger.error(f"노드 {i+1} 실행 실패: {node_error}")
                    node_id = node.get("id", f"node_{i}")
                    node_name = node.get("data", {}).get("title") or node.get("data", {}).get("name")
                    
                    # 에러 결과도 항상 dict로 반환
                    error_result = {
                        "action": node.get("type", "unknown"),
                        "status": "failed",
                        "error": str(node_error),
                        "node_id": node_id,
                        "output": None
                    }
                    results.append(error_result)
                    
                    # 에러 결과도 컨텍스트에 저장 (다음 노드에서 참조 가능)
                    context.add_node_result(node_id, node_name, error_result)
        elif request.execution_mode == "parallel":
            logger.error("병렬 실행은 아직 지원되지 않음")
            # 병렬 실행 로직 (향후 구현)
            raise HTTPException(status_code=501, detail="병렬 실행은 아직 지원되지 않습니다.")
        
        logger.debug(f"모든 노드 실행 완료 - 결과: {results}")
        
        return ActionResponse(
            success=True,
            message=f"{len(request.nodes)}개 노드 실행 완료",
            data={
                "results": results,
                "context": context.to_dict()  # 컨텍스트 정보도 반환 (디버깅용)
            }
        )
    except HTTPException as http_error:
        logger.error(f"HTTP 에러 발생: {http_error}")
        raise http_error
    except Exception as e:
        logger.error(f"예상치 못한 에러 발생: {e}")
        logger.error(f"에러 타입: {type(e)}")
        import traceback
        logger.error(f"스택 트레이스: {traceback.format_exc()}")
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
        logger.error(f"폴더 선택 실패: {e}")
        logger.error(f"스택 트레이스: {traceback.format_exc()}")
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


@router.get("/processes/list")
async def get_process_list():
    """
    화면에 보이는 프로세스 목록을 가져옵니다.
    백그라운드 프로세스는 제외하고 실제 창이 있는 프로세스만 반환합니다.
    """
    try:
        import win32gui
        import win32process
        import psutil
        
        processes = []
        process_dict = {}  # 중복 제거용 (같은 프로세스 이름의 여러 창)
        
        def enum_window_callback(hwnd, extra):
            """창 열거 콜백 함수"""
            if win32gui.IsWindowVisible(hwnd):
                window_text = win32gui.GetWindowText(hwnd)
                # 빈 창 제목 제외
                if window_text:
                    try:
                        # 프로세스 ID 가져오기
                        _, pid = win32process.GetWindowThreadProcessId(hwnd)
                        
                        # 프로세스 정보 가져오기
                        try:
                            proc = psutil.Process(pid)
                            process_name = proc.name()
                            exe_path = proc.exe() if hasattr(proc, 'exe') else None
                            
                            # 중복 제거: 같은 프로세스 이름이면 창 제목만 추가
                            if process_name not in process_dict:
                                process_dict[process_name] = {
                                    "process_name": process_name,
                                    "process_id": pid,
                                    "exe_path": exe_path,
                                    "windows": [],
                                    "hwnd": hwnd  # 첫 번째 창 핸들 저장
                                }
                            
                            # 창 정보 추가
                            process_dict[process_name]["windows"].append({
                                "title": window_text,
                                "hwnd": hwnd
                            })
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            # 프로세스가 종료되었거나 접근 권한이 없는 경우 무시
                            pass
                    except Exception:
                        # 창 정보를 가져올 수 없는 경우 무시
                        pass
        
        # 모든 창 열거
        win32gui.EnumWindows(enum_window_callback, None)
        
        # 딕셔너리를 리스트로 변환
        for process_name, process_info in process_dict.items():
            processes.append({
                "process_name": process_info["process_name"],
                "process_id": process_info["process_id"],
                "exe_path": process_info["exe_path"],
                "window_count": len(process_info["windows"]),
                "windows": process_info["windows"],
                "hwnd": process_info["hwnd"]  # 포커스용 핸들
            })
        
        # 프로세스 이름으로 정렬
        processes.sort(key=lambda x: x["process_name"].lower())
        
        return {
            "success": True,
            "count": len(processes),
            "processes": processes
        }
        
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="Windows 전용 기능입니다. pywin32와 psutil 패키지가 필요합니다."
        )
    except Exception as e:
        import traceback
        logger.error(f"프로세스 목록 조회 실패: {e}")
        logger.error(f"스택 트레이스: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"프로세스 목록 조회 실패: {str(e)}")


@router.post("/processes/focus")
async def focus_process(request: dict):
    """
    선택한 프로세스에 포커스를 줍니다.
    """
    try:
        import win32gui
        
        process_id = request.get("process_id")
        hwnd = request.get("hwnd")
        
        if not process_id and not hwnd:
            raise HTTPException(status_code=400, detail="process_id 또는 hwnd가 필요합니다.")
        
        # hwnd가 있으면 직접 사용, 없으면 process_id로 찾기
        if hwnd:
            target_hwnd = hwnd
        else:
            # process_id로 창 핸들 찾기
            import win32process
            target_hwnd = None
            
            def find_window_callback(hwnd, extra):
                nonlocal target_hwnd
                if win32gui.IsWindowVisible(hwnd):
                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                    if pid == process_id:
                        target_hwnd = hwnd
                        return False  # 찾았으면 중단
                return True
            
            win32gui.EnumWindows(find_window_callback, None)
            
            if not target_hwnd:
                raise HTTPException(status_code=404, detail=f"프로세스 ID {process_id}에 해당하는 창을 찾을 수 없습니다.")
        
        # 창을 최상단으로 가져오기
        win32gui.ShowWindow(target_hwnd, 9)  # SW_RESTORE = 9
        win32gui.SetForegroundWindow(target_hwnd)
        win32gui.BringWindowToTop(target_hwnd)
        
        return {
            "success": True,
            "message": f"프로세스에 포커스를 주었습니다.",
            "process_id": process_id,
            "hwnd": target_hwnd
        }
        
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="Windows 전용 기능입니다. pywin32 패키지가 필요합니다."
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"프로세스 포커스 실패: {e}")
        logger.error(f"스택 트레이스: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"프로세스 포커스 실패: {str(e)}")