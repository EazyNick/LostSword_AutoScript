# 데이터베이스 스키마 비교 문서

## 개요

n8n ERD를 참고하여 기존 데이터베이스 구조를 재설계했습니다. 이 문서는 기존 구조와 새로운 구조의 차이점을 설명합니다.

## 기존 스키마 (v1.0)

### 테이블 구조

#### 1. `scripts` 테이블
```sql
CREATE TABLE scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active INTEGER DEFAULT 1,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**특징:**
- 단순한 스크립트 정보만 저장
- 활성화 상태 관리 (`active`)
- 마지막 실행 시간 추적 (`last_executed_at`)
- 버전 관리 없음

#### 2. `nodes` 테이블
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
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
)
```

**특징:**
- 노드 정보를 개별 행으로 저장
- 연결 정보를 JSON으로 저장
- 인덱스 부족으로 조회 성능 저하 가능

#### 3. `user_settings` 테이블
```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**특징:**
- 단순 키-값 쌍 저장
- 사용자 구분 없음 (향후 확장 어려움)

### 기존 구조의 문제점

1. **실행 기록 부재**: 실행 내역 및 통계 관리 불가
2. **태그 시스템 부재**: 워크플로우 분류 및 검색 어려움
3. **인덱스 부족**: 대용량 데이터 처리 시 성능 저하
4. **확장성 부족**: 사용자 시스템, 프로젝트 시스템 확장 어려움
5. **통계 기능 부재**: 워크플로우 실행 통계 수집 불가

## 새로운 스키마 (v2.0)

### 주요 개선사항

#### 1. 워크플로우 테이블 개선 (`workflows`)

**변경사항:**
- `scripts` → `workflows`로 테이블명 변경 (더 명확한 의미)
- `id`를 INTEGER에서 TEXT로 변경 (UUID 지원)
- `nodes`, `connections`를 별도 테이블이 아닌 JSON으로 저장 (성능 최적화)
- `settings`, `static_data`, `pin_data`, `meta` 필드 추가
- `trigger_count` 필드 추가

**인덱스 추가:**
- `idx_workflows_updated_at`: 최근 수정 워크플로우 조회 최적화
- `idx_workflows_name`: 이름 기반 검색 최적화

#### 2. 실행 기록 시스템

**새로 추가된 테이블:**

##### `executions` 테이블
- 실행 ID, 워크플로우 ID, 상태, 시작/종료 시간
- 재시도 정보 (`retry_of`, `retry_success_id`)
- 실행 모드 (`mode`: trigger, manual 등)

##### `execution_data` 테이블
- 실행 시 워크플로우 데이터 스냅샷
- 실행 결과 데이터

##### `execution_metadata` 테이블
- 실행 관련 메타데이터 (키-값 쌍)
- 확장 가능한 구조

**인덱스:**
- `idx_executions_workflow_id`: 워크플로우별 실행 조회
- `idx_executions_status`: 상태별 필터링
- `idx_executions_started_at`: 시간순 정렬

#### 4. 워크플로우 통계 (`workflow_statistics`)

**새로 추가:**
- 워크플로우별 실행 통계
- 이벤트 카운트 및 최신 이벤트 시간
- 대시보드 통계 데이터 제공

#### 5. 태그 시스템

**새로 추가된 테이블:**

##### `tags` 테이블
- 태그 ID, 이름, 생성/수정 시간

##### `workflow_tags` 테이블
- 워크플로우-태그 다대다 관계
- 워크플로우 분류 및 검색 기능

**장점:**
- 워크플로우 분류 및 검색 용이
- 태그 기반 필터링 가능

#### 6. 시스템 설정 및 변수

**새로 추가된 테이블:**

##### `settings` 테이블
- 시스템 전역 설정
- 시작 시 로드 여부 관리

##### `variables` 테이블
- 전역 변수 관리
- 타입별 변수 저장

#### 7. 사용자 설정 개선 (`user_settings`)

**변경사항:**
- `user_id` 필드 추가 (향후 사용자 시스템 확장 대비)
- `UNIQUE(user_id, setting_key)` 제약조건으로 사용자별 설정 관리

#### 8. 성능 최적화 뷰

**새로 추가된 뷰:**

##### `execution_summary` 뷰
- 실행 기록 요약 정보
- 실행 시간 계산 포함

##### `workflow_stats` 뷰
- 워크플로우별 통계 집계
- 실행 횟수, 성공/실패 횟수 등

**장점:**
- 복잡한 집계 쿼리 간소화
- 성능 최적화

## 마이그레이션 전략

### 1단계: 데이터 마이그레이션

```sql
-- 기존 scripts → workflows 마이그레이션
INSERT INTO workflows (id, name, nodes, connections, created_at, updated_at)
SELECT 
    'wf_' || CAST(id AS TEXT) AS id,
    name,
    '[]' AS nodes,
    '{}' AS connections,
    created_at,
    updated_at
