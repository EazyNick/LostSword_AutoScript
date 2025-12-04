"""
HTTP API 요청 액션 노드
외부 API에 HTTP 요청을 보내는 노드입니다.
"""

import asyncio
import json
from typing import Any

import aiohttp

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import create_failed_result, get_parameter


class HttpApiRequestNode(BaseNode):
    """HTTP API 요청 액션 노드 클래스"""

    @staticmethod
    @NodeExecutor("http-api-request")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        HTTP API 요청을 실행합니다.

        Args:
            parameters: 노드 파라미터
                - url: 요청 URL (필수)
                - method: HTTP 메서드 (GET, POST, PUT, DELETE 등, 기본값: GET)
                - headers: HTTP 헤더 (dict 또는 string, 선택)
                - body: 요청 본문 (dict 또는 string, 선택)
                - timeout: 타임아웃 (초, 기본값: 30)

        Returns:
            실행 결과 딕셔너리
        """
        url = get_parameter(parameters, "url")
        if not url:
            return create_failed_result(
                action="http-api-request", reason="no_url", message="URL이 제공되지 않았습니다."
            )

        method = get_parameter(parameters, "method", default="GET").upper()
        headers = get_parameter(parameters, "headers", default={})
        body = get_parameter(parameters, "body")
        timeout = get_parameter(parameters, "timeout", default=30)

        # headers가 문자열이면 JSON 파싱
        if isinstance(headers, str):
            try:
                headers = json.loads(headers)
            except json.JSONDecodeError:
                headers = {}

        # body가 dict이면 JSON 문자열로 변환
        if isinstance(body, dict):
            body = json.dumps(body, ensure_ascii=False)
            if "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"

        try:
            async with (
                aiohttp.ClientSession() as session,
                session.request(
                    method=method, url=url, headers=headers, data=body, timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response,
            ):
                # 응답 본문 읽기
                try:
                    response_text = await response.text()
                    # JSON 파싱 시도
                    try:
                        response_data = json.loads(response_text)
                    except json.JSONDecodeError:
                        response_data = response_text
                except Exception as e:
                    from log import log_manager

                    log_manager.logger.warning(f"응답 본문 읽기 실패: {e}")
                    response_data = None

                # 성공 여부 판단 (2xx 상태 코드)
                success = 200 <= response.status < 300

                return {
                    "action": "http-api-request",
                    "status": "completed" if success else "failed",
                    "output": {
                        "success": success,
                        "status_code": response.status,
                        "status_text": response.reason,
                        "headers": dict(response.headers),
                        "data": response_data,
                    },
                }

        except aiohttp.ClientError as e:
            return create_failed_result(
                action="http-api-request",
                reason="request_failed",
                message=f"HTTP 요청 실패: {e!s}",
                output={"error": str(e)},
            )
        except asyncio.TimeoutError:
            return create_failed_result(
                action="http-api-request", reason="timeout", message=f"요청 시간 초과: {timeout}초"
            )
        except Exception as e:
            import traceback

            from log import log_manager

            log_manager.logger.error(f"HTTP 요청 중 예상치 못한 오류: {e}")
            log_manager.logger.error(f"스택 트레이스: {traceback.format_exc()}")
            return create_failed_result(
                action="http-api-request",
                reason="unknown_error",
                message=f"예상치 못한 오류: {e!s}",
                output={"error": str(e)},
            )
