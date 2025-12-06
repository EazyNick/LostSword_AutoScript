"""
액션 관련 API 라우터
"""

import os
from typing import Any

from fastapi import APIRouter, HTTPException

from api.router_wrapper import api_handler
from log import log_manager
from models import ActionRequest, ActionResponse, NodeExecutionRequest
from models.folder_path_models import FolderPathParams  # Pydantic 모델로 경로 검증 (경로 조작 공격 방지)
from models.process_focus_models import (
    ProcessFocusParams,  # Pydantic 모델로 입력 검증 (process_id 또는 hwnd 중 하나는 필수)
)
from services.action_service import ActionService
from services.node_execution_context import NodeExecutionContext

router = APIRouter(prefix="/api", tags=["actions"])
action_service = ActionService()
logger = log_manager.logger


@router.post("/action", response_model=ActionResponse)
@api_handler
async def execute_action(request: ActionRequest) -> ActionResponse:
    """
    단일 액션을 실행합니다.
    """
    parameters = request.parameters or {}
    result = await action_service.process_game_action(request.action_type, parameters)

    return ActionResponse(success=True, message=f"액션 '{request.action_type}' 실행 완료", data=result)


@router.post("/execute-nodes", response_model=ActionResponse)
@api_handler
async def execute_nodes(request: NodeExecutionRequest) -> ActionResponse:
    """
    노드 기반 워크플로우를 실행합니다.
    노드 간 데이터 전달을 지원합니다.
    """
    logger.debug(f"execute_nodes 호출됨 - 요청 데이터: {request}")
    logger.debug(f"실행 모드: {request.execution_mode}")
    logger.debug(f"노드 개수: {len(request.nodes)}")

    # 노드 실행 컨텍스트 생성 (데이터 전달)
    context = NodeExecutionContext()

    results = []

    if request.execution_mode == "sequential":
        logger.debug("순차 실행 시작")
        for i, node in enumerate(request.nodes):
            logger.debug(f"노드 {i + 1} 실행 중: {node}")
            try:
                # 실행 컨텍스트와 함께 노드 실행
                result = await action_service.process_node(node, context)

                # 결과가 None이면 기본값으로 변환
                if result is None:
                    result = {"action": node.get("type", "unknown"), "status": "completed", "output": None}

                # 결과가 dict가 아니면 dict로 변환
                if not isinstance(result, dict):
                    result = {"action": node.get("type", "unknown"), "status": "completed", "output": result}

                results.append(result)
                logger.debug(f"노드 {i + 1} 실행 완료: {result}")
            except Exception as node_error:
                logger.error(f"노드 {i + 1} 실행 실패: {node_error}")
                node_id = node.get("id", f"node_{i}")
                node_name = node.get("data", {}).get("title") or node.get("data", {}).get("name")

                # 에러 결과도 항상 dict로 반환
                error_result = {
                    "action": node.get("type", "unknown"),
                    "status": "failed",
                    "error": str(node_error),
                    "node_id": node_id,
                    "output": None,
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
            "context": context.to_dict(),  # 컨텍스트 정보도 반환 (디버깅용)
        },
    )


@router.post("/folder/select")
@api_handler
async def select_folder() -> dict[str, Any]:
    """
    폴더 선택 다이얼로그를 띄우고 선택된 폴더 경로를 반환합니다.
    """
    import tkinter as tk
    from tkinter import filedialog

    # tkinter 루트 윈도우 생성 (숨김)
    root = tk.Tk()
    root.withdraw()  # 메인 윈도우 숨기기
    root.attributes("-topmost", True)  # 다른 창 위에 표시

    # 폴더 선택 다이얼로그
    folder_path = filedialog.askdirectory(title="이미지 폴더 선택", mustexist=True)

    root.destroy()  # 루트 윈도우 제거

    if not folder_path:
        return {"success": False, "message": "폴더가 선택되지 않았습니다."}

    return {"success": True, "folder_path": folder_path}