FROM scripts;
```

### 2단계: 노드 데이터 변환

```sql
-- 기존 nodes → workflows.nodes JSON 변환
-- (애플리케이션 레벨에서 처리 권장)
```

### 3단계: 사용자 설정 마이그레이션

```sql
-- 기존 user_settings → 새 user_settings (user_id NULL로 설정)
INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
SELECT 
    NULL AS user_id,
    setting_key,
    setting_value,
    updated_at
FROM user_settings_old;
```

## 성능 개선 효과

### 쿼리 성능

1. **인덱스 추가로 조회 속도 향상**
   - 워크플로우 목록 조회: ~50% 향상 예상
   - 실행 기록 조회: ~70% 향상 예상

2. **뷰 활용으로 복잡 쿼리 간소화**
   - 통계 조회 쿼리 복잡도 감소
   - 유지보수성 향상

### 확장성

1. **사용자 시스템 확장 준비**
   - `user_id` 필드 추가로 다중 사용자 지원 가능

2. **프로젝트 시스템 확장 준비**
   - 향후 `projects` 테이블 추가 시 연동 용이

3. **실행 기록 관리**
   - 대용량 실행 기록 처리 가능
   - 통계 및 분석 기능 제공

## 호환성 고려사항

### 기존 API 호환성

- 기존 API 엔드포인트는 레거시 뷰를 통해 호환성 유지
- 점진적 마이그레이션 지원

### 데이터 손실 방지

- 모든 기존 데이터를 새 스키마로 마이그레이션
- 롤백 계획 수립

## 향후 확장 계획

### 단기 (v2.1)
- 사용자 인증 시스템 (`users`, `auth_identity` 테이블)
- 프로젝트 시스템 (`projects`, `project_relation` 테이블)

### 중기 (v2.2)
- 웹훅 시스템 완전 구현 (`webhooks` 테이블 활용)
- 이벤트 시스템 (`event_destinations` 테이블 활용)

### 장기 (v3.0)
- 멀티 테넌트 지원
- 워크플로우 공유 시스템
- 크리덴셜 관리 시스템

## 유지보수 및 개발 편의성을 위한 실용적 개선안

현재 v1.0 구조를 유지하면서도, 개발과 유지보수를 더 쉽게 만들 수 있는 점진적 개선안을 제안합니다.

### 개선 원칙

1. **점진적 개선**: 기존 코드와의 호환성 유지
2. **실용성 우선**: 즉시 사용 가능한 개선사항 우선
3. **인덱스 최적화**: 조회 성능 향상
4. **데이터 무결성**: 제약조건 강화

### 1. scripts 테이블 개선

#### 추가 권장 컬럼

```sql
-- 버전 관리 (선택적, 향후 확장 대비)
ALTER TABLE scripts ADD COLUMN version INTEGER DEFAULT 1;

-- 마지막 실행 시간 (대시보드 통계용)
ALTER TABLE scripts ADD COLUMN last_executed_at TIMESTAMP;
```

**이유:**
- `version`: 향후 버전 관리 시스템 확장 대비
- `last_executed_at`: 대시보드에서 최근 실행 스크립트 표시

#### 인덱스 추가

```sql
-- 이름 기반 검색 최적화
CREATE INDEX IF NOT EXISTS idx_scripts_name ON scripts(name);

-- 최근 수정 스크립트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_scripts_updated_at ON scripts(updated_at DESC);

-- 활성 스크립트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_scripts_active ON scripts(active) WHERE active = 1;

-- 최근 실행 스크립트 조회 최적화
CREATE INDEX IF NOT EXISTS idx_scripts_last_executed ON scripts(last_executed_at DESC);
```

**성능 효과:**
- 스크립트 목록 조회 시 약 30-50% 성능 향상 예상
- 활성 스크립트만 필터링 시 약 60% 성능 향상 예상

### 2. nodes 테이블 개선

#### 제약조건 강화

```sql
-- script_id + node_id 복합 유니크 제약조건 (중복 노드 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_script_node_unique 
ON nodes(script_id, node_id);
```

**이유:**
- 같은 스크립트 내에서 동일한 node_id 중복 방지
- 데이터 무결성 보장

#### 추가 권장 컬럼

```sql
-- 노드 수정 시간 추적
ALTER TABLE nodes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 노드 순서 (선택적, 노드 정렬용)
ALTER TABLE nodes ADD COLUMN display_order INTEGER DEFAULT 0;
```

**이유:**
- `updated_at`: 노드 수정 이력 추적
- `display_order`: 노드 표시 순서 관리 (선택적)

#### 인덱스 추가

```sql
-- 스크립트별 노드 조회 최적화 (이미 외래키지만 명시적 인덱스)
CREATE INDEX IF NOT EXISTS idx_nodes_script_id ON nodes(script_id);

-- 노드 타입별 조회 최적화 (통계 및 필터링용)
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type);

