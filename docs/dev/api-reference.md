# API 참조 문서

## 기본 정보

- **Base URL**: `.env` 파일의 `API_HOST:API_PORT` (기본값: `localhost:8000`)
- **Content-Type**: `application/json`
- **API 문서**: `http://{API_HOST}:{API_PORT}/docs`

## 주요 엔드포인트

### 노드 실행
```http
POST /api/execute-nodes
Content-Type: application/json

{
  "nodes": [
    {
      "id": "node1",
      "type": "click",
      "data": {"x": 100, "y": 200}
    }
  ],
  "execution_mode": "sequential"
}
```

**응답 형식**:
- 성공: `{"success": true, "message": "...", "data": {"results": [...]}}`
- 실패: `{"success": false, "message": "노드 실행 중 오류 발생: ...", "data": {"results": [...]}}`

**지원 노드 타입**: `click`, `image-touch`, `wait`, `condition`, `process-focus` 등

### 스크립트 관리
```http
GET    /api/scripts/list          # 목록 조회
GET    /api/scripts/{id}          # 조회
POST   /api/scripts/save          # 저장
DELETE /api/scripts/{id}          # 삭제
```

### 노드 관리
```http
GET /api/nodes/list               # 노드 목록
GET /api/nodes/{id}               # 노드 정보
```

### 사용자 설정
```http
GET  /api/user-settings/{key}     # 설정 조회
POST /api/user-settings          # 설정 저장
```

## 에러 응답

```json
{
  "success": false,
  "error": "에러 메시지"
}
```

## 관련 문서

- [시스템 아키텍처](architecture.md)
- [개발 환경 설정](development.md)

