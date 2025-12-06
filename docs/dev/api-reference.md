# API 참조 문서

## 기본 정보

- **Base URL**: `.env` 파일의 `API_HOST:API_PORT` (기본값: `localhost:8001`)
- **Content-Type**: `application/json`
- **API 문서**: `http://{API_HOST}:{API_PORT}/docs` (Swagger UI)

## 주요 엔드포인트

### 1. 노드 실행

#### 단일 액션 실행
```http
POST /api/action
Content-Type: application/json

{
  "action_type": "image-touch",
  "parameters": {
    "folder_path": "C:/images",
    "image_name": "button.png"
  }
}
```

**응답 (ActionResponse)**:
```json
{
  "success": true,
  "message": "액션 'image-touch' 실행 완료",
  "data": {
    "result": "..."
  }
}
```

#### 노드 기반 워크플로우 실행
```http
POST /api/execute-nodes
Content-Type: application/json

{
  "nodes": [
    {
      "id": "node1",
      "type": "image-touch",
      "data": {
        "title": "이미지 터치",
        "folder_path": "C:/images"
      }
    },
    {
      "id": "node2",
      "type": "wait",
      "data": {
        "title": "대기",
        "wait_time": 2
      }
    }
  ],
  "execution_mode": "sequential"
}
```

**응답 (성공)**:
```json
{
  "success": true,
  "message": "2개 노드 실행 완료",
  "data": {
    "results": [
      {
        "action": "image-touch",
        "status": "completed",
        "output": {...}
      },
      {
        "action": "wait",
        "status": "completed",
        "output": {...}
      }
    ],
    "context": {...}
  }
}
```

**응답 (실패)**:
```json
{
  "success": false,
  "message": "노드 실행 중 오류 발생: 폴더를 찾을 수 없습니다",
  "data": {
    "results": [
      {
        "action": "image-touch",
        "status": "failed",
        "error": "폴더를 찾을 수 없습니다: ...",
        "node_id": "node1",
        "output": null
      }
    ],
    "context": {...}
  }
}
```

### 2. 스크립트 관리

#### 스크립트 목록 조회
```http
GET /api/scripts
```

**응답**: 스크립트 배열 직접 반환
```json
[
  {
    "id": 1,
    "name": "테스트 스크립트",
    "description": "설명",
    "active": true,
    "execution_order": 1,
    "last_executed_at": "2025-01-01T00:00:00",
    "created_at": "2025-01-01T00:00:00",
    "updated_at": "2025-01-01T00:00:00"
  }
]
```

#### 스크립트 조회
```http
GET /api/scripts/{script_id}
```

**응답 (ScriptResponse)**:
```json
{
  "id": 1,
  "name": "테스트 스크립트",
  "description": "설명",
  "created_at": "2025-01-01T00:00:00",
  "updated_at": "2025-01-01T00:00:00",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": {"x": 100, "y": 100},
      "data": {"title": "시작"},
      "connected_to": [...],
      "parameters": {...}
    }
  ],
  "connections": [
    {
      "from": "start",
      "to": "node1",
      "outputType": null
    }
  ]
}
```

#### 스크립트 생성
```http
POST /api/scripts
Content-Type: application/json

{
  "name": "새 스크립트",
  "description": "설명"
}
```

**응답**:
```json
{
  "id": 1,
  "name": "새 스크립트",
  "description": "설명",
  "created_at": "2025-01-01T00:00:00",
  "updated_at": "2025-01-01T00:00:00",
  "message": "스크립트가 생성되었습니다."
}
```

#### 스크립트 업데이트
```http
PUT /api/scripts/{script_id}
Content-Type: application/json

{
  "name": "수정된 이름",
  "description": "수정된 설명",
  "nodes": [...],
  "connections": [...]
}
```

**응답**:
```json
{
  "message": "스크립트가 업데이트되었습니다."
}
```

#### 스크립트 삭제
```http
DELETE /api/scripts/{script_id}
```

