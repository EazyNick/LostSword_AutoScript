# 스크린샷 기능 문서

**최신 수정일자: 2025-12-20**

## 개요

스크린샷 기능은 각 노드 실행이 완료될 때 자동으로 현재 화면을 캡처하여 설정된 경로에 저장하는 기능입니다. 이 기능은 **Python 서버에서만** 실행되며, JS 클라이언트는 스크린샷 캡처 요청만 보냅니다.

## 아키텍처

### 실행 흐름

```
노드 실행 요청 (JS 클라이언트)
    ↓
Python 서버에서 노드 실행
    ↓
실행 결과 반환 (JS 클라이언트)
    ↓
JS 클라이언트에서 스크린샷 캡처 요청
    ↓
Python 서버에서 화면 캡처 (pyautogui)
    ↓
Python 서버에서 파일 저장
```

### 중요 사항: 캡처 위치

**현재 구현에서는 Python 서버에서만 화면을 캡처합니다.**

- ✅ **Python 서버에서 캡처**: `ScreenCapture` 클래스의 `capture_screen()` 메서드 사용
- ❌ **JS 클라이언트에서는 캡처하지 않음**: JS 클라이언트는 캡처 요청만 전송

**캡처가 Python 서버에서만 이루어지는 이유:**
- Python 서버의 `ScreenCapture` 클래스가 `pyautogui`를 사용하여 실제 화면을 캡처합니다
- JS 클라이언트는 브라우저 내부의 DOM만 캡처할 수 있어 실제 화면과 다를 수 있습니다
- Python 서버에서 캡처하면 실제 사용자가 보는 화면과 동일한 스크린샷을 얻을 수 있습니다

## 구성 요소

### 1. JS 클라이언트

#### 1.1 스크린샷 API (`UI/src/js/api/screenshot-api.js`)

**주요 함수:**

- `isAutoScreenshotEnabled()`: 자동 스크린샷 설정 확인 (서버 DB + 로컬 스토리지)
- `captureAndSaveScreenshot()`: 노드 실행 완료 후 Python 서버로 스크린샷 캡처 요청 (메인 함수)

**요청 방식:**
```javascript
// Python 서버로 스크린샷 캡처 및 저장 요청
const result = await apiCall('/api/screenshots/capture', {
    method: 'POST',
    body: JSON.stringify({
        filename: filename,
        save_path: savePath,
        image_format: imageFormat,
        node_id: nodeId,
        node_type: nodeType,
        script_name: scriptName,
        node_name: nodeName,
        is_running_all_scripts: isRunningAllScripts,
        execution_start_time: executionStartTime,
        script_execution_order: scriptExecutionOrder
    })
});
```

**파라미터 설명:**
- `filename`: 생성된 파일명 (타임스탬프 + 스크립트명 + 노드명 + 노드 ID 포함)
- `save_path`: 저장 경로 (설정에서 가져옴)
- `image_format`: 이미지 형식 (PNG 또는 JPEG)
- `node_id`: 노드 ID
- `node_type`: 노드 타입
- `script_name`: 스크립트 이름 (폴더 구조 생성에 사용)
- `node_name`: 노드 이름 (파일명에 포함)
- `is_running_all_scripts`: 전체 실행 여부 (true: 전체 실행, false: 단일 실행)
- `execution_start_time`: 실행 시작 시간 (ISO 형식, 폴더명 생성에 사용)
- `script_execution_order`: 전체 실행 시 스크립트 실행 순서 (1부터 시작, 단일 실행 시 null)

#### 1.2 노드 실행 서비스 통합 (`UI/src/pages/workflow/services/workflow-execution-service.js`)

**통합 위치:**
```javascript
// 노드 실행 완료 후 스크린샷 캡처 요청 (비동기, 백그라운드 실행)
// 모든 노드(성공/실패 포함)에 대해 스크린샷 캡처
const scriptName = currentScript?.name || 'Unknown';
const nodeName = nodeData.data?.title || nodeData.type || nodeData.id;
const isRunningAllScripts = this.isRunningAllScripts || false;
const executionStartTime = this.isRunningAllScripts && this.allScriptsExecutionStartTime
    ? this.allScriptsExecutionStartTime
    : (this.executionStartTime
        ? new Date(this.executionStartTime).toISOString()
        : new Date().toISOString());
const scriptExecutionOrder = this.isRunningAllScripts ? this.scriptExecutionOrder : null;

captureAndSaveScreenshot(
    nodeData.id, 
    nodeData.type, 
    scriptName, 
    nodeName, 
    isRunningAllScripts, 
    executionStartTime, 
    scriptExecutionOrder
).catch((error) => {
    const logger = this.workflowPage.getLogger();
    logger.warn('[WorkflowExecutionService] 스크린샷 캡처 실패 (무시):', error);
});
```

