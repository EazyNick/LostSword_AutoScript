"""
HTTP API 요청 액션 노드
외부 API에 HTTP 요청을 보내는 노드입니다.
"""

import aiohttp
import asyncio
import json
from typing import Dict, Any, Optional
from log import log_manager

logger = log_manager.logger


class HttpApiRequestNode:
    """HTTP API 요청 액션 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
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
        if parameters is None:
            parameters = {}
        
        url = parameters.get("url")
        if not url:
            return {
                "action": "http-api-request",
                "status": "failed",
                "message": "URL이 제공되지 않았습니다.",
                "output": {
                    "success": False,
                    "reason": "no_url"
                }
            }
        
        method = parameters.get("method", "GET").upper()
        headers = parameters.get("headers", {})
        body = parameters.get("body")
        timeout = parameters.get("timeout", 30)
        
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
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    data=body,
                    timeout=aiohttp.ClientTimeout(total=timeout)
                ) as response:
                    # 응답 본문 읽기
                    try:
                        response_text = await response.text()
                        # JSON 파싱 시도
                        try:
                            response_data = json.loads(response_text)
                        except json.JSONDecodeError:
                            response_data = response_text
                    except Exception as e:
                        logger.warning(f"응답 본문 읽기 실패: {e}")
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
                            "data": response_data
                        }
                    }
        
        except aiohttp.ClientError as e:
            logger.error(f"HTTP 요청 실패: {e}")
            return {
                "action": "http-api-request",
                "status": "failed",
                "message": f"HTTP 요청 실패: {str(e)}",
                "output": {
                    "success": False,
                    "reason": "request_failed",
                    "error": str(e)
                }
            }
        except asyncio.TimeoutError:
            logger.error(f"HTTP 요청 타임아웃: {url}")
            return {
                "action": "http-api-request",
                "status": "failed",
                "message": f"요청 시간 초과: {timeout}초",
                "output": {
                    "success": False,
                    "reason": "timeout"
                }
            }
        except Exception as e:
            logger.error(f"HTTP 요청 중 예상치 못한 오류: {e}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            return {
                "action": "http-api-request",
                "status": "failed",
                "message": f"예상치 못한 오류: {str(e)}",
                "output": {
                    "success": False,
                    "reason": "unknown_error",
                    "error": str(e)
                }
            }

