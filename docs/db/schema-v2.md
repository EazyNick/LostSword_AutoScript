# 데이터베이스 스키마 v2.0 (향후 적용 예정)

n8n ERD를 참고하여 재설계된 개선된 데이터베이스 스키마입니다.

## 개요

- **데이터베이스**: SQLite 3
- **테이블 수**: 12개
- **뷰 수**: 2개
- **상태**: 설계 완료, 적용 예정

## 주요 개선사항

1. **워크플로우 관리 개선**: `scripts` → `workflows`로 변경, JSON 기반 노드 저장
2. **실행 기록 시스템**: 실행 내역 및 통계 관리
3. **태그 시스템**: 워크플로우 분류 및 검색
4. **성능 최적화**: 인덱스 및 뷰 추가
5. **확장성**: 사용자 시스템, 웹훅 시스템 확장 준비

## 테이블 구조

### 1. `settings` 테이블

시스템 전역 설정을 저장합니다.

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    loadOnStartup INTEGER DEFAULT 0
)
```

**용도:**
- 애플리케이션 전역 설정
- 시작 시 자동 로드 여부 관리

### 2. `variables` 테이블

전역 변수를 관리합니다.

```sql
CREATE TABLE variables (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    value TEXT NOT NULL
)
```

**인덱스:**
- `idx_variables_key`: 키 기반 조회 최적화

### 3. `workflows` 테이블

워크플로우 정보를 저장합니다. (기존 `scripts` 개선)

```sql
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 0,
    nodes TEXT NOT NULL,              -- JSON 배열
    connections TEXT NOT NULL,         -- JSON 객체
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings TEXT,                     -- JSON 객체
    static_data TEXT,                  -- JSON 객체
    pin_data TEXT,                     -- JSON 객체
    trigger_count INTEGER DEFAULT 0,
    meta TEXT                          -- JSON 객체
)
```

**주요 변경사항:**
- `id`: INTEGER → TEXT (UUID 지원)
- `active`: 활성화 상태 추가
- `nodes`, `connections`: 별도 테이블 대신 JSON으로 저장
- `settings`, `static_data`, `pin_data`, `meta`: 추가 메타데이터

**인덱스:**
- `idx_workflows_active`: 활성 워크플로우 조회
- `idx_workflows_updated_at`: 최근 수정 워크플로우 조회
- `idx_workflows_name`: 이름 기반 검색

### 4. `executions` 테이블

워크플로우 실행 기록을 저장합니다.

```sql
CREATE TABLE executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    finished INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'trigger',
    retry_of TEXT,
    retry_success_id TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP,
    wait_until TIMESTAMP,
    status TEXT DEFAULT 'running',
    deleted_at TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
)
```

**상태 값:**
- `running`: 실행 중
- `success`: 성공
- `error`: 실패
- `waiting`: 대기 중

**인덱스:**
- `idx_executions_workflow_id`: 워크플로우별 조회
- `idx_executions_status`: 상태별 필터링
- `idx_executions_started_at`: 시간순 정렬
- `idx_executions_finished`: 완료 여부 필터링

### 5. `execution_data` 테이블

실행 시 워크플로우 데이터 스냅샷과 실행 결과를 저장합니다.

```sql
CREATE TABLE execution_data (
    execution_id INTEGER PRIMARY KEY,
    workflow_data TEXT,                -- JSON 객체
    data TEXT,                         -- JSON 객체
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
)
```

### 6. `execution_metadata` 테이블

실행 관련 메타데이터를 키-값 쌍으로 저장합니다.

```sql
CREATE TABLE execution_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
)
```

**인덱스:**
- `idx_execution_metadata_execution_id`: 실행별 조회
- `idx_execution_metadata_key`: 키 기반 조회

### 7. `workflow_statistics` 테이블

워크플로우별 실행 통계를 저장합니다.

```sql
CREATE TABLE workflow_statistics (
    name TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    latest_event TIMESTAMP,
    PRIMARY KEY (name, workflow_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
)
```

**용도:**
- 워크플로우별 실행 횟수
- 이벤트 카운트
- 대시보드 통계 데이터 제공

### 8. `tags` 테이블

태그 정보를 저장합니다.

```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**인덱스:**
- `idx_tags_name`: 이름 기반 검색

### 9. `workflow_tags` 테이블

워크플로우와 태그의 다대다 관계를 저장합니다.

```sql
CREATE TABLE workflow_tags (
    workflow_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (workflow_id, tag_id),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)
```

**인덱스:**
- `idx_workflow_tags_workflow_id`: 워크플로우별 태그 조회
- `idx_workflow_tags_tag_id`: 태그별 워크플로우 조회

### 10. `user_settings` 테이블 (개선)

사용자 설정을 저장합니다. (기존 테이블 개선)

```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,                      -- 향후 사용자 시스템 확장 대비
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
)
```

**주요 변경사항:**
- `user_id` 필드 추가 (향후 확장 대비)
- `UNIQUE(user_id, setting_key)` 제약조건

**인덱스:**
- `idx_user_settings_user_id`: 사용자별 조회
- `idx_user_settings_key`: 키 기반 조회

### 11. `webhooks` 테이블 (향후 확장)

웹훅 정보를 저장합니다.

```sql
CREATE TABLE webhooks (
    webhook_path TEXT NOT NULL,
    method TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    node TEXT,
    webhook_id TEXT,
    path_length INTEGER,
    PRIMARY KEY (webhook_path, method),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
)
```

### 12. `event_destinations` 테이블 (향후 확장)

이벤트 목적지 정보를 저장합니다.

```sql
CREATE TABLE event_destinations (
    id TEXT PRIMARY KEY,
    destination TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 뷰 (Views)

### 1. `execution_summary` 뷰

실행 기록 요약 정보를 제공합니다.

```sql
CREATE VIEW execution_summary AS
SELECT 
    e.id,
    e.workflow_id,
    w.name AS workflow_name,
    e.status,
    e.started_at,
    e.stopped_at,
    e.finished,
    CASE 
        WHEN e.stopped_at IS NOT NULL AND e.started_at IS NOT NULL 
        THEN (julianday(e.stopped_at) - julianday(e.started_at)) * 86400
        ELSE NULL
    END AS duration_seconds
FROM executions e
JOIN workflows w ON e.workflow_id = w.id;
```

**용도:**
- 실행 기록 조회 시 JOIN 없이 간단하게 조회
- 실행 시간 자동 계산

### 2. `workflow_stats` 뷰

워크플로우별 통계를 집계합니다.

```sql
CREATE VIEW workflow_stats AS
SELECT 
    w.id,
    w.name,
    w.active,
    w.trigger_count,
    COUNT(e.id) AS total_executions,
    SUM(CASE WHEN e.finished = 1 THEN 1 ELSE 0 END) AS finished_executions,
    SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END) AS error_count,
    MAX(e.started_at) AS last_execution_at
