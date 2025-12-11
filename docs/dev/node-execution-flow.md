# 노드 실행 흐름 및 데이터 전달

## 개요

워크플로우에서 노드를 순차적으로 실행할 때, 이전 노드의 실행 결과를 다음 노드로 전달하는 시스템입니다.

## 아키텍처

### 1. 클라이언트 측: 이전 노드 결과 저장 및 전달

`UI/src/pages/workflow/services/workflow-execution-service.js`에서 노드를 순차적으로 실행하면서 이전 노드의 결과를 저장하고 다음 노드 실행 시 전달합니다.

```javascript
// 이전 노드의 실행 결과를 저장 (다음 노드 실행 시 전달)
let previousNodeResult = null;

for (let i = 0; i < workflowData.nodes.length; i++) {
    // API 요청에 이전 노드 결과 포함
    const response = await fetch(`${apiBaseUrl}/api/execute-nodes`, {
        method: 'POST',
        body: JSON.stringify({
            nodes: [nodeData],
            execution_mode: 'sequential',
            total_nodes: totalNodesCount,
            current_node_index: i,
            previous_node_result: previousNodeResult  // 이전 노드 결과 전달
        })
    });

    const result = await response.json();
    const nodeResult = result.data?.results?.[0];

    // 이전 노드 결과 업데이트 (다음 노드 실행 시 전달)
    if (nodeResult) {
        previousNodeResult = {
            ...nodeResult,
            node_id: nodeData.id,
            node_name: nodeData.data?.title || nodeData.type || nodeData.id
        };
    }
}
```

### 2. 서버 측: 컨텍스트에 이전 노드 결과 추가

`server/api/action_router.py`에서 클라이언트로부터 전달된 이전 노드 결과를 컨텍스트에 추가합니다.

```python
# 클라이언트에서 전달된 이전 노드 결과가 있으면 컨텍스트에 추가
if request.previous_node_result:
    prev_result = request.previous_node_result
    prev_node_id = prev_result.get("node_id") or prev_result.get("_node_id") or "previous"
    prev_node_name = prev_result.get("node_name") or prev_result.get("_node_name") or "이전 노드"
    context.add_node_result(prev_node_id, prev_node_name, prev_result)
```

### 3. 조건 노드: 이전 노드 출력 주입

`server/services/condition_service.py`에서 조건 노드 실행 전에 이전 노드의 출력을 `previous_output` 파라미터에 주입합니다.

```python
@staticmethod
def prepare_condition_node_data(
    node_data: dict[str, Any], context: NodeExecutionContext | None
) -> dict[str, Any]:
    """조건 노드 실행 전 데이터를 준비합니다."""
    if not context:
        return node_data

    # 이전 노드의 출력을 파라미터에 추가
    previous_result = context.get_previous_node_result()
    if previous_result:
        # 이전 노드의 output 필드를 previous_output으로 추가
        node_data["previous_output"] = previous_result.get("output", previous_result)
    
    return node_data
```

## 데이터 흐름

### 1. 노드 실행 순서

```
시작 노드 → 대기 노드 → 조건 노드 → 종료 노드
```

### 2. 데이터 전달 예시

**대기 노드 실행:**
```json
{
  "action": "wait",
  "status": "completed",
  "output": {
    "wait_time": 1.0
  }
}
```

**조건 노드 실행 시:**
- 클라이언트에서 이전 노드 결과를 `previous_node_result`에 포함하여 전달
- 서버에서 컨텍스트에 추가
- 조건 노드 실행 전 `previous_output`에 주입:
  ```python
  {
    "previous_output": {
      "wait_time": 1.0
    },
    "condition_type": "equals",
    "field_path": "output.wait_time",
    "compare_value": "1.0"
  }
  ```

## 노드 실행 로그

### 로그 형식

노드 실행 시 다음과 같은 형식으로 로그가 기록됩니다:

```
[API] 노드 {현재순번}/{전체개수} 실행 시작 - ID: {node_id}, 타입: {node_type}, 이름: {node_name}
[API] 노드 {현재순번}/{전체개수} 실행 성공 - ID: {node_id}, 타입: {node_type}, 이름: {node_name}, 상태: {status}
[API] 노드 {현재순번}/{전체개수} 실행 실패 - ID: {node_id}, 타입: {node_type}, 이름: {node_name}, 에러: {error}
```

### 전체 노드 개수 계산

- 시작 노드와 종료 노드도 전체 개수에 포함
- 예: 시작 1개 + 실행 노드 2개 + 종료 1개 = 4개 → "노드 1/4 실행 시작"

## 비동기 로깅

노드 실행 로그는 비동기로 전송되어 노드 실행을 블로킹하지 않습니다.

```python
# 실행 시작 로그 전송 (비동기, fire-and-forget)
asyncio.create_task(
    log_client.send_log_async(
        execution_id=execution_id,
        script_id=script_id,
        node_id=node_id,
        node_type=self.action_name,
        node_name=node_name,
        status="running",
        started_at=started_at,
        parameters=log_parameters,
    )
)
```

이를 통해 로깅이 노드 실행 속도에 영향을 주지 않습니다.

## 관련 파일

- `UI/src/pages/workflow/services/workflow-execution-service.js`: 노드 실행 및 이전 노드 결과 전달
- `server/api/action_router.py`: API 엔드포인트 및 컨텍스트 관리
- `server/services/action_service.py`: 노드 실행 서비스
- `server/services/condition_service.py`: 조건 노드 전처리
- `server/services/node_execution_context.py`: 실행 컨텍스트 관리
- `server/models/action_models.py`: API 요청/응답 모델

