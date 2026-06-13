@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo.
  echo [최초 1회만] 실행에 필요한 파일을 설치합니다. 1~2분 걸려요...
  echo.
  call npm install
)
echo.
echo ============================================================
echo  서버를 시작합니다. 잠시 후 브라우저가 자동으로 열립니다.
echo  ※ 사이트를 보는 동안 이 검은 창은 닫지 마세요.
echo  ※ 다 봤으면 이 창을 닫으면 서버가 꺼집니다.
echo ============================================================
echo.
call npm run dev -- --open
pause