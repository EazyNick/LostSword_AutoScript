# 노드 출력 데이터 표준 형식

모든 노드는 n8n 스타일의 표준 출력 형식을 따라야 합니다. 이를 통해 프론트엔드에서 이전 노드의 출력 변수들을 일관되게 표시하고 사용자가 선택할 수 있습니다.

## 표준 출력 형식

모든 노드의 `execute` 메서드는 다음 형식의 딕셔너리를 반환해야 합니다:

```python
{
    "action": str,           # 노드 타입 (예: "click", "http-request")
    "status": str,           # "completed" 또는 "failed"
    "output": dict[str, Any] # 실제 출력 데이터 (키-값 쌍으로 구성)
}
```

### 성공 시

```python
{
    "action": "click",
    "status": "completed",
    "output": {
        "x": 100,
        "y": 200,
        "success": True
    }
}
```

### 실패 시

```python
{
    "action": "click",
    "status": "failed",
    "output": {
        "success": False,
        "reason": "element_not_found"
    },
    "error": {
        "reason": "element_not_found",
        "message": "요소를 찾을 수 없습니다"
    }
}
```

## 핵심 규칙

### 1. `output` 필드는 반드시 dict 형식이어야 합니다

✅ **올바른 예시:**
```python
# 키-값 쌍으로 구성
return {
    "action": "click",
    "status": "completed",
    "output": {
        "x": 100,
        "y": 200
    }
}

# 단일 값도 dict로 래핑
return {
    "action": "get-text",
    "status": "completed",
    "output": {
        "text": "Hello World"
    }
}
```

❌ **잘못된 예시:**
```python
# output이 dict가 아님
return {
    "action": "get-text",
    "status": "completed",
    "output": "Hello World"  # ❌ dict가 아님
}

# output이 None
return {
    "action": "click",
    "status": "completed",
    "output": None  # ❌ None이면 빈 dict로 변환됨
}
```

### 2. 각 키는 프론트엔드에서 변수로 표시됩니다

`output` 딕셔너리의 각 키는 n8n처럼 태그 형태로 표시되어 사용자가 선택할 수 있습니다.

예를 들어, `output: {"title": "...", "link": "...", "author": "..."}` 형식이면:
- 프론트엔드에서 `title`, `link`, `author` 변수가 태그로 표시됨
- 사용자가 다음 노드의 입력에서 이 변수들을 선택할 수 있음

### 3. `normalize_result` 함수가 자동으로 변환합니다

`@NodeExecutor` 데코레이터가 자동으로 `normalize_result`를 호출하여:
- `output`이 dict가 아니면 `{"value": output}` 형식으로 변환
- `output`이 None이면 빈 dict `{}`로 변환
- 필수 필드(`action`, `status`, `output`)가 없으면 자동 추가
- **표준 형식이 아닌 dict는 자동으로 `output` 필드로 래핑**

따라서 노드 개발자는 다음 중 하나만 반환하면 됩니다:

```python
# 방법 1: 표준 형식으로 반환 (권장)
return {
    "action": "click",
    "status": "completed",
    "output": {"x": 100, "y": 200}
}

# 방법 2: output만 반환 (action, status는 자동 추가됨)
return {"output": {"x": 100, "y": 200}}

# 방법 3: 단순 dict 반환 (전체가 output으로 래핑됨)
return {"x": 100, "y": 200}
# → {"action": "click", "status": "completed", "output": {"x": 100, "y": 200}}

# 방법 4: 단순 값 반환 ({"value": ...}로 자동 변환됨)
return "Hello World"
# → {"action": "click", "status": "completed", "output": {"value": "Hello World"}}
```

#### `normalize_result` 변환 규칙 상세 예시

**규칙 3: dict이지만 표준 형식이 아닌 경우**

표준 형식이 아니면 result의 내용을 `output` 필드로 래핑합니다:

