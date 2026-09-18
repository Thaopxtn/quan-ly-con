@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Dang yeu cau quyen Administrator...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

echo ====================================================
echo   DANG XU LY GO BO DRIVER LOI EW_USBCCGPFILTER (NOVA 3I)
echo ====================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fix-huawei-driver.ps1"

pause
