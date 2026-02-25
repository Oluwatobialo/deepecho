@echo off
echo Starting DeepEcho Backend...
cd backend
call .venv\Scripts\activate
echo Virtual environment activated (Python 3.12)
py -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload
pause
