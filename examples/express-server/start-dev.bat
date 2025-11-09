@echo off
REM Solana Tip SDK - Development Startup Script (Windows)

echo Starting Solana Tip SDK Example Server...
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo .env file created. You can edit it to customize settings.
    echo.
)

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start server
echo Starting server...
echo.
node server.js
