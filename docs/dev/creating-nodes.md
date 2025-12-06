# 노드 추가 가이드

새로운 노드를 추가하려면 **Python (FastAPI)**에 먼저 노드 설정을 추가하고, 그 다음 **JavaScript (UI)**와 **Python (FastAPI)** 양쪽 모두에 구현해야 합니다.

## 빠른 시작

1. **Python (서버)**: `server/config/nodes_config.py`에 노드 정보 추가
2. **Python (FastAPI)**: `server/nodes/{카테고리}/{이름}.py` 파일 생성
3. **JavaScript (UI)**: `node-{이름}.js` 파일 생성

> **참고**: 노드 설정은 Python 서버에서 중앙 관리되며, 클라이언트는 `/api/config/nodes` API를 통해 자동으로 가져옵니다.

## 1. Python (서버) 노드 설정 추가

### 1.1 노드 설정 파일에 추가

`server/config/nodes_config.py`의 `NODES_CONFIG` 딕셔너리에 노드 정보를 추가하세요:

```python
NODES_CONFIG: dict[str, dict[str, Any]] = {
    # ... 기존 노드들 ...
    "my-node": {
        "label": "내 노드",
        "title": "내 노드",
        "description": "노드 설명",
        "script": "node-my-node.js",  # 노드 스크립트 파일명
        "is_boundary": False,          # 경계 노드 여부 (시작/종료 노드는 True)
        "category": "action",           # 노드 카테고리 (action, logic, system 등)
    }
}
```

**설정 필드 설명**:
- `label`: 노드의 표시 이름
- `title`: 노드의 제목 (기본값)
- `description`: 노드 설명
- `script`: 클라이언트에서 사용할 JavaScript 파일명 (`node-{이름}.js`)
- `is_boundary`: 경계 노드 여부 (`True`면 시작/종료 노드)
- `category`: 노드 카테고리 (`action`, `logic`, `system`, `image` 등)

**특수 설정**:
- `requires_folder_path`: `True`로 설정하면 노드 설정 모달에서 폴더 경로 입력 필드가 표시됩니다 (예: `image-touch` 노드)

## 2. JavaScript (UI) 구현

### 2.1 노드 렌더링 파일 생성

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
                    <div class="node-settings"></div>
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

> 💡 **팁**: `node-example.js` 파일을 참고하여 템플릿으로 사용할 수 있습니다.

## 3. Python (FastAPI) 구현

### 3.1 노드 클래스 생성

노드 타입에 따라 적절한 디렉토리에 Python 파일을 생성하세요:

- **액션 노드**: `server/nodes/actionnodes/my_node.py`
- **조건 노드**: `server/nodes/conditionnodes/my_node.py`
- **대기 노드**: `server/nodes/waitnodes/my_node.py`
- **이미지 노드**: `server/nodes/imagenodes/my_node.py`
- **경계 노드**: `server/nodes/boundarynodes/my_node.py`

```python
# server/nodes/actionnodes/my_node.py
"""
내 노드
노드 설명을 작성하세요.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter


class MyNode(BaseNode):
    """내 노드 클래스"""

    @staticmethod
    @NodeExecutor("my-node")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        노드 실행 로직

        Args:
            parameters: 노드 파라미터
                - value: 값 (기본값: 0)

        Returns:
            실행 결과 딕셔너리
        """
        value = get_parameter(parameters, "value", default=0)

        # 노드 실행 로직 작성
        # ...

        return {
            "action": "my-node",
            "status": "completed",
            "output": {"value": value}
        }
```

### 3.2 노드 등록 확인

노드가 자동으로 등록되므로 별도의 등록 코드는 필요하지 않습니다. `@NodeExecutor` 데코레이터가 노드를 자동으로 등록합니다.

## 참고 파일

### Python (서버) 예시
- `server/config/nodes_config.py`: 노드 설정 파일 (모든 노드 메타데이터 정의)
- `server/nodes/actionnodes/click.py`: 클릭 노드 구현 예시
- `server/nodes/base_node.py`: 기본 노드 클래스
- `server/nodes/node_executor_wrapper.py`: 노드 실행 래퍼 (자동 에러 처리, 로깅 등)

### JavaScript (UI) 예시
- `UI/src/js/components/node/node-action.js`: 기본 액션 노드
- `UI/src/js/components/node/node-example.js`: 노드 생성 템플릿

## 주의사항

1. **노드 이름 일치**: 
   - Python 서버의 `nodes_config.py`에 정의된 노드 타입
   - Python의 `@NodeExecutor` 데코레이터 액션 이름
   - JavaScript의 `registerNodeType` 노드 타입
   - 이 세 가지가 모두 일치해야 합니다.

2. **파일명 규칙**: 
   - JavaScript: `node-{이름}.js` (예: `node-my-node.js`)
   - Python: `{이름}.py` (스네이크 케이스, 예: `my_node.py`)

3. **노드 카테고리**: 적절한 디렉토리에 노드를 생성하세요 (actionnodes, conditionnodes 등)

4. **노드 설정 우선순위**: 
   - 노드 설정은 Python 서버(`server/config/nodes_config.py`)에서 중앙 관리됩니다.
   - 클라이언트는 `/api/config/nodes` API를 통해 자동으로 노드 설정을 가져옵니다.
   - 새 노드를 추가한 후 서버를 재시작하면 클라이언트에서 자동으로 새 노드를 사용할 수 있습니다.

