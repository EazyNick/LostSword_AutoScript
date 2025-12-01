# 프로젝트 구조

이 문서는 자동화 도구 프로젝트의 폴더 구조와 각 디렉토리의 역할을 설명합니다.

## 전체 구조

```
자동화도구/
├── server/                 # FastAPI 서버
│   ├── main.py             # 메인 서버 파일
│   ├── config.py           # 설정 관리
│   ├── requirements.txt    # Python 의존성
│   ├── env.example        # 환경 변수 예제
│   ├── api/               # API 라우터들
│   │   ├── action_router.py      # 액션 API
│   │   ├── config_router.py      # 설정 API
│   │   ├── state_router.py        # 애플리케이션 상태 API
│   │   ├── node_router.py        # 노드 관리 API
│   │   └── script_router.py      # 스크립트 관리 API
│   ├── db/                # 데이터베이스 관련
│   │   ├── database.py           # 데이터베이스 연결 및 설정
│   │   └── workflows.db          # SQLite 데이터베이스 파일
│   ├── automation/        # 자동화 모듈
│   │   ├── __init__.py
│   │   ├── screen_capture.py      # 화면 캡처 및 이미지 처리
│   │   ├── input_handler.py      # 입력 처리 (마우스, 키보드)
│   │   ├── application_state.py  # 애플리케이션 상태 관리
│   │   └── workflow_engine.py    # 워크플로우 실행 엔진
│   ├── models/            # 데이터 모델
│   │   ├── action_models.py    # 액션 관련 모델
│   │   └── script_models.py    # 스크립트 관련 모델
│   ├── services/          # 비즈니스 로직
│   │   └── action_service.py   # 액션 처리 서비스
│   ├── log/               # 로깅 관련
│   │   ├── log_manager.py      # 로그 관리자
│   │   └── logs/               # 로그 파일 저장 디렉토리
│   └── seed_nodes.py      # 샘플 노드 데이터 삽입 스크립트
├── UI/                    # 웹 기반 UI
│   └── src/
│       ├── index.html     # 메인 HTML
│       ├── js/           # JavaScript 모듈들
│       │   ├── api/      # API 클라이언트
│       │   │   ├── api.js           # 기본 API 클라이언트
│       │   │   ├── nodeapi.js      # 노드 API 클라이언트
│       │   │   └── scriptapi.js    # 스크립트 API 클라이언트
│       │   ├── components/  # UI 컴포넌트
│       │   │   ├── node/    # 노드 관련 컴포넌트
│       │   │   │   ├── node.js              # 노드 매니저
│       │   │   │   ├── node-action.js       # 액션 노드
│       │   │   │   ├── node-condition.js    # 조건 노드
│       │   │   │   ├── node-loop.js         # 루프 노드
│       │   │   │   ├── node-wait.js          # 대기 노드
│       │   │   │   ├── node-image-touch.js  # 이미지 터치 노드
│       │   │   │   ├── node-process-focus.js # 프로세스 포커스 노드
│       │   │   │   └── ...
│       │   │   ├── connection.js    # 연결선 관리
│       │   │   └── sidebar.js       # 사이드바
│       │   └── utils/     # 유틸리티
│       │       ├── logger.js    # 로깅 유틸리티
│       │       ├── modal.js     # 모달 관리
│       │       └── toast.js     # 토스트 알림
│       ├── pages/        # 페이지별 파일들
│       │   └── workflow/  # 워크플로우 페이지
│       │       ├── workflow.html    # 워크플로우 페이지 HTML
│       │       ├── workflow.js      # 워크플로우 페이지 메인 로직
│       │       ├── workflow.css     # 워크플로우 페이지 스타일
│       │       ├── config/          # 설정 파일들
│       │       │   ├── nodes.config.js      # 노드 설정
│       │       │   └── node-defaults.js     # 노드 기본값
│       │       ├── constants/       # 상수 정의
│       │       │   └── node-types.js
│       │       ├── modals/          # 모달 컴포넌트
│       │       │   ├── add-node-modal.js      # 노드 추가 모달
│       │       │   └── node-settings-modal.js # 노드 설정 모달
│       │       ├── services/        # 서비스 레이어
│       │       │   ├── node-creation-service.js    # 노드 생성 서비스
│       │       │   ├── node-update-service.js       # 노드 업데이트 서비스
│       │       │   ├── node-registry.js            # 노드 레지스트리
│       │       │   ├── workflow-execution-service.js # 워크플로우 실행 서비스
│       │       │   ├── workflow-load-service.js     # 워크플로우 로드 서비스
│       │       │   └── workflow-save-service.js     # 워크플로우 저장 서비스
│       │       └── utils/           # 유틸리티
│       │           ├── node-utils.js           # 노드 유틸리티
│       │           ├── node-validation-utils.js # 노드 검증 유틸리티
│       │           ├── storage-utils.js        # 스토리지 유틸리티
│       │           └── viewport-utils.js       # 뷰포트 유틸리티
│       └── styles/       # CSS 스타일들
│           ├── common.css           # 공통 스타일
│           └── components/         # 컴포넌트별 스타일
│               ├── header.css
│               ├── modal.css
│               ├── node.css
│               └── sidebar.css
├── docs/                 # 문서
│   ├── database.md       # 데이터베이스 사용 가이드
│   ├── dev/              # 개발자 문서
│   │   ├── development.md        # 개발 환경 설정
│   │   ├── environment.md        # 환경 변수 설정
│   │   ├── node.md               # 노드 추가 가이드
│   │   ├── workflow-structure.md # 워크플로우 구조 설명
│   │   ├── project-structure.md  # 프로젝트 구조 (이 문서)
│   │   └── architecture.md       # 시스템 아키텍처
│   └── performance/      # 성능 관련 문서
│       └── coordinate-calculation-optimization.md
├── assets/               # 정적 자산
│   └── readme/           # README용 이미지
└── README.md             # 프로젝트 메인 README
```

