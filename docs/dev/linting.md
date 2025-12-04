# 코드 린팅 가이드

이 프로젝트는 [Ruff](https://github.com/astral-sh/ruff)를 사용하여 Python 코드의 품질을 관리합니다. Ruff는 매우 빠르고 현대적인 Python 린터 및 포매터입니다.

## 목차

- [설치](#설치)
- [기본 사용법](#기본-사용법)
- [린팅 실행](#린팅-실행)
- [포매팅 실행](#포매팅-실행)
- [설정 파일](#설정-파일)
- [타입 체킹](#타입-체킹)
- [CI/CD 통합](#cicd-통합)

## 설치

### 개발 의존성 설치

```bash
pip install -r server/requirements-dev.txt
```

또는 Ruff만 설치하려면:

```bash
pip install ruff
```

## 기본 사용법

### 전체 프로젝트 검사

```bash
# 린팅 검사
ruff check server/

# 포매팅 검사 (변경하지 않음)
ruff format --check server/
```

### 자동 수정

```bash
# 린팅 문제 자동 수정
ruff check --fix server/

# 포매팅 적용
ruff format server/
```

## 린팅 실행

### 기본 린팅

```bash
# 전체 프로젝트 린팅
ruff check server/

# 특정 디렉토리만 확인
ruff check server/api/

# 특정 파일만 확인
ruff check server/main.py
```

### 자동 수정 가능한 문제 수정

```bash
# 자동 수정 가능한 문제를 자동으로 수정
ruff check --fix server/

# 특정 파일만 수정
ruff check --fix server/main.py
```

### 출력 형식

```bash
# 간단한 출력 형식
ruff check --output-format=concise server/

# JSON 형식으로 출력
ruff check --output-format=json server/
```

### 특정 규칙만 확인

```bash
# 특정 규칙만 확인 (예: unused imports)
ruff check --select F401 server/

# 특정 규칙 제외
ruff check --ignore E501 server/
```

## 포매팅 실행

### 기본 포매팅

```bash
# 전체 프로젝트 포매팅
ruff format server/

# 특정 파일만 포매팅
ruff format server/main.py

# 특정 디렉토리만 포매팅
ruff format server/api/
```

### 변경사항 미리보기

```bash
# 실제로 변경하지 않고 차이점만 확인
ruff format --check server/

# diff 형식으로 출력
ruff format --diff server/
```

## 설정 파일

프로젝트의 린팅 설정은 `pyproject.toml` 파일에 정의되어 있습니다.

### 주요 설정

- **target-version**: Python 3.10
- **line-length**: 120자
- **활성화된 규칙**: pycodestyle, pyflakes, isort, bugbear 등

### 설정 수정

`pyproject.toml` 파일의 `[tool.ruff]` 섹션에서 설정을 변경할 수 있습니다:

```toml
[tool.ruff]
line-length = 120
target-version = "py310"

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B"]
ignore = ["E501"]  # 라인 길이 제한 무시
```

자세한 설정 옵션은 [Ruff 공식 문서](https://docs.astral.sh/ruff/)를 참고하세요.

## 타입 체킹

프로젝트는 선택적으로 [mypy](https://mypy.readthedocs.io/)를 사용한 타입 체킹을 지원합니다.

### mypy 실행

```bash
# 전체 프로젝트 타입 체크
mypy server/

# 특정 파일만 확인
mypy server/main.py
```

### 설정

타입 체킹 설정은 `pyproject.toml`의 `[tool.mypy]` 섹션에 정의되어 있습니다.

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install -r server/requirements-dev.txt
      - name: Run linter
        run: |
          ruff check server/
      - name: Check formatting
        run: |
          ruff format --check server/
```

### 로컬에서 CI 검사 실행

```bash
# 린팅 검사
ruff check server/

# 포매팅 검사
ruff format --check server/

# 둘 다 실행
ruff check server/ && ruff format --check server/
```

## 일반적인 문제 해결

### Import 정렬 문제

```bash
# isort를 사용하여 import 정렬
ruff check --select I --fix server/
```

### 사용하지 않는 import 제거

```bash
# 사용하지 않는 import 자동 제거
ruff check --select F401 --fix server/
```

### 긴 라인 처리

기본적으로 라인 길이는 120자로 설정되어 있습니다. 특정 파일이나 라인에서 무시하려면:

```python
# ruff: noqa: E501
very_long_line_that_exceeds_120_characters = "..."

# 또는 파일 전체에서 무시
# ruff: noqa
```

## 참고 자료

- [Ruff 공식 문서](https://docs.astral.sh/ruff/)
- [Ruff GitHub 저장소](https://github.com/astral-sh/ruff)
- [mypy 공식 문서](https://mypy.readthedocs.io/)

## 기여 전 체크리스트

코드를 기여하기 전에 다음을 확인하세요:

- [ ] `ruff check --fix server/` 실행하여 자동 수정 가능한 문제 해결
- [ ] `ruff format server/` 실행하여 코드 포매팅
- [ ] `ruff check server/` 실행하여 남은 문제가 없는지 확인
- [ ] `ruff format --check server/` 실행하여 포매팅이 올바른지 확인
- [ ] `mypy server/` 실행하여 타입 체크 통과 확인

## 첫 실행 가이드

### 1. 개발 의존성 설치 확인

```bash
# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 개발 의존성 설치
pip install -r server/requirements-dev.txt
```

### 2. 린팅 실행 순서

```bash
# 1단계: 자동 수정 가능한 문제 수정
ruff check --fix server/

# 2단계: 코드 포매팅
ruff format server/

# 3단계: 남은 문제 확인
ruff check server/

# 4단계: 타입 체크
mypy server/
(mypy .) # 현재 디렉토리
```

### 3. 문제 해결

- **ruff 에러**: `ruff check --fix server/`로 자동 수정 시도
- **타입 에러**: mypy가 지적한 부분에 타입 힌트 추가
- **포매팅 문제**: `ruff format server/`로 자동 포매팅

