BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "nodes" (
	"id"	INTEGER,
	"script_id"	INTEGER NOT NULL,
	"node_id"	TEXT NOT NULL,
	"node_type"	TEXT NOT NULL,
	"position_x"	REAL NOT NULL,
	"position_y"	REAL NOT NULL,
	"node_data"	TEXT NOT NULL,
	"created_at"	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	"connected_to"	TEXT DEFAULT '[]',
	"connected_from"	TEXT DEFAULT '[]',
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("script_id") REFERENCES "scripts"("id") ON DELETE CASCADE
);

-- 스크립트 1의 노드들
INSERT INTO "nodes" VALUES (1,1,'start','start',0.0,0.0,'{"title": "시작", "color": "green"}','2025-11-11 12:18:57','["node1"]','[]');
INSERT INTO "nodes" VALUES (2,1,'node1','action',300.0,0.0,'{"title": "페이지 이동", "color": "blue", "url": "https://example.com/login"}','2025-11-11 12:18:57','["node2"]','["start"]');
INSERT INTO "nodes" VALUES (3,1,'node2','action',600.0,0.0,'{"title": "아이디 입력", "color": "blue", "selector": "#username", "value": "testuser"}','2025-11-11 12:18:57','["node3"]','["node1"]');
INSERT INTO "nodes" VALUES (4,1,'node3','condition',300.0,150.0,'{"title": "로그인 성공 확인", "color": "orange", "condition": "check_login_success"}','2025-11-11 12:18:57','["node4", "node5"]','["node2"]');
INSERT INTO "nodes" VALUES (5,1,'node4','action',900.0,0.0,'{"title": "대시보드 이동", "color": "blue", "url": "https://example.com/dashboard"}','2025-11-11 12:18:57','["end"]','["node3"]');
INSERT INTO "nodes" VALUES (6,1,'node5','action',1200.0,0.0,'{"title": "에러 처리", "color": "red", "message": "로그인 실패"}','2025-11-11 12:18:57','["end"]','["node3"]');
INSERT INTO "nodes" VALUES (7,1,'end','end',1500.0,0.0,'{"title": "종료", "color": "red"}','2025-11-11 12:18:57','[]','["node4", "node5"]');

-- 스크립트 2의 노드들
INSERT INTO "nodes" VALUES (8,2,'start','start',0.0,0.0,'{"title": "시작", "color": "green"}','2025-11-11 12:18:57','["node1"]','[]');
INSERT INTO "nodes" VALUES (9,2,'node1','action',300.0,0.0,'{"title": "결제 페이지 이동", "color": "blue", "url": "https://example.com/payment"}','2025-11-11 12:18:57','["node2"]','["start"]');
INSERT INTO "nodes" VALUES (10,2,'node2','action',600.0,0.0,'{"title": "결제 정보 입력", "color": "blue", "card_number": "1234-5678-9012-3456"}','2025-11-11 12:18:57','["node3"]','["node1"]');
INSERT INTO "nodes" VALUES (11,2,'node3','wait',300.0,150.0,'{"title": "결제 처리 대기", "color": "purple", "duration": 3000}','2025-11-11 12:18:57','["node4"]','["node2"]');
INSERT INTO "nodes" VALUES (12,2,'node4','condition',900.0,0.0,'{"title": "결제 성공 확인", "color": "orange", "condition": "check_payment_success"}','2025-11-11 12:18:57','["end"]','["node3"]');
INSERT INTO "nodes" VALUES (13,2,'end','end',1500.0,0.0,'{"title": "종료", "color": "red"}','2025-11-11 12:18:57','[]','["node4"]');

COMMIT;