**특징:**
- 비동기 실행: 노드 실행 흐름을 차단하지 않음
- 에러 처리: 스크린샷 캡처 실패 시에도 노드 실행은 계속 진행
- **모든 노드 캡처**: 성공/실패 여부와 관계없이 모든 노드 실행 후 스크린샷 캡처
- 시작 노드 포함: 시작 노드도 다른 노드와 동일하게 실행되며, 실행 완료 후 스크린샷이 캡처됨
- 폴더 구조: 실행 모드(단일/전체)에 따라 동적으로 폴더 구조 생성

### 2. Python 서버

#### 2.1 스크린샷 캡처 및 저장 API (`server/api/screenshot_router.py`)

**엔드포인트:**
```
POST /api/screenshots/capture
```

**요청 형식:**
```json
{
    "filename": "screenshot_2025-12-20T10-30-45-123456_로그인테스트_이미지터치_node123.png",
    "save_path": "./screenshots",
    "image_format": "PNG",
    "node_id": "node123",
    "node_type": "image-touch",
    "script_name": "로그인 테스트",
    "node_name": "이미지 터치",
    "is_running_all_scripts": false,
    "execution_start_time": "2025-12-20T10:30:45.123456Z",
    "script_execution_order": null
}
```

**전체 실행 시 요청 예시:**
```json
{
    "filename": "screenshot_2025-12-20T10-30-45-123456_로그인테스트_이미지터치_node123.png",
    "save_path": "./screenshots",
    "image_format": "PNG",
    "node_id": "node123",
    "node_type": "image-touch",
    "script_name": "로그인 테스트",
    "node_name": "이미지 터치",
    "is_running_all_scripts": true,
    "execution_start_time": "2025-12-20T10:30:45.123456Z",
    "script_execution_order": 1
}
```

**화면 캡처 방식:**
```python
# ScreenCapture 클래스를 사용하여 화면 캡처
from automation.screen_capture import ScreenCapture

screen_capture = ScreenCapture()
screenshot = screen_capture.capture_screen()  # pyautogui 사용
```

**응답 형식:**
```json
{
    "success": true,
    "message": "스크린샷 캡처 및 저장 완료",
    "data": {
        "filename": "screenshot_2025-12-20T10-30-45_node123.png",
        "path": "C:/project/screenshots/screenshot_2025-12-20T10-30-45_node123.png",
        "node_id": "node123",
        "node_type": "image-touch",
        "saved_at": "2025-12-20T10:30:45.123456",
        "image_format": "PNG"
    }
}
```

**캡처 및 저장 처리:**
1. `ScreenCapture.capture_screen()` 메서드를 사용하여 화면 캡처
2. 상대 경로인 경우: 프로젝트 루트 기준으로 변환
3. 절대 경로인 경우: 그대로 사용
4. **폴더 구조 생성**:
   - **단일 실행**: `{save_path}/{YYYY-MM-DD_HH-MM-SS}/screenshot_...png`
   - **전체 실행**: `{save_path}/{YYYY-MM-DD_HH-MM-SS}/{순서}. {스크립트명}/screenshot_...png`
5. 디렉토리가 없으면 자동 생성
6. **한글 경로 지원**: `cv2.imencode`와 바이너리 모드 파일 쓰기를 사용하여 Windows에서 한글 경로 문제 해결
7. 파일 저장 후 존재 여부 확인

**폴더 구조 예시:**

**단일 실행:**
```
screenshots/
└── 2025-12-20_10-30-45/
    ├── screenshot_2025-12-20T10-30-45-123456_로그인테스트_시작노드_start.png
    ├── screenshot_2025-12-20T10-30-46-789012_로그인테스트_이미지터치_node123.png
    └── screenshot_2025-12-20T10-30-47-345678_로그인테스트_대기_node456.png
```

