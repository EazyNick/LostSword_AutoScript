# 노드 추가 가이드

이 문서는 새로운 노드 타입을 추가하는 방법을 설명합니다.

## 빠른 시작

새로운 노드를 추가하려면 다음 두 단계만 수행하면 됩니다:

1. **설정 파일에 노드 정보 추가** (`nodes.config.js`)
2. **노드 기능 구현 파일 생성** (`node-{노드이름}.js`)

## 1단계: 설정 파일에 노드 정보 추가

`UI/src/pages/workflow/config/nodes.config.js` 파일을 열고 `NODES_CONFIG` 객체에 새 노드 정보를 추가하세요.

### 예시: "알림 노드" 추가하기

```javascript
export const NODES_CONFIG = {
    // ... 기존 노드들 ...
    
    'notification': {
        label: '알림 노드',           // 노드 추가 모달에 표시될 이름
        title: '알림',                // 노드의 기본 제목
        description: '알림 메시지를 표시하는 노드입니다.',  // 노드 설명
        color: 'blue',                // 노드 색상 (blue, orange, green, purple, gray)
        script: 'node-notification.js',  // 노드 기능 구현 파일명
        isBoundary: false,            // 시작/종료 노드 여부 (true면 자동 생성됨)
        category: 'action'            // 노드 카테고리 (선택사항)
    }
};
```

### 설정 옵션 설명

- **label**: 노드 추가 모달의 드롭다운에 표시될 이름
- **title**: 노드의 기본 제목 (사용자가 변경 가능)
- **description**: 노드에 대한 설명
- **color**: 노드의 기본 색상
- **script**: 노드 기능을 구현한 JavaScript 파일명 (반드시 `node-{이름}.js` 형식)
- **isBoundary**: `true`로 설정하면 시작/종료 노드처럼 자동 생성되는 노드
- **category**: 노드 카테고리 (선택사항, 'action', 'logic', 'system' 등)
- **requiresFolderPath**: `true`로 설정하면 이미지 터치 노드처럼 폴더 경로 입력이 필요 (선택사항)

## 2단계: 노드 기능 구현 파일 생성

`UI/src/js/components/node/` 디렉토리에 노드 기능을 구현한 JavaScript 파일을 생성하세요.

파일명은 설정 파일의 `script` 값과 일치해야 합니다 (예: `node-notification.js`).

### 기본 노드 구현 예시

```javascript
// node-notification.js
// 알림 노드 정의

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('notification', {
        /**
         * 알림 노드 내용 생성
         * @param {Object} nodeData - 노드 데이터
         */
        renderContent(nodeData) {
            const message = nodeData.message || '알림 메시지 없음';
            
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-title">${this.escapeHtml(nodeData.title || '알림')}</div>
                    <div class="node-description">${this.escapeHtml(message)}</div>
                </div>
                <div class="node-output"></div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
```

### 조건 노드 구현 예시 (True/False 출력)

```javascript
// node-check.js
// 체크 노드 정의 (조건 노드처럼 True/False 출력)

(function () {
    if (!window.NodeManager) return;

    window.NodeManager.registerNodeType('check', {
        renderContent(nodeData) {
            return `
                <div class="node-input"></div>
                <div class="node-content">
                    <div class="node-icon">✓</div>
                    <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
                </div>
                <div class="node-outputs">
                    <div class="node-output true-output">
                        <div class="output-dot true-dot">
                            <span class="output-symbol">T</span>
                        </div>
                        <span class="output-label">True</span>
                    </div>
                    <div class="node-output false-output">
                        <div class="output-dot false-dot">
                            <span class="output-symbol">F</span>
                        </div>
                        <span class="output-label">False</span>
                    </div>
                </div>
                <div class="node-settings">⚙</div>
            `;
        }
    });
})();
```

### renderContent 함수

`renderContent` 함수는 노드의 HTML 내용을 생성하는 함수입니다. 이 함수는 `nodeData` 객체를 받아서 HTML 문자열을 반환해야 합니다.

**매개변수:**
- `nodeData`: 노드 데이터 객체
  - `nodeData.id`: 노드 ID
  - `nodeData.type`: 노드 타입
  - `nodeData.title`: 노드 제목
  - `nodeData.color`: 노드 색상
  - 기타 사용자 정의 속성들

**반환값:**
- HTML 문자열 (노드의 내부 구조)

**사용 가능한 메서드:**
- `this.escapeHtml(text)`: HTML 이스케이프 (XSS 방지)

## 완료!

이제 워크플로우 편집 페이지를 새로고침하면 새로운 노드가 노드 추가 모달에 나타납니다.

## 고급 기능

### 특수 설정이 필요한 노드

이미지 터치 노드처럼 추가 설정(폴더 경로 등)이 필요한 경우:

1. 설정 파일에 `requiresFolderPath: true` 추가
2. `add-node-modal.js`의 `updateCustomSettings` 함수를 참고하여 필요한 UI 추가

### 노드 실행 로직

**중요**: 노드의 실행 로직은 **FastAPI API에 구현**해야 합니다.

1. **API 엔드포인트 추가**: `server/api/` 디렉토리에 새로운 라우터를 추가하거나 기존 라우터에 엔드포인트를 추가합니다.
   - 예: `server/api/action_router.py`에 새로운 액션 타입 처리 로직 추가
   
2. **서비스 로직 구현**: `server/services/action_service.py`에 노드 실행 로직을 구현합니다.
   - `process_node()` 또는 `process_game_action()` 메서드에 새로운 노드 타입 처리 추가
   
3. **워크플로우 엔진 연동**: `server/automation/workflow_engine.py`에서 노드 실행 시 해당 API를 호출하도록 설정합니다.

**예시 구조:**
```
새 노드 타입 추가 시:
1. UI: node-{이름}.js (노드 렌더링)
2. API: server/api/{router}.py (FastAPI 엔드포인트)
3. Service: server/services/{service}.py (비즈니스 로직)
4. Engine: server/automation/workflow_engine.py (실행 엔진)
```

## 문제 해결

### 노드가 모달에 나타나지 않는 경우

1. 설정 파일의 문법 오류 확인
2. 브라우저 콘솔에서 오류 메시지 확인
3. 노드 스크립트 파일이 올바른 경로에 있는지 확인

### 노드 스크립트 로드 실패

- 스크립트 파일이 `UI/src/js/components/node/` 디렉토리에 있는지 확인
- 파일명이 설정 파일의 `script` 값과 정확히 일치하는지 확인
- 브라우저 콘솔에서 404 오류 확인

## 예시 노드 파일

완전한 예시는 다음 파일들을 참고하세요:

- `node-action.js`: 기본 액션 노드
- `node-condition.js`: 조건 노드 (True/False 출력)
- `node-image-touch.js`: 특수 설정이 필요한 노드

