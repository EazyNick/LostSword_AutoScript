# 개발자 가이드

로스트소드 자동화 도구 개발 및 배포를 위한 명령어 모음입니다.

## 📋 목차
- [개발 환경 설정](#개발-환경-설정)
- [개발용 서버 실행](#개발용-서버-실행)
- [배포](#배포)
- [유용한 명령어들](#유용한-명령어들)

## 🛠️ 개발 환경 설정

### 1. 가상환경 생성 및 활성화
```bash
# 가상환경 생성
python -m venv python

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 가상환경 활성화 (Linux/Mac)
source venv/bin/activate
```

### 2. 패키지 설치
```bash
# 의존성 설치
pip install -r server\requirements.txt

# 또는 개발용 패키지 추가 설치
pip install -r requirements.txt
pip install pytest black flake8  # 개발 도구 (선택사항)
```

### 3. 환경 변수 설정
```bash
# 환경 변수 파일 복사
cp env.example .env

```

## 🚀 개발용 서버 실행

### 개발 모드 (자동 재시작)
```bash
# 가상환경 활성화 후
cd server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 프로덕션 모드 (배포용)
```bash
# 자동 재시작 없이 실행
cd server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## 📦 배포

배포 관련 스크립트는 추후 개발 완료 후 추가 예정입니다.

## 🔧 유용한 명령어들

### 서버 관련
```bash
# 서버 상태 확인
curl http://localhost:8000/health

# API 문서 확인
# 브라우저에서 http://localhost:8000/docs 접속

# 서버 로그 확인
python -m uvicorn main:app --reload --log-level debug
```

### 패키지 관리
```bash
# 현재 설치된 패키지 목록
pip list

# requirements.txt 업데이트
pip freeze > requirements.txt

# 특정 패키지 설치
pip install 패키지명

# 패키지 제거
pip uninstall 패키지명
```

### 가상환경 관리
```bash
# 가상환경 비활성화
deactivate

# 가상환경 삭제
rmdir /s venv  # Windows
rm -rf venv    # Linux/Mac

# 가상환경 재생성
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 개발 도구
```bash
# 코드 포맷팅 (black 설치 필요)
black server/

# 린팅 (flake8 설치 필요)
flake8 server/

# 테스트 실행 (pytest 설치 필요)
pytest server/tests/
```

## 🐛 문제 해결

### 포트 충돌
```bash
# 다른 포트 사용
python -m uvicorn main:app --reload --port 8001

# 사용 중인 포트 확인
netstat -ano | findstr :8000
```

### 가상환경 문제
```bash
# 가상환경 재생성
deactivate
rmdir /s venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 패키지 설치 오류
```bash
# pip 업그레이드
python -m pip install --upgrade pip

# 캐시 클리어
pip cache purge

# 강제 재설치
pip install --force-reinstall -r requirements.txt
```

## 📝 개발 팁

### FastAPI 개발
- 코드 변경 시 `--reload` 옵션으로 자동 재시작
- `http://localhost:8000/docs`에서 API 문서 자동 생성
- `http://localhost:8000/redoc`에서 대체 문서 확인

### UI 개발
- 브라우저 개발자 도구 (F12) 활용
- 네트워크 탭에서 API 호출 확인
- 콘솔에서 JavaScript 오류 확인

### 디버깅
- FastAPI 로그 레벨 조정: `--log-level debug`
- 브라우저 콘솔에서 JavaScript 디버깅
- 서버 콘솔에서 Python 오류 확인

## 🔗 유용한 링크

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [Uvicorn 공식 문서](https://www.uvicorn.org/)
- [Pydantic 공식 문서](https://pydantic-docs.helpmanual.io/)
- [OpenCV Python 문서](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [PyAutoGUI 문서](https://pyautogui.readthedocs.io/)

---

**참고**: 이 가이드는 Windows 환경을 기준으로 작성되었습니다. Linux/Mac 환경에서는 경로 구분자와 명령어가 다를 수 있습니다.

