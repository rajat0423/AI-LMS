@echo off
echo ============================================
echo   Aao Seekhe LMS - Backend Starter
echo ============================================
echo.

cd /d "%~dp0"

REM Create data folder if it doesn't exist
if not exist "data" (
    mkdir data
    echo [OK] Created data folder
)

REM Create virtual environment if it doesn't exist
if not exist "venv\Scripts\python.exe" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
    echo [INFO] Installing dependencies...
    venv\Scripts\python.exe -m pip install -r requirements.txt
    echo [OK] Dependencies installed
)

echo.
echo [INFO] Starting backend server...
echo [INFO] URL: http://127.0.0.1:8000
echo [INFO] API Docs: http://127.0.0.1:8000/docs
echo [INFO] Press Ctrl+C to stop
echo.

venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
