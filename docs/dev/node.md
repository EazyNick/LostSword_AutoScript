# 노드 추가 가이드

## 빠른 시작

1. **UI 설정**: `UI/src/pages/workflow/config/nodes.config.js`에 노드 정보 추가
2. **UI 렌더링**: `UI/src/js/components/node/node-{이름}.js` 생성
3. **백엔드 실행**: `server/nodes/actionnodes/{이름}.py` 생성

## 1. UI 설정 추가

```javascript
// nodes.config.js
'my-node': {
    label: '내 노드',
    title: '내 노드',
    color: 'blue',
    script: 'node-my-node.js'
}
```

## 2. UI 렌더링 파일 생성

```javascript
// node-my-node.js
window.NodeManager.registerNodeType('my-node', {
    renderContent(nodeData) {
        return `
            <div class="node-input"></div>
            <div class="node-content">
                <div class="node-title">${this.escapeHtml(nodeData.title)}</div>
            </div>
            <div class="node-output"></div>
            <div class="node-settings">⚙</div>
        `;
    }
});
```

## 3. 백엔드 노드 클래스 생성

```python
# server/nodes/actionnodes/my_node.py
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import node_executor
from utils import get_parameter

class MyNode(BaseNode):
    @staticmethod
    @node_executor("my-node")
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        value = get_parameter(parameters, "value", default=0)
        return {
            "action": "my-node",
            "status": "completed",
            "output": {"value": value}
        }
```

## 참고 파일

- `node-action.js`: 기본 액션 노드
- `server/nodes/actionnodes/click.py`: 클릭 노드 예시

