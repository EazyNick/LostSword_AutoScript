**최신 수정일자: 2025.12.00**

# Python 노드 생성 가이드

Python (서버)에서 커스텀 노드를 만드는 방법을 설명합니다.

## 빠른 시작

1. **노드 설정 추가**: `server/config/nodes_config.py`에 노드 정보 추가 (필수: `input_schema`, `output_schema` 포함)
2. **노드 클래스 생성**: `server/nodes/{카테고리}/{이름}.py` 파일 생성
3. **JavaScript 렌더링 파일 생성**: `UI/src/js/components/node/node-{이름}.js` 파일 생성

> **중요**: 
> - Python 노드도 클라이언트에서 렌더링하기 위해 JavaScript 파일이 필요합니다. 이 파일은 노드의 시각적 표현을 담당합니다.
> - JavaScript 파일은 **자동으로 로드**됩니다. `index.html`을 수정할 필요가 없습니다. `nodes_config.py`의 `script` 필드만 올바르게 설정하면 `NodeRegistry`가 자동으로 스크립트를 로드합니다.

## 1. 노드 설정 추가

`server/config/nodes_config.py`의 `NODES_CONFIG` 딕셔너리에 노드 정보를 추가하세요:

```python
NODES_CONFIG: dict[str, dict[str, Any]] = {
    # ... 기존 노드들 ...
    "my-node": {
        "label": "내 노드",
        "title": "내 노드",
        "description": "노드 설명",
        "script": "node-my-node.js",  # 클라이언트 JS 파일명
        "is_boundary": False,          # 경계 노드 여부
        "category": "action",          # 노드 카테고리: "action", "logic", "system" 등
        "parameters": {                # 사용자 설정 파라미터 (선택)
            "value": {
                "type": "string",
                "label": "값",
                "description": "설정할 값",
                "default": "",
                "required": True,
                "placeholder": "값을 입력하세요"
            }
        },
        "detail_types": {},            # 상세 노드 타입 정의 (선택)
        "input_schema": {              # 입력 스키마 (필수)
            "action": {"type": "string", "description": "이전 노드 타입"},
            "status": {"type": "string", "description": "이전 노드 실행 상태"},
            "output": {"type": "any", "description": "이전 노드 출력 데이터"}
        },
        "output_schema": {             # 출력 스키마 (필수)
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

### 필수 필드

- **`input_schema`**: 노드의 입력 형식을 정의합니다. 노드 설정 모달의 입력 미리보기에 사용됩니다.
- **`output_schema`**: 노드의 출력 형식을 정의합니다. 노드 설정 모달의 출력 미리보기에 사용됩니다.

### 파라미터 타입

- **string**: 텍스트 입력 필드
- **number**: 숫자 입력 필드 (min, max 옵션 가능)
- **boolean**: 체크박스
- **options**: 선택 옵션이 있는 경우 `options` 배열 추가

```python
"parameters": {
    "condition_type": {
        "type": "options",
        "label": "조건 타입",
        "description": "평가할 조건의 타입을 선택하세요.",
        "default": "equals",
        "required": True,
        "options": [
            {"value": "equals", "label": "같음 (=)"},
            {"value": "not_equals", "label": "다름 (!=)"}
        ]
    }
}
```

### 특수 파라미터

- **folder_path**: 폴더 선택 버튼이 자동으로 추가됩니다
- **file_path**: 파일 선택 버튼이 자동으로 추가됩니다

```python
"parameters": {
    "folder_path": {
        "type": "string",
        "label": "이미지 폴더 경로",
        "description": "이미지 파일이 있는 폴더를 선택하세요",
        "default": "",
        "required": True,
        "placeholder": "C:\\images\\touch"
    }
}
```

### 특수 속성

- **`requires_folder_path`**: `True`로 설정하면 폴더 경로가 필수임을 표시합니다 (예: `image-touch` 노드)

## 2. 노드 클래스 생성

노드 타입에 따라 적절한 디렉토리에 Python 파일을 생성하세요:

- **액션 노드**: `server/nodes/actionnodes/my_node.py`
- **조건 노드**: `server/nodes/conditionnodes/my_node.py`
- **대기 노드**: `server/nodes/waitnodes/my_node.py`
- **이미지 노드**: `server/nodes/imagenodes/my_node.py`
- **경계 노드**: `server/nodes/boundarynodes/my_node.py`

### 기본 템플릿

```python
# server/nodes/actionnodes/my_node.py
"""
내 노드
노드 설명을 작성하세요.
"""

from typing import Any

from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import create_failed_result, get_parameter


