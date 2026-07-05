@echo off
title EduTrack Lite - Launcher
echo ===================================================
echo   Starting EduTrack Lite Full-Stack Environment
echo ===================================================

echo [1/3] Launching FastAPI ML Microservice on http://localhost:8000...
start "EduTrack ML Service (Port 8000)" cmd /k "cd /d "%~dp0ml_service" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Launching Express Backend API on http://localhost:5000...
start "EduTrack Backend API (Port 5000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [3/3] Launching Next.js Frontend Web App on http://localhost:3000...
start "EduTrack Frontend UI (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo  All 3 servers are starting in separate windows!
echo  Open your browser to: http://localhost:3000
echo ===================================================
pause
