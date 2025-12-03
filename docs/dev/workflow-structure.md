# Workflow 페이지 구조

## 디렉토리 구조

```
workflow/
├── workflow.js              # 메인 컨트롤러
├── workflow.html            # HTML 템플릿
├── workflow.css             # 스타일
├── config/                  # 설정 (nodes.config.js)
├── constants/               # 상수 (node-types.js)
├── modals/                  # 모달 (add-node-modal.js, node-settings-modal.js)
├── services/                # 비즈니스 로직 (저장/로드/실행)
└── utils/                   # 유틸리티
```

## 모듈 분리 원칙

- **config/**: 하드코딩된 데이터
- **constants/**: 상수 정의
- **modals/**: 모달 UI
- **services/**: 비즈니스 로직
- **utils/**: 재사용 가능한 함수