@router.get("/images/list")
@api_handler
async def get_image_list(folder_path: str) -> dict[str, Any]:
    """
    특정 폴더의 이미지 파일 목록을 가져옵니다.
    파일 이름 순서대로 정렬하여 반환합니다.
    """
    # Pydantic 모델로 경로 검증 (경로 조작 공격 방지, 존재 여부 확인, 디렉토리 확인 포함)
    try:
        params = FolderPathParams(folder_path=folder_path)
        validated_path = params.folder_path
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"경로 검증 실패: {e!s}")

    # 지원하는 이미지 확장자
    image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff", ".webp"}

    # 이미지 파일 목록 가져오기
    image_files = []
    for filename in os.listdir(validated_path):
        file_path = os.path.join(validated_path, filename)
        if os.path.isfile(file_path):
            _, ext = os.path.splitext(filename.lower())
            if ext in image_extensions:
                image_files.append(
                    {
                        "filename": filename,
                        "path": file_path,
                        "name": os.path.splitext(filename)[0],  # 확장자 제거한 이름
                    }
                )

    # 파일 이름 순서대로 정렬
    image_files.sort(key=lambda x: x["filename"])

    return {"success": True, "folder_path": validated_path, "count": len(image_files), "images": image_files}


@router.get("/processes/list")
@api_handler
async def get_process_list() -> dict[str, Any]:
    """
    화면에 보이는 프로세스 목록을 가져옵니다.
    백그라운드 프로세스는 제외하고 실제 창이 있는 프로세스만 반환합니다.
    """
    try:
        import psutil
        import win32gui
        import win32process
    except ImportError:
        raise HTTPException(status_code=500, detail="Windows 전용 기능입니다. pywin32와 psutil 패키지가 필요합니다.")

    processes = []
    process_dict = {}  # 중복 제거용 (같은 프로세스 이름의 여러 창)

    def enum_window_callback(hwnd: int, extra: Any) -> None:
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
                        exe_path = proc.exe() if hasattr(proc, "exe") else None

                        # 중복 제거: 같은 프로세스 이름이면 창 제목만 추가
                        if process_name not in process_dict:
                            process_dict[process_name] = {
                                "process_name": process_name,
                                "process_id": pid,
                                "exe_path": exe_path,
                                "windows": [],
                                "hwnd": hwnd,  # 첫 번째 창 핸들 저장
                            }

                        # 창 정보 추가
                        process_dict[process_name]["windows"].append({"title": window_text, "hwnd": hwnd})
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        # 프로세스가 종료되었거나 접근 권한이 없는 경우 무시
                        pass
                except Exception:
                    # 창 정보를 가져올 수 없는 경우 무시
                    pass

    # 모든 창 열거
    win32gui.EnumWindows(enum_window_callback, None)

    # 딕셔너리를 리스트로 변환
    for _process_name, process_info in process_dict.items():
        processes.append(
            {
                "process_name": process_info["process_name"],
                "process_id": process_info["process_id"],
                "exe_path": process_info["exe_path"],
                "window_count": len(process_info["windows"]),
                "windows": process_info["windows"],
                "hwnd": process_info["hwnd"],  # 포커스용 핸들
            }
        )

    # 프로세스 이름으로 정렬
    processes.sort(key=lambda x: x["process_name"].lower())

    return {"success": True, "count": len(processes), "processes": processes}


@router.post("/processes/focus")
@api_handler
async def focus_process(request: dict[str, Any]) -> dict[str, Any]:
    """
    선택한 프로세스에 포커스를 줍니다.
    """
    try:
        import win32gui
        import win32process
    except ImportError:
        raise HTTPException(status_code=500, detail="Windows 전용 기능입니다. pywin32 패키지가 필요합니다.")

    try:
        params = ProcessFocusParams(**request)
        process_id = params.process_id
        hwnd = params.hwnd
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파라미터 검증 실패: {e!s}")

    # hwnd가 있으면 직접 사용, 없으면 process_id로 찾기
    if hwnd:
        target_hwnd = hwnd
    else:
        # process_id로 창 핸들 찾기
        target_hwnd = None

        def find_window_callback(hwnd: int, extra: Any) -> bool:
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
        "message": "프로세스에 포커스를 주었습니다.",
        "process_id": process_id,
        "hwnd": target_hwnd,
    }
