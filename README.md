# LostSword_AutoScript

자동화를 위한 FastAPI 서버와 웹 기반 UI 도구입니다.

## 📸 웹 UI 미리보기
![웹 UI 스크린샷](assets/readme/web_ui.png)

## 시스템 요구사항

- **Python**: 3.10.6 (tags/v3.10.6:9c7b4bd, Aug 1 2022, 21:53:49) [MSC v.1932 64 bit (AMD64)] on win32
- **운영체제**: Windows 10/11
- **메모리**: 최소 4GB RAM 권장
- **디스크**: 최소 1GB 여유 공간

## 프로젝트 구조

```
LostSword_AutoScript/
├── server/                 # FastAPI 서버
│   ├── main.py             # 메인 서버 파일
│   ├── config.py           # 설정 관리
│   ├── requirements.txt    # Python 의존성
│   ├── env.example        # 환경 변수 예제
│   └── game_automation/   # 게임 자동화 모듈
│       ├── __init__.py
│       ├── screen_capture.py    # 화면 캡처 및 이미지 처리
│       ├── input_handler.py    # 입력 처리 (마우스, 키보드)
│       ├── game_state.py       # 게임 상태 관리
│       └── workflow_engine.py  # 워크플로우 실행 엔진
├── UI/                    # 웹 기반 UI
│   └── src/
│       ├── index.html     # 메인 HTML
│       ├── js/           # JavaScript 모듈들
│       ├── styles/       # CSS 스타일들
│       └── pages/        # 페이지별 파일들
└── README.md
```

## 기능

### 백엔드 (FastAPI)
- **게임 액션 API**: 클릭, 이동, 수집, 전투, 네비게이션 등
- **워크플로우 엔진**: 노드 기반 자동화 스크립트 실행
- **화면 캡처**: 게임 화면 캡처 및 이미지 매칭
- **입력 처리**: 마우스/키보드 자동화
- **게임 상태 관리**: 플레이어 정보, 인벤토리, 위치 등 추적

### 프론트엔드 (웹 기반)
- **워크플로우 편집기**: 시각적 노드 기반 스크립트 편집
- **액션 관리**: 다양한 게임 액션 관리 및 실행
- **게임 상태 모니터링**: 실시간 게임 상태 추적
- **키보드 단축키**: 저장(Ctrl+S), 노드 추가(Ctrl+N), 실행(F5/Ctrl+R) 등

## 설치 및 실행

### 사용자용 배포 (추천)

1. **개발자 배포**:
   ```bash
   # 개발자가 사용자용 패키지 생성
   deploy-for-users.bat
   ```

2. **사용자 사용**:
   ```bash
   # 배포된 폴더에서
   start-server.bat
   ```

3. **웹 브라우저에서 `http://localhost:8000` 접속**

### 개발자용 설치

1. **가상환경 생성**:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

2. **패키지 설치**:
   ```bash
   cd server
   pip install -r requirements.txt
   ```

3. **서버 실행**:
   ```bash
   # 개발용
   start-server-simple.bat
   
   # 또는 수동으로
   cd server
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **웹 브라우저에서 `http://localhost:8000` 접속**


## API 엔드포인트

### 기본 엔드포인트
- `GET /` - 서버 상태 확인
- `GET /health` - 헬스 체크

### 게임 액션
- `POST /api/action` - 단일 액션 실행
- `POST /api/execute-nodes` - 노드 기반 워크플로우 실행
- `GET /api/game-state` - 현재 게임 상태 조회

### 요청 예제

#### 단일 액션 실행
```json
POST /api/action
{
    "action_type": "click",
    "parameters": {
        "x": 100,
        "y": 200,
        "button": "left",
        "clicks": 1
    }
}
```

#### 워크플로우 실행
```json
POST /api/execute-nodes
{
    "nodes": [
        {
            "id": "node1",
            "type": "click",
            "data": {
                "x": 100,
                "y": 200
            }
        },
        {
            "id": "node2",
            "type": "move",
            "data": {
                "direction": "forward",
                "distance": 1
            }
        }
    ],
    "execution_mode": "sequential"
}
```

## 워크플로우 노드 타입

- **click**: 마우스 클릭
- **move**: 캐릭터 이동
- **collect**: 아이템 수집
- **battle**: 전투 수행
- **navigate**: 맵 이동
- **wait**: 대기
- **condition**: 조건부 실행
- **loop**: 반복 실행
- **custom**: 커스텀 액션

## 개발 가이드

### 새로운 액션 타입 추가

1. `server/game_automation/workflow_engine.py`에서 새로운 핸들러 추가
2. `server/main.py`에서 액션 처리 함수 구현
3. UI에서 인터페이스 업데이트

### 새로운 노드 타입 추가

1. `NodeType` 열거형에 새 타입 추가
2. `WorkflowEngine`에 핸들러 구현
3. UI에서 노드 생성 및 편집 기능 추가

## 라이선스

Apache-2.0 license

## 기여

이슈 및 풀 리퀘스트를 환영합니다.

## 주의사항

- 이 도구는 교육 및 연구 목적으로만 사용되어야 합니다
- 게임의 이용약관을 준수하여 사용하세요
- 자동화 사용으로 인한 계정 제재에 대한 책임은 사용자에게 있습니다
