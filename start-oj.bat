@echo off
setlocal

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-rin-oj.ps1"

if errorlevel 1 (
  echo.
  echo Rin OJ startup failed. Check .logs\*.err.log for details.
  pause
  exit /b 1
)

echo.
echo Rin OJ startup finished.
echo Web:     http://127.0.0.1:3000
echo Gateway: http://127.0.0.1:8080/healthz
echo Logs:    .logs\
echo.
pause
