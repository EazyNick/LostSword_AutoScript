@echo off
REM Server startup batch file
REM Usage: start-server.bat

echo ========================================
echo LostSword AutoScript Server Starting
echo ========================================
echo.

REM Set current directory to project root
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo.
    pause
    exit /b 1
)

REM Activate virtual environment
if exist ".venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
    echo.
) else if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
    echo.
) else (
    echo [WARNING] Virtual environment not found. (.venv or venv)
    echo Using global Python environment.
    echo.
)

REM Change to server directory
cd server

REM Start server
echo Starting server...
echo Host: 127.0.0.1
echo Port: 8001
echo Auto-reload: Enabled
echo.
echo Press Ctrl+C to stop the server.
echo ========================================
echo.

python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001

REM Handle errors
if errorlevel 1 (
    echo.
    echo [ERROR] An error occurred while starting the server.
    echo.
    pause
    exit /b 1
)