class MyNode(BaseNode):
    """내 노드 클래스"""

    @staticmethod
    @NodeExecutor("my-node")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        """
        노드 실행 로직

        Args:
            parameters: 노드 파라미터
                - value: 값 (기본값: "")

        Returns:
            실행 결과 딕셔너리
        """
        value = get_parameter(parameters, "value", default="")

        # 노드 실행 로직 작성
        # ...

        return {
            "action": "my-node",
            "status": "completed",
            "output": {"value": value}
        }
```

### 파라미터 추출

`get_parameter()` 함수를 사용하여 파라미터를 안전하게 추출합니다:

```python
from utils import get_parameter

# 필수 파라미터 (없으면 에러 발생)
value = get_parameter(parameters, "value")

# 기본값이 있는 파라미터
count = get_parameter(parameters, "count", default=1)

# 타입 변환
timeout = get_parameter(parameters, "timeout", default=30)
if timeout is not None:
    timeout = float(timeout)
```

### 반환 형식

노드는 항상 다음 형식의 딕셔너리를 반환해야 합니다:

```python
{
    "action": "my-node",           # 노드 타입
    "status": "completed",         # "completed" 또는 "failed"
    "output": {                    # 출력 데이터
        "result": "success",
        "data": {...}
    }
}
```

### 에러 처리

에러 발생 시 `create_failed_result()` 함수를 사용하세요:

```python
from utils import create_failed_result

# 에러 발생 시
if not some_condition:
    return create_failed_result(
        action="my-node",
        reason="error_type",
        message="에러 메시지",
        output={"error": "상세 정보"}
    )
```

실제 예시 (`server/nodes/actionnodes/click.py`):

```python
return {"action": "click", "status": "completed", "output": {"x": x, "y": y}}
```

## 3. JavaScript 렌더링 파일 생성

Python 노드도 클라이언트에서 렌더링하기 위해 JavaScript 파일이 필요합니다.

`UI/src/js/components/node/node-my-node.js` 파일을 생성하세요:

```javascript
// node-my-node.js
(function () {
    if (!window.NodeManager) {
        return;
    }

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
})();
```

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

## 5. 노드 등록

노드는 `@NodeExecutor` 데코레이터로 자동 등록됩니다. 별도의 등록 코드는 필요하지 않습니다.

서버를 재시작하면 새 노드가 자동으로 인식됩니다.

## 참고 파일

### Python (서버)
- `server/config/nodes_config.py`: 노드 설정 파일 (실제 예시)
- `server/nodes/actionnodes/click.py`: 클릭 노드 구현 예시
- `server/nodes/actionnodes/process_focus.py`: 프로세스 포커스 노드 구현 예시 (복잡한 로직)
- `server/nodes/base_node.py`: 기본 노드 클래스
- `server/nodes/node_executor_wrapper.py`: 노드 실행 래퍼 (자동 에러 처리, 로깅 등)
- `server/utils/__init__.py`: 유틸리티 함수 (`get_parameter`, `create_failed_result` 등)

### JavaScript (클라이언트)
- `UI/src/js/components/node/node-example.js`: 노드 생성 템플릿
- `UI/src/js/components/node/node-process-focus.js`: 프로세스 포커스 노드 렌더링 예시

## 주의사항

1. **노드 이름 일치**: 
   - `nodes_config.py`의 노드 타입 (예: `"my-node"`)
   - `@NodeExecutor` 데코레이터의 액션 이름 (예: `@NodeExecutor("my-node")`)
   - `registerNodeType`의 노드 타입 (예: `'my-node'`)
   - `script` 필드의 파일명 (예: `"node-my-node.js"`)
   - 이 네 가지가 모두 일치해야 합니다.

2. **파일명 규칙**: 
   - Python: 스네이크 케이스 (`my_node.py`)
   - JavaScript: 케밥 케이스 (`node-my-node.js`)
   - JavaScript 파일은 `UI/src/js/components/node/` 디렉토리에 위치해야 합니다.

3. **노드 카테고리**: 적절한 디렉토리에 노드를 생성하세요.

4. **스키마 정의**: `input_schema`와 `output_schema`는 필수입니다. 노드 설정 모달의 미리보기에 사용됩니다.

5. **서버 재시작**: 새 노드를 추가한 후 서버를 재시작하면 자동으로 인식됩니다.

6. **자동 로드**: 
   - `index.html`을 수정할 필요가 없습니다. `nodes_config.py`의 `script` 필드만 올바르게 설정하면 자동으로 로드됩니다.
   - JavaScript 파일만 수정한 경우 브라우저 새로고침만으로 반영됩니다 (자동 로드 시스템이 다시 로드함).
