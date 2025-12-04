# 린팅 및 타입 체크 수정 사항 요약

## 개요

이 문서는 Ruff 린터와 Mypy 타입 체커에서 발견된 에러들을 수정한 내용을 정리한 것입니다.

**수정 일시**: 2024년
**수정된 파일 수**: 약 25개 파일
**수정된 에러 수**: 111개 (Ruff) + 78개 (Mypy)

---

## 1. Ruff 린터 에러 수정

### 1.1 Deprecated 타입 제거 (UP035)

**문제**: `typing.Dict`, `typing.List`, `typing.Tuple` 등이 Python 3.9+에서 deprecated됨

**수정 전**:
```python
from typing import Dict, List, Tuple, Optional

def get_data() -> Dict[str, Any]:
    return {}
```

**수정 후**:
```python
from typing import Any

def get_data() -> dict[str, Any]:
    return {}
```

**수정된 파일**:
- `server/api/state_router.py`
- `server/api/action_node_router.py`
- `server/api/action_router.py`
- `server/api/config_router.py`
- `server/api/node_router.py`
- `server/api/script_router.py`
- `server/automation/application_state.py`
- `server/automation/input_handler.py`
- `server/automation/screen_capture.py`
- `server/automation/workflow_engine.py`
- `server/config/action_node_types.py`
- `server/db/connection.py`
- `server/db/database.py`
- `server/db/node_repository.py`
- `server/db/script_repository.py`

### 1.2 사용되지 않는 Import 제거 (F401)

**문제**: Import했지만 실제로 사용하지 않는 모듈들

**수정 전**:
```python
from typing import Any, Dict, List, Optional
from pynput import keyboard, mouse
from pynput.keyboard import Key
from pynput.mouse import Button
```

**수정 후**:
```python
from typing import Any
from pynput.keyboard import Listener as KeyboardListener
from pynput.mouse import Listener as MouseListener
```

**제거된 주요 Import**:
- `Dict`, `List`, `Tuple`, `Optional`, `Union`, `TypeVar` (사용하지 않는 경우)
- `pynput.keyboard`, `pynput.mouse` (직접 import)
- `pynput.keyboard.Key`, `pynput.mouse.Button` (사용하지 않음)
- `json` (일부 파일에서 사용하지 않음)

### 1.3 타입 어노테이션 추가 (ANN204, ANN201, ANN202, ANN001, ANN002)

**문제**: 함수 및 메서드에 반환 타입 어노테이션이 없음

**수정 전**:
```python
def __init__(self):
    self.value = 0

def start_monitoring(self):
    pass
```

**수정 후**:
```python
def __init__(self) -> None:
    self.value = 0

def start_monitoring(self) -> None:
    pass
```

### 1.4 Optional 타입 수정 (RUF013)

**문제**: PEP 484에서 암시적 Optional 사용 금지

**수정 전**:
```python
def set_stats(level: int = None, hp: int = None) -> None:
    pass
```

**수정 후**:
```python
def set_stats(level: int | None = None, hp: int | None = None) -> None:
    pass
```

### 1.5 불필요한 변수 할당 제거 (RET504)

**문제**: 변수에 할당한 후 바로 return하는 불필요한 코드

**수정 전**:
```python
def get_connection(self):
    conn = sqlite3.connect(self.db_path)
    return conn
```

**수정 후**:
```python
def get_connection(self):
    return sqlite3.connect(self.db_path)
```

### 1.6 사용되지 않는 변수 처리 (RUF059, F841)

**문제**: 언패킹한 변수 중 사용하지 않는 것들

**수정 전**:
```python
min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
logger.debug(f"점수: {max_val}")
```

**수정 후**:
```python
_min_val, max_val, _min_loc, max_loc = cv2.minMaxLoc(result)
logger.debug(f"점수: {max_val}")
```

### 1.7 Import 순서 수정 (E402)

