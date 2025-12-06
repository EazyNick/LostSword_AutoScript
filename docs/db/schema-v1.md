# 데이터베이스 스키마 v1.0 (현재 사용 중)

현재 프로젝트에서 사용 중인 데이터베이스 스키마입니다.

## 개요

- **데이터베이스**: SQLite 3
- **파일 위치**: `server/db/workflows.db`
- **테이블 수**: 7개 (scripts, nodes, user_settings, script_executions, tags, script_tags, dashboard_stats)
- **뷰 수**: 1개 (script_stats)

## 테이블 구조

### 1. `scripts` 테이블

워크플로우(스크립트)의 기본 정보를 저장합니다.

```sql
CREATE TABLE scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active INTEGER DEFAULT 1,
    execution_order INTEGER DEFAULT NULL,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**컬럼 설명:**
- `id`: 스크립트 고유 ID (자동 증가)
- `name`: 스크립트 이름 (고유값)
- `description`: 스크립트 설명
- `active`: 스크립트 활성화 상태 (1: 활성, 0: 비활성, 기본값: 1)
- `execution_order`: 스크립트 실행 순서 (NULL이면 id 사용, '전체 실행' 시 이 순서대로 실행됨)
- `last_executed_at`: 마지막 실행 시간
- `created_at`: 생성 시간
- `updated_at`: 수정 시간

**인덱스:**
- PRIMARY KEY: `id`
- UNIQUE: `name`
- `idx_scripts_name`: 이름 검색 및 중복 체크 성능 향상
- `idx_scripts_updated_at`: 최근 수정 스크립트 조회 최적화
- `idx_scripts_active`: 활성 스크립트만 필터링 시 성능 향상 (부분 인덱스)
- `idx_scripts_last_executed`: 최근 실행 순 정렬 최적화
- `idx_scripts_execution_order`: 실행 순서 기준 정렬 최적화 (전체 실행 시 사용)

### 2. `nodes` 테이블

워크플로우 내 노드 정보와 연결 관계를 저장합니다.

```sql
CREATE TABLE nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    node_data TEXT NOT NULL,
    connected_to TEXT DEFAULT '[]',
    connected_from TEXT DEFAULT '[]',
    parameters TEXT DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE CASCADE
)
```

**컬럼 설명:**
- `id`: 노드 고유 ID (자동 증가)
- `script_id`: 소속 스크립트 ID (외래키)
- `node_id`: 노드 식별자 (워크플로우 내 고유)
- `node_type`: 노드 타입 (start, end, action, condition 등)
- `position_x`, `position_y`: 노드 위치 좌표
- `node_data`: 노드 데이터 (JSON 문자열)
- `connected_to`: 연결 대상 노드 목록 (JSON 배열)
- `connected_from`: 연결 출처 노드 목록 (JSON 배열)
- `parameters`: 노드 파라미터 (JSON 객체)
- `description`: 노드 설명
- `created_at`: 생성 시간

**인덱스:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `script_id` → `scripts.id` (CASCADE DELETE)
- `idx_nodes_script_node_unique`: 스크립트 내 노드 중복 방지 (UNIQUE)
- `idx_nodes_script_id`: 스크립트별 노드 조회 최적화
- `idx_nodes_type`: 노드 타입별 조회 최적화
- `idx_nodes_script_type`: 스크립트 + 타입 복합 인덱스

**JSON 필드 형식:**

`connected_to` 예시:
```json
[
    {"to": "node2", "outputType": null},
    {"to": "node3", "outputType": "true"}
]
```

`connected_from` 예시:
```json
["node1", "node2"]
```

`node_data` 예시:
```json
{"title": "클릭 노드", "url": "https://example.com"}
```

`parameters` 예시:
```json
{"wait_time": 3.0, "retry_count": 2}
```

### 3. `script_executions` 테이블

스크립트 실행 기록을 저장합니다. **`scripts` 테이블의 자식 테이블**입니다.

```sql
CREATE TABLE script_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    error_message TEXT,
    execution_time_ms INTEGER,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
)
```

**컬럼 설명:**
- `id`: 실행 기록 고유 ID (자동 증가)
- `script_id`: 실행된 스크립트 ID (외래키 → `scripts.id`)
- `status`: 실행 상태 (`running`, `success`, `error`)
- `started_at`: 실행 시작 시간
- `finished_at`: 실행 종료 시간
- `error_message`: 에러 메시지 (실패 시)
- `execution_time_ms`: 실행 시간 (밀리초)

**인덱스:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `script_id` → `scripts.id` (CASCADE DELETE)
- `idx_executions_script_id`: 스크립트별 실행 기록 조회 최적화
- `idx_executions_status`: 상태별 조회 최적화
- `idx_executions_started_at`: 실행 시간 순 정렬 최적화
- `idx_executions_script_status`: 스크립트 + 상태 복합 인덱스

### 4. `tags` 테이블

태그 정보를 저장합니다. **독립 테이블**이며, `script_tags`를 통해 `scripts`와 연결됩니다.

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**컬럼 설명:**
- `id`: 태그 고유 ID (자동 증가)
- `name`: 태그 이름 (고유값)
- `color`: 태그 색상
- `created_at`: 생성 시간

**인덱스:**
- PRIMARY KEY: `id`
- UNIQUE: `name`
- `idx_tags_name`: 태그 이름 검색 최적화

### 5. `script_tags` 테이블

스크립트와 태그의 다대다 관계를 저장합니다. **`scripts`와 `tags` 테이블의 자식 테이블**입니다.

```sql
CREATE TABLE script_tags (
    script_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (script_id, tag_id),
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)
```

**컬럼 설명:**
- `script_id`: 스크립트 ID (외래키 → `scripts.id`)
- `tag_id`: 태그 ID (외래키 → `tags.id`)

**인덱스:**
- PRIMARY KEY: `(script_id, tag_id)` - 복합 기본키
- FOREIGN KEY: `script_id` → `scripts.id` (CASCADE DELETE)
- FOREIGN KEY: `tag_id` → `tags.id` (CASCADE DELETE)
- `idx_script_tags_script`: 스크립트별 태그 조회 최적화
- `idx_script_tags_tag`: 태그별 스크립트 조회 최적화

### 6. `user_settings` 테이블

사용자 설정을 키-값 쌍으로 저장합니다. **독립 테이블**입니다.

```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
)
```

**컬럼 설명:**
- `id`: 설정 고유 ID (자동 증가)
- `user_id`: 사용자 ID (NULL이면 전역 설정)
- `setting_key`: 설정 키
- `setting_value`: 설정 값
- `updated_at`: 수정 시간

**인덱스:**
- PRIMARY KEY: `id`
- UNIQUE: `(user_id, setting_key)` - 사용자별 설정 키 고유성 보장
- `idx_user_settings_user_id`: 사용자별 설정 조회 최적화
- `idx_user_settings_key`: 설정 키별 조회 최적화

**주요 설정 키:**
- `focused-script-id`: 마지막으로 포커스된 스크립트 ID (값으로만 저장, 외래키 아님)
- `script-order`: 스크립트 목록 순서 (JSON 배열)
- `sidebar-width`: 사이드바 너비 (픽셀)
- `theme`: 테마 설정 (`dark`, `light`, `system`)
- `language`: 언어 설정 (`ko`, `en`)

### 7. `dashboard_stats` 테이블

대시보드 통계 데이터를 저장합니다. **독립 테이블**입니다.

```sql
CREATE TABLE dashboard_stats (
    stat_key TEXT PRIMARY KEY,
    stat_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**컬럼 설명:**
- `stat_key`: 통계 키 (기본키)
- `stat_value`: 통계 값
- `updated_at`: 수정 시간

**인덱스:**
- PRIMARY KEY: `stat_key`
- `idx_dashboard_stats_key`: 통계 키 조회 최적화

**주요 통계 키:**
- `total_scripts`: 전체 스크립트 개수
- `today_executions`: 오늘 실행 횟수
- `today_failed_scripts`: 오늘 실패한 스크립트 개수
- `inactive_scripts`: 비활성 스크립트 개수

## 테이블 관계도 (ERD)

### 계층 구조

```
scripts (부모 테이블)
├── nodes (자식 테이블)
│   └── script_id → scripts.id (외래키, CASCADE DELETE)
├── script_executions (자식 테이블)
│   └── script_id → scripts.id (외래키, CASCADE DELETE)
└── script_tags (자식 테이블)
    ├── script_id → scripts.id (외래키, CASCADE DELETE)
    └── tag_id → tags.id (외래키, CASCADE DELETE)

tags (독립 테이블)
└── script_tags (관계 테이블)
    └── tag_id → tags.id (외래키, CASCADE DELETE)

user_settings (독립 테이블)
dashboard_stats (독립 테이블)
```

### 관계 상세

#### 1. `scripts` → `nodes` (1:N)
- 하나의 스크립트는 여러 노드를 가질 수 있음
- `nodes.script_id`가 `scripts.id`를 참조
- 스크립트 삭제 시 관련 노드도 자동 삭제 (CASCADE)

#### 2. `scripts` → `script_executions` (1:N)
- 하나의 스크립트는 여러 실행 기록을 가질 수 있음
- `script_executions.script_id`가 `scripts.id`를 참조
- 스크립트 삭제 시 관련 실행 기록도 자동 삭제 (CASCADE)

#### 3. `scripts` ↔ `tags` (N:M, `script_tags`를 통한 관계)
- 하나의 스크립트는 여러 태그를 가질 수 있음
- 하나의 태그는 여러 스크립트에 연결될 수 있음
- `script_tags` 테이블이 다대다 관계를 중개
- `script_tags.script_id`가 `scripts.id`를 참조
- `script_tags.tag_id`가 `tags.id`를 참조
- 스크립트 삭제 시 관련 태그 관계도 자동 삭제 (CASCADE)
- 태그 삭제 시 관련 스크립트 관계도 자동 삭제 (CASCADE)

### 외래키 제약조건

**활성화:**
- 모든 데이터베이스 연결 생성 시 `PRAGMA foreign_keys = ON`으로 자동 활성화
- `DatabaseConnection.get_connection()` 메서드에서 처리

**이점:**
1. **데이터 무결성**: 존재하지 않는 `scripts.id`를 참조할 수 없음
2. **자동 삭제**: 부모 레코드 삭제 시 자식 레코드도 자동 삭제 (CASCADE)
3. **일관성**: 모든 테이블에서 `scripts.id`를 외래키로 일관되게 참조
4. **안전성**: 잘못된 데이터 삽입 방지

**외래키 관계 요약:**

| 자식 테이블 | 외래키 컬럼 | 부모 테이블 | 부모 컬럼 | CASCADE |
|------------|-----------|------------|---------|---------|
| `nodes` | `script_id` | `scripts` | `id` | ✅ |
| `script_executions` | `script_id` | `scripts` | `id` | ✅ |
| `script_tags` | `script_id` | `scripts` | `id` | ✅ |
| `script_tags` | `tag_id` | `tags` | `id` | ✅ |

## 데이터 접근

### Python 코드 예시

```python
from server.db.database import DatabaseManager

db = DatabaseManager()

# 스크립트 생성
script_id = db.create_script("테스트 스크립트", "설명")

# 스크립트 조회
script = db.get_script(script_id)

# 노드 저장
nodes = [
    {
        "id": "start",
        "type": "start",
        "position": {"x": 0, "y": 0},
        "data": {"title": "시작"},
        "parameters": {}
    }
]
connections = []
db.save_script_data(script_id, nodes, connections)

# 사용자 설정 저장
db.save_user_setting("theme", "dark")
theme = db.get_user_setting("theme", "light")
```

## 마이그레이션

기존 테이블에 컬럼이 추가되는 경우 `TableManager.migrate_tables()` 메서드가 자동으로 처리합니다.

현재까지 추가된 컬럼:
- `nodes.connected_to` (v1.1)
- `nodes.connected_from` (v1.1)
- `nodes.parameters` (v1.2)
- `nodes.description` (v1.3)
- `nodes.updated_at` (v1.3)
- `scripts.active` (v1.4)
- `scripts.last_executed_at` (v1.4)
- `user_settings.user_id` (v1.5)

현재까지 추가된 테이블:
- `script_executions` (v1.5) - 실행 기록 관리
- `tags` (v1.5) - 태그 시스템
- `script_tags` (v1.5) - 스크립트-태그 관계
- `dashboard_stats` (v1.5) - 대시보드 통계

현재까지 추가된 뷰:
- `script_stats` (v1.5) - 스크립트 통계 집계

현재까지 추가된 인덱스:
- `idx_scripts_execution_order` (v1.6) - 실행 순서 기준 정렬 최적화 (전체 실행 시 사용)

