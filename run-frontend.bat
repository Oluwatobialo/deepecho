@echo off
cd /d "%~dp0"
echo Starting DeepEcho frontend (API: http://localhost:8002)...
call npm.cmd run dev
pause
