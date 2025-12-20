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

서버를 실행하는 방법은 두 가지가 있습니다:

#### 방법 1: 배치 파일 사용 (권장) ⚡

프로젝트 루트에서 `start-server.bat` 파일을 더블클릭하거나 명령어로 실행합니다:

```bash
start-server.bat
```

**배치 파일 기능:**
- 가상환경 자동 활성화 (`.venv` 또는 `venv` 자동 감지)
- Python 설치 여부 자동 확인
- 서버 자동 실행 (호스트: 127.0.0.1, 포트: 8001)

#### 방법 2: 수동 실행

```bash
cd server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

> **참고**: 기본 포트는 8001입니다. 포트를 변경하려면 `start-server.bat` 파일을 수정하거나 수동 실행 시 `--port` 옵션을 변경하세요.

### 5. 웹 브라우저에서 접속

브라우저에서 `http://localhost:8001` 접속

## 문제 해결

설치나 실행 중 문제가 발생하면 [이슈](https://github.com/your-repo/issues)를 생성해주세요.

