# 프로젝트 구조

## 주요 디렉토리

### `server/`
- **api/**: REST API 라우터 (`@api_handler` 데코레이터 사용)
- **nodes/**: 노드 클래스 (`BaseNode` 상속, `@node_executor` 데코레이터)
  - `actionnodes/`: 액션 노드들
  - `conditionnodes/`: 조건 노드들
  - `waitnodes/`: 대기 노드들
  - `imagenodes/`: 이미지 노드들
  - `boundarynodes/`: 시작/종료 노드들
- **services/**: 비즈니스 로직
- **automation/**: 화면 캡처, 입력 처리, 워크플로우 실행
- **db/**: SQLite 데이터베이스 관리
- **utils/**: 공통 유틸리티 (파라미터 검증, 결과 포맷팅 등)
- **config/**: 설정 관리 (`server_config.py`)

### `UI/src/`
- **js/api/**: API 클라이언트 (`window.API_BASE_URL` 사용)
- **js/components/node/**: 노드 렌더링 컴포넌트
- **pages/workflow/**: 워크플로우 편집기
  - **services/**: 저장/로드/실행 로직
  - **modals/**: 노드 추가/설정 모달
  - **config/**: 노드 설정 파일

## 파일 명명 규칙

- **Python**: 스네이크 케이스 (`action_service.py`)
- **JavaScript**: 케밥 케이스 (`node-action.js`)

