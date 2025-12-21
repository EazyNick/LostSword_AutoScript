"""
엑셀 열기 노드
win32를 사용하여 엑셀 파일을 여는 노드입니다.

주의사항:
- Windows 환경에서만 사용 가능합니다.
- pywin32 라이브러리가 필요합니다 (pip install pywin32).
"""

import os
from typing import Any

from log import log_manager
from nodes.base_node import BaseNode
from nodes.excelnodes.excel_manager import store_excel_objects
from nodes.node_executor_wrapper import NodeExecutor
from utils import create_failed_result, get_parameter

logger = log_manager.logger

try:
    import win32com.client
except ImportError:
    win32com = None


class ExcelOpenNode(BaseNode):
    """
    엑셀 열기 노드 클래스

    Windows 환경에서만 동작하며, win32com을 사용하여 엑셀 파일을 엽니다.
    """

    @staticmethod
    @NodeExecutor("excel-open")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        엑셀 파일을 엽니다.

        주의: Windows 환경에서만 사용 가능합니다. win32com을 사용하여 엑셀을 제어합니다.

        Args:
            parameters: 노드 파라미터
                - file_path: 엑셀 파일 경로 (필수)
                - visible: 엑셀 창 표시 여부 (기본값: True)

        Returns:
            실행 결과 딕셔너리
        """
        # win32com이 설치되어 있지 않은 경우
        if win32com is None:
            return create_failed_result(
                action="excel-open",
                reason="win32com_not_installed",
                message="pywin32가 설치되어 있지 않습니다. pip install pywin32를 실행하세요.",
                output={"file_path": None, "visible": None, "success": False},
            )

        file_path = get_parameter(parameters, "file_path", default="")
        visible = get_parameter(parameters, "visible", default=True)

        # visible 파라미터 디버깅 로그
        logger.info(
            f"[ExcelOpenNode] 파라미터 수신 - file_path: {file_path}, visible: {visible} (type: {type(visible)})"
        )

        # 파일 경로 검증
        if not file_path:
            return create_failed_result(
                action="excel-open",
                reason="file_path_required",
                message="엑셀 파일 경로가 필요합니다.",
                output={"file_path": file_path, "visible": visible, "success": False},
            )

        # 파일 경로 정규화 (Windows 경로 처리)
        file_path = os.path.normpath(file_path)

        # 파일 존재 여부 확인
        if not os.path.exists(file_path):
            return create_failed_result(
                action="excel-open",
                reason="file_not_found",
                message=f"파일을 찾을 수 없습니다: {file_path}",
                output={"file_path": file_path, "visible": visible, "success": False},
            )

        # 파일 확장자 확인
        if not file_path.lower().endswith((".xlsx", ".xls", ".xlsm")):
            return create_failed_result(
                action="excel-open",
                reason="invalid_file_type",
                message=f"지원하지 않는 파일 형식입니다: {file_path}",
                output={"file_path": file_path, "visible": visible, "success": False},
            )

        try:
            import asyncio
            import time

            # execution_id 가져오기 (메타데이터에서) - 대기 로직 전에 먼저 확인
            execution_id = parameters.get("_execution_id")
            if not execution_id:
                return create_failed_result(
                    action="excel-open",
                    reason="execution_id_required",
                    message="execution_id가 필요합니다. 엑셀 객체를 저장할 수 없습니다.",
                    output={"file_path": file_path, "visible": visible, "success": False},
                )

            # Excel 애플리케이션 객체 생성
            excel_app = win32com.client.Dispatch("Excel.Application")

            # 엑셀 창 표시 여부 설정
            excel_app.Visible = bool(visible)

            # 엑셀 파일 열기
            workbook = excel_app.Workbooks.Open(file_path)

            # Excel이 완전히 준비될 때까지 대기
            # workbook.Open()이 반환되어도 Excel이 완전히 로드되기 전에 다음 노드가 실행될 수 있음
            max_wait_time = 30  # 최대 30초 대기
            check_interval = 0.1  # 0.1초마다 확인
            start_time = time.time()
            excel_ready = False

            while (time.time() - start_time) < max_wait_time:
                try:
                    # Excel이 준비되었는지 확인
                    # Ready 속성 확인 및 간단한 속성 접근 시도
                    if excel_app.Ready and workbook.Name:
                        excel_ready = True
                        break
                except Exception:
                    # 아직 준비되지 않았으면 계속 대기
                    pass

                await asyncio.sleep(check_interval)

            if not excel_ready:
                logger.warning(
                    f"[ExcelOpenNode] Excel 준비 확인 타임아웃 - execution_id: {execution_id}, 하지만 계속 진행합니다."
                )
            else:
                logger.info(f"[ExcelOpenNode] Excel 준비 완료 - execution_id: {execution_id}")

            # 엑셀 객체를 저장소에 저장
            store_excel_objects(execution_id, excel_app, workbook, file_path)
            logger.info(f"[ExcelOpenNode] 엑셀 객체 저장 완료 - execution_id: {execution_id}")

            # 출력에 execution_id 항상 포함 (다음 노드에서 사용 가능하도록)
            return {
                "action": "excel-open",
                "status": "completed",
                "output": {
                    "file_path": file_path,
                    "visible": bool(visible),
                    "success": True,
                    "execution_id": execution_id,  # 다음 노드에서 사용할 수 있도록 execution_id 항상 포함
                },
            }
        except Exception as e:
            return create_failed_result(
                action="excel-open",
                reason="excel_open_error",
                message=f"엑셀 파일을 여는 중 오류가 발생했습니다: {e!s}",
                output={"file_path": file_path, "visible": visible, "success": False},
            )
