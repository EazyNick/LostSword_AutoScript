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
  - `node-icons.config.js`: 노드 아이콘 중앙 관리
- **js/components/**: 공통 컴포넌트
  - `sidebar.js`: 사이드바 관리
  - `connection.js`: 노드 연결선 관리
- **js/utils/**: 유틸리티
  - `theme-manager.js`: 테마 관리 (라이트/다크/시스템)
  - `toast.js`: 토스트 알림
  - `modal.js`: 모달 창
- **pages/workflow/**: 워크플로우 편집기 및 페이지
  - `page-router.js`: SPA 페이지 라우팅
  - `dashboard.js`: 대시보드 페이지
  - `settings.js`: 설정 페이지
  - `workflow.js`: 워크플로우 편집기
  - **services/**: 저장/로드/실행 로직
  - **modals/**: 노드 추가/설정 모달
  - **config/**: 노드 설정 파일
- **styles/**: 스타일시트
  - `themes/dark/`: 다크 모드 스타일
  - `themes/light/`: 라이트 모드 스타일
  - `components/`: 컴포넌트별 스타일

## 파일 명명 규칙

- **Python**: 스네이크 케이스 (`action_service.py`)
- **JavaScript**: 케밥 케이스 (`node-action.js`)

