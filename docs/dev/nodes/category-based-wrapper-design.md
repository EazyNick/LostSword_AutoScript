# 카테고리 기반 Wrapper 설계

## 개요

노드들을 파라미터 패턴과 기능적 특성에 따라 5가지 wrapper로 분류하여 공통 로직을 재사용하고 코드 중복을 줄입니다.

## Wrapper 분류

### 1. 경계 노드 Wrapper (BoundaryNodeWrapper)
**대상 노드**: `start`, `end` (향후 추가 가능)

**특징**:
- 파라미터가 없거나 매우 단순함
- 워크플로우의 시작/종료점 역할
- 이전 노드 출력을 받지 않음

**공통 처리**:
- 파라미터 검증 최소화
- 단순 실행 및 결과 반환

---

### 2. 흐름 제어 노드 Wrapper (FlowControlNodeWrapper)
**대상 노드**: `repeat`, `loop`, `condition`

**특징**:
- 워크플로우 실행 흐름을 제어
- 특수한 실행 방식 (반복, 분기)
- 하위 노드 체인을 관리

**공통 처리**:
- 반복/조건 정보 메타데이터 관리
- 하위 노드 체인 수집 및 실행
- 반복/분기 결과 집계

**공통 파라미터**:
- `repeat_count` (반복 노드)
- `condition_type`, `field_path`, `compare_value` (조건 노드)

---

### 3. 파일 경로 기반 Wrapper (FilePathNodeWrapper)
**대상 노드**: `file-read`, `file-write`, `excel-open`, `image-touch`

**특징**:
- 파일 경로 관련 파라미터 사용 (`file_path`, `folder_path`)
- 경로 검증 및 보안 처리 필요
- 파일 시스템 작업 수행

**공통 처리**:
- 경로 검증 (절대 경로, 경로 조작 방지)
- 경로 정규화
- 파일/폴더 존재 여부 확인
- 권한 검증

**공통 파라미터**:
- `file_path` (file-read, file-write, excel-open)
- `folder_path` (image-touch)

**추가 파라미터 예시**:
- `encoding` (file-read, file-write)
- `mode` (file-write)
- `visible` (excel-open)
- `timeout` (image-touch)

---

### 4. 이전 출력 참조 Wrapper (PreviousOutputNodeWrapper)
**대상 노드**: `excel-close`, `condition` (일부)

**특징**:
- 이전 노드의 출력 데이터를 참조
- 필드 경로를 통한 중첩 데이터 접근
- 실행 ID나 컨텍스트 정보 활용

**공통 처리**:
- 이전 노드 출력 파싱
- 필드 경로 해석 (`output.data.value` 등)
- 변수 치환 및 데이터 추출
- 실행 ID 검증 및 관리

**공통 파라미터**:
- `execution_id` (excel-close)
- `field_path` (condition, excel-close)
- `previous_output` (자동 주입)

**추가 파라미터 예시**:
- `save_changes` (excel-close)
- `condition_type`, `compare_value` (condition)

---

### 5. 단순 액션 Wrapper (SimpleActionNodeWrapper)
**대상 노드**: `click`, `wait`, `process-focus`, `http-api-request`, `testUIconfig`

**특징**:
- 기본적인 파라미터만 사용
- 복잡한 전처리/후처리 불필요
- 직접적인 액션 수행

**공통 처리**:
- 기본 파라미터 검증
- 타입 변환 및 기본값 처리
- 단순 실행 및 결과 반환

**파라미터 예시**:
- `x`, `y` (click)
- `wait_time` (wait)
- `url`, `method`, `headers`, `body` (http-api-request)
- 파라미터 없음 (process-focus)

---

## Wrapper 구현 전략

### 1. 공통 베이스 클래스
```python
class BaseNodeWrapper:
    """모든 wrapper의 기본 클래스"""
    def validate_parameters(self, parameters: dict) -> dict:
        """기본 파라미터 검증"""
        pass
    
    def pre_execute(self, parameters: dict) -> dict:
        """실행 전 처리"""
        return parameters
    
    def post_execute(self, result: dict) -> dict:
        """실행 후 처리"""
        return result
```

### 2. 각 Wrapper별 특화 메서드

#### FilePathNodeWrapper
```python
def validate_file_path(self, path: str) -> str:
    """파일 경로 검증 및 정규화"""
    pass

def check_file_permissions(self, path: str) -> bool:
    """파일 권한 확인"""
    pass
```

#### PreviousOutputNodeWrapper
```python
def parse_field_path(self, field_path: str, previous_output: dict) -> Any:
    """필드 경로 파싱 및 값 추출"""
    pass

def resolve_execution_id(self, execution_id: str, previous_output: dict) -> str:
    """실행 ID 해석"""
    pass
```

#### FlowControlNodeWrapper
```python
def collect_child_nodes(self, node_id: str) -> list:
    """하위 노드 체인 수집"""
    pass

def aggregate_results(self, results: list) -> dict:
    """반복/분기 결과 집계"""
    pass
```

---

## 분류 기준 요약

| Wrapper | 분류 기준 | 주요 파라미터 패턴 |
|---------|----------|------------------|
| **경계 노드** | `is_boundary=True` | 파라미터 없음 |
| **흐름 제어** | `category="logic"` | `repeat_count`, `condition_type`, `field_path` |
| **파일 경로** | `file_path` 또는 `folder_path` 존재 | `file_path`, `folder_path` |
| **이전 출력 참조** | `execution_id` 또는 `field_path` + `source="previous_output"` | `execution_id`, `field_path` |
| **단순 액션** | 위 조건에 해당하지 않는 모든 액션 노드 | 다양함 |

---

## 장점

1. **코드 재사용**: 공통 로직을 wrapper에 집중
2. **유지보수성**: 각 카테고리별 로직이 명확히 분리
3. **확장성**: 새로운 노드 추가 시 적절한 wrapper 선택만 하면 됨
4. **일관성**: 같은 패턴의 노드들이 동일한 방식으로 처리됨
5. **테스트 용이성**: 각 wrapper별로 독립적인 테스트 가능

---

## 마이그레이션 계획

1. **1단계**: 각 wrapper 클래스 생성 및 기본 구조 구현
2. **2단계**: 기존 노드들을 하나씩 해당 wrapper로 마이그레이션
3. **3단계**: 공통 로직을 wrapper로 이동하여 중복 제거
4. **4단계**: 테스트 및 검증