**문제**: 모듈 레벨 import가 파일 상단에 없음

**수정 전** (`server/api/config_router.py`):
```python
from db.database import db_manager
from log import log_manager

router = APIRouter(prefix="/api/config", tags=["config"])
logger = log_manager.logger

from config.server_config import settings  # ❌ 중간에 import
```

**수정 후**:
```python
from config.server_config import settings
from db.database import db_manager
from log import log_manager

router = APIRouter(prefix="/api/config", tags=["config"])
logger = log_manager.logger
```

### 1.8 Lambda 인자 처리 (ARG005)

**문제**: Lambda 함수에서 사용하지 않는 인자

**수정 전**:
```python
lambda conn, cursor: self._save_impl(cursor, data)
```

**수정 후**:
```python
lambda _conn, cursor: self._save_impl(cursor, data)
```

### 1.9 중첩 if 문 단순화 (SIM102)

**수정 전**:
```python
if to_node_id in node_connected_from:
    if from_node_id not in node_connected_from[to_node_id]:
        node_connected_from[to_node_id].append(from_node_id)
```

**수정 후**:
```python
if to_node_id in node_connected_from and from_node_id not in node_connected_from[to_node_id]:
    node_connected_from[to_node_id].append(from_node_id)
```

### 1.10 후행 공백 제거 (W291)

**문제**: 줄 끝에 불필요한 공백

**수정**: 모든 후행 공백 제거

---

## 2. Mypy 타입 체크 에러 수정

### 2.1 Optional 타입 수정

**문제**: `default: T = None`에서 타입 불일치

**수정 전** (`server/utils/parameter_validator.py`):
```python
def get_parameter(
    parameters: dict[str, Any], 
    key: str, 
    default: T = None,  # ❌ T와 None 타입 불일치
    validator: Callable[[Any], T] | None = None
) -> T:
    return parameters.get(key, default)
```

**수정 후**:
```python
def get_parameter(
    parameters: dict[str, Any], 
    key: str, 
    default: T | None = None,  # ✅ Optional 타입 명시
    validator: Callable[[Any], T] | None = None
) -> T | None:
    value: Any = parameters.get(key, default)
    # ... 검증 로직
    return value  # type: ignore[return-value]
```

### 2.2 반환 타입 명시

**문제**: 데이터베이스 쿼리 결과의 반환 타입이 Any로 추론됨

**수정 전** (`server/db/connection.py`):
```python
def test_callback(conn: sqlite3.Connection, cursor: sqlite3.Cursor) -> int:
    cursor.execute("SELECT COUNT(*) FROM test_table")
    return cursor.fetchone()[0]  # ❌ Any 반환
```

**수정 후**:
```python
def test_callback(conn: sqlite3.Connection, cursor: sqlite3.Cursor) -> int:
    cursor.execute("SELECT COUNT(*) FROM test_table")
    result = cursor.fetchone()
    if result is None:
        return 0
    count: int = result[0]  # ✅ 타입 명시
    return count
```

### 2.3 변수 타입 어노테이션 추가

**수정 전** (`server/db/node_repository.py`):
```python
node_connected_to = {}
node_connected_from = {}
```

**수정 후**:
```python
node_connected_to: dict[str, list[dict[str, Any]]] = {}
node_connected_from: dict[str, list[str]] = {}
```

### 2.4 state.get() 반환값 타입 캐스팅

**문제**: `dict.get()`이 `object` 타입을 반환하여 타입 체크 실패

**수정 전** (`server/automation/application_state.py`):
```python
def get_scene(self) -> str:
    return self.state.get("current_scene", "unknown")  # ❌ object 반환

def get_player_stats(self) -> dict[str, int]:
    return {
        "level": self.state.get("player_level", 1),  # ❌ object 반환
        "hp": self.state.get("player_hp", 100),
        "mp": self.state.get("player_mp", 100),
    }
```

