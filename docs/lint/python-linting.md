# Python 린팅 자동화 가이드

## 개요

개발 중 매번 린팅 명령어를 입력하는 것을 자동화하기 위한 스크립트와 Git hook을 제공합니다.

## 사용 방법

### 1. 수동 실행 (스크립트 사용)

#### Windows (PowerShell)
```powershell
.\scripts\linting\lint.ps1
```

#### Linux/Mac (Bash)
```bash
chmod +x scripts/linting/lint.sh
./scripts/linting/lint.sh
```

#### Python (모든 플랫폼)
```bash
python scripts/linting/lint.py
```

### 2. 자동 실행 (Git Pre-commit Hook)

커밋 전에 자동으로 린팅 검사를 실행합니다.

#### 설정 방법

1. **Git hooks 디렉토리 확인**
   ```bash
   # Git 저장소가 초기화되어 있어야 합니다
   git init  # 아직 초기화하지 않았다면
   ```

2. **Pre-commit hook 활성화**
   ```bash
   # Windows (Git Bash)
   chmod +x .git/hooks/pre-commit
   
   # 또는 PowerShell에서
   icacls .git/hooks/pre-commit /grant Everyone:RX
   ```

3. **테스트**
   ```bash
   git add .
   git commit -m "test"
   # 자동으로 린팅 검사가 실행됩니다
   ```

#### Hook 비활성화 (필요시)

```bash
# 임시로 비활성화
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled

# 다시 활성화
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
```

### 3. VS Code / Cursor 설정 (선택사항)

`.vscode/tasks.json` 파일을 생성하여 작업으로 등록할 수 있습니다:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Lint",
            "type": "shell",
            "command": "python",
            "args": ["scripts/linting/lint.py"],
            "problemMatcher": [],
            "group": {
                "kind": "test",
                "isDefault": true
            }
        }
    ]
}
```

단축키 `Ctrl+Shift+P` → "Tasks: Run Task" → "Lint" 선택

## 실행되는 명령어

스크립트는 다음 순서로 실행됩니다:

1. **Ruff 자동 수정**: `ruff check --fix server/`
2. **Ruff 포매팅**: `ruff format server/`
3. **Ruff 검사**: `ruff check server/`
4. **Mypy 타입 체크**: `mypy server/`

모든 단계가 통과해야 커밋이 진행됩니다.

## 문제 해결

### Pre-commit Hook이 실행되지 않는 경우

1. **권한 확인**
   ```bash
   ls -la .git/hooks/pre-commit
   # 실행 권한이 있어야 합니다 (x)
   ```

2. **수동 실행 테스트**
   ```bash
   .git/hooks/pre-commit
   ```

3. **Git 설정 확인**
   ```bash
   git config core.hooksPath
   # 비어있거나 .git/hooks를 가리켜야 합니다
   ```

### 린팅 실패 시

- 에러 메시지를 확인하고 수정
- 자동 수정이 안 되는 경우 수동으로 수정
- `--no-verify` 플래그로 hook 건너뛰기 (권장하지 않음)
  ```bash
  git commit --no-verify -m "message"
  ```

### 명령어를 찾을 수 없는 경우

스크립트는 자동으로 가상환경에서 `ruff`와 `mypy`를 찾습니다. 만약 찾지 못한다면:

1. **가상환경 확인**
   ```bash
   # 가상환경이 있는지 확인
   ls -la .venv  # 또는 venv, env
   ```

2. **가상환경 활성화 후 수동 실행**
   ```bash
   # Windows
   .venv\Scripts\activate
   
   # Linux/Mac
   source .venv/bin/activate
   
   # 그 후 스크립트 실행
   python scripts/linting/lint.py
   ```

3. **ruff와 mypy 설치 확인**
   ```bash
   pip list | grep ruff
   pip list | grep mypy
   ```

## 참고

- Pre-commit hook은 커밋 전에만 실행됩니다
- 푸시 전 검사는 GitHub Actions 등을 사용하세요
- 자세한 린팅 설정은 `docs/dev/linting.md`를 참고하세요
- GitHub Desktop 사용 시 메시지 확인 방법은 `docs/lint/github-desktop-hooks.md`를 참고하세요