-- 복합 인덱스: 스크립트 + 타입 조회
CREATE INDEX IF NOT EXISTS idx_nodes_script_type ON nodes(script_id, node_type);
```

**성능 효과:**
- 노드 조회 시 약 40-60% 성능 향상 예상
- 노드 타입별 통계 조회 시 약 70% 성능 향상 예상

### 3. 실행 기록 테이블 추가 (우선순위: 높음)

#### 간단한 실행 기록 테이블

```sql
-- 실행 기록 테이블 (간단한 버전)
CREATE TABLE IF NOT EXISTS script_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',  -- 'running', 'success', 'error', 'cancelled'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    error_message TEXT,
    execution_time_ms INTEGER,  -- 실행 시간 (밀리초)
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_executions_script_id ON script_executions(script_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON script_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON script_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_script_status ON script_executions(script_id, status);
```

**이유:**
- 실행 기록 추적 (대시보드 통계 필수)
- 에러 분석 및 디버깅 용이
- 성능 모니터링 가능

**사용 예시:**
```python
# 실행 시작
execution_id = db.execute_with_connection(lambda conn, cursor:
    cursor.execute("""
        INSERT INTO script_executions (script_id, status, started_at)
        VALUES (?, 'running', CURRENT_TIMESTAMP)
    """, (script_id,))
    return cursor.lastrowid
)

# 실행 완료
db.execute_with_connection(lambda conn, cursor:
    cursor.execute("""
        UPDATE script_executions
        SET status = ?, finished_at = CURRENT_TIMESTAMP,
            execution_time_ms = ?
        WHERE id = ?
    """, ('success', execution_time_ms, execution_id))
)
```

### 4. 태그 시스템 추가 (우선순위: 중간)

#### 태그 테이블

```sql
-- 태그 테이블
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,  -- 태그 색상 (선택적)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 스크립트-태그 관계 테이블
CREATE TABLE IF NOT EXISTS script_tags (
    script_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (script_id, tag_id),
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_script_tags_script ON script_tags(script_id);
CREATE INDEX IF NOT EXISTS idx_script_tags_tag ON script_tags(tag_id);
```

**이유:**
- 스크립트 분류 및 검색 용이
- 대시보드에서 태그별 필터링 가능
- 사용자 경험 향상

### 5. user_settings 테이블 개선

#### 향후 확장 대비

```sql
-- user_id 필드 추가 (향후 사용자 시스템 확장 대비)
ALTER TABLE user_settings ADD COLUMN user_id TEXT DEFAULT NULL;

-- 복합 유니크 제약조건 (user_id가 NULL이면 기존처럼 동작)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_key 
ON user_settings(COALESCE(user_id, ''), setting_key);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
```

**이유:**
- 향후 다중 사용자 지원 확장 용이
- 기존 코드와 호환 (user_id가 NULL이면 기존처럼 동작)

### 6. 통계 뷰 생성 (선택적)

#### 스크립트 통계 뷰

```sql
-- 스크립트 통계 뷰 (대시보드용)
CREATE VIEW IF NOT EXISTS script_stats AS
SELECT 
    s.id,
    s.name,
    s.active,
    s.last_executed_at,
    COUNT(e.id) AS total_executions,
    SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END) AS error_count,
    AVG(e.execution_time_ms) AS avg_execution_time_ms,
    MAX(e.started_at) AS last_execution_at
FROM scripts s
LEFT JOIN script_executions e ON s.id = e.script_id
GROUP BY s.id, s.name, s.active, s.last_executed_at;
```

**이유:**
- 대시보드 통계 조회 간소화
- 복잡한 집계 쿼리 캡슐화
- 성능 최적화

### 7. 트리거 추가 (선택적)

#### 자동 타임스탬프 업데이트

```sql
-- scripts.updated_at 자동 업데이트 트리거
CREATE TRIGGER IF NOT EXISTS update_scripts_timestamp
AFTER UPDATE ON scripts
BEGIN
    UPDATE scripts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- nodes.updated_at 자동 업데이트 트리거
CREATE TRIGGER IF NOT EXISTS update_nodes_timestamp
AFTER UPDATE ON nodes
BEGIN
    UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

**이유:**
- 타임스탬프 자동 관리
- 개발자 실수 방지

### 우선순위별 적용 가이드

#### Phase 1: 즉시 적용 권장 (필수)

1. **scripts 테이블 개선**
   - `active` 필드 추가
   - 인덱스 추가 (`name`, `updated_at`, `active`)

2. **nodes 테이블 개선**
   - 복합 유니크 제약조건 추가
   - 인덱스 추가 (`script_id`, `node_type`)

3. **실행 기록 테이블 추가**
   - `script_executions` 테이블 생성
   - 기본 인덱스 추가

**예상 작업 시간**: 2-3시간
**기존 코드 영향**: 최소 (기존 코드는 그대로 동작)

#### Phase 2: 단기 적용 권장 (중요)

4. **태그 시스템 추가**
   - `tags`, `script_tags` 테이블 생성

5. **user_settings 개선**
   - `user_id` 필드 추가 (NULL 허용)

**예상 작업 시간**: 3-4시간
**기존 코드 영향**: 최소 (기존 코드는 그대로 동작)

#### Phase 3: 중장기 적용 (선택적)

6. **통계 뷰 생성**
   - `script_stats` 뷰 생성

7. **트리거 추가**
   - 자동 타임스탬프 업데이트

8. **추가 컬럼**
   - `scripts.version`, `scripts.last_executed_at`
   - `nodes.updated_at`, `nodes.display_order`

**예상 작업 시간**: 2-3시간
**기존 코드 영향**: 없음

### 마이그레이션 스크립트 예시

```sql
-- Phase 1: scripts 테이블 개선
BEGIN TRANSACTION;

-- active 필드 추가
ALTER TABLE scripts ADD COLUMN active INTEGER DEFAULT 1;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_scripts_name ON scripts(name);
CREATE INDEX IF NOT EXISTS idx_scripts_updated_at ON scripts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_active ON scripts(active) WHERE active = 1;

-- nodes 테이블 개선
CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_script_node_unique 
ON nodes(script_id, node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_script_id ON nodes(script_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type);

-- 실행 기록 테이블 생성
CREATE TABLE IF NOT EXISTS script_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    error_message TEXT,
    execution_time_ms INTEGER,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_executions_script_id ON script_executions(script_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON script_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON script_executions(started_at DESC);

COMMIT;
```

### 성능 개선 효과 예상

| 작업 | 쿼리 타입 | 성능 향상 |
|------|----------|----------|
| scripts 인덱스 추가 | 이름 검색 | 30-50% |
| scripts 인덱스 추가 | 활성 스크립트 필터링 | 60% |
| nodes 인덱스 추가 | 스크립트별 노드 조회 | 40-60% |
| nodes 인덱스 추가 | 타입별 통계 조회 | 70% |
| 실행 기록 테이블 | 실행 이력 조회 | N/A (신규 기능) |

### 개발 편의성 향상

1. **디버깅 용이성**
   - 실행 기록을 통한 에러 추적
   - 노드 수정 시간 추적

2. **통계 기능**
   - 대시보드 통계 데이터 제공
   - 성능 모니터링

3. **데이터 무결성**
   - 제약조건 강화로 데이터 오류 방지
   - 중복 노드 방지

4. **확장성**
   - 향후 기능 추가 용이
   - 사용자 시스템 확장 준비

## 결론

새로운 스키마는 다음과 같은 이점을 제공합니다:

1. **확장성**: 향후 기능 추가에 유연하게 대응
2. **성능**: 인덱스 및 뷰를 통한 쿼리 최적화
3. **추적성**: 실행 기록 추적
4. **분류**: 태그 시스템을 통한 워크플로우 관리
5. **통계**: 실행 통계 및 분석 기능 제공

기존 구조의 단순함을 유지하면서도, n8n과 같은 엔터프라이즈급 워크플로우 도구의 핵심 기능을 제공할 수 있는 구조로 개선되었습니다.

### 실용적 개선안 요약

위에서 제안한 점진적 개선안은 다음과 같은 장점이 있습니다:

1. **기존 코드 호환성**: 기존 코드 수정 최소화
2. **점진적 적용**: 단계별로 적용 가능
3. **즉시 효과**: 인덱스 추가만으로도 성능 향상
4. **실용성**: 실제 개발에 필요한 기능 우선
5. **유지보수성**: 명확한 구조와 제약조건으로 버그 방지

특히 **Phase 1 (즉시 적용 권장)** 항목들은 기존 코드에 거의 영향을 주지 않으면서도 즉시 성능과 기능 향상을 가져다줍니다.

