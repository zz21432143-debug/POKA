@echo off
setlocal
cd /d "%~dp0\.."
set URL=http://127.0.0.1:43123
curl -sf --max-time 2 %URL% >nul 2>&1
if errorlevel 1 (
  start "POKA" cmd /c "npm run dev"
  timeout /t 4 /nobreak >nul
)
start "" "%URL%"
echo Cursor 미리보기가 아니라 기본 브라우저로 엽니다.
