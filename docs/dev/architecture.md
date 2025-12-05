# 시스템 아키텍처

## 전체 구조

```
클라이언트 (브라우저) ←→ FastAPI 서버
```

## 백엔드

### 주요 모듈
- **api/**: REST API 라우터 (`@api_handler` 데코레이터 사용)
- **nodes/**: 노드 클래스 (`BaseNode` 상속, `@node_executor` 데코레이터)
- **services/**: 비즈니스 로직
- **automation/**: 화면 캡처, 입력 처리, 워크플로우 실행
- **db/**: SQLite 데이터베이스 관리
- **utils/**: 공통 유틸리티 (파라미터 검증, 결과 포맷팅 등)

### 노드 시스템
- 모든 노드는 `BaseNode` 상속
- `@node_executor("action-name")` 데코레이터로 공통 기능 처리
- 파라미터 검증: `get_parameter()` 사용

## 프론트엔드

### 주요 모듈
- **js/api/**: API 클라이언트 (`window.API_BASE_URL` 동적 사용)
- **js/components/node/**: 노드 렌더링 컴포넌트
- **pages/workflow/**: 워크플로우 편집기
  - **services/**: 저장/로드/실행 로직
  - **modals/**: 노드 추가/설정 모달

## 설정

- **환경 변수**: `.env` 파일에서 `API_HOST`, `API_PORT`, `ENVIRONMENT` 로드
- **서버 설정**: `server/config/server_config.py`에서 중앙 관리
- **클라이언트**: `window.API_HOST`, `window.API_PORT`로 동적 API URL 생성

## 데이터 흐름

1. **저장**: 클라이언트 → `POST /api/scripts/save` → DB
2. **실행**: 클라이언트 → `POST /api/action/execute` → 노드 실행 → Windows API
3. **로드**: 클라이언트 → `GET /api/scripts/{id}` → DB → 클라이언트

## 기술 스택

- **백엔드**: FastAPI, SQLite, OpenCV, PyAutoGUI
- **프론트엔드**: 순수 JavaScript (ES6+), HTML5, CSS3

