@echo off
echo ========================================
echo 로스트소드 자동화 서버 시작
echo ========================================
echo.

REM 가상환경 활성화
call venv\Scripts\activate

if %errorlevel% neq 0 (
    echo [오류] 가상환경 활성화에 실패했습니다.
    echo 가상환경이 올바르게 설치되어 있는지 확인해주세요.
    pause
    exit /b 1
)

REM 서버 디렉토리로 이동
cd server

echo 서버를 시작합니다...
echo 브라우저에서 http://localhost:8000 으로 접속하세요.
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

REM 서버 실행
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