**응답**:
```json
{
  "message": "스크립트가 삭제되었습니다.",
  "id": 1
}
```

#### 스크립트 활성/비활성 상태 변경
```http
PATCH /api/scripts/{script_id}/active
Content-Type: application/json

{
  "active": true
}
```

**응답**:
```json
{
  "message": "스크립트 활성 상태가 변경되었습니다.",
  "active": true
}
```

#### 스크립트 순서 업데이트
```http
PATCH /api/scripts/order
Content-Type: application/json

{
  "script_orders": [
    {"id": 1, "order": 0},
    {"id": 2, "order": 1}
  ]
}
```

**응답**:
```json
{
  "message": "스크립트 순서가 업데이트되었습니다.",
  "orders": [
    {"id": 1, "order": 0},
    {"id": 2, "order": 1}
  ]
}
```

### 3. 대시보드 통계

#### 대시보드 통계 조회
```http
GET /api/dashboard/stats
```

**응답**: 통계 딕셔너리 직접 반환
```json
{
  "total_scripts": 10,
  "today_executions": 5,
  "today_failed_scripts": 1,
  "inactive_scripts": 2
}
```

### 4. 노드 관리

#### 스크립트의 노드 조회
```http
GET /api/nodes/script/{script_id}
```

**응답**:
```json
{
  "script_id": 1,
  "nodes": [...],
  "connections": [...]
}
```

#### 노드 일괄 업데이트
```http
PUT /api/nodes/script/{script_id}/batch
Content-Type: application/json

{
  "nodes": [...],
  "connections": [...]
}
```

**응답**:
```json
{
  "message": "노드들이 업데이트되었습니다.",
  "node_count": 5,
  "connection_count": 4
}
```

### 5. 설정 관리

#### 서버 설정 조회
```http
GET /api/config/
```

**응답**:
```json
{
  "dev_mode": true
}
```

#### 노드 설정 조회
```http
GET /api/config/nodes
```

**응답**:
```json
{
  "nodes": {
    "start": {
      "label": "시작",
      "title": "시작",
      "description": "...",
      "script": "node-start.js",
      "isBoundary": true,
      "category": "boundary"
    }
  }
}
```

#### 사용자 설정 조회 (전체)
```http
GET /api/config/user-settings
```

**응답**: 설정 딕셔너리 직접 반환
```json
{
  "sidebar-width": "300",
  "script-order": "[1,2,3]",
  "focused-script": "1"
}
```

#### 사용자 설정 조회 (단일)
```http
GET /api/config/user-settings/{setting_key}
```

**응답**:
```json
{
  "key": "sidebar-width",
  "value": "300"
}
```

#### 사용자 설정 저장
```http
POST /api/config/user-settings
Content-Type: application/json

{
  "key": "sidebar-width",
  "value": "350"
}
```

**응답**:
```json
{
  "message": "설정이 저장되었습니다.",
  "key": "sidebar-width",
  "value": "350"
}
```

#### 사용자 설정 삭제
```http
DELETE /api/config/user-settings/{setting_key}
```

**응답**:
```json
{
  "message": "설정이 삭제되었습니다.",
  "key": "sidebar-width"
}
```

## 에러 응답

FastAPI의 기본 에러 응답 형식:
```json
{
  "detail": "에러 메시지"
}
```

HTTP 상태 코드:
- `200`: 성공
- `400`: 잘못된 요청 (Bad Request)
- `404`: 리소스를 찾을 수 없음 (Not Found)
- `500`: 서버 내부 오류 (Internal Server Error)
- `501`: 미구현 기능 (Not Implemented)

## 지원 노드 타입

- **경계 노드**: `start`, `end`
- **액션 노드**: `image-touch`, `process-focus`
- **대기 노드**: `wait`
- **조건 노드**: `condition`
- **반복 노드**: `loop`

## 관련 문서

- [시스템 아키텍처](architecture.md)
- [개발 환경 설정](development.md)
- [프로젝트 구조](project-structure.md)
