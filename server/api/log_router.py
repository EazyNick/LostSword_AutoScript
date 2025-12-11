"""
로그 관련 API 라우터
"""

from fastapi import APIRouter, HTTPException, Query, Request

from api.response_helpers import list_response, success_response
from api.router_wrapper import api_handler
from db.database import db_manager
from log import log_manager
from models.log_models import NodeExecutionLogRequest, NodeExecutionLogResponse
from models.response_models import ListResponse, SuccessResponse

router = APIRouter(prefix="/api/logs", tags=["logs"])
logger = log_manager.logger


@router.post("/node-execution", response_model=NodeExecutionLogResponse)
@api_handler
async def create_node_execution_log(request: NodeExecutionLogRequest, api_request: Request) -> NodeExecutionLogResponse:
    """
    노드 실행 로그를 생성합니다.
    wrapper에서 각 노드 실행 시 호출됩니다.
    """
    client_ip = api_request.client.host if api_request.client else "unknown"
    logger.debug(
        f"[API] 노드 실행 로그 생성 요청 - 노드 ID: {request.node_id}, 타입: {request.node_type}, 상태: {request.status}, 클라이언트 IP: {client_ip}"
    )

    try:
        log_id = db_manager.node_execution_logs.create_log(
            execution_id=request.execution_id,
            script_id=request.script_id,
            node_id=request.node_id,
            node_type=request.node_type,
            node_name=request.node_name,
            status=request.status,
            started_at=request.started_at,
            finished_at=request.finished_at,
            execution_time_ms=request.execution_time_ms,
            parameters=request.parameters,
            result=request.result,
            error_message=request.error_message,
            error_traceback=request.error_traceback,
        )

        logger.info(
            f"[API] 노드 실행 로그 생성 성공 - 로그 ID: {log_id}, 노드 ID: {request.node_id}, 상태: {request.status}"
        )

        return NodeExecutionLogResponse(success=True, message="노드 실행 로그가 생성되었습니다.", log_id=log_id)
    except Exception as e:
        logger.error(f"[API] 노드 실행 로그 생성 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"로그 생성 실패: {e!s}")


@router.get("/node-execution", response_model=ListResponse)
@api_handler
async def get_node_execution_logs(
    http_request: Request,
    execution_id: str | None = Query(None, description="워크플로우 실행 ID"),
    script_id: int | None = Query(None, description="스크립트 ID"),
    node_id: str | None = Query(None, description="노드 ID"),
    limit: int = Query(100, ge=1, le=1000, description="조회할 최대 개수"),
    offset: int = Query(0, ge=0, description="건너뛸 개수"),
) -> ListResponse:
    """
    노드 실행 로그를 조회합니다.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    logger.debug(
        f"[API] 노드 실행 로그 조회 요청 - execution_id: {execution_id}, script_id: {script_id}, node_id: {node_id}, 클라이언트 IP: {client_ip}"
    )

    try:
        if execution_id:
            logs = db_manager.node_execution_logs.get_logs_by_execution_id(execution_id)
        elif script_id:
            logs = db_manager.node_execution_logs.get_logs_by_script_id(script_id, limit=limit, offset=offset)
        elif node_id:
            logs = db_manager.node_execution_logs.get_logs_by_node_id(node_id, limit=limit, offset=offset)
        else:
            logs = db_manager.node_execution_logs.get_recent_logs(limit=limit)

        logger.info(f"[API] 노드 실행 로그 조회 성공 - 로그 개수: {len(logs)}개")

        return list_response(logs, "노드 실행 로그 조회 완료")
    except Exception as e:
        logger.error(f"[API] 노드 실행 로그 조회 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"로그 조회 실패: {e!s}")


@router.get("/node-execution/failed", response_model=ListResponse)
@api_handler
async def get_failed_node_execution_logs(
    http_request: Request,
    script_id: int | None = Query(None, description="스크립트 ID (선택사항)"),
    limit: int = Query(100, ge=1, le=1000, description="조회할 최대 개수"),
) -> ListResponse:
    """
    실패한 노드 실행 로그를 조회합니다.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    logger.debug(f"[API] 실패한 노드 실행 로그 조회 요청 - script_id: {script_id}, 클라이언트 IP: {client_ip}")

    try:
        logs = db_manager.node_execution_logs.get_failed_logs(script_id=script_id, limit=limit)

        logger.info(f"[API] 실패한 노드 실행 로그 조회 성공 - 로그 개수: {len(logs)}개")

        return list_response(logs, "실패한 노드 실행 로그 조회 완료")
    except Exception as e:
        logger.error(f"[API] 실패한 노드 실행 로그 조회 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"로그 조회 실패: {e!s}")


@router.delete("/node-execution/{log_id}", response_model=SuccessResponse)
@api_handler
async def delete_node_execution_log(log_id: int, http_request: Request) -> SuccessResponse:
    """
    특정 노드 실행 로그를 삭제합니다.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    logger.debug(f"[API] 노드 실행 로그 삭제 요청 - 로그 ID: {log_id}, 클라이언트 IP: {client_ip}")

    try:
        deleted = db_manager.node_execution_logs.delete_log(log_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="로그를 찾을 수 없습니다.")

        logger.info(f"[API] 노드 실행 로그 삭제 성공 - 로그 ID: {log_id}")
        return success_response({"log_id": log_id}, "노드 실행 로그가 삭제되었습니다.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] 노드 실행 로그 삭제 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"로그 삭제 실패: {e!s}")


@router.delete("/node-execution/execution/{execution_id}", response_model=SuccessResponse)
@api_handler
async def delete_node_execution_logs_by_execution_id(execution_id: str, http_request: Request) -> SuccessResponse:
    """
    특정 실행 ID의 모든 노드 실행 로그를 삭제합니다.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    logger.debug(f"[API] 실행 ID별 노드 실행 로그 삭제 요청 - execution_id: {execution_id}, 클라이언트 IP: {client_ip}")

    try:
        deleted_count = db_manager.node_execution_logs.delete_logs_by_execution_id(execution_id)
        logger.info(
            f"[API] 실행 ID별 노드 실행 로그 삭제 성공 - execution_id: {execution_id}, 삭제된 개수: {deleted_count}"
        )
        return success_response(
            {"execution_id": execution_id, "deleted_count": deleted_count},
            f"{deleted_count}개의 노드 실행 로그가 삭제되었습니다.",
        )
    except Exception as e:
        logger.error(f"[API] 실행 ID별 노드 실행 로그 삭제 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"로그 삭제 실패: {e!s}")


@router.delete("/node-execution", response_model=SuccessResponse)
@api_handler
async def delete_all_node_execution_logs(http_request: Request) -> SuccessResponse:
    """
    모든 노드 실행 로그를 삭제합니다.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    logger.debug(f"[API] 전체 노드 실행 로그 삭제 요청 - 클라이언트 IP: {client_ip}")

    try:
        deleted_count = db_manager.node_execution_logs.delete_all_logs()
        logger.info(f"[API] 전체 노드 실행 로그 삭제 성공 - 삭제된 개수: {deleted_count}")
        return success_response(
            {"deleted_count": deleted_count},
            f"모든 노드 실행 로그({deleted_count}개)가 삭제되었습니다.",
        )
    except Exception as e:
        logger.error(f"[API] 전체 노드 실행 로그 삭제 실패: {e!s}")
        raise HTTPException(status_code=500, detail=f"로그 삭제 실패: {e!s}")
