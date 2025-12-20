**최신 수정일자: 2025.12.00**

# JavaScript 노드 생성 가이드

JavaScript (클라이언트)에서 커스텀 노드를 만드는 방법을 설명합니다. JavaScript 노드는 서버 API를 호출하거나 클라이언트에서 직접 실행할 수 있습니다.

## 빠른 시작

1. **노드 설정 추가**: `server/config/nodes_config.py`에 노드 정보 추가 (서버 측, 필수: `input_schema`, `output_schema` 포함)
2. **노드 렌더링 파일 생성**: `UI/src/js/components/node/node-{이름}.js` 파일 생성

> **중요**: JavaScript 파일은 **자동으로 로드**됩니다. `index.html`을 수정할 필요가 없습니다. `nodes_config.py`의 `script` 필드만 올바르게 설정하면 `NodeRegistry`가 자동으로 스크립트를 로드합니다.

## 1. 노드 설정 추가 (서버 측)

먼저 서버 측에서 노드 설정을 추가해야 합니다. `server/config/nodes_config.py`에 노드 정보를 추가하세요:

```python
NODES_CONFIG: dict[str, dict[str, Any]] = {
    "my-node": {
        "label": "내 노드",
        "title": "내 노드",
        "description": "노드 설명",
        "script": "node-my-node.js",  # 이 파일명과 일치해야 함
        "is_boundary": False,
        "category": "action",
        "parameters": {  # 선택사항
            "value": {
                "type": "string",
                "label": "값",
                "description": "설정할 값",
                "default": "",
                "required": True
            }
        },
        "input_schema": {  # 필수
            "action": {"type": "string", "description": "이전 노드 타입"},
            "status": {"type": "string", "description": "이전 노드 실행 상태"},
            "output": {"type": "any", "description": "이전 노드 출력 데이터"}
        },
        "output_schema": {  # 필수
            "action": {"type": "string", "description": "노드 타입"},
            "status": {"type": "string", "description": "실행 상태"},
            "output": {
                "type": "object",
                "description": "출력 데이터",
                "properties": {
                    "value": {"type": "string", "description": "입력받은 값"},
                    "result": {"type": "string", "description": "처리 결과"}
                }
            }
        }
    }
}
```

> **참고**: JavaScript 노드도 서버 측 설정이 필요합니다. `input_schema`와 `output_schema`는 필수입니다.

## 2. 노드 렌더링 파일 생성

`UI/src/js/components/node/node-my-node.js` 파일을 생성하세요:

```javascript
// node-my-node.js
(function () {
    // NodeManager가 로드될 때까지 대기
    if (!window.NodeManager) {
        const checkAndRegister = () => {
            if (window.NodeManager && window.NodeManager.registerNodeType) {
                registerNode();
            } else {
                setTimeout(checkAndRegister, 50);
            }
        };
        checkAndRegister();
        return;
    }

    function registerNode() {
        window.NodeManager.registerNodeType('my-node', {
            /**
             * 노드 내용 생성
             * @param {Object} nodeData - 노드 데이터
             */
            renderContent(nodeData) {
                // 노드 아이콘은 node-icons.config.js에서 중앙 관리
                const NodeIcons = window.NodeIcons || {};
                const icon = NodeIcons.getIcon('my-node', nodeData) || NodeIcons.icons?.default || '⚙';
                
                return `
                    <div class="node-input"></div>
                    <div class="node-content">
                        <div class="node-icon-box">
                            <div class="node-icon">${icon}</div>
                        </div>
                        <div class="node-text-area">
                            <div class="node-title">${this.escapeHtml(nodeData.title || '내 노드')}</div>
                            <div class="node-description">${this.escapeHtml(nodeData.description || '')}</div>
                        </div>
                    </div>
                    <div class="node-output"></div>
                    <div class="node-settings" data-node-id="${nodeData.id}">⚙</div>
                `;
            }
        });

        console.log('[node-my-node] 노드 타입 등록 완료');
    }

    // 즉시 등록 시도
    if (window.NodeManager && window.NodeManager.registerNodeType) {
        registerNode();
    }
})();
```

### 실제 예시

`UI/src/js/components/node/node-process-focus.js`를 참고하세요:

```javascript
window.NodeManager.registerNodeType('process-focus', {
    renderContent(nodeData) {
        const icon = window.NodeIcons ? window.NodeIcons.getIcon('process-focus', nodeData) : '🖥️';
        const processName = nodeData.process_name || '프로세스 미선택';
        const windowTitle = nodeData.window_title || '';
        const displayText = windowTitle ? `${processName} - ${windowTitle}` : processName;

        return `
            <div class="node-input"></div>
            <div class="node-content">
                <div class="node-icon-box">
                    <div class="node-icon">${icon}</div>
                </div>
                <div class="node-text-area">
                    <div class="node-title">${this.escapeHtml(nodeData.title || '프로세스 포커스')}</div>
                    <div class="node-description">${this.escapeHtml(displayText)}</div>
                </div>
            </div>
            <div class="node-output"></div>
            <div class="node-settings" data-node-id="${nodeData.id}">⚙</div>
        `;
    }
});
```

## 3. 노드 실행 구현 (선택)

노드가 실제로 실행되어야 하는 경우, 두 가지 방법이 있습니다:

### 방법 1: 서버 API 호출

서버에 노드 실행을 요청하는 방법입니다. 서버 측에 Python 노드 클래스가 있어야 합니다.

