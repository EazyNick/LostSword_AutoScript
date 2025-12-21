# 액션 노드 (Action Nodes)

액션 노드는 사용자 입력이나 시스템 작업을 수행하는 노드입니다.

## 구현된 노드

### click (클릭 노드)

화면의 특정 좌표를 클릭하는 노드입니다.

**파일 위치**: `server/nodes/actionnodes/click.py`

**노드 타입**: `click`

**설명**: 지정된 좌표 (x, y)를 클릭합니다.

#### 파라미터

- `x` (number, 기본값: 0): 클릭할 X 좌표
- `y` (number, 기본값: 0): 클릭할 Y 좌표

#### 출력 스키마

```json
{
  "action": "click",
  "status": "completed",
  "output": {
    "x": 100,
    "y": 200
  }
}
```

#### 동작 방식

1. 파라미터에서 `x`, `y` 좌표를 추출합니다
2. 좌표를 출력에 포함하여 반환합니다
3. 실제 클릭 작업은 클라이언트 측에서 처리됩니다 (현재 구현)

#### 코드 예시

```python
@NodeExecutor("click")
async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
    x = get_parameter(parameters, "x", default=0)
    y = get_parameter(parameters, "y", default=0)
    
    return {
        "action": "click",
        "status": "completed",
        "output": {"x": x, "y": y}
    }
```

---

### http-api-request (HTTP API 요청 노드)

외부 API에 HTTP 요청을 보내는 노드입니다.

**파일 위치**: `server/nodes/actionnodes/http_api_request.py`

**노드 타입**: `http-api-request`

**설명**: 외부 API에 HTTP 요청을 보내고 응답을 받습니다. SSRF (Server-Side Request Forgery) 공격을 방지하기 위한 검증이 포함되어 있습니다.

#### 파라미터

- `url` (string, 필수): 요청할 URL
- `method` (string, 기본값: "GET"): HTTP 메서드 (GET, POST, PUT, DELETE 등)
- `headers` (object 또는 string, 선택): HTTP 헤더
- `body` (object 또는 string, 선택): 요청 본문
- `timeout` (number, 기본값: 30): 타임아웃 (초)

#### 출력 스키마

```json
{
  "action": "http-api-request",
  "status": "completed",
  "output": {
    "status_code": 200,
    "headers": {...},
    "body": "...",
    "url": "https://api.example.com/endpoint"
  }
}
```

#### 동작 방식

1. 파라미터를 `HttpApiRequestParams` 모델로 검증합니다 (SSRF 방지 포함)
2. `aiohttp`를 사용하여 비동기 HTTP 요청을 보냅니다
3. 응답 상태 코드, 헤더, 본문을 수집합니다
4. 표준 형식의 결과를 반환합니다

#### 보안 기능

- **SSRF 방지**: 내부 IP 주소 (127.0.0.1, localhost, 10.x.x.x 등)로의 요청을 차단합니다
- **URL 검증**: 유효한 URL 형식인지 검증합니다
- **타임아웃**: 요청이 무한정 대기하지 않도록 타임아웃을 설정합니다

#### 코드 예시

```python
@NodeExecutor("http-api-request")
async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
    # Pydantic 모델로 입력 검증 (SSRF 방지 포함)
    validated_params = HttpApiRequestParams(**parameters)
    
    url = validated_params.url
    method = validated_params.method
    
    async with aiohttp.ClientSession() as session:
        async with session.request(
            method=method,
            url=url,
            headers=validated_params.headers,
            json=validated_params.body if isinstance(validated_params.body, dict) else None,
            data=validated_params.body if isinstance(validated_params.body, str) else None,
            timeout=aiohttp.ClientTimeout(total=validated_params.timeout)
        ) as response:
            body = await response.text()
            
            return {
                "action": "http-api-request",
                "status": "completed",
                "output": {
                    "status_code": response.status,
                    "headers": dict(response.headers),
                    "body": body,
                    "url": str(response.url)
                }
            }
```

---

### process-focus (프로세스 포커스 노드)

특정 프로세스/창에 포커스를 주는 노드입니다.

**파일 위치**: `server/nodes/actionnodes/process_focus.py`