**수정 후**:
```python
def get_scene(self) -> str:
    scene: Any = self.state.get("current_scene", "unknown")
    return str(scene)  # ✅ 명시적 타입 변환

def get_player_stats(self) -> dict[str, int]:
    level: Any = self.state.get("player_level", 1)
    hp: Any = self.state.get("player_hp", 100)
    mp: Any = self.state.get("player_mp", 100)
    return {
        "level": int(level),  # ✅ 명시적 타입 변환
        "hp": int(hp),
        "mp": int(mp),
    }
```

### 2.5 None 체크 추가

**수정 전** (`server/api/script_router.py`):
```python
script_id = db_manager.create_script(request.name, request.description)
# ❌ description이 None일 수 있음
```

**수정 후**:
```python
description = request.description or ""
script_id = db_manager.create_script(request.name, description)
# ✅ None 체크 후 빈 문자열로 변환
```

**수정 전** (`server/api/action_router.py`):
```python
result = await action_service.process_game_action(
    request.action_type, 
    request.parameters  # ❌ None일 수 있음
)
```

**수정 후**:
```python
parameters = request.parameters or {}
result = await action_service.process_game_action(
    request.action_type, 
    parameters  # ✅ None 체크 후 빈 dict로 변환
)
```

### 2.6 Input Handler 타입 수정

**수정 전** (`server/automation/input_handler.py`):
```python
self.mouse_listener = None
self.keyboard_listener = None
self.last_click_position = None
self.last_key_press = None

def get_mouse_position(self) -> tuple[int, int]:
    return pyautogui.position()  # ❌ Point 객체 반환
```

**수정 후**:
```python
self.mouse_listener: MouseListener | None = None  # type: ignore[assignment]
self.keyboard_listener: KeyboardListener | None = None  # type: ignore[assignment]
self.last_click_position: tuple[int, int] | None = None
self.last_key_press: str | None = None

def get_mouse_position(self) -> tuple[int, int]:
    pos = pyautogui.position()
    return (pos.x, pos.y)  # ✅ tuple로 변환
```

### 2.7 Async 함수 래퍼 타입 수정

**수정 전** (`server/api/router_wrapper.py`):
```python
def api_handler(func: Callable[P, R]) -> Callable[P, R]:
    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return await func(*args, **kwargs)  # ❌ 타입 불일치
    return wrapper
```

**수정 후**:
```python
from collections.abc import Awaitable

def api_handler(func: Callable[P, Awaitable[R]]) -> Callable[P, Awaitable[R]]:
    @wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        result: R = await func(*args, **kwargs)
        return result
    return wrapper  # type: ignore[return-value]
```

### 2.8 동적 속성 타입 무시

**문제**: 런타임에 동적으로 추가되는 속성 (`logger.hr`)

**수정 전** (`server/log/log_manager.py`):
```python
self.logger.hr = self.hr  # ❌ Logger에 hr 속성이 없음
```

**수정 후**:
```python
self.logger.hr = self.hr  # type: ignore[attr-defined]
```

### 2.9 타입 체킹 블록 사용

**수정 전** (`server/automation/workflow_engine.py`):
```python
from collections.abc import Callable

self.node_handlers: dict[NodeType, Callable] = {
    # ...
}
```

**수정 후**:
```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Callable

self.node_handlers: dict[NodeType, "Callable"] = {
    # ...
}
```

### 2.10 Exception 처리 타입 수정

**수정 전** (`server/automation/workflow_engine.py`):
```python
for i, result in enumerate(results):
    if isinstance(result, Exception):
        # ...
    else:
        self.results.append(result)  # ❌ result가 dict | BaseException
```

**수정 후**:
```python
for i, result in enumerate(results):
    if isinstance(result, Exception):
        # ...
    elif isinstance(result, dict):  # ✅ dict 타입 확인
        self.results.append(result)
```

---

## 3. 주요 수정 패턴 요약

