-- 기존 execution_logs 테이블 삭제 (로그 기능 제거)
-- 실행 방법: sqlite3 server/db/workflows.db < server/db/remove_logs_table.sql

DROP TABLE IF EXISTS execution_logs;

-- 삭제 확인
SELECT 'execution_logs 테이블이 삭제되었습니다.' as message;

