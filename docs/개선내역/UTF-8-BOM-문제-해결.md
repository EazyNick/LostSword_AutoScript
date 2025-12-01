# UTF-8 BOM 문제 해결: 환경 변수 읽기 실패

## 문제 상황

`.env` 파일에 `ENVIRONMENT=dev`를 설정했지만, 서버에서는 `prd`로 읽히는 문제가 발생했습니다.

**증상:**
- `.env` 파일에 `ENVIRONMENT=dev` 설정
- 서버 로그: `ENVIRONMENT: prd`
- JavaScript 로그: `ENVIRONMENT: prd`

## 원인 분석

디버깅 과정에서 환경 변수를 확인한 결과:

```python
# 디버깅 코드
env_vars = {k: v for k, v in os.environ.items() if 'ENVIRONMENT' in k}
# 결과: {'\ufeffENVIRONMENT': 'dev'}
```

`.env` 파일이 UTF-8 BOM(Byte Order Mark)으로 저장되어 있어서, 키 이름이 `'\ufeffENVIRONMENT'`로 읽혔습니다.

### UTF-8 BOM이란?

- BOM(Byte Order Mark): 파일 인코딩을 나타내는 특수 문자
- UTF-8 BOM: `\ufeff` (U+FEFF)
- Windows 메모장 등에서 UTF-8로 저장할 때 자동으로 추가됨

## 해결 과정

### 1단계: 문제 확인

환경 변수를 직접 확인하여 BOM 문제를 발견:

```python
python -c "from dotenv import load_dotenv; import os; 
load_dotenv(); print({k: v for k, v in os.environ.items() if 'ENVIRONMENT' in k})"
# 결과: {'\ufeffENVIRONMENT': 'dev'}
```

### 2단계: BOM 제거

PowerShell을 사용하여 UTF-8 without BOM으로 재저장:

```powershell
$content = Get-Content .env -Raw
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path .env), $content, $utf8NoBom)
```

### 3단계: 검증

BOM 제거 후 정상 작동 확인:

```python
python -c "from dotenv import load_dotenv; import os; 
load_dotenv(); print(os.getenv('ENVIRONMENT'))"
# 결과: dev ✅
```

## 기술적 결정 사항

### BOM 제거 방법

1. **PowerShell 사용**: Windows에서 가장 간단한 방법
2. **에디터 설정**: VS Code 등에서 UTF-8 without BOM으로 저장하도록 설정
3. **코드에서 처리**: `load_dotenv()` 후 BOM 제거 (복잡함)

### 예방 방법

`.env.example` 파일을 UTF-8 without BOM으로 생성하여 템플릿으로 사용:

```powershell
# UTF-8 without BOM으로 파일 생성
$content = @"
ENVIRONMENT=dev
"@
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText(".env.example", $content, $utf8NoBom)
```

## 결과

### 해결 후

- `.env` 파일이 UTF-8 without BOM으로 저장됨
- 환경 변수가 정상적으로 읽힘
- `ENVIRONMENT=dev` 설정이 올바르게 적용됨

### 교훈

1. **파일 인코딩 주의**: 특히 Windows 환경에서 UTF-8 BOM 문제 발생 가능
2. **디버깅 방법**: 환경 변수를 직접 확인하여 문제 원인 파악
3. **예방**: 템플릿 파일을 올바른 인코딩으로 생성

## 적용 범위

다음 파일들이 영향을 받았습니다:

- `.env`: 파일 인코딩 수정
- `.env.example`: UTF-8 without BOM으로 생성
- `server/server_config.py`: 환경 변수 읽기 (정상 작동 확인)

## 향후 개선 가능 사항

1. **자동 BOM 제거**: `load_dotenv()` 전에 BOM 자동 제거 로직 추가
2. **인코딩 검증**: 환경 변수 로드 시 BOM 검사 및 경고
3. **문서화**: `.env.example`에 인코딩 주의사항 추가

