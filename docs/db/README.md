# 데이터베이스 구조 문서

이 폴더에는 AutoScript 프로젝트의 데이터베이스 구조에 대한 상세 문서가 포함되어 있습니다.

## 문서 목록

- **[현재 스키마 (v1.0)](schema-v1.md)**: 현재 사용 중인 데이터베이스 스키마
- **[개선 스키마 (v2.0)](schema-v2.md)**: 향후 적용 예정인 개선된 스키마
- **[리포지토리 구조](repositories.md)**: 데이터베이스 접근 계층 구조
- **[연결 관리](connection.md)**: 데이터베이스 연결 관리 방식
- **[스키마 비교](database-schema-comparison.md)**: v1.0과 v2.0 스키마 비교

## 데이터베이스 파일

- **위치**: `server/db/workflows.db`
- **타입**: SQLite 3
- **인코딩**: UTF-8

## 빠른 시작

### 데이터베이스 초기화

```python
from server.db.database import DatabaseManager

# 데이터베이스 초기화 (테이블 생성)
db = DatabaseManager()
```

### 예시 데이터 생성

```python
from server.db.database import DatabaseManager
import logging

logger = logging.getLogger(__name__)
db = DatabaseManager()
db.seed_example_data(logger)
```

## 주요 테이블 (현재 v1.0)

### 부모 테이블
1. **scripts**: 워크플로우(스크립트) 정보 (활성화 상태 포함) - **메인 부모 테이블**

### 자식 테이블 (외래키로 `scripts` 참조)
2. **nodes**: 노드 정보 및 연결 관계 (`script_id` → `scripts.id`)
3. **script_executions**: 스크립트 실행 기록 (`script_id` → `scripts.id`)
4. **script_tags**: 스크립트-태그 관계 (`script_id` → `scripts.id`, `tag_id` → `tags.id`)

### 독립 테이블
5. **tags**: 태그 정보 (독립, `script_tags`를 통해 `scripts`와 연결)
6. **user_settings**: 사용자 설정 (키-값 쌍, 다중 사용자 지원)
7. **dashboard_stats**: 대시보드 통계 데이터

### 외래키 구조
- **부모 → 자식**: `scripts` (부모) → `nodes`, `script_executions`, `script_tags` (자식)
- **CASCADE DELETE**: 부모 레코드 삭제 시 자식 레코드도 자동 삭제
- **외래키 제약조건**: 모든 연결에서 자동 활성화 (`PRAGMA foreign_keys = ON`)

## 주요 뷰

1. **script_stats**: 스크립트 통계 집계 뷰

## 향후 개선 사항 (v2.0)

- 실행 기록 관리 (`executions`, `execution_data`, `execution_metadata`)
- 워크플로우 통계 (`workflow_statistics`)
- 태그 시스템 (`tags`, `workflow_tags`)
- 시스템 설정 및 변수 관리 (`settings`, `variables`)
- 웹훅 관리 (`webhooks`)

자세한 내용은 각 문서를 참고하세요.