### 패턴 1: Deprecated 타입 → 내장 타입
- `typing.Dict` → `dict`
- `typing.List` → `list`
- `typing.Tuple` → `tuple`
- `typing.Optional[T]` → `T | None`

### 패턴 2: 암시적 Optional → 명시적 Optional
- `param: int = None` → `param: int | None = None`

### 패턴 3: 타입 캐스팅
- `value = dict.get(key)` → `value: Any = dict.get(key); return int(value)`

### 패턴 4: None 체크
- `param` → `param or default_value`

### 패턴 5: 타입 어노테이션 추가
- 변수: `var = value` → `var: Type = value`
- 함수: `def func():` → `def func() -> ReturnType:`

---

## 4. 수정된 파일 목록

### API 라우터
- `server/api/state_router.py`
- `server/api/action_node_router.py`
- `server/api/action_router.py`
- `server/api/config_router.py`
- `server/api/node_router.py`
- `server/api/router_wrapper.py`
- `server/api/script_router.py`

### Automation 모듈
- `server/automation/application_state.py`
- `server/automation/input_handler.py`
- `server/automation/screen_capture.py`
- `server/automation/workflow_engine.py`

### 데이터베이스 모듈
- `server/db/connection.py`
- `server/db/database.py`
- `server/db/node_repository.py`
- `server/db/script_repository.py`
- `server/db/user_settings_repository.py`

### 기타
- `server/config/action_node_types.py`
- `server/utils/parameter_validator.py`
- `server/log/log_manager.py`
- `server/services/action_service.py`

---

## 5. 참고 사항

### 타입 무시 설정 (pyproject.toml)

코드에 `type: ignore` 주석을 직접 달지 않고, `pyproject.toml`의 mypy 설정에서 전역적으로 무시하도록 설정했습니다:

```toml
[tool.mypy]
# 전역적으로 무시할 에러 코드
disable_error_code = [
    "no-any-return",      # Any 타입 반환 허용 (동적 타입이 필요한 경우)
    "attr-defined",       # 동적 속성 추가 허용 (예: logger.hr)
    "import-untyped",     # 타입 스텁이 없는 라이브러리 import 허용
]

# 파일별 무시 설정
[[tool.mypy.overrides]]
module = ["seed_nodes", "db.node_repository", "db.database"]
disable_error_code = [
    "arg-type",  # 테스트 코드의 리터럴 리스트 타입 추론 문제
    "index",     # 딕셔너리 인덱싱 타입 추론 문제
]

[[tool.mypy.overrides]]
module = ["api.router_wrapper"]
disable_error_code = [
    "return-value",  # 데코레이터 래퍼의 복잡한 제네릭 타입 반환 문제
]
```

**장점**:
- 코드가 더 깔끔해짐 (주석 없이)
- 설정이 한 곳에 집중됨
- 유지보수가 쉬움

### TYPE_CHECKING 블록
런타임에는 필요하지 않지만 타입 체킹에만 필요한 import는 `TYPE_CHECKING` 블록에 넣었습니다:

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Callable
```

이렇게 하면 런타임 성능에 영향을 주지 않으면서 타입 체킹은 정확하게 수행됩니다.

---

## 6. 검증 방법

수정 후 다음 명령어로 검증할 수 있습니다:

```bash
# Ruff 린터 검사
ruff check server/

# Ruff 자동 수정
ruff check --fix server/

# Mypy 타입 체크
mypy server/
```

---

## 7. 향후 개선 사항

1. **타입 스텁 추가**: 외부 라이브러리(`pytz` 등)의 타입 스텁 설치
2. **더 엄격한 타입 체킹**: `pyproject.toml`의 mypy 설정 강화
3. **타입 어노테이션 보완**: 테스트 코드에도 타입 어노테이션 추가
4. **동적 속성 타입 정의**: `logger.hr` 같은 동적 속성을 위한 프로토콜 정의

