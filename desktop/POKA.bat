@echo off
chcp 65001 >nul
title POKA
setlocal EnableExtensions

set "URL=http://127.0.0.1:43123/"
set "ROOT="

if exist "%~dp0..\package.json" set "ROOT=%~dp0.."
if not defined ROOT if exist "%~dp0package.json" set "ROOT=%~dp0"

if not defined ROOT (
  echo.
  echo  이 파일만 바탕화면에 두면 사이트가 열리지 않습니다.
  echo  POKA 프로젝트 폴더 안의 desktop\POKA.bat 을 실행하세요.
  echo  또는 같은 폴더의 POKA.url 을 더블클릭하세요. ^(서버가 켜져 있을 때^)
  echo.
  pause
  exit /b 1
)

cd /d "%ROOT%"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 가 없습니다. https://nodejs.org 에서 20 이상을 설치하세요.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%URL%').StatusCode | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo 서버를 켭니다. 잠시 기다려 주세요...
  start "POKA 서버" /min cmd /c "cd /d "%ROOT%" && npm run dev"
  set "READY="
  for /L %%I in (1,1,40) do (
    if not defined READY (
      powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '%URL%').StatusCode | Out-Null; exit 0 } catch { exit 1 }"
      if not errorlevel 1 set "READY=1"
      if not defined READY timeout /t 1 /nobreak >nul
    )
  )
)

powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%URL%').StatusCode | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo 서버가 켜지지 않았습니다. 이 폴더에서 npm install 후 다시 실행하세요.
  pause
  exit /b 1
)

start "" "%URL%"
exit /b 0