**노드 타입**: `process-focus`

**설명**: Windows 환경에서 특정 프로세스나 창에 포커스를 줍니다. 여러 방법을 시도하여 안정적으로 포커스를 전달합니다.

#### 파라미터

- `process_id` (number, 선택): 프로세스 ID
- `hwnd` (number, 선택): 창 핸들 (Window Handle)
- `window_title` (string, 선택): 창 제목
- `process_name` (string, 선택): 프로세스 이름

**참고**: `process_id` 또는 `hwnd` 중 하나는 필수입니다.

#### 출력 스키마

```json
{
  "action": "process-focus",
  "status": "completed",
  "output": {
    "success": true,
    "process_id": 12345,
    "hwnd": 67890,
    "window_title": "애플리케이션 제목"
  }
}
```

#### 동작 방식

1. 여러 방법으로 대상 창을 찾습니다:
   - `window_title`로 찾기 (가장 정확)
   - `process_name`으로 찾기
   - `hwnd`로 직접 찾기
   - `process_id`로 창 핸들 찾기 (win32gui 사용)

2. 창을 찾으면 포커스를 줍니다:
   - `pygetwindow`를 사용한 포커스 시도
   - 실패 시 `win32gui`를 사용한 강제 포커스 방법 시도
   - `AttachThreadInput`을 사용하여 Windows 보안 제한 우회

3. 표준 형식의 결과를 반환합니다

#### Windows 보안 제한 우회

Windows는 보안상의 이유로 다른 프로세스의 창에 포커스를 주는 것을 제한합니다. 이 노드는 다음 방법을 사용하여 이를 우회합니다:

- `AttachThreadInput`: 스레드 입력을 연결하여 포커스 권한 획득
- `AllowSetForegroundWindow`: 포그라운드 창 설정 권한 부여
- 여러 API 조합: `ShowWindow`, `SetWindowPos`, `BringWindowToTop` 등

#### 코드 예시

```python
@NodeExecutor("process-focus")
async def execute(parameters: dict[str, Any]) -> dict[str, Any]:
    process_id = get_parameter(parameters, "process_id")
    hwnd = get_parameter(parameters, "hwnd")
    window_title = get_parameter(parameters, "window_title", default="")
    
    # pygetwindow로 창 찾기
    if window_title:
        windows = gw.getWindowsWithTitle(window_title)
        if windows:
            target_window = windows[0]
            target_window.activate()
            return {...}
    
    # win32gui로 강제 포커스
    ProcessFocusNode._force_foreground_window(target_hwnd)
    return {...}
```

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    액션 노드 실행                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              클릭 노드 (click)                     │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  입력: {x: 100, y: 200}                   │  │  │
│  │  │  처리: 좌표 추출 및 검증                    │  │  │
│  │  │  출력: {x: 100, y: 200}                   │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         HTTP API 요청 노드 (http-api-request)     │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  입력: {url, method, headers, body}        │  │  │
│  │  │  처리:                                      │  │  │
│  │  │    1. SSRF 방지 검증                        │  │  │
│  │  │    2. aiohttp로 비동기 요청                 │  │  │
│  │  │    3. 응답 수집                             │  │  │
│  │  │  출력: {status_code, headers, body}         │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │      프로세스 포커스 노드 (process-focus)         │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  입력: {process_id, hwnd, window_title}    │  │  │
│  │  │  처리:                                      │  │  │
│  │  │    1. 창 찾기 (여러 방법 시도)              │  │  │
│  │  │    2. 포커스 전달 (Windows API 사용)        │  │  │
│  │  │  출력: {success, process_id, hwnd}         │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 공통 특징

1. **표준 인터페이스**: 모든 액션 노드는 `BaseNode`를 상속받고 `@NodeExecutor` 데코레이터를 사용합니다
2. **에러 처리**: `NodeExecutor`가 자동으로 에러를 처리하고 표준 형식의 실패 결과를 반환합니다
3. **파라미터 검증**: 파라미터는 자동으로 검증되고 정규화됩니다
4. **로깅**: 모든 실행은 자동으로 로그에 기록됩니다
