# 환경 변수 설정 가이드

## 기본 동작

`.env` 파일이 없으면 기본값으로 프로덕션 모드(`ENVIRONMENT=prd`)가 적용됩니다.

## .env 파일 생성 (프로젝트 루트)

```env
# 개발 모드 (모든 로그 출력)
ENVIRONMENT=dev

# 프로덕션 모드 (에러만 출력)
ENVIRONMENT=prd

# API 설정
API_HOST=127.0.0.1  # 보안: 로컬호스트에서만 접근 가능 (기본값)
API_PORT=8001  # 기본 포트 8001
```

## 설정 값

- `ENVIRONMENT=dev`: 개발 모드 (모든 로그 출력)
- `ENVIRONMENT=prd`: 프로덕션 모드 (에러만 출력, 기본값)
- `API_HOST`: 서버 호스트 (기본값: `127.0.0.1` - 로컬호스트만 접근 가능)
- `API_PORT`: 서버 포트 (기본값: `8000`)

## 동작 원리

1. 서버가 `.env` 파일을 읽어 `window.API_HOST`, `window.API_PORT`, `window.DEV_MODE`를 HTML에 주입
2. 클라이언트 JavaScript가 `window.API_BASE_URL`로 동적 API URL 생성
3. `logger.js`가 `window.DEV_MODE`로 로그 출력 제어

