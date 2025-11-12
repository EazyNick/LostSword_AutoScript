-- SQLite 데이터베이스에 샘플 노드 데이터를 추가하는 SQL 스크립트
-- 실행 방법: sqlite3 server/db/workflows.db < server/db/insert_sample_nodes.sql

-- 기존 데이터 삭제 (선택사항 - 주석 해제하면 기존 데이터 삭제)
-- DELETE FROM connections;
-- DELETE FROM nodes;
-- DELETE FROM scripts;

-- ==========================================
-- 1. 스크립트 데이터 삽입
-- ==========================================

-- 스크립트 1: 로그인 테스트
INSERT OR IGNORE INTO scripts (id, name, description, created_at, updated_at) 
VALUES (1, '로그인 테스트', '사용자 로그인 프로세스 검증', datetime('now'), datetime('now'));

-- 스크립트 2: 결제 프로세스 테스트
INSERT OR IGNORE INTO scripts (id, name, description, created_at, updated_at) 
VALUES (2, '결제 프로세스 테스트', '온라인 결제 과정 검증', datetime('now'), datetime('now'));

-- ==========================================
-- 2. 스크립트 1의 노드 데이터 삽입
-- ==========================================

-- 시작 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'start', 'start', 49800, 49900, 
        '{"title": "시작", "color": "green"}', 
        datetime('now'));

-- 페이지 이동 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'node1', 'action', 50000, 49900, 
        '{"title": "페이지 이동", "color": "blue", "url": "https://example.com/login"}', 
        datetime('now'));

-- 아이디 입력 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'node2', 'action', 50200, 49900, 
        '{"title": "아이디 입력", "color": "blue", "selector": "#username", "value": "testuser"}', 
        datetime('now'));

-- 로그인 성공 확인 노드 (조건 노드)
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'node3', 'condition', 50400, 49900, 
        '{"title": "로그인 성공 확인", "color": "orange", "condition": "check_login_success"}', 
        datetime('now'));

-- 대시보드 이동 노드 (True 경로)
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'node4', 'action', 50600, 49700, 
        '{"title": "대시보드 이동", "color": "blue", "url": "https://example.com/dashboard"}', 
        datetime('now'));

-- 에러 처리 노드 (False 경로)
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'node5', 'action', 50600, 50100, 
        '{"title": "에러 처리", "color": "red", "message": "로그인 실패"}', 
        datetime('now'));

-- 종료 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (1, 'end', 'end', 50800, 49900, 
        '{"title": "종료", "color": "red"}', 
        datetime('now'));

-- ==========================================
-- 3. 스크립트 1의 연결 데이터 삽입
-- ==========================================

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'start', 'node1', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'node1', 'node2', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'node2', 'node3', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'node3', 'node4', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'node3', 'node5', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'node4', 'end', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (1, 'node5', 'end', datetime('now'));

-- ==========================================
-- 4. 스크립트 2의 노드 데이터 삽입
-- ==========================================

-- 시작 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (2, 'start', 'start', 49800, 49900, 
        '{"title": "시작", "color": "green"}', 
        datetime('now'));

-- 결제 페이지 이동 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (2, 'node1', 'action', 50000, 49900, 
        '{"title": "결제 페이지 이동", "color": "blue", "url": "https://example.com/payment"}', 
        datetime('now'));

-- 결제 정보 입력 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (2, 'node2', 'action', 50200, 49900, 
        '{"title": "결제 정보 입력", "color": "blue", "card_number": "1234-5678-9012-3456", "cvv": "123"}', 
        datetime('now'));

-- 결제 처리 대기 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (2, 'node3', 'wait', 50400, 49900, 
        '{"title": "결제 처리 대기", "color": "purple", "duration": 3000}', 
        datetime('now'));

-- 결제 성공 확인 노드 (조건 노드)
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (2, 'node4', 'condition', 50600, 49900, 
        '{"title": "결제 성공 확인", "color": "orange", "condition": "check_payment_success"}', 
        datetime('now'));

-- 종료 노드
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (2, 'end', 'end', 50800, 49900, 
        '{"title": "종료", "color": "red"}', 
        datetime('now'));

-- ==========================================
-- 5. 스크립트 2의 연결 데이터 삽입
-- ==========================================

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (2, 'start', 'node1', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (2, 'node1', 'node2', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (2, 'node2', 'node3', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (2, 'node3', 'node4', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (2, 'node4', 'end', datetime('now'));

-- ==========================================
-- 6. 추가 샘플 스크립트 (선택사항)
-- ==========================================

-- 스크립트 3: 데이터 수집 테스트
INSERT OR IGNORE INTO scripts (id, name, description, created_at, updated_at) 
VALUES (3, '데이터 수집 테스트', '웹 페이지에서 데이터를 수집하는 테스트', datetime('now'), datetime('now'));

-- 스크립트 3의 노드들
INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (3, 'start', 'start', 49800, 49900, 
        '{"title": "시작", "color": "green"}', 
        datetime('now'));

INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (3, 'node1', 'action', 50000, 49900, 
        '{"title": "목록 페이지 이동", "color": "blue", "url": "https://example.com/list"}', 
        datetime('now'));

INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (3, 'node2', 'loop', 50200, 49900, 
        '{"title": "아이템 반복 처리", "color": "purple", "loop_type": "for_each"}', 
        datetime('now'));

INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (3, 'node3', 'action', 50400, 49700, 
        '{"title": "데이터 추출", "color": "blue", "selector": ".item-title"}', 
        datetime('now'));

INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (3, 'node4', 'action', 50400, 50100, 
        '{"title": "다음 페이지", "color": "blue", "action": "click_next"}', 
        datetime('now'));

INSERT OR REPLACE INTO nodes (script_id, node_id, node_type, position_x, position_y, node_data, created_at)
VALUES (3, 'end', 'end', 50600, 49900, 
        '{"title": "종료", "color": "red"}', 
        datetime('now'));

-- 스크립트 3의 연결들
INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'start', 'node1', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'node1', 'node2', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'node2', 'node3', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'node2', 'node4', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'node3', 'node2', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'node4', 'node2', datetime('now'));

INSERT OR REPLACE INTO connections (script_id, from_node_id, to_node_id, created_at)
VALUES (3, 'node2', 'end', datetime('now'));

-- ==========================================
-- 완료 메시지
-- ==========================================
-- SELECT '샘플 노드 데이터 삽입 완료!' as message;
-- SELECT COUNT(*) as total_nodes FROM nodes;
-- SELECT COUNT(*) as total_connections FROM connections;
-- SELECT COUNT(*) as total_scripts FROM scripts;

