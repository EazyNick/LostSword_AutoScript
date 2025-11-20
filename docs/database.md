# 데이터베이스 사용 가이드

이 문서는 데이터베이스 사용 방법에 대한 가이드입니다.

## 데이터베이스 파일

이 폴더에는 SQLite 데이터베이스 파일(`workflows.db`)이 저장됩니다.

## 샘플 데이터 삽입 방법

### 방법 1: SQL 파일 실행
```bash
cd server/db
sqlite3 workflows.db < insert_sample_nodes.sql
```

### 방법 2: Python 스크립트 실행
```bash
cd server
python seed_nodes.py
```

### 방법 3: SQLite CLI에서 직접 실행
```bash
cd server/db
sqlite3 workflows.db
```
그 다음 SQL 파일의 내용을 복사해서 붙여넣기

## 데이터베이스 구조

- **scripts**: 스크립트 정보
- **nodes**: 노드 정보 (위치, 타입, 데이터)
- **connections**: 노드 간 연결 정보

