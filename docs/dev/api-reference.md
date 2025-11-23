# API 참조 문서

이 문서는 LostSword_AutoScript의 RESTful API 엔드포인트를 설명합니다.

## 기본 정보

- **Base URL**: `http://localhost:8000`
- **Content-Type**: `application/json`
- **API 문서**: `http://localhost:8000/docs` (Swagger UI)
- **대체 문서**: `http://localhost:8000/redoc` (ReDoc)

## 기본 엔드포인트

### 서버 상태 확인
```http
GET /
```

**응답**:
```json
{
  "message": "LostSword AutoScript API",
  "version": "1.0.0"
}
```

### 헬스 체크
```http
GET /health
```

**응답**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00"
}
```

## 게임 액션 API

### 단일 액션 실행
```http
POST /api/action/execute
```

**요청 본문**:
```json
{
  "action_type": "click",
  "parameters": {
    "x": 100,
    "y": 200,
    "button": "left",
    "clicks": 1
  }
}
```

**지원하는 액션 타입**:
- `click`: 마우스 클릭
- `image_touch`: 이미지를 찾아 클릭
- `wait`: 대기
- `process_focus`: 프로세스 창 포커스

**응답**:
```json
{
  "success": true,
  "message": "액션이 성공적으로 실행되었습니다.",
  "data": {
    "action_type": "click",
    "executed_at": "2024-01-01T00:00:00"
  }
}
```

### 이미지 터치 액션
```http
POST /api/action/execute
```

**요청 본문**:
```json
{
  "action_type": "image_touch",
  "parameters": {
    "folder_path": "C:/Users/User/Downloads/images",
    "threshold": 0.7,
    "max_attempts": 5,
    "delay": 0.5
  }
}
```

**파라미터 설명**:
- `folder_path`: 이미지가 있는 폴더 경로
- `threshold`: 이미지 매칭 임계값 (0.0 ~ 1.0, 기본값: 0.7)
- `max_attempts`: 최대 재시도 횟수 (기본값: 5)
- `delay`: 재시도 간 대기 시간(초) (기본값: 0.5)

### 대기 액션
```http
POST /api/action/execute
```

**요청 본문**:
```json
{
  "action_type": "wait",
  "parameters": {
    "duration": 2.5
  }
}
```

**파라미터 설명**:
- `duration`: 대기 시간(초)

### 프로세스 포커스 액션
```http
POST /api/action/execute
```

**요청 본문**:
```json
{
  "action_type": "process_focus",
  "parameters": {
    "hwnd": 123456,
    "process_name": "game.exe",
    "window_title": "Game Window"
  }
}
```

**파라미터 설명**:
- `hwnd`: 윈도우 핸들 (선택사항)
- `process_name`: 프로세스 이름 (선택사항)
- `window_title`: 윈도우 제목 (선택사항)

## 프로세스 관리 API

### 프로세스 목록 조회
```http
GET /api/processes/list
```

**응답**:
```json
{
  "success": true,
  "processes": [
    {
      "pid": 1234,
      "name": "game.exe",
      "hwnd": 123456,
      "window_title": "Game Window",
      "is_visible": true
    }
  ]
}
```

### 프로세스 포커스
```http
POST /api/processes/focus
```

**요청 본문**:
```json
{
  "hwnd": 123456,
  "process_name": "game.exe",
  "window_title": "Game Window"
}
```

**응답**:
```json
{
  "success": true,
  "message": "프로세스 창이 포커스되었습니다."
}
```

## 이미지 관리 API

### 이미지 목록 조회
```http
GET /api/images/list?folder_path={경로}
```

**쿼리 파라미터**:
- `folder_path`: 이미지 폴더 경로 (URL 인코딩 필요)

**응답**:
```json
{
  "success": true,
  "count": 5,
  "images": [
    "image1.png",
    "image2.png",
    "image3.jpg"
  ]
}
```

## 게임 상태 API

### 게임 상태 조회
```http
GET /api/game-state
```

**응답**:
```json
{
  "success": true,
  "state": {
    "player": {
      "level": 50,
      "hp": 1000,
      "mp": 500
    },
    "inventory": {
      "items": []
    },
    "position": {
      "x": 100,
      "y": 200
    }
  }
}
```

## 스크립트 관리 API

### 스크립트 목록 조회
```http
GET /api/scripts/list
```

**응답**:
```json
{
  "success": true,
  "scripts": [
    {
      "id": 1,
      "name": "My Script",
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00"
    }
  ]
}
```

### 스크립트 저장
```http
POST /api/scripts/save
```

**요청 본문**:
```json
{
  "name": "My Script",
  "nodes": [
    {
      "id": "node1",
      "type": "action",
      "title": "클릭",
      "position": {
        "x": 100,
        "y": 200
      },
      "parameters": {
        "x": 500,
        "y": 300
      }
    }
  ],
  "connections": [
    {
      "from": "node1",
      "to": "node2"
    }
  ]
}
```

**응답**:
```json
{
  "success": true,
  "message": "스크립트가 저장되었습니다.",
  "script_id": 1
}
```

### 스크립트 로드
```http
GET /api/scripts/{script_id}
```

**경로 파라미터**:
- `script_id`: 스크립트 ID

**응답**:
```json
{
  "success": true,
  "script": {
    "id": 1,
    "name": "My Script",
    "nodes": [...],
    "connections": [...],
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
}
```

### 스크립트 삭제
```http
DELETE /api/scripts/{script_id}
```

**경로 파라미터**:
- `script_id`: 스크립트 ID

**응답**:
```json
{
  "success": true,
  "message": "스크립트가 삭제되었습니다."
}
```

## 노드 관리 API

### 노드 목록 조회
```http
GET /api/nodes/list
```

**응답**:
```json
{
  "success": true,
  "nodes": [
    {
      "id": 1,
      "type": "action",
      "title": "클릭",
      "description": "마우스 클릭 액션"
    }
  ]
}
```

## 에러 응답

모든 API는 에러 발생 시 다음 형식으로 응답합니다:

```json
{
  "success": false,
  "error": "에러 메시지",
  "details": "상세 에러 정보 (선택사항)"
}
```

### HTTP 상태 코드

- `200 OK`: 요청 성공
- `400 Bad Request`: 잘못된 요청
- `404 Not Found`: 리소스를 찾을 수 없음
- `500 Internal Server Error`: 서버 내부 오류

## 예제

### Python 예제
```python
import requests

# 단일 액션 실행
response = requests.post(
    "http://localhost:8000/api/action/execute",
    json={
        "action_type": "click",
        "parameters": {
            "x": 100,
            "y": 200,
            "button": "left"
        }
    }
)
print(response.json())
```

### JavaScript 예제
```javascript
// 단일 액션 실행
fetch('http://localhost:8000/api/action/execute', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        action_type: 'click',
        parameters: {
            x: 100,
            y: 200,
            button: 'left'
        }
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

## 관련 문서

- [시스템 아키텍처](architecture.md)
- [개발 환경 설정](development.md)
- [프로젝트 구조](project-structure.md)

