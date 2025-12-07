@echo off
REM 린팅 및 포매팅 자동 실행 스크립트
REM Python (server)와 JavaScript (UI) 모두 린팅 및 포매팅을 실행합니다.

echo ========================================
echo 린팅 및 포매팅 자동 실행 시작
echo ========================================
echo.

REM 현재 디렉토리 저장
set ORIGINAL_DIR=%CD%

REM Python 린팅 및 포매팅 (server)
REM 프로젝트 루트에서 실행 (server 폴더로 이동하지 않음)
echo [1/4] Python 린팅 체크 및 자동 수정 (server)...
ruff check --fix server/
if %ERRORLEVEL% NEQ 0 (
    echo 경고: Python 린팅 체크 중 오류가 발생했습니다.
) else (
    echo Python 린팅 체크 완료.
)
echo.

echo [2/4] Python 포매팅 적용 (server)...
ruff format server/
if %ERRORLEVEL% NEQ 0 (
    echo 경고: Python 포매팅 중 오류가 발생했습니다.
) else (
    echo Python 포매팅 완료.
)
echo.

REM JavaScript 린팅 및 포매팅 (UI)
echo [3/4] JavaScript 린팅 체크 및 자동 수정 (UI)...
cd UI
if %ERRORLEVEL% NEQ 0 (
    echo 오류: UI 폴더를 찾을 수 없습니다.
    cd %ORIGINAL_DIR%
    exit /b 1
)
call npm run lint:fix
if %ERRORLEVEL% NEQ 0 (
    echo 경고: JavaScript 린팅 중 오류가 발생했습니다.
) else (
    echo JavaScript 린팅 완료.
)
echo.

echo [4/4] JavaScript 포매팅 적용 (UI)...
call npm run format
if %ERRORLEVEL% NEQ 0 (
    echo 경고: JavaScript 포매팅 중 오류가 발생했습니다.
) else (
    echo JavaScript 포매팅 완료.
)
echo.

REM 원래 디렉토리로 복귀
cd %ORIGINAL_DIR%

echo ========================================
echo 모든 린팅 및 포매팅 작업 완료!
echo ========================================
pause