```python
# 예시 1: output 필드가 없는 경우
입력: {"x": 100, "y": 200}
출력: {
    "action": "click",
    "status": "completed",
    "output": {"x": 100, "y": 200}  # 전체가 output으로 래핑됨
}

# 예시 2: output 필드가 있지만 dict가 아닌 경우
입력: {"output": "string_value"}
출력: {
    "action": "click",
    "status": "completed",
    "output": {"value": "string_value"}  # dict가 아니므로 {"value": ...}로 변환
}

# 예시 3: output 필드가 있고 dict이지만 action이나 status가 없는 경우
입력: {"output": {"x": 100, "y": 200}}
출력: {
    "action": "click",  # 자동 추가
    "status": "completed",  # 자동 추가
    "output": {"x": 100, "y": 200}  # 그대로 사용
}

# 예시 4: 표준 필드와 데이터가 섞여 있는 경우
입력: {"x": 100, "y": 200, "action": "custom", "message": "test"}
출력: {
    "action": "custom",  # 입력의 action 사용
    "status": "completed",  # 자동 추가
    "output": {"x": 100, "y": 200}  # 표준 필드(action, status, output, error, message, meta) 제외
}
```

## 노드 구현 예시

### 예시 1: 클릭 노드

```python
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter

class ClickNode(BaseNode):
    @staticmethod
    @NodeExecutor("click")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        x = get_parameter(parameters, "x", default=0)
        y = get_parameter(parameters, "y", default=0)
        
        # output을 dict로 반환 (각 키가 변수로 표시됨)
        return {
            "action": "click",
            "status": "completed",
            "output": {
                "x": x,
                "y": y,
                "clicked": True
            }
        }
```

### 예시 2: HTTP 요청 노드

```python
class HttpRequestNode(BaseNode):
    @staticmethod
    @NodeExecutor("http-request")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        url = get_parameter(parameters, "url")
        method = get_parameter(parameters, "method", default="GET")
        
        # HTTP 요청 실행...
        response_data = await make_request(url, method)
        
        # 응답 데이터를 키-값 쌍으로 구성
        return {
            "action": "http-request",
            "status": "completed",
            "output": {
                "status_code": response_data.status_code,
                "body": response_data.body,
                "headers": response_data.headers,
                "url": url
            }
        }
```

### 예시 3: RSS 피드 노드

```python
class RssFeedNode(BaseNode):
    @staticmethod
    @NodeExecutor("rss-feed")
    async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
        feed_url = get_parameter(parameters, "url")
        
        # RSS 피드 파싱...
        items = await parse_rss_feed(feed_url)
        
        # 첫 번째 아이템의 데이터를 키-값 쌍으로 반환
        if items:
            first_item = items[0]
            return {
                "action": "rss-feed",
                "status": "completed",
                "output": {
                    "title": first_item.title,
                    "link": first_item.link,
                    "pubDate": first_item.pub_date,
                    "author": first_item.author,
                    "id": first_item.id,
                    "isoDate": first_item.iso_date
                }
            }
        else:
            return {
                "action": "rss-feed",
                "status": "completed",
                "output": {}
            }
```

## 프론트엔드 연동

프론트엔드에서는 이전 노드들의 `output` 필드를 파싱하여:

1. **변수 목록 표시**: 각 키를 태그 형태로 표시
2. **변수 선택**: 사용자가 다음 노드의 입력에서 이 변수들을 선택
3. **값 미리보기**: 선택한 변수의 실제 값을 표시

예를 들어, 이전 노드가 다음을 반환했다면:
```json
{
    "action": "rss-feed",
    "status": "completed",
    "output": {
        "title": "나노바나나 무료 연결법 공개!",
        "link": "https://www.youtube.com/watch?v=...",
        "pubDate": "2025-09-06T03:00:56.000Z",
        "author": "시민개발자 구씨",
        "id": "yt:video:...",
        "isoDate": "2025-09-06T03:00:56.000Z"
    }
}
```

프론트엔드에서는 `title`, `link`, `pubDate`, `author`, `id`, `isoDate` 6개의 변수를 태그로 표시하고, 사용자가 다음 노드의 입력에서 이 중 하나를 선택할 수 있습니다.

## 마이그레이션 가이드

기존 노드가 표준 형식을 따르지 않는다면:

1. `output` 필드가 dict가 아닌 경우: `{"value": output}` 형식으로 변환됨 (자동)
2. `output` 필드가 None인 경우: 빈 dict `{}`로 변환됨 (자동)
3. 수동 수정이 필요한 경우: `output`을 명시적으로 dict로 구성

## 참고

- `server/utils/result_formatter.py`: 표준화 함수 구현
- `server/nodes/node_executor_wrapper.py`: 자동 정규화 로직
- `docs/dev/ui-ux/input-output-ux.md`: 전체 UX 가이드