**전체 실행:**
```
screenshots/
└── 2025-12-20_10-30-45/
    ├── 1. 로그인 테스트/
    │   ├── screenshot_2025-12-20T10-30-45-123456_로그인테스트_시작노드_start.png
    │   └── screenshot_2025-12-20T10-30-46-789012_로그인테스트_이미지터치_node123.png
    └── 2. 결제 프로세스 테스트/
        ├── screenshot_2025-12-20T10-30-50-111222_결제프로세스테스트_시작노드_start.png
        └── screenshot_2025-12-20T10-30-51-333444_결제프로세스테스트_결제버튼클릭_node789.png
```

**파일명 형식:**
```
screenshot_{timestamp}_{스크립트명}_{노드명}_{nodeId}.{extension}
```

예시:
- `screenshot_2025-12-20T10-30-45-123456_로그인테스트_이미지터치_node123.png`
- `screenshot_2025-12-20T10-30-45-123456_로그인테스트_대기_node456.jpg`

#### 2.2 ScreenCapture 클래스 (`server/automation/screen_capture.py`)

**주요 메서드:**

- `capture_screen(region=None)`: 화면을 캡처하여 numpy 배열로 반환
  - `region`: 캡처할 영역 (x, y, width, height), None이면 전체 화면
  - `pyautogui.screenshot()` 사용
  - OpenCV 형식 (BGR)으로 변환하여 반환

### 3. 설정 관리

#### 3.1 설정 항목

설정 페이지에서 다음 항목들을 관리할 수 있습니다:

1. **자동 스크린샷** (`screenshot.autoScreenshot`)
   - 각 노드 실행 완료 후 자동으로 스크린샷을 저장할지 여부
   - 기본값: `true`

2. **오류 발생 시 스크린샷** (`screenshot.screenshotOnError`)
   - 테스트 실패 시 스크린샷을 저장할지 여부
   - 기본값: `true`
   - 현재 구현에서는 사용되지 않음 (향후 구현 예정)

3. **저장 경로** (`screenshot.savePath`)
   - 스크린샷이 저장될 폴더 경로
   - 기본값: `./screenshots`
   - 상대 경로 또는 절대 경로 모두 지원

4. **이미지 형식** (`screenshot.imageFormat`)
   - 스크린샷 파일 형식
   - 지원 형식: `PNG`, `JPEG`
   - 기본값: `PNG`

#### 3.2 설정 저장 위치

설정은 두 곳에 저장됩니다:

1. **로컬 스토리지** (`localStorage.getItem('app-settings')`)
   - 즉시 반영을 위한 캐시
   - 설정 페이지에서 변경 시 즉시 저장

2. **서버 DB** (`user_settings` 테이블)
   - 영구 저장소
   - 키 형식: `screenshot.autoScreenshot`, `screenshot.savePath` 등
   - 설정 페이지에서 저장 시 서버에도 저장

#### 3.3 설정 확인 우선순위

스크린샷 캡처 전에 설정을 확인하는 순서:

1. **서버 DB 확인** (`UserSettingsAPI.getSetting('screenshot.autoScreenshot')`)
2. **로컬 스토리지 확인** (서버에 설정이 없을 경우)
3. **기본값 사용** (`true`)

#### 3.4 DB 초기화 시 기본 설정

데이터베이스 초기화 시 스크린샷 기본 설정이 자동으로 추가됩니다:

- **새 DB 생성 시**: `seed_example_data()` 메서드에서 기본 설정 추가
- **기존 DB 사용 시**: `initialize_database()` 함수에서 설정이 없으면 기본값 추가
- **기본 설정값**:
  - `screenshot.autoScreenshot`: `"true"`
  - `screenshot.screenshotOnError`: `"true"`
  - `screenshot.savePath`: `"./screenshots"`
  - `screenshot.imageFormat`: `"PNG"`

## 동작 시나리오

### 시나리오 1: 정상 실행 (자동 스크린샷 활성화)

1. 사용자가 워크플로우 실행 버튼 클릭
2. JS 클라이언트에서 시작 노드부터 순차적으로 실행 요청
3. Python 서버에서 노드 실행 완료 (시작 노드 포함)
4. 실행 결과 반환 (`status: "completed"`)
5. JS 클라이언트에서 `captureAndSaveScreenshot()` 호출
6. 자동 스크린샷 설정 확인 → `true`
7. Python 서버로 스크린샷 캡처 요청 전송 (`/api/screenshots/capture`)
8. Python 서버에서 `ScreenCapture.capture_screen()`으로 화면 캡처
9. Python 서버에서 설정된 경로에 파일 저장
10. 다음 노드 실행으로 진행

