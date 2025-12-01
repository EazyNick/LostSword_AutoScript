# 환경 변수 설정 가이드

## 기본 동작

**`.env` 파일이 없거나 `ENVIRONMENT` 변수가 없는 경우, 자동으로 프로덕션 모드(`ENVIRONMENT=prd`)가 적용됩니다.**

즉, `.env` 파일을 생성하지 않아도 서버는 정상적으로 실행되며, 프로덕션 모드로 동작합니다.

## .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성하세요. (선택사항 - 개발 모드를 사용하려는 경우에만 필요)

### 파일 위치
```
자동화도구/
├── .env          ← 여기에 생성
├── server/
├── UI/
└── ...
```

### 파일 내용 예시

#### 개발 모드 (모든 로그 출력)
```env
ENVIRONMENT=dev
```

#### 프로덕션 모드 (로그 비활성화, 에러만 출력)
```env
ENVIRONMENT=prd
```

## 설정 값 설명

- `ENVIRONMENT=dev`: 개발 모드
  - 모든 `console.log`, `console.warn`, `console.info`, `console.debug` 출력
  - 디버깅에 유용한 상세 로그 표시
  
- `ENVIRONMENT=prd`: 프로덕션 모드
  - 일반 로그 비활성화
  - `console.error`만 출력 (에러는 항상 표시)

## 사용 방법

### 프로덕션 모드 (기본값)

`.env` 파일이 없거나 `ENVIRONMENT` 변수가 없는 경우, 자동으로 프로덕션 모드로 동작합니다.
- 별도 설정 불필요
- 로그 최소화 (에러만 출력)

### 개발 모드 사용하기

개발 모드를 사용하려면 다음 단계를 따르세요:

1. **프로젝트 루트에 `.env` 파일 생성**
   ```bash
   # Windows PowerShell
   New-Item -Path .env -ItemType File
   
   # 또는 직접 파일 생성
   ```

2. **`.env` 파일에 설정 추가**
   ```
   ENVIRONMENT=dev
   ```

3. **서버 재시작**
   - 서버를 중지하고 다시 시작해야 환경 변수가 적용됩니다.

4. **브라우저에서 확인**
   - 페이지를 새로고침 (Ctrl+Shift+R)
   - 개발자 도구 콘솔(F12)에서 확인:
     - `ENVIRONMENT=dev` → `[Logger] 개발 모드 활성화됨`
     - `ENVIRONMENT=prd` 또는 `.env` 없음 → `[Logger] 프로덕션 모드 (로그 비활성화)`

## 동작 원리

1. 서버(`server/main.py`)가 `.env` 파일을 읽습니다.
   - `.env` 파일이 없거나 `ENVIRONMENT` 변수가 없으면 기본값 `'prd'` 사용
   - `ENVIRONMENT = env_vars.get('ENVIRONMENT', 'prd').lower()`
   - `DEV_MODE = ENVIRONMENT == 'dev'`
2. `ENVIRONMENT` 값을 기반으로 `window.DEV_MODE`를 HTML에 주입합니다.
3. `logger.js`가 `window.DEV_MODE` 값을 확인합니다.
4. 개발 모드일 때만 로그를 출력합니다.

## 주의사항

- `.env` 파일은 `.gitignore`에 추가하는 것을 권장합니다.
- 서버를 재시작해야 환경 변수 변경이 적용됩니다.
- `logger.js`가 먼저 로드되어야 하므로 `workflow.html`에서 스크립트 순서를 확인하세요.

## 예시

### 개발 중 (.env)
```env
# 개발 모드 - 모든 로그 출력
ENVIRONMENT=dev
```

### 프로덕션 배포 (.env)
```env
# 프로덕션 모드 - 로그 최소화
ENVIRONMENT=prd
```

### 로그 확인

개발 모드일 때 콘솔 예시:
```
[Logger] 개발 모드 활성화됨
[api.js] 스크립트 시작
[ScriptAPI] getAllScripts() 호출됨
[apiCall] 요청 시작: GET http://localhost:8000/api/scripts
[apiCall] ✅ 응답 데이터: [...]
```

프로덕션 모드일 때 콘솔 예시:
```
[Logger] 프로덕션 모드 (로그 비활성화)
(일반 로그는 출력되지 않음)
(에러만 출력됨)
```

