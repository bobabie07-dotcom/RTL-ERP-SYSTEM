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
    echo  Download the LTS version, install it, then run this file again.
    echo.
    pause
    start https://nodejs.org
    exit
)

if not exist "node_modules" (
    echo  Installing dependencies for the first time... (takes ~1 minute)
    echo.
    call npm install
)

echo  Opening app in your browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

npm run dev
pause
