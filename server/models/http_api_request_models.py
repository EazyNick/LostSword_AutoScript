"""
HTTP API 요청 노드 관련 모델들
"""

from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


class HttpApiRequestParams(BaseModel):
    """HTTP API 요청 파라미터 모델"""

    url: str = Field(..., min_length=1)
    method: Literal["GET", "POST", "PUT", "DELETE", "PATCH"] = "GET"
    headers: dict[str, str] = Field(default_factory=dict)
    body: str | dict[str, Any] | None = None
    timeout: int = Field(default=30, ge=1, le=300)  # 1-300초

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """SSRF 방지: 내부 네트워크 접근 차단"""
        # HTTP/HTTPS만 허용
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL은 http:// 또는 https://로 시작해야 합니다")

        # URL 파싱
        try:
            parsed = urlparse(v)
            host = parsed.hostname
            if not host:
                raise ValueError("유효하지 않은 URL입니다")
        except Exception as e:
            raise ValueError(f"URL 파싱 실패: {e}") from e

        # 금지된 호스트/프로토콜
        blocked_hosts = [
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1",
            "169.254.169.254",  # AWS 메타데이터
        ]

        # 사설 IP 대역 차단
        if host:
            # 10.x.x.x
            if host.startswith("10."):
                raise ValueError("내부 네트워크 접근은 허용되지 않습니다: 10.x.x.x")
            # 172.16.x.x ~ 172.31.x.x
            if host.startswith("172."):
                parts = host.split(".")
                if len(parts) >= 2:
                    try:
                        second_octet = int(parts[1])
                        if 16 <= second_octet <= 31:
                            raise ValueError(f"내부 네트워크 접근은 허용되지 않습니다: {host}")
                    except ValueError:
                        pass
            # 192.168.x.x
            if host.startswith("192.168."):
                raise ValueError("내부 네트워크 접근은 허용되지 않습니다: 192.168.x.x")

            # 금지된 호스트 확인
            for blocked in blocked_hosts:
                if host == blocked or host.startswith(blocked + "."):
                    raise ValueError(f"내부 네트워크 접근은 허용되지 않습니다: {host}")

        return v
