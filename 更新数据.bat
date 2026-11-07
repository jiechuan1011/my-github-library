@echo off
rem Double-click me to refresh data, rebuild the page and open it.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0更新.ps1"
if errorlevel 1 echo.
echo.
pause
