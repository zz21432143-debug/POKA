@echo off
chcp 65001 >nul
set "DESK=%USERPROFILE%\Desktop"
if not exist "%DESK%" set "DESK=%USERPROFILE%\OneDrive\Desktop"
if not exist "%DESK%" (
  echo 바탕화면 폴더를 찾지 못했습니다.
  pause
  exit /b 1
)

set "SRC=%~dp0POKA.url"
copy /Y "%SRC%" "%DESK%\POKA.url" >nul
echo 바탕화면에 POKA.url 을 복사했습니다.
echo 더블클릭하면 브라우저가 열립니다. 그전에 이 폴더에서 POKA.bat 으로 서버를 켜 두세요.
pause
