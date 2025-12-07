"""
공통 API 응답 모델들
모든 API 엔드포인트에서 일관된 응답 형식을 사용하기 위한 모델
"""

from typing import Any, Literal

from pydantic import BaseModel


class BaseResponse(BaseModel):
    """기본 응답 모델 - 모든 응답의 공통 필드"""

    success: bool
    message: str | None = None


class SuccessResponse(BaseResponse):
    """성공 응답 모델 - 데이터를 포함한 성공 응답"""

    success: Literal[True] = True
    data: dict[str, Any] | None = None


class ErrorResponse(BaseResponse):
    """에러 응답 모델 - 비즈니스 로직 에러 응답 (HTTPException 대신 사용)"""

    success: Literal[False] = False
    error: str | None = None
    error_code: str | None = None


class ListResponse(BaseResponse):
    """리스트 응답 모델 - 리스트 데이터를 포함한 응답"""

    success: bool = True
    data: list[Any]
    count: int | None = None


class PaginatedResponse(ListResponse):
    """페이지네이션 응답 모델 - 페이지네이션 정보를 포함한 리스트 응답"""

    page: int
    page_size: int
    total: int
    total_pages: int


# 타입 별칭: 성공 또는 에러 응답을 반환하는 경우 사용
StandardResponseType = SuccessResponse | ErrorResponse
