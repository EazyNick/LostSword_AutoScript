@echo off
echo ========================================
echo 로스트소드 자동화 서버 시작
echo ========================================
echo.

REM 가상환경의 Python 직접 사용

REM 서버 디렉토리로 이동
cd server

echo 서버를 시작합니다...
echo 브라우저에서 http://localhost:8000 으로 접속하세요.
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

REM 서버 실행 (가상환경의 Python 직접 사용)
..\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000

pause
