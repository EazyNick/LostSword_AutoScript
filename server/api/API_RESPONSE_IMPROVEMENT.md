# API 응답 형식 개선 계획

## 현재 문제점 분석

### 1. 응답 형식 불일치

#### 문제 상황
- **action_router.py**: 일부는 `ActionResponse` 모델 사용, 일부는 직접 `dict` 반환
  - `execute_action`: `ActionResponse` 사용 ✅
  - `select_folder`: `{"success": True, "folder_path": ...}` 직접 반환 ❌
  - `get_image_list`: `{"success": True, "count": ..., "images": ...}` 직접 반환 ❌
  - `get_process_list`: `{"success": True, "count": ..., "processes": ...}` 직접 반환 ❌
  - `focus_process`: `{"success": True, "message": ..., "process_id": ..., "hwnd": ...}` 직접 반환 ❌

- **script_router.py**: 대부분 직접 `dict` 반환
  - `get_all_scripts`: `list[dict]` 직접 반환 ❌
  - `get_script`: `ScriptResponse` 모델 사용하지만 실제로는 dict 반환 ✅
  - `create_script`: `{"id": ..., "name": ..., "message": ...}` 직접 반환 ❌
  - `update_script`: `{"message": "..."}` 직접 반환 ❌
  - `delete_script`: `{"message": "...", "id": ...}` 직접 반환 ❌
  - `execute_script`: `{"success": True/False, "message": ..., "results": ...}` 직접 반환 ❌

- **config_router.py**: 모두 직접 `dict` 반환
  - `get_config`: `{"dev_mode": ...}` 직접 반환 ❌
  - `get_nodes_config`: `{"nodes": ...}` 직접 반환 ❌
  - `get_user_settings`: `dict[str, str]` 직접 반환 ❌
  - `get_user_setting`: `{"key": ..., "value": ...}` 직접 반환 ❌
  - `save_user_setting`: `{"message": ..., "key": ..., "value": ...}` 직접 반환 ❌
  - `delete_user_setting`: `{"message": ..., "key": ...}` 직접 반환 ❌

- **dashboard_router.py**: 직접 `dict` 반환
  - `get_dashboard_stats`: `dict` 직접 반환 ❌

- **node_router.py**: 직접 `dict` 반환
  - 모든 엔드포인트가 `{"message": ..., ...}` 형식으로 직접 반환 ❌

- **state_router.py**: 직접 `dict` 반환
  - `get_application_state`: `{"application_running": ..., ...}` 직접 반환 ❌

### 2. 성공/실패 표시 방식 불일치

- 일부는 `success` 필드 사용 (`action_router.py`의 일부, `script_router.py`의 `execute_script`)
- 일부는 `success` 필드 없음 (대부분의 엔드포인트)
- 일부는 HTTP 상태 코드만으로 성공/실패 판단

### 3. 메시지 필드 불일치

- 일부는 `message` 필드 포함 (`ActionResponse`, 일부 엔드포인트)
- 일부는 `message` 필드 없음 (대부분의 엔드포인트)
- 메시지 형식이 일관되지 않음

### 4. 에러 처리 방식 불일치

- 일부는 `HTTPException` 사용 (대부분)
- 일부는 `success: False`와 함께 데이터 반환 (`execute_nodes`, `execute_script`)
- 에러 응답 형식이 통일되지 않음

### 5. 타입 안정성 부족

- `response_model` 지정이 일관되지 않음
- 직접 `dict` 반환으로 타입 검증 불가
- IDE 자동완성 및 타입 체크 불가

## 개선 방안

### 1. 공통 응답 모델 생성

```python
# models/response_models.py

class BaseResponse(BaseModel):
    """기본 응답 모델"""
    success: bool
    message: str | None = None

class SuccessResponse(BaseResponse):
    """성공 응답 모델"""
    success: bool = True
    data: dict[str, Any] | None = None

class ErrorResponse(BaseResponse):
    """에러 응답 모델"""
    success: bool = False
    error: str | None = None
    error_code: str | None = None

class ListResponse(BaseResponse):
    """리스트 응답 모델"""
    success: bool = True
    data: list[Any]
    count: int | None = None

class PaginatedResponse(ListResponse):
    """페이지네이션 응답 모델"""
    page: int
    page_size: int
    total: int
    total_pages: int

# 타입 별칭: 성공 또는 에러 응답을 반환하는 경우 사용
StandardResponseType = Union[SuccessResponse, ErrorResponse]
```

**타입 힌트 사용 가이드:**
- 항상 성공만 반환하는 경우: `-> SuccessResponse`
- 성공 또는 에러를 반환하는 경우: `-> StandardResponseType` (Union[SuccessResponse, ErrorResponse])
- `response_model`은 `BaseResponse` 사용 (공통 부모 클래스)

### 2. 응답 헬퍼 함수 생성

```python
# api/response_helpers.py

def success_response(
    data: Any = None,
    message: str | None = None,
    **kwargs
) -> SuccessResponse:
    """성공 응답 생성"""
    return SuccessResponse(
        success=True,
        message=message,
        data={"result": data, **kwargs} if data is not None else kwargs or None
    )

def error_response(
    message: str,
    error: str | None = None,
    error_code: str | None = None
) -> ErrorResponse:
    """에러 응답 생성"""
    return ErrorResponse(
        success=False,
        message=message,
        error=error or message,
        error_code=error_code
    )

def list_response(
    items: list[Any],
    message: str | None = None,
    **kwargs
) -> ListResponse:
    """리스트 응답 생성"""
    return ListResponse(
        success=True,
        message=message,
        data=items,
        count=len(items),
        **kwargs
    )
```

### 3. 통일된 응답 형식 규칙

#### 성공 응답
```json
{
  "success": true,
  "message": "작업이 완료되었습니다.",
  "data": {
    // 실제 데이터
  }
}
```

#### 에러 응답 (비즈니스 로직 에러)
```json
{
  "success": false,
  "message": "에러 메시지",
  "error": "상세 에러 정보",
  "error_code": "ERROR_CODE"
}
```

#### HTTP 에러 (4xx, 5xx)
- FastAPI의 `HTTPException` 사용
- 클라이언트는 HTTP 상태 코드로 판단

### 4. 적용 우선순위

1. **공통 응답 모델 생성** (`models/response_models.py`)
2. **응답 헬퍼 함수 생성** (`api/response_helpers.py`)
3. **action_router.py** 수정
4. **script_router.py** 수정
5. **config_router.py** 수정
6. **dashboard_router.py** 수정
7. **node_router.py** 수정
8. **state_router.py** 수정

### 5. 마이그레이션 전략

- 기존 API와의 호환성을 위해 점진적으로 마이그레이션
- 새로운 엔드포인트는 새로운 형식 사용
- 기존 엔드포인트는 우선순위에 따라 순차적으로 수정

## 예상 효과

1. **유지보수성 향상**: 일관된 응답 형식으로 클라이언트 코드 단순화
2. **타입 안정성**: Pydantic 모델로 런타임 검증 및 IDE 지원
3. **에러 처리 개선**: 명확한 에러 응답 형식
4. **코드 재사용성**: 헬퍼 함수로 중복 코드 제거
5. **문서화 개선**: 자동 생성되는 OpenAPI 스키마 개선

