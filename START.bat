@echo off
title RTL Poultry ERP
echo.
echo  Starting RTL Poultry Farming ERP...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Please install it from: https://nodejs.org
    pause
    start https://nodejs.org
    exit
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Python is not installed.
    echo.
    echo  Please install it from: https://python.org
    pause
    start https://python.org
    exit
)

if not exist "node_modules" (
    echo  Installing frontend dependencies...
    call npm install
)

if not exist "backend\.env" (
    echo  Creating backend\.env from example...
    copy "backend\.env.example" "backend\.env" >nul
    echo  IMPORTANT: Edit backend\.env and set your DB_PASSWORD before continuing.
    echo.
    pause
)

if not exist "backend\venv" (
    echo  Creating Python virtual environment...
    python -m venv backend\venv
)

if not exist "backend\venv\Lib\site-packages\fastapi" (
    echo  Installing backend dependencies...
    call backend\venv\Scripts\pip install -r backend\requirements.txt
)

echo.
echo  Starting API server on http://localhost:8000 ...
start "Poultry API" cmd /k "cd backend && ..\backend\venv\Scripts\python -m uvicorn main:app --reload --port 8000"

echo  Waiting for API to start...
timeout /t 3 /nobreak >nul

echo  Starting frontend on http://localhost:5173 ...
start http://localhost:5173
start http://localhost:8000/api/docs

npm run dev
pause
