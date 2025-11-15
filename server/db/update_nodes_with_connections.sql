-- ==========================================
-- 노드 테이블에 연결 정보 추가
-- ==========================================

BEGIN TRANSACTION;

-- 스크립트 1의 노드 연결 정보 업데이트
-- start → node1
UPDATE nodes SET connected_to = '["node1"]' WHERE node_id = 'start' AND script_id = 1;
UPDATE nodes SET connected_from = '["start"]' WHERE node_id = 'node1' AND script_id = 1;

-- node1 → node2
UPDATE nodes SET connected_to = '["node2"]' WHERE node_id = 'node1' AND script_id = 1;
UPDATE nodes SET connected_from = json_set(connected_from, '$', json_array('node1')) WHERE node_id = 'node2' AND script_id = 1;

-- node2 → node3
UPDATE nodes SET connected_to = '["node3"]' WHERE node_id = 'node2' AND script_id = 1;
UPDATE nodes SET connected_from = json_set(connected_from, '$', json_array('node2')) WHERE node_id = 'node3' AND script_id = 1;

-- node3 → node4, node5 (조건 노드: 두 경로)
UPDATE nodes SET connected_to = '["node4", "node5"]' WHERE node_id = 'node3' AND script_id = 1;
UPDATE nodes SET connected_from = json_set(connected_from, '$', json_array('node3')) WHERE node_id = 'node4' AND script_id = 1;
UPDATE nodes SET connected_from = json_set(connected_from, '$', json_array('node3')) WHERE node_id = 'node5' AND script_id = 1;

-- node4 → end
UPDATE nodes SET connected_to = '["end"]' WHERE node_id = 'node4' AND script_id = 1;
UPDATE nodes SET connected_from = json_set(connected_from, '$', json_array('node4', 'node5')) WHERE node_id = 'end' AND script_id = 1;

-- node5 → end
UPDATE nodes SET connected_to = '["end"]' WHERE node_id = 'node5' AND script_id = 1;
-- end의 connected_from은 위에서 이미 업데이트됨

-- 스크립트 2의 노드 연결 정보 업데이트
-- start → node1
UPDATE nodes SET connected_to = '["node1"]' WHERE node_id = 'start' AND script_id = 2;
UPDATE nodes SET connected_from = '["start"]' WHERE node_id = 'node1' AND script_id = 2;

-- node1 → node2
UPDATE nodes SET connected_to = '["node2"]' WHERE node_id = 'node1' AND script_id = 2;
UPDATE nodes SET connected_from = '["node1"]' WHERE node_id = 'node2' AND script_id = 2;

-- node2 → node3
UPDATE nodes SET connected_to = '["node3"]' WHERE node_id = 'node2' AND script_id = 2;
UPDATE nodes SET connected_from = '["node2"]' WHERE node_id = 'node3' AND script_id = 2;

-- node3 → node4
UPDATE nodes SET connected_to = '["node4"]' WHERE node_id = 'node3' AND script_id = 2;
UPDATE nodes SET connected_from = '["node3"]' WHERE node_id = 'node4' AND script_id = 2;

-- node4 → end
UPDATE nodes SET connected_to = '["end"]' WHERE node_id = 'node4' AND script_id = 2;
UPDATE nodes SET connected_from = '["node4"]' WHERE node_id = 'end' AND script_id = 2;

COMMIT;

