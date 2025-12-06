# Tag/Notes 기능 개발

화면에 note처럼 주석을 달 수 있는 기능을 개발합니다.

## 개요

워크플로우 편집 화면에서 노드나 특정 위치에 주석(note)을 추가할 수 있는 기능입니다. 이는 스크립트 개발 및 유지보수 시 중요한 정보를 기록하는 데 사용됩니다.

## 주요 기능

### 1. 주석 추가/편집/삭제
- 워크플로우 캔버스에 주석 노드 추가
- 주석 내용 편집
- 주석 삭제
- 주석 위치 이동

### 2. 주석 표시
- 주석 아이콘으로 표시
- 호버 시 주석 내용 미리보기
- 클릭 시 전체 주석 내용 표시

### 3. 주석 스타일링
- 색상 구분 (중요도, 카테고리별)
- 크기 조절
- 폰트 스타일 (굵게, 기울임 등)

### 4. 주석 검색
- 주석 내용 검색
- 주석이 있는 노드 필터링

## 데이터베이스 구조

### 테이블 설계
```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    node_id TEXT,  -- 연결된 노드 ID (NULL이면 독립 주석)
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    content TEXT NOT NULL,
    color TEXT DEFAULT '#FFD700',  -- 주석 색상
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
)
```

## UI/UX 요구사항

### 주석 노드 디자인
- 노트 아이콘 (📝 또는 📌)
- 배경색으로 구분
- 텍스트 영역 (여러 줄 지원)
- 크기 조절 핸들

### 인터랙션
- 더블클릭으로 편집 모드 진입
- 드래그로 위치 이동
- 우클릭 메뉴 (편집, 삭제, 색상 변경)
- 노드와 연결선으로 연결 가능

## 구현 단계

### Phase 1: 기본 기능
1. 주석 노드 타입 추가
2. 주석 추가/편집/삭제 기능
3. 주석 데이터베이스 저장/로드

### Phase 2: 고급 기능
1. 주석 색상 커스터마이징
2. 주석 검색 기능
3. 주석 미리보기

### Phase 3: 통합 기능
1. 노드와 주석 연결
2. 주석 그룹화
3. 주석 템플릿

## 참고사항

- 기존 노드 시스템과의 통합 필요
- 주석은 워크플로우 실행에 영향을 주지 않음
- 주석은 스크립트별로 관리됨

