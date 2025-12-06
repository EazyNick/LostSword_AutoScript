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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**특징:**
- 단순한 스크립트 정보만 저장
- 활성화 상태, 설정, 메타데이터 없음
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

## 결론

새로운 스키마는 다음과 같은 이점을 제공합니다:

1. **확장성**: 향후 기능 추가에 유연하게 대응
2. **성능**: 인덱스 및 뷰를 통한 쿼리 최적화
3. **추적성**: 실행 기록 추적
4. **분류**: 태그 시스템을 통한 워크플로우 관리
5. **통계**: 실행 통계 및 분석 기능 제공

기존 구조의 단순함을 유지하면서도, n8n과 같은 엔터프라이즈급 워크플로우 도구의 핵심 기능을 제공할 수 있는 구조로 개선되었습니다.

