"""
액션 관련 API 라우터
"""

import os
import time
from typing import Any

from fastapi import APIRouter, HTTPException

from api.response_helpers import error_response, list_response, success_response
from api.router_wrapper import api_handler
from db.database import db_manager
from log import log_manager
from models import (
    ActionRequest,
    ActionResponse,
    NodeExecutionRequest,
    StandardResponseType,
    SuccessResponse,
)
from models.folder_path_models import FolderPathParams  # Pydantic 모델로 경로 검증 (경로 조작 공격 방지)
from models.process_focus_models import (
    ProcessFocusParams,  # Pydantic 모델로 입력 검증 (process_id 또는 hwnd 중 하나는 필수)
)
from models.response_models import ListResponse
from services.action_service import ActionService
from services.node_execution_context import NodeExecutionContext
from utils.execution_id_generator import generate_execution_id

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
    result = await action_service.process_action(request.action_type, parameters)

    return ActionResponse(success=True, message=f"액션 '{request.action_type}' 실행 완료", data=result)


@router.post("/execute-nodes", response_model=ActionResponse)
@api_handler
async def execute_nodes(request: NodeExecutionRequest) -> ActionResponse:
    """
    노드 기반 워크플로우를 실행합니다.
    노드 간 데이터 전달을 지원합니다.
    """
    logger.info(f"[API] execute_nodes 호출됨 - 노드 개수: {len(request.nodes)}, 실행 모드: {request.execution_mode}")
    logger.debug(f"[API] 요청 데이터: {request}")

    # 실행 ID 생성 (같은 실행의 노드들을 그룹화)
    # 날짜시간 기반의 읽기 쉬운 형식: YYYYMMDD-HHMMSS-{랜덤문자열}
    execution_id = generate_execution_id()

    # 스크립트 ID 추출 (요청에서 가져오거나 None)
    script_id = getattr(request, "script_id", None)

    # 실행 시작 시간 기록
    execution_start_time = time.time()
    execution_record_id = None

    # 스크립트 실행 기록 저장 (시작)
    if script_id:
        try:
            execution_record_id = db_manager.record_script_execution(
                script_id=script_id, status="running", error_message=None, execution_time_ms=None
            )
            logger.info(
                f"[API] 스크립트 실행 기록 저장 (시작) - 실행 ID: {execution_record_id}, 스크립트 ID: {script_id}"
            )
        except Exception as e:
            logger.warning(f"[API] 스크립트 실행 기록 저장 실패 (무시): {e!s}")

    # 노드 실행 컨텍스트 생성 (데이터 전달)
    context = NodeExecutionContext()

    # 클라이언트에서 전달된 이전 노드 결과가 있으면 컨텍스트에 추가
    if request.previous_node_result:
        prev_result = request.previous_node_result
        prev_node_id = prev_result.get("node_id") or prev_result.get("_node_id") or "previous"
        prev_node_name = prev_result.get("node_name") or prev_result.get("_node_name") or "이전 노드"
        context.add_node_result(prev_node_id, prev_node_name, prev_result)
        logger.debug(f"[API] 이전 노드 결과를 컨텍스트에 추가: {prev_node_id} - {prev_result.get('action', 'unknown')}")

    results = []
    has_error = False
    error_message = None

    if request.execution_mode == "sequential":
        logger.info(f"[API] 순차 실행 시작 - 실행 ID: {execution_id}")

        # 전체 노드 개수와 현재 순번 결정 (클라이언트에서 전달된 값 우선, 없으면 요청의 노드 개수 사용)
        total_nodes = request.total_nodes if request.total_nodes is not None else len(request.nodes)
        start_index = request.current_node_index if request.current_node_index is not None else 0

        for i, node in enumerate(request.nodes):
            node_id = node.get("id", f"node_{i}")
            node_type = node.get("type", "unknown")
            node_name = node.get("data", {}).get("title") or node.get("data", {}).get("name") or node_id
            # 현재 노드 순번 계산 (클라이언트에서 전달된 순번 + 루프 인덱스)
            current_node_number = start_index + i + 1
            logger.info(
                f"[API] 노드 {current_node_number}/{total_nodes} 실행 시작 - ID: {node_id}, 타입: {node_type}, 이름: {node_name}"
            )
            try:
                # 실행 컨텍스트와 함께 노드 실행 (execution_id와 메타데이터 전달)
                result = await action_service.process_node(
                    node, context, execution_id=execution_id, script_id=script_id
                )

                # 결과가 None이면 기본값으로 변환
                if result is None:
                    result = {"action": node.get("type", "unknown"), "status": "completed", "output": None}

                # 결과가 dict가 아니면 dict로 변환
                if not isinstance(result, dict):
                    result = {"action": node.get("type", "unknown"), "status": "completed", "output": result}

                # 결과의 status가 "failed"인지 확인 (NodeExecutor가 에러를 catch해서 dict로 반환하는 경우)
                if result.get("status") == "failed" or result.get("error"):
                    # 에러 발생 플래그 설정
                    has_error = True
                    error_msg = result.get("error") or result.get("message") or "노드 실행 실패"
                    if not error_message:
                        error_message = error_msg
                    logger.error(
                        f"[API] 노드 {current_node_number}/{total_nodes} 실행 실패 (status: failed) - ID: {node_id}, 타입: {node_type}, 이름: {node_name}, 에러: {error_msg}"
                    )
                else:
                    logger.info(
                        f"[API] 노드 {current_node_number}/{total_nodes} 실행 성공 - ID: {node_id}, 타입: {node_type}, 이름: {node_name}, 상태: {result.get('status', 'completed')}"
                    )

                results.append(result)
                logger.debug(f"[API] 노드 {i + 1} 실행 결과: {result}")
            except Exception as node_error:
                logger.error(
                    f"[API] 노드 {current_node_number}/{total_nodes} 실행 실패 (예외 발생) - ID: {node_id}, 타입: {node_type}, 이름: {node_name}, 에러: {node_error}"
                )
                node_id = node.get("id", f"node_{i}")
                node_name = node.get("data", {}).get("title") or node.get("data", {}).get("name")
                error_msg = str(node_error)

                # 에러 발생 플래그 설정
                has_error = True
                if not error_message:
                    error_message = error_msg

                # 에러 결과도 항상 dict로 반환
                error_result = {
                    "action": node.get("type", "unknown"),
                    "status": "failed",
                    "error": error_msg,
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

    logger.info(
        f"[API] 모든 노드 실행 완료 - 총 {len(request.nodes)}개 노드, 성공: {len([r for r in results if r.get('status') != 'failed' and not r.get('error')])}개, 실패: {len([r for r in results if r.get('status') == 'failed' or r.get('error')])}개"
    )
    logger.debug(f"[API] 실행 결과 상세: {results}")

    # 실행 완료 시간 계산
    execution_time_ms = int((time.time() - execution_start_time) * 1000) if execution_start_time else None

    # 스크립트 실행 기록 업데이트 (완료)
    if script_id and execution_record_id:
        try:
            final_status = "error" if has_error else "success"
            db_manager.record_script_execution(
                script_id=script_id,
                status=final_status,
                error_message=error_message,
                execution_time_ms=execution_time_ms,
                execution_id=execution_record_id,
            )
            logger.info(
                f"[API] 스크립트 실행 기록 업데이트 (완료) - 실행 ID: {execution_record_id}, 상태: {final_status}"
            )
        except Exception as e:
            logger.warning(f"[API] 스크립트 실행 기록 업데이트 실패 (무시): {e!s}")

    # 에러가 발생했으면 success: False 반환
    if has_error:
        logger.warning(f"[API] 노드 실행 중 오류 발생 - 에러 메시지: {error_message}")
        return ActionResponse(
            success=False,
            message=f"노드 실행 중 오류 발생: {error_message}",
            data={
                "results": results,
                "context": context.to_dict(),  # 컨텍스트 정보도 반환 (디버깅용)
            },
        )

    logger.info(f"[API] 모든 노드 실행 성공 - {len(request.nodes)}개 노드 모두 성공")
    return ActionResponse(
        success=True,
        message=f"{len(request.nodes)}개 노드 실행 완료",
        data={
            "results": results,
            "context": context.to_dict(),  # 컨텍스트 정보도 반환 (디버깅용)
        },
    )


@router.post("/folder/select", response_model=SuccessResponse)
@api_handler
async def select_folder() -> StandardResponseType:
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
        return error_response("폴더가 선택되지 않았습니다.")

    return success_response({"folder_path": folder_path}, "폴더가 선택되었습니다.")


@router.post("/file/select", response_model=SuccessResponse)
@api_handler
async def select_file() -> StandardResponseType:
    """
    파일 선택 다이얼로그를 띄우고 선택된 파일 경로를 반환합니다.
    """
    import tkinter as tk
    from tkinter import filedialog

    # tkinter 루트 윈도우 생성 (숨김)
    root = tk.Tk()
    root.withdraw()  # 메인 윈도우 숨기기
    root.attributes("-topmost", True)  # 다른 창 위에 표시

    # 파일 선택 다이얼로그
    file_path = filedialog.askopenfilename(
        title="파일 선택",
        filetypes=[
            ("모든 파일", "*.*"),
            ("텍스트 파일", "*.txt"),
            ("JSON 파일", "*.json"),
            ("CSV 파일", "*.csv"),
        ],
    )

    root.destroy()  # 루트 윈도우 제거

    if not file_path:
        return error_response("파일이 선택되지 않았습니다.")

    return success_response({"file_path": file_path}, "파일이 선택되었습니다.")


@router.get("/images/list", response_model=ListResponse)
@api_handler
async def get_image_list(folder_path: str) -> ListResponse:
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

    return list_response(
        image_files,
        "이미지 목록 조회 완료",
        folder_path=validated_path,
    )


@router.get("/processes/list", response_model=ListResponse)
@api_handler
async def get_process_list() -> ListResponse:
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

    return list_response(processes, "프로세스 목록 조회 완료")


@router.post("/processes/focus", response_model=SuccessResponse)
@api_handler
async def focus_process(request: dict[str, Any]) -> SuccessResponse:
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

    return success_response(
        {"process_id": process_id, "hwnd": target_hwnd},
        "프로세스에 포커스를 주었습니다.",
    )
