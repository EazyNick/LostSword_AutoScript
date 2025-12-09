# 웹훅 노드 구현 가이드

## 개요

외부 시스템에서 HTTP 요청으로 워크플로우를 트리거하는 노드입니다.

## 웹훅 URL 생성

### 로컬 개발
```
http://{API_HOST}:{API_PORT}/api/webhook/{webhook_id}
```

### 프로덕션 (HTTPS)

**ngrok (개발/테스트)**
```bash
ngrok http {API_PORT}
# https://abc123.ngrok.io/api/webhook/{webhook_id}
```

**역방향 프록시 (프로덕션)**
```
https://yourdomain.com/api/webhook/{webhook_id}
```

## 구현 방법

### 1. 웹훅 엔드포인트 생성

```python
# server/api/webhook_router.py
from fastapi import APIRouter, Request
from api.router_wrapper import api_handler

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/{webhook_id}")
@api_handler
async def receive_webhook(webhook_id: str, request: Request):
    # 웹훅 수신 및 워크플로우 트리거
    pass
```

### 2. 웹훅 노드 클래스 생성

```python
# server/nodes/actionnodes/webhook.py
from nodes.base_node import BaseNode
from nodes.node_executor_wrapper import NodeExecutor
from utils import get_parameter
import uuid

class WebhookNode(BaseNode):
    @staticmethod
    @NodeExecutor("webhook")
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        webhook_id = get_parameter(parameters, "webhook_id") or str(uuid.uuid4())
        # 웹훅 등록 및 URL 반환
        return {"action": "webhook", "status": "completed", "output": {"webhook_id": webhook_id}}
```

### 3. 클라이언트 UI

```javascript
// 웹훅 URL 표시 및 복사 기능
// node-settings-modal.js에 추가
```

## 보안

- **시크릿 사용**: `X-Webhook-Secret` 헤더로 인증
- **HTTPS**: 프로덕션 환경 필수
- **Rate Limiting**: 요청 제한 설정

## n8n의 웹훅 구현 방식 참고

n8n은 오픈소스 워크플로우 자동화 도구로, 웹훅 노드를 잘 구현한 대표적인 예시입니다. n8n의 구현 방식을 참고하면 좋은 아이디어를 얻을 수 있습니다.

### n8n 웹훅의 주요 특징

#### 1. 웹훅 URL 구조

n8n은 다음과 같은 형식의 웹훅 URL을 생성합니다:

```
https://your-n8n-instance.com/webhook/{workflow_id}/{node_id}
```

또는 더 간단한 형식:

```
https://your-n8n-instance.com/webhook/{unique_path}
```

**특징:**
- 각 웹훅 노드마다 고유한 경로 생성
- 워크플로우 ID와 노드 ID를 조합하여 고유성 보장
- 사용자가 커스텀 경로를 설정할 수 있음

#### 2. 웹훅 수신 방식

n8n은 두 가지 웹훅 모드를 지원합니다:

**Production 모드:**
- 웹훅이 활성화되면 즉시 요청을 받을 수 있음
- 워크플로우가 실행 중이어야 함
- 지속적으로 대기 상태 유지

**Test 모도:**
- 웹훅 URL을 생성하고 일정 시간 동안만 활성화
- 테스트 요청을 받은 후 자동으로 비활성화
- 개발/테스트에 유용

#### 3. 인증 방식

n8n은 여러 인증 방식을 지원합니다:

**1. Header Auth (가장 일반적)**
```http
POST /webhook/{path}
X-n8n-webhook-token: your-secret-token
```

**2. Basic Auth**
```http
POST /webhook/{path}
Authorization: Basic base64(username:password)
```

**3. Query Parameter**
```
https://your-n8n-instance.com/webhook/{path}?token=your-secret-token
```

**4. HMAC Signature (고급)**
- 요청 본문을 HMAC으로 서명하여 검증
- GitHub, Stripe 등에서 사용하는 방식

#### 4. 웹훅 데이터 처리

n8n은 웹훅으로 받은 데이터를 다음과 같이 처리합니다:

```javascript
// n8n의 웹훅 노드 출력 데이터 구조
{
  "headers": {
    "content-type": "application/json",
    "x-custom-header": "value"
  },
  "query": {
    "param1": "value1"
  },
  "body": {
    // 요청 본문 데이터
  },
  "params": {
    // 경로 파라미터
  }
}
```

#### 5. 응답 처리

n8n은 웹훅 요청에 대한 응답을 커스터마이징할 수 있습니다:

- **즉시 응답**: 웹훅 노드에서 바로 응답 반환
- **지연 응답**: 워크플로우 완료 후 응답 (Respond to Webhook 노드 사용)
- **응답 코드/본문 커스터마이징**: HTTP 상태 코드와 본문 설정 가능

#### 6. 웹훅 활성화/비활성화

n8n의 웹훅은 다음과 같이 관리됩니다:

- 워크플로우가 활성화되면 웹훅도 자동 활성화
- 워크플로우가 비활성화되면 웹훅도 자동 비활성화
- 웹훅 URL은 워크플로우가 활성화된 동안만 유효

### n8n 방식의 장점

1. **간단한 URL 구조**: 워크플로우 ID와 노드 ID만으로 고유 URL 생성
2. **자동 활성화/비활성화**: 워크플로우 상태와 연동
3. **유연한 인증**: 다양한 인증 방식 지원
4. **테스트 모드**: 개발 중 테스트 용이

### 우리 프로젝트에 적용할 수 있는 아이디어

#### 1. 웹훅 URL 구조

```
http://{API_HOST}:{API_PORT}/api/webhook/{script_id}/{node_id}
```

또는 더 간단하게:

```
http://{API_HOST}:{API_PORT}/api/webhook/{webhook_id}
```

- `webhook_id`: UUID 또는 사용자 정의 경로

#### 2. 웹훅 활성화 상태 관리

```python
# 워크플로우(스크립트)가 활성화된 경우에만 웹훅 수신
# DB에 웹훅 활성화 상태 저장
CREATE TABLE webhooks (
    webhook_id TEXT PRIMARY KEY,
    script_id INTEGER,
    node_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ...
);
```

#### 3. 테스트 모드 지원

```python
# 테스트 모드: 일정 시간 동안만 활성화
@router.post("/test/{webhook_id}")
async def test_webhook(...):
    # 테스트 모드 웹훅은 1회 사용 후 자동 비활성화
    pass
```

#### 4. 다양한 인증 방식 지원

```python
# Header Auth
x_webhook_token: Optional[str] = Header(None)

# Query Parameter
token: Optional[str] = None

# Basic Auth
authorization: Optional[str] = Header(None)
```

## 참고 자료

- [FastAPI Webhooks](https://fastapi.tiangolo.com/advanced/webhooks/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Webhook Security Best Practices](https://webhooks.fyi/best-practices/webhook-security)
- [n8n Webhook Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n GitHub Repository](https://github.com/n8n-io/n8n)

