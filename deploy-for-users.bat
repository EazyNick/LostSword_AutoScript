@echo off
echo ========================================
echo 로스트소드 자동화 도구 - 사용자 배포
echo ========================================
echo.

REM 배포 폴더 생성
set DEPLOY_DIR=LostSword_Automation
if exist "%DEPLOY_DIR%" (
    echo 기존 배포 폴더를 삭제합니다...
    rmdir /s /q "%DEPLOY_DIR%"
)

echo [1/4] 배포 폴더 생성 중...
mkdir "%DEPLOY_DIR%"

echo [2/4] 서버 코드 복사 중...
xcopy "server" "%DEPLOY_DIR%\server" /E /I /Y

echo [3/4] UI 코드 복사 중...
xcopy "UI\src" "%DEPLOY_DIR%\ui" /E /I /Y

echo [4/5] 가상환경 복사 중...
xcopy "venv" "%DEPLOY_DIR%\venv" /E /I /Y

echo [5/5] 사용자용 스크립트 복사 중...
copy "user-start-server.bat" "%DEPLOY_DIR%\start-server.bat"

echo.
echo ========================================
echo 배포 완료!
echo ========================================
echo.
echo 배포된 폴더: %DEPLOY_DIR%
echo.
echo 사용자 사용법:
echo 1. %DEPLOY_DIR%\start-server.bat 실행
echo 2. 브라우저에서 http://localhost:8000 접속
echo.
pause
