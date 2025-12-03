# 개발자 가이드

## 개발 환경 설정

### 1. 가상환경 생성 및 활성화
```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

### 2. 패키지 설치
```bash
pip install -r server/requirements.txt
```

### 3. 환경 변수 설정 (선택)
```bash
# .env 파일 생성 (프로젝트 루트)
ENVIRONMENT=dev
API_HOST=0.0.0.0
API_PORT=8000
```

## 서버 실행

### 개발 모드
```bash
cd server
python main.py
# 또는
python -m uvicorn main:app --reload
```

### 프로덕션 모드
```bash
cd server
python -m uvicorn main:app
```

## 유용한 명령어

```bash
# API 문서 확인
# 브라우저: http://localhost:8000/docs

# 포트 변경 (.env 파일 수정)
API_PORT=8001
```

## 관련 문서

- [프로젝트 구조](project-structure.md)
- [시스템 아키텍처](architecture.md)
- [환경 변수 설정](environment.md)