FROM workflows w
LEFT JOIN executions e ON w.id = e.workflow_id
GROUP BY w.id, w.name, w.active, w.trigger_count;
```

**용도:**
- 대시보드 통계 데이터 제공
- 복잡한 집계 쿼리 간소화

## 관계도

```
workflows (1) ──< (N) executions
workflows (1) ──< (N) execution_data
executions (1) ──< (N) execution_metadata
workflows (1) ──< (N) workflow_statistics
workflows (N) ──< (N) tags (workflow_tags)
workflows (1) ──< (N) webhooks
```

## 성능 최적화

### 인덱스 전략

1. **외래키 인덱스**: 모든 외래키에 인덱스 생성
2. **조회 패턴 기반**: 자주 조회되는 컬럼에 인덱스 생성
3. **복합 인덱스**: WHERE 절에서 자주 함께 사용되는 컬럼 조합

### 뷰 활용

- 복잡한 JOIN 및 집계 쿼리를 뷰로 캡슐화
- 쿼리 성능 향상 및 유지보수성 개선

## 마이그레이션

v1.0에서 v2.0으로 마이그레이션하는 방법은 `TableManagerV2.migrate_from_v1()` 메서드를 사용합니다.

자세한 내용은 [스키마 비교 문서](../database-schema-comparison.md)를 참고하세요.

