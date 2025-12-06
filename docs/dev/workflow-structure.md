# Workflow 페이지 구조

## 디렉토리 구조

```
pages/workflow/
├── workflow.js              # 워크플로우 편집기 메인 컨트롤러
├── page-router.js           # SPA 페이지 라우팅 관리
├── dashboard.js             # 대시보드 페이지
├── settings.js              # 설정 페이지
├── config/                  # 설정 (nodes.config.js)
├── constants/               # 상수 (node-types.js)
├── modals/                  # 모달 (add-node-modal.js, node-settings-modal.js)
├── services/                # 비즈니스 로직 (저장/로드/실행)
└── utils/                   # 유틸리티
```

**참고**: `workflow.html`은 `index.html`로 통합되었습니다.

## 모듈 분리 원칙

- **config/**: 하드코딩된 데이터
- **constants/**: 상수 정의
- **modals/**: 모달 UI
- **services/**: 비즈니스 로직
- **utils/**: 재사용 가능한 함수

## 페이지 구조

### SPA (Single Page Application) 구조

모든 페이지는 `index.html`에 포함되어 있으며, `page-router.js`가 페이지 전환을 관리합니다:

- **대시보드 페이지** (`dashboard.js`): 스크립트 통계 및 관리
- **스크립트 페이지** (`workflow.js`): 워크플로우 편집기
- **실행 기록 페이지**: 실행 내역 확인 (구현 예정)
- **설정 페이지** (`settings.js`): 애플리케이션 설정 관리

### 페이지 라우팅

`PageRouter` 클래스가 다음을 담당합니다:
- 페이지 전환 관리
- 네비게이션 활성화 상태 업데이트
- 헤더 제목/설명 동적 변경
- 사이드바 스크립트 섹션 표시/숨김 제어
