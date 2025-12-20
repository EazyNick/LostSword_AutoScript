@echo off
REM Linting and formatting automation script
REM Runs linting and formatting for both Python (server) and JavaScript (UI)

REM Continue execution even if errors occur
setlocal enabledelayedexpansion

REM Set console window title
title Linting and Formatting Automation

REM Adjust console window size (optional)
mode con: cols=100 lines=40

echo ========================================
echo Starting Linting and Formatting
echo ========================================
echo.

REM Save original directory (where script was executed from)
set ORIGINAL_DIR=%CD%

REM Find project root directory (where server/ and UI/ folders exist)
REM Check if already in project root
if exist "server" (
    if exist "UI" (
        echo Already in project root: %CD%
        goto :found_root
    )
)

REM If running from scripts folder, go up one level
if exist "..\server" (
    if exist "..\UI" (
        cd ..
        echo Changed to project root: %CD%
        goto :found_root
    )
)

REM Try going up one more level (in case we're deeper)
cd ..
if exist "server" (
    if exist "UI" (
        echo Found project root: %CD%
        goto :found_root
    )
)

REM If still not found, try one more level
cd ..
if exist "server" (
    if exist "UI" (
        echo Found project root: %CD%
        goto :found_root
    )
)

REM Project root not found
echo [ERROR] Cannot find project root directory.
echo Please run this script from the project root or scripts folder.
echo Current location: %ORIGINAL_DIR%
echo.
echo Looking for folders: server/ and UI/
pause
exit /b 1

:found_root
echo Working directory: %CD%
echo.

REM Find and activate Python virtual environment
REM Check common virtual environment names
if exist "venv\Scripts\activate.bat" (
    echo Found virtual environment: venv
    call "venv\Scripts\activate.bat"
    goto :venv_activated
)

if exist ".venv\Scripts\activate.bat" (
    echo Found virtual environment: .venv
    call ".venv\Scripts\activate.bat"
    goto :venv_activated
)

if exist "env\Scripts\activate.bat" (
    echo Found virtual environment: env
    call "env\Scripts\activate.bat"
    goto :venv_activated
)

if exist ".env\Scripts\activate.bat" (
    echo Found virtual environment: .env
    call ".env\Scripts\activate.bat"
    goto :venv_activated
)

if exist "ENV\Scripts\activate.bat" (
    echo Found virtual environment: ENV
    call "ENV\Scripts\activate.bat"
    goto :venv_activated
)

REM Search for any directory with Scripts\activate.bat (any name)
for /d %%d in (*) do (
    if exist "%%d\Scripts\activate.bat" (
        echo Found virtual environment: %%d
        call "%%d\Scripts\activate.bat"
        goto :venv_activated
    )
)

REM Virtual environment not found
echo [WARNING] Virtual environment not found in common locations.
echo Attempting to use system Python or PATH...
echo.

:venv_activated
REM Check if ruff command exists (after venv activation)
where ruff >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ruff command not found.
    echo Please ensure:
    echo   1. Python virtual environment is activated, OR
    echo   2. ruff is installed: pip install ruff
    echo.
    goto :check_npm
)

REM Python linting and formatting (server)
REM Run from project root (do not change to server folder)
echo [1/5] Python linting check and auto-fix (server)...
ruff check --fix server/
set PYTHON_LINT_ERROR=%ERRORLEVEL%
if !PYTHON_LINT_ERROR! NEQ 0 (
    echo [WARNING] Python linting check failed. (Error code: !PYTHON_LINT_ERROR!)
) else (
    echo [SUCCESS] Python linting check completed.
)
echo.

echo [2/5] Python formatting (server)...
ruff format server/
set PYTHON_FORMAT_ERROR=%ERRORLEVEL%
if !PYTHON_FORMAT_ERROR! NEQ 0 (
    echo [WARNING] Python formatting failed. (Error code: !PYTHON_FORMAT_ERROR!)
) else (
    echo [SUCCESS] Python formatting completed.
)
echo.

REM Check if mypy command exists
where mypy >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] mypy command not found. Skipping type checking.
    echo Please install mypy: pip install mypy
    echo.
    goto :check_npm
)

echo [3/5] Mypy type checking (server)...
mypy server/
set MYPY_ERROR=%ERRORLEVEL%
if !MYPY_ERROR! NEQ 0 (
    echo [WARNING] Mypy type checking failed. (Error code: !MYPY_ERROR!)
) else (
    echo [SUCCESS] Mypy type checking completed.
)
echo.

:check_npm
REM JavaScript linting and formatting (UI)
echo [4/5] JavaScript linting check and auto-fix (UI)...

REM Check if npm command exists
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm command not found.
    echo Please ensure Node.js is installed.
    echo.
    goto :end
)

REM Check if UI folder exists
if not exist "UI" (
    echo [ERROR] UI folder not found.
    echo Current location: %CD%
    echo.
    goto :end
)

cd UI
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot change to UI folder.
    cd %ORIGINAL_DIR%
    goto :end
)

echo Changed to UI folder: %CD%
call npm run lint:fix
set JS_LINT_ERROR=%ERRORLEVEL%
if !JS_LINT_ERROR! NEQ 0 (
    echo [WARNING] JavaScript linting failed. (Error code: !JS_LINT_ERROR!)
) else (
    echo [SUCCESS] JavaScript linting completed.
)
echo.

echo [5/5] JavaScript formatting (UI)...
call npm run format
set JS_FORMAT_ERROR=%ERRORLEVEL%
if !JS_FORMAT_ERROR! NEQ 0 (
    echo [WARNING] JavaScript formatting failed. (Error code: !JS_FORMAT_ERROR!)
) else (
    echo [SUCCESS] JavaScript formatting completed.
)
echo.

REM Return to original directory
cd %ORIGINAL_DIR%

:end
echo.
echo ========================================
echo All linting and formatting tasks completed!
echo ========================================
echo.
echo Please review the execution results above.
echo.
echo Press any key to close this window...
pause