## 주요 디렉토리 설명

### `server/`
FastAPI 기반 백엔드 서버입니다. 자동화 로직과 API 엔드포인트를 제공합니다.

- **`api/`**: RESTful API 라우터들을 정의합니다.
- **`automation/`**: 자동화 핵심 로직 (화면 캡처, 입력 처리, 워크플로우 실행 등)
- **`services/`**: 비즈니스 로직을 처리하는 서비스 레이어
- **`models/`**: Pydantic 모델 정의
- **`db/`**: 데이터베이스 연결 및 스키마 관리

### `UI/src/`
웹 기반 프론트엔드입니다. 순수 JavaScript로 구현되어 있으며, 모듈화된 구조로 되어 있습니다.

- **`js/api/`**: 서버 API와 통신하는 클라이언트 코드
- **`js/components/`**: 재사용 가능한 UI 컴포넌트
- **`pages/workflow/`**: 워크플로우 편집기 페이지 관련 파일들
- **`styles/`**: CSS 스타일시트

### `docs/`
프로젝트 문서입니다.

- **`dev/`**: 개발자를 위한 상세 문서
- **`performance/`**: 성능 최적화 관련 문서

## 파일 명명 규칙

### Python 파일
- **스네이크 케이스**: `action_service.py`, `screen_capture.py`
- **모듈 파일**: `__init__.py`

### JavaScript 파일
- **케밥 케이스**: `node-action.js`, `workflow-execution-service.js`
- **클래스 파일**: `node.js`, `connection.js` (단일 단어인 경우)

### 설정 파일
- **케밥 케이스**: `nodes.config.js`, `node-defaults.js`

## 관련 문서

- [시스템 아키텍처](architecture.md)
- [워크플로우 구조](workflow-structure.md)
- [노드 추가 가이드](node.md)

