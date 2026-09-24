@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================================
echo              HUY TU DONG KHOI DONG MAY CHU CUNG WINDOWS
echo ==============================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-autostart.ps1" -Action uninstall
echo.
echo [DA HUY] May chu se khong tu dong chay khi bat may tinh nua.
echo.
pause