```javascript
// node-my-node.js
window.NodeManager.registerNodeType('my-node', {
    renderContent(nodeData) {
        // ... 렌더링 코드 ...
    },
    
    /**
     * 노드 실행 (서버 API 호출)
     * @param {Object} nodeData - 노드 데이터
     * @returns {Promise<Object>} 실행 결과
     */
    async execute(nodeData) {
        const apiBaseUrl = window.API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl}/api/execute-nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nodes: [{
                    id: nodeData.id,
                    type: 'my-node',
                    data: nodeData
                }],
                execution_mode: 'sequential'
            })
        });
        
        const result = await response.json();
        return result.data?.results?.[0] || result;
    }
});
```

### 방법 2: 클라이언트에서 직접 실행

서버 없이 클라이언트에서 직접 실행하는 방법입니다.

```javascript
// node-my-node.js
window.NodeManager.registerNodeType('my-node', {
    renderContent(nodeData) {
        // ... 렌더링 코드 ...
    },
    
    /**
     * 노드 실행 (클라이언트 직접 실행)
     * @param {Object} nodeData - 노드 데이터
     * @returns {Promise<Object>} 실행 결과
     */
    async execute(nodeData) {
        const value = nodeData.value || '';
        
        // 클라이언트에서 직접 실행 로직
        // 예: DOM 조작, 브라우저 API 호출 등
        const result = await this.performClientAction(value);
        
        return {
            action: 'my-node',
            status: 'completed',
            output: {
                value: value,
                result: result
            }
        };
    },
    
    /**
     * 클라이언트 액션 수행
     */
    async performClientAction(value) {
        // 예: 알림 표시
        if (window.Notification && Notification.permission === 'granted') {
            new Notification('내 노드 실행', { body: value });
        }
        
        // 예: 로컬 스토리지에 저장
        localStorage.setItem('my-node-value', value);
        
        return 'success';
    }
});
```

> **참고**: 대부분의 노드는 서버에서 실행되므로, JavaScript 노드에서 `execute` 메서드를 구현하는 경우는 드뭅니다. 일반적으로는 `renderContent`만 구현하면 됩니다.

## 4. 자동 스크립트 로드 (Import)

**중요**: JavaScript 파일은 **자동으로 로드**됩니다. `index.html`을 수정할 필요가 없습니다.

### 자동 로드 동작 원리

1. **서버 시작 시**: 서버가 `nodes_config.py`의 모든 노드 설정을 `/api/config/nodes` API로 제공합니다.
2. **클라이언트 로드 시**: `WorkflowPage`가 초기화되면 `NodeRegistry`가 자동으로:
   - 서버에서 노드 설정 목록을 가져옵니다
   - 각 노드의 `script` 필드를 확인합니다
   - 해당 JavaScript 파일을 동적으로 로드합니다 (`/static/js/components/node/{script}`)
3. **노드 등록**: JavaScript 파일이 로드되면 `registerNodeType`이 자동으로 호출되어 노드가 등록됩니다.

### 필요한 작업

- ✅ `nodes_config.py`에 `script` 필드 설정 (예: `"script": "node-my-node.js"`)
- ✅ `UI/src/js/components/node/node-my-node.js` 파일 생성
- ❌ `index.html` 수정 **불필요** (자동으로 로드됨)

### 동적 로드 확인

브라우저 개발자 도구 콘솔에서 다음 메시지를 확인할 수 있습니다:

```
[NodeRegistry] 서버에서 노드 설정 로드 완료: X개
[NodeRegistry] 노드 스크립트 로드 완료: node-my-node.js
[node-my-node] 노드 타입 등록 완료
```

## 참고 파일

- `UI/src/js/components/node/node-example.js`: 노드 생성 템플릿
- `UI/src/js/components/node/node-process-focus.js`: 프로세스 포커스 노드 구현 예시

## 주의사항

1. **노드 이름 일치**: 
   - `nodes_config.py`의 노드 타입 (예: `"my-node"`)
   - `registerNodeType`의 노드 타입 (예: `'my-node'`)
   - `script` 필드의 파일명 (예: `"node-my-node.js"`)
   - 이 세 가지가 모두 일치해야 합니다.

2. **파일명 규칙**: 
   - JavaScript: `node-{이름}.js` (예: `node-my-node.js`)
   - 파일은 `UI/src/js/components/node/` 디렉토리에 위치해야 합니다.

3. **NodeManager 로드 대기**: 
   - `NodeManager`가 로드되기 전에 스크립트가 실행될 수 있으므로, 로드 대기 로직을 포함하세요.
   - 자동 로드 시스템이 `NodeManager` 로드를 기다린 후 스크립트를 로드하므로, 일반적으로 문제가 없습니다.

4. **스키마 정의**: 
   - `input_schema`와 `output_schema`는 필수입니다. 노드 설정 모달의 미리보기에 사용됩니다.

5. **서버 재시작**: 
   - 서버 측 설정을 변경한 경우 서버를 재시작해야 합니다.
   - JavaScript 파일만 수정한 경우 브라우저 새로고침만으로 반영됩니다 (자동 로드 시스템이 다시 로드함).

6. **자동 로드**: 
   - `index.html`을 수정할 필요가 없습니다. `nodes_config.py`의 `script` 필드만 올바르게 설정하면 자동으로 로드됩니다.

## 실행 방식 선택 가이드

### 서버 API 호출을 사용하는 경우
- 서버 측 리소스가 필요한 경우 (파일 시스템, 데이터베이스 등)
- 보안이 중요한 작업
- 복잡한 비즈니스 로직

### 클라이언트 직접 실행을 사용하는 경우
- 브라우저 API만으로 충분한 경우 (알림, 로컬 스토리지 등)
- 서버 부하를 줄이고 싶은 경우
- 빠른 응답이 필요한 경우

> **참고**: 대부분의 노드는 Python으로 구현되며, JavaScript 노드는 주로 렌더링만 담당합니다. 실제 실행은 서버에서 이루어집니다.
