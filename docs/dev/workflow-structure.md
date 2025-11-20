# Workflow 페이지 구조

## 디렉토리 구조

```
workflow/
├── workflow.js              # 메인 컨트롤러 클래스 (WorkflowPage)
├── workflow.html            # HTML 템플릿
├── workflow.css             # 스타일
│
├── config/                  # 설정 데이터
│   └── node-defaults.js     # 노드 기본값 (설명, 색상, 제목)
│
├── constants/               # 상수 정의
│   └── node-types.js        # 노드 타입 상수
│
├── modals/                  # 모달 관리
│   ├── add-node-modal.js    # 노드 추가 모달
│   └── node-settings-modal.js # 노드 설정 모달
│
├── services/                # 비즈니스 로직
│   ├── workflow-save-service.js    # 워크플로우 저장
│   ├── workflow-load-service.js    # 워크플로우 로드
│   └── workflow-execution-service.js # 워크플로우 실행
│
└── utils/                   # 유틸리티 함수
    ├── node-utils.js        # 노드 관련 유틸리티
    └── workflow-utils.js    # 워크플로우 관련 유틸리티
```

## 모듈 분리 원칙

1. **config/**: 하드코딩된 데이터 (기본값, 설정 등)
2. **constants/**: 상수 정의 (타입, 라벨 등)
3. **modals/**: 모달 UI 및 이벤트 처리
4. **services/**: 비즈니스 로직 (저장, 로드, 실행)
5. **utils/**: 재사용 가능한 유틸리티 함수

## 사용 예시

```javascript
// workflow.js에서
import { AddNodeModal } from './modals/add-node-modal.js';
import { getDefaultDescription } from './config/node-defaults.js';
import { NODE_TYPES } from './constants/node-types.js';

export class WorkflowPage {
    constructor() {
        this.addNodeModal = new AddNodeModal(this);
    }
    
    showAddNodeModal() {
        this.addNodeModal.show();
    }
}
```


