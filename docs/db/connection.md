# 데이터베이스 연결 관리

데이터베이스 연결 관리 방식에 대한 문서입니다.

## 개요

프로젝트는 `DatabaseConnection` 클래스를 통해 SQLite 데이터베이스 연결을 관리합니다.

## DatabaseConnection 클래스

**파일**: `server/db/connection.py`

### 초기화

```python
from server.db.connection import DatabaseConnection

# 기본 경로 사용 (server/db/workflows.db)
conn = DatabaseConnection()

# 사용자 지정 경로
conn = DatabaseConnection("custom/path/workflows.db")
```

**기본 경로:**
- `server/db/workflows.db`

### 주요 메서드

#### 1. `get_connection()`

데이터베이스 연결 객체를 반환합니다.

```python
db_conn = conn.get_connection()
# 사용 후 반드시 close() 호출
db_conn.close()
```

#### 2. `get_cursor(conn)`

커서 객체를 반환합니다.

```python
db_conn = conn.get_connection()
cursor = conn.get_cursor(db_conn)
cursor.execute("SELECT * FROM scripts")
db_conn.close()
```

#### 3. `execute_with_connection(callback)`

연결을 자동으로 관리하는 컨텍스트 매니저입니다.

```python
def my_callback(conn, cursor):
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트",))
    return cursor.lastrowid

script_id = conn.execute_with_connection(my_callback)
# 자동으로 커밋 및 연결 종료
```

**장점:**
- 자동 커밋/롤백 처리
- 에러 발생 시 자동 롤백
- 연결 자동 종료

## 연결 생명주기

### 일반적인 사용 패턴

```python
conn = DatabaseConnection()
db_conn = conn.get_connection()
cursor = conn.get_cursor(db_conn)

try:
    cursor.execute("SELECT * FROM scripts")
    results = cursor.fetchall()
    db_conn.commit()
except Exception as e:
    db_conn.rollback()
    raise e
finally:
    db_conn.close()
```

### execute_with_connection 사용

```python
conn = DatabaseConnection()

def query_callback(conn, cursor):
    cursor.execute("SELECT * FROM scripts")
    return cursor.fetchall()

results = conn.execute_with_connection(query_callback)
# 자동으로 커밋 및 연결 종료
```

## 트랜잭션 관리

### 자동 트랜잭션

`execute_with_connection` 메서드는 자동으로 트랜잭션을 관리합니다:

- **성공 시**: 자동 커밋
- **에러 발생 시**: 자동 롤백

```python
def save_with_rollback(conn, cursor):
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트1",))
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트2",))
    # 에러 발생 시 두 INSERT 모두 롤백됨
    raise ValueError("의도된 에러")

try:
    conn.execute_with_connection(save_with_rollback)
except ValueError:
    # 두 INSERT 모두 롤백됨
    pass
```

### 수동 트랜잭션

필요한 경우 수동으로 트랜잭션을 제어할 수 있습니다:

```python
conn = DatabaseConnection()
db_conn = conn.get_connection()
cursor = conn.get_cursor(db_conn)

try:
    cursor.execute("BEGIN TRANSACTION")
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트1",))
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트2",))
    db_conn.commit()
except Exception as e:
    db_conn.rollback()
    raise e
finally:
    db_conn.close()
```

## SQLite 특성

### 단일 연결

SQLite는 단일 연결을 사용하므로:
- 연결 풀링 불필요
- 각 작업마다 연결 생성 및 종료
- 동시성 제한 (읽기는 병렬 가능, 쓰기는 직렬화)

### 외래키 제약조건

SQLite는 기본적으로 외래키 제약조건이 비활성화되어 있습니다. 

**자동 활성화:**
`DatabaseConnection.get_connection()` 메서드에서 자동으로 활성화됩니다:

```python
def get_connection(self) -> sqlite3.Connection:
    conn = sqlite3.connect(self.db_path)
    # SQLite는 기본적으로 외래키 제약조건이 비활성화되어 있으므로 활성화
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
```

**외래키 관계:**
- `nodes.script_id` → `scripts.id` (CASCADE DELETE)
- `script_executions.script_id` → `scripts.id` (CASCADE DELETE)
- `script_tags.script_id` → `scripts.id` (CASCADE DELETE)
- `script_tags.tag_id` → `tags.id` (CASCADE DELETE)

**이점:**
- 데이터 무결성 보장
- 부모 레코드 삭제 시 자식 레코드 자동 삭제
- 잘못된 데이터 삽입 방지

## 모범 사례

### 1. 연결 자동 관리 사용

```python
# ✅ 좋은 예
def save_script(conn, cursor):
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트",))
    return cursor.lastrowid

script_id = conn.execute_with_connection(save_script)

# ❌ 나쁜 예 (연결 종료 누락 가능)
db_conn = conn.get_connection()
cursor = conn.get_cursor(db_conn)
cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트",))
db_conn.commit()
# close() 누락!
```

### 2. 에러 처리

```python
# ✅ 좋은 예: execute_with_connection 사용 (자동 롤백)
def risky_operation(conn, cursor):
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트",))
    if some_condition:
        raise ValueError("에러 발생")
    return True

try:
    result = conn.execute_with_connection(risky_operation)
except ValueError:
    # 자동으로 롤백됨
    pass

# ❌ 나쁜 예: 수동 에러 처리 (롤백 누락 가능)
db_conn = conn.get_connection()
cursor = conn.get_cursor(db_conn)
try:
    cursor.execute("INSERT INTO scripts (name) VALUES (?)", ("테스트",))
    if some_condition:
        raise ValueError("에러 발생")
    db_conn.commit()
except ValueError:
    # rollback() 누락 가능!
    pass
finally:
    db_conn.close()
```

### 3. 리소스 정리

```python
# ✅ 좋은 예: finally 블록 사용
db_conn = conn.get_connection()
try:
    cursor = conn.get_cursor(db_conn)
    cursor.execute("SELECT * FROM scripts")
    results = cursor.fetchall()
finally:
    db_conn.close()  # 항상 연결 종료

# ❌ 나쁜 예: 연결 종료 누락
db_conn = conn.get_connection()
cursor = conn.get_cursor(db_conn)
cursor.execute("SELECT * FROM scripts")
results = cursor.fetchall()
# close() 누락!
```

## 성능 고려사항

### 연결 오버헤드

SQLite는 파일 기반 데이터베이스이므로:
- 연결 생성 비용이 낮음
- 각 작업마다 연결 생성/종료 가능
- 연결 풀링 불필요

### 동시성

- **읽기**: 여러 연결에서 동시 읽기 가능
- **쓰기**: 한 번에 하나의 연결만 쓰기 가능 (자동 직렬화)

### 트랜잭션 크기

- 작은 트랜잭션 권장 (빠른 커밋)
- 큰 트랜잭션은 성능 저하 가능

