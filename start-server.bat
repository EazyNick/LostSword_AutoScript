@echo off
REM Server startup batch file
REM Usage: start-server.bat

REM Enable delayed expansion for variable handling in loops
setlocal enabledelayedexpansion

echo ========================================
echo AutoScript Server Starting
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

REM Read .env file and set environment variables
REM Default values if .env file doesn't exist or variables are not set
set API_HOST=127.0.0.1
set API_PORT=8001

REM Check if .env file exists
if exist ".env" (
    echo Reading .env file...
    REM Read .env file line by line
    for /f "usebackq eol=# tokens=1,2 delims==" %%a in (".env") do (
        REM eol=# skips lines starting with #
        set "key=%%a"
        set "value=%%b"
        REM Remove leading/trailing spaces from key
        for /f "tokens=*" %%k in ("!key!") do set "key=%%k"
        REM Check if this is API_HOST or API_PORT (case-insensitive)
        if /i "!key!"=="API_HOST" (
            REM Remove quotes and spaces from value
            set "value=!value:"=!"
            for /f "tokens=*" %%v in ("!value!") do set API_HOST=%%v
        )
        if /i "!key!"=="API_PORT" (
            REM Remove quotes and spaces from value
            set "value=!value:"=!"
            for /f "tokens=*" %%v in ("!value!") do set API_PORT=%%v
        )
    )
) else (
    echo [INFO] .env file not found. Using default values.
)

REM Change to server directory
cd server

REM Start server
echo Starting server...
echo Host: %API_HOST%
echo Port: %API_PORT%
echo Auto-reload: Enabled
echo.
echo Press Ctrl+C to stop the server.
echo ========================================
echo.

python -m uvicorn main:app --reload --host %API_HOST% --port %API_PORT%

REM Handle errors
if errorlevel 1 (
    echo.
    echo [ERROR] An error occurred while starting the server.
    echo.
    pause
    exit /b 1
)
