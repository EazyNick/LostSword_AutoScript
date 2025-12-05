# 노드 추가 가이드

새로운 노드를 추가하려면 **JavaScript (UI)**와 **Python (FastAPI)** 양쪽 모두에 구현해야 합니다.

## 빠른 시작

1. **JavaScript (UI)**: `nodes.config.js`에 노드 정보 추가 → `node-{이름}.js` 파일 생성
2. **Python (FastAPI)**: `server/nodes/{카테고리}/{이름}.py` 파일 생성

## 1. JavaScript (UI) 설정

### 1.1 노드 설정 파일에 추가

`UI/src/pages/workflow/config/nodes.config.js`에 노드 정보를 추가하세요:

```javascript
export const NODES_CONFIG = {
    // ... 기존 노드들 ...
    'my-node': {
        label: '내 노드',
        title: '내 노드',
        description: '노드 설명',
        color: 'blue',
        script: 'node-my-node.js',  // 노드 스크립트 파일명
        isBoundary: false,          // 경계 노드 여부 (시작/종료 노드는 true)
        category: 'action'           // 노드 카테고리 (action, logic, system 등)
    }
};
```

### 1.2 노드 렌더링 파일 생성

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
                return `
                    <div class="node-input"></div>
                    <div class="node-content">
                        <div class="node-title">${this.escapeHtml(nodeData.title || '내 노드')}</div>
                        <div class="node-description">${this.escapeHtml(nodeData.description || '')}</div>
                    </div>
                    <div class="node-output"></div>
                    <div class="node-settings">⚙</div>
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

## 2. Python (FastAPI) 구현

### 2.1 노드 클래스 생성

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

### 2.2 노드 등록 확인

노드가 자동으로 등록되므로 별도의 등록 코드는 필요하지 않습니다. `@NodeExecutor` 데코레이터가 노드를 자동으로 등록합니다.

## 참고 파일

### JavaScript 예시
- `UI/src/js/components/node/node-action.js`: 기본 액션 노드
- `UI/src/js/components/node/node-example.js`: 노드 생성 템플릿
- `UI/src/pages/workflow/config/nodes.config.js`: 노드 설정 파일

### Python 예시
- `server/nodes/actionnodes/click.py`: 클릭 노드 구현 예시
- `server/nodes/base_node.py`: 기본 노드 클래스
- `server/nodes/node_executor_wrapper.py`: 노드 실행 래퍼 (자동 에러 처리, 로깅 등)

## 주의사항

1. **노드 이름 일치**: JavaScript의 노드 타입과 Python의 `@NodeExecutor` 액션 이름이 일치해야 합니다.
2. **파일명 규칙**: JavaScript는 `node-{이름}.js`, Python은 `{이름}.py` (스네이크 케이스)
3. **노드 카테고리**: 적절한 디렉토리에 노드를 생성하세요 (actionnodes, conditionnodes 등)

