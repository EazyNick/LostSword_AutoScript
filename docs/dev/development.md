**최신 수정일자: 2025.12.00**

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
# 프로덕션 의존성
pip install -r server/requirements.txt

# 개발 의존성 (린팅, 테스팅 등)
pip install -r server/requirements-dev.txt
```

### 3. 환경 변수 설정 (선택)
```bash
# .env 파일 생성 (프로젝트 루트)
ENVIRONMENT=dev
API_HOST=127.0.0.1  # 보안: 로컬호스트에서만 접근 가능 (기본값)
API_PORT=8001  # 기본 포트 8001
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

## 코드 품질 관리

코드 품질 관리를 위한 린팅 및 포매팅 설정에 대한 자세한 내용은 [린팅 가이드](linting.md)를 참고하세요.

## 유용한 명령어

```bash
# API 문서 확인
# 브라우저: http://localhost:8001/docs (기본 포트 8001)

# 포트 변경 (.env 파일 수정)
API_PORT=8001
```

## 관련 문서

- [프로젝트 구조](project-structure.md)
- [시스템 아키텍처](architecture.md)
- [환경 변수 설정](environment.md)
- [코드 린팅 가이드](linting.md)

