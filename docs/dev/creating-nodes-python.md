# Python 노드 생성 가이드

Python (서버)에서 커스텀 노드를 만드는 방법을 설명합니다.

## 빠른 시작

1. **노드 설정 추가**: `server/config/nodes_config.py`에 노드 정보 추가
2. **노드 클래스 생성**: `server/nodes/{카테고리}/{이름}.py` 파일 생성
3. **JavaScript 렌더링 파일 생성**: `UI/src/js/components/node/node-{이름}.js` 파일 생성 (서버 API 요청용)
4. **예시 출력 추가** (선택): `UI/src/pages/workflow/config/node-preview-outputs.js`에 예시 출력 함수 추가

> **중요**: Python 노드도 클라이언트에서 렌더링하기 위해 JavaScript 파일이 필요합니다. 이 파일은 서버 API로 노드 실행을 요청하는 역할을 합니다.

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
        "category": "action",           # 노드 카테고리
        "parameters": {                 # 사용자 설정 파라미터 (선택)
            "value": {
                "type": "string",
                "label": "값",
                "description": "설정할 값",
                "default": "",
                "required": True,
                "placeholder": "값을 입력하세요"
            }
        }
    }
}
```

### 파라미터 타입

- **string**: 텍스트 입력 필드
- **number**: 숫자 입력 필드 (min, max 옵션 가능)
- **boolean**: 체크박스
- **options**: 선택 옵션이 있는 경우 `options: ["옵션1", "옵션2"]` 추가

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

에러 발생 시:

```python
from utils import create_failed_result

return create_failed_result(
    action="my-node",
    reason="error_type",
    message="에러 메시지",
    output={"error": "상세 정보"}
)
```

## 3. 노드 등록

노드는 `@NodeExecutor` 데코레이터로 자동 등록됩니다. 별도의 등록 코드는 필요하지 않습니다.

## 4. 예시 출력 추가 (선택)

노드 설정 모달의 출력 미리보기에 표시될 예시 출력을 정의하려면 `UI/src/pages/workflow/config/node-preview-outputs.js`에 함수를 추가하세요:

```javascript
// node-preview-outputs.js

export function generatePreviewOutput(nodeType, nodeData) {
    switch (nodeType) {
        // ... 기존 노드들 ...
        
        case 'my-node':
            return generateMyNodeOutput(nodeData);
        
        default:
            return generateDefaultOutput(nodeType);
    }
}

function generateMyNodeOutput(nodeData) {
    const value = nodeData?.value || '기본값';
    return JSON.stringify({
        action: "my-node",
        status: "completed",
        output: {
            value: value,
            result: "성공"
        }
    }, null, 2);
}
```

> **참고**: 대부분의 노드는 예시 출력을 사용하며, `wait`, `start`, `end` 노드만 실제 실행 결과를 표시합니다.

## 참고 파일

### Python (서버)
- `server/config/nodes_config.py`: 노드 설정 파일
- `server/nodes/actionnodes/click.py`: 클릭 노드 구현 예시
- `server/nodes/base_node.py`: 기본 노드 클래스
- `server/nodes/node_executor_wrapper.py`: 노드 실행 래퍼 (자동 에러 처리, 로깅 등)
- `server/utils/parameter_utils.py`: 파라미터 추출 유틸리티

### JavaScript (클라이언트)
- `UI/src/js/components/node/node-example.js`: 노드 생성 템플릿
- `UI/src/js/components/node/node-click.js`: 클릭 노드 구현 예시

## 주의사항

1. **노드 이름 일치**: 
   - `nodes_config.py`의 노드 타입
   - `@NodeExecutor` 데코레이터의 액션 이름
   - 이 두 가지가 일치해야 합니다.

2. **파일명 규칙**: 
   - Python: 스네이크 케이스 (`my_node.py`)

3. **노드 카테고리**: 적절한 디렉토리에 노드를 생성하세요.

4. **서버 재시작**: 새 노드를 추가한 후 서버를 재시작하면 자동으로 인식됩니다.

