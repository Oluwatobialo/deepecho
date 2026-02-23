@echo off
REM DeepEcho backend - requires Python 3.11 or 3.12 (MentalBERT/transformers incompatible with 3.14)
setlocal
cd /d "%~dp0backend"

py -c "import sys; v=sys.version_info; ok=(v.major==3 and 11<=v.minor<=12); sys.exit(0 if ok else 1)" 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Backend requires Python 3.11 or 3.12. MentalBERT/transformers do not support Python 3.14+.
  echo Current: 
  py -c "import sys; print(sys.version)" 2>nul
  echo.
  echo Install Python 3.12 from https://www.python.org/downloads/ then run:
  echo   py -3.12 -m venv .venv
  echo   .venv\Scripts\activate
  echo   pip install -r requirements.txt
  echo   python -m uvicorn main:app --host 127.0.0.1 --port 8002
  echo.
  exit /b 1
)

py -m uvicorn main:app --host 127.0.0.1 --port 8002
exit /b %errorlevel%
