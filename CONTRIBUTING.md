# Contributing to AutoScript

기여해주셔서 감사합니다! 이 문서는 AutoScript 프로젝트에 기여하는 방법을 안내합니다.

## 빠른 시작

### 개발 환경 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd AutoScript

# 2. Python 가상환경 설정(프로젝트 루트 디렉토리에 권장)
python -m venv venv
venv\Scripts\activate  # Windows

# 3. 의존성 설치
pip install -r server/requirements-dev.txt  # Python
cd UI && npm install                        # JavaScript
```

### 서버 실행

```bash
cd server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

브라우저에서 `http://localhost:8000` 접속

## 코드 기여 방법

1. **이슈 확인**: 기존 이슈를 확인하거나 새 이슈를 생성하세요
2. **브랜치 생성**: `git checkout -b feature/your-feature-name`
3. **코드 작성**: 변경사항을 작성하세요
4. **린팅 검사**: 아래 체크리스트를 확인하세요
5. **커밋**: 명확한 커밋 메시지와 함께 커밋하세요
6. **Pull Request**: PR을 생성하고 변경사항을 설명하세요

## 코드 기여 전 확인사항

코드를 기여하기 전에 다음을 확인해주세요:

### 1. Python 코드 품질 검사

린팅과 포매팅을 실행해주세요:

```bash
# 개발 의존성 설치
pip install -r server/requirements-dev.txt

# 린팅 및 포매팅 실행
ruff check --fix server/
ruff format server/
```

### 2. JavaScript 코드 품질 검사

린팅과 포매팅을 실행해주세요:

```bash
# UI 디렉토리로 이동
cd UI

# 의존성 설치 (최초 1회만)
npm install

# 린팅 실행 (오류 확인)
npm run lint

# 린팅 자동 수정
npm run lint:fix

# 코드 포매팅
npm run format
```

> 💡 **팁**: Pre-commit hook이 자동으로 린팅을 검사합니다. 커밋 전에 자동으로 실행됩니다.

자세한 내용은 [코드 린팅 가이드](docs/dev/linting.md)와 [JavaScript 린팅 가이드](docs/lint/javascript-linting.md)를 참고하세요.

## Pull Request 가이드

- **제목**: 변경사항을 명확하게 설명하세요
- **설명**: 무엇을 변경했는지, 왜 변경했는지 설명하세요
- **테스트**: 가능한 경우 테스트 방법을 포함하세요
- **린팅**: 모든 린팅 검사를 통과했는지 확인하세요

## 문서

자세한 개발 가이드는 다음 문서를 참고하세요:

- [개발 환경 설정](docs/dev/development.md)
- [코드 린팅 가이드](docs/dev/linting.md)
- [프로젝트 구조](docs/dev/project-structure.md)
- [API 참조](docs/dev/api-reference.md)
- [노드 추가 가이드](docs/dev/creating-nodes.md): JavaScript와 FastAPI에 노드를 추가하는 방법

## 문의

질문이나 제안사항이 있으시면 이슈를 생성해주세요.

감사합니다! 🎉

