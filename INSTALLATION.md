# 설치 및 실행 가이드

AutoScript를 설치하고 실행하는 방법을 안내합니다.

## 시스템 요구사항

- **Python**: 3.10.6 이상
- **운영체제**: Windows 10/11
- **메모리**: 최소 4GB RAM 권장
- **디스크**: 최소 1GB 권장

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone <repository-url>
cd AutoScript
```

### 2. 가상환경 생성 및 활성화

```bash
python -m venv venv
venv\Scripts\activate
```

### 3. 패키지 설치

```bash
cd server
pip install -r requirements.txt
```

### 4. 서버 실행

```bash
cd server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 5. 웹 브라우저에서 접속

브라우저에서 `http://localhost:8000` 접속

## 문제 해결

설치나 실행 중 문제가 발생하면 [이슈](https://github.com/your-repo/issues)를 생성해주세요.