**참고:** 시작 노드도 다른 노드와 동일하게 실행되며, 실행 완료 후 스크린샷이 캡처됩니다. 시작 노드는 실행해도 아무 동작이 없으므로 문제없이 동작합니다.

### 시나리오 2: 자동 스크린샷 비활성화

1. ~4. 위와 동일
5. JS 클라이언트에서 `captureAndSaveScreenshot()` 호출
6. 자동 스크린샷 설정 확인 → `false`
7. **스크린샷 캡처 요청 건너뛰기**
8. 다음 노드 실행으로 진행

### 시나리오 3: 노드 실행 실패

1. ~3. 위와 동일
4. 실행 결과 반환 (`status: "failed"`)
5. JS 클라이언트에서 `captureAndSaveScreenshot()` 호출
6. 자동 스크린샷 설정 확인 → `true`
7. **에러 발생 시에도 스크린샷 캡처** (에러 상황 기록용)
8. Python 서버로 스크린샷 캡처 요청 전송 (`/api/screenshots/capture`)
9. Python 서버에서 `ScreenCapture.capture_screen()`으로 화면 캡처
10. Python 서버에서 설정된 경로에 파일 저장
11. 에러 처리로 진행

**참고:** 현재 구현에서는 성공/실패 여부와 관계없이 모든 노드 실행 후 스크린샷을 캡처합니다. 이를 통해 에러 발생 시점의 화면 상태를 기록할 수 있습니다.

### 시나리오 4: 전체 스크립트 실행

1. 사용자가 "전체 실행" 버튼 클릭
2. JS 클라이언트에서 전체 실행 시작 시간 생성 (`allScriptsExecutionStartTime`)
3. 각 스크립트를 순차적으로 실행 (1번부터 시작하는 실행 순서 포함)
4. 각 스크립트의 각 노드 실행 완료 후 스크린샷 캡처
5. **동일한 실행 시작 시간 사용**: 모든 스크립트가 같은 `YYYY-MM-DD_HH-MM-SS` 폴더에 저장됨
6. **스크립트별 폴더 생성**: 각 스크립트는 실행 순서가 포함된 폴더에 저장됨
   - 예: `1. 로그인 테스트`, `2. 결제 프로세스 테스트`
7. 모든 스크립트 실행 완료 후 종료

## 파일 구조

```
UI/src/js/api/screenshot-api.js       # 스크린샷 캡처 요청 API
UI/src/pages/workflow/services/
    workflow-execution-service.js      # 노드 실행 서비스 (스크린샷 호출)
UI/src/js/components/sidebar/
    sidebar-scripts.js                 # 전체 실행 시 실행 시작 시간 및 순서 관리
UI/src/pages/workflow/settings.js     # 설정 페이지 (스크린샷 설정 관리)

server/api/screenshot_router.py       # 스크린샷 캡처 및 저장 API 엔드포인트
server/automation/screen_capture.py   # 화면 캡처 클래스 (ScreenCapture)
server/api/__init__.py                 # 라우터 등록
server/main.py                         # 라우터 등록
server/db/database.py                  # DB 초기화 (스크린샷 기본 설정 추가)
```

## 의존성

### JS 클라이언트

- 추가 의존성 없음 (표준 JavaScript만 사용)

### Python 서버

- **pyautogui**: 화면 캡처 라이브러리
  - `ScreenCapture` 클래스에서 사용
  - 실제 화면을 캡처하기 위한 라이브러리
- **opencv-python (cv2)**: 이미지 처리 및 저장
  - 캡처된 이미지를 파일로 저장하기 위해 사용
  - PNG 및 JPEG 형식 지원
- 표준 라이브러리:
  - `pathlib.Path`: 파일 경로 처리
  - `datetime`: 타임스탬프 생성
  - `re`: 정규표현식 (파일명 안전화)

## 설정 방법

### 1. 설정 페이지에서 변경

1. 설정 페이지로 이동
2. "스크린샷" 섹션에서 설정 변경
   - 자동 스크린샷: 토글 스위치로 On/Off
   - 저장 경로: 텍스트 입력 필드
   - 이미지 형식: 드롭다운 메뉴에서 선택
3. 설정 저장 버튼 클릭
4. 로컬 스토리지와 서버 DB에 모두 저장됨

### 2. 기본값

설정이 없는 경우 기본값:

- `autoScreenshot`: `true` (활성화)
- `screenshotOnError`: `true` (활성화)
- `savePath`: `./screenshots`
- `imageFormat`: `PNG`

## 제한사항 및 주의사항

### 1. 화면 캡처 범위

- 현재는 전체 화면을 캡처합니다 (`pyautogui.screenshot()`)
- 실제 사용자가 보는 화면과 동일한 스크린샷을 얻을 수 있습니다
- 필요시 특정 영역만 캡처하도록 수정 가능 (`region` 파라미터 사용)

### 2. 성능 고려사항

- 스크린샷 캡처는 비동기로 실행되어 노드 실행 흐름을 차단하지 않습니다
- 대용량 화면의 경우 캡처 시간이 오래 걸릴 수 있습니다
- Python 서버에서 직접 캡처하므로 네트워크 전송 시간은 없습니다
- 한글 경로 지원을 위해 `cv2.imencode`를 사용하여 인코딩 후 바이너리 모드로 저장하므로 약간의 오버헤드가 있을 수 있습니다

### 3. 저장 공간

- 각 노드 실행마다 스크린샷이 저장되므로 저장 공간이 빠르게 증가할 수 있습니다
- 정기적인 정리 스크립트나 자동 삭제 기능을 고려해볼 수 있습니다

### 4. 보안

- 스크린샷에는 민감한 정보가 포함될 수 있습니다
- 저장 경로에 대한 접근 권한을 적절히 관리해야 합니다

### 5. 한글 경로 지원

- Windows에서 한글 경로 문제를 해결하기 위해 `cv2.imencode`와 바이너리 모드 파일 쓰기를 사용합니다
- `cv2.imwrite`는 Windows에서 한글 경로를 제대로 처리하지 못하는 경우가 있어, 인코딩 후 바이너리 모드로 저장하는 방식을 사용합니다
- 파일 저장 후 `file_path.exists()`로 실제 저장 여부를 확인합니다

## 향후 개선 사항

1. **스크린샷 영역 선택**: 특정 영역만 캡처하는 기능 추가
2. **스크린샷 압축**: 이미지 품질 조절 및 압축 옵션 추가
3. **자동 정리**: 오래된 스크린샷 자동 삭제 기능
4. **스크린샷 미리보기**: 설정 페이지에서 저장된 스크린샷 목록 및 미리보기
5. **스크린샷 필터링**: 성공/실패별 스크린샷 필터링 기능

## 문제 해결

### 스크린샷이 저장되지 않는 경우

1. **설정 확인**
   - 설정 페이지에서 "자동 스크린샷"이 On인지 확인
   - 브라우저 개발자 도구 콘솔에서 에러 메시지 확인

2. **서버 로그 확인**
   - Python 서버 로그에서 스크린샷 캡처 요청 확인
   - `ScreenCapture.capture_screen()` 실행 여부 확인
   - 저장 경로 권한 확인

3. **저장 경로 확인**
   - 설정된 경로가 올바른지 확인
   - 디렉토리 생성 권한 확인

4. **pyautogui 권한 확인**
   - Windows에서 화면 캡처 권한이 있는지 확인
   - 관리자 권한이 필요한 경우가 있을 수 있음

### 스크린샷이 중복으로 저장되는 경우

현재 구현에서는 중복 저장이 발생하지 않습니다:

- Python 서버에서 한 번만 캡처합니다
- 각 노드 실행 완료 시점에 한 번만 요청이 전송됩니다
- API 엔드포인트는 요청당 한 번만 실행됩니다

만약 중복 저장이 발생한다면:
- 브라우저 개발자 도구에서 `captureAndSaveScreenshot()` 호출 횟수 확인
- 네트워크 탭에서 `/api/screenshots/capture` 요청 횟수 확인
- Python 서버 로그에서 중복 요청 확인

## 참고 자료

- [pyautogui 공식 문서](https://pyautogui.readthedocs.io/)
- [OpenCV Python 문서](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [FastAPI 파일 업로드 가이드](https://fastapi.tiangolo.com/tutorial/request-files/)
