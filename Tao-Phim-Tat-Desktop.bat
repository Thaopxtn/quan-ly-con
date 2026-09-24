@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================================
echo       TAO PHIM TAT PHAN MEM TRUNG TAM MAY CHU PARENTPRO TREN DESKTOP
echo ==============================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-autostart.ps1" -Action shortcut_only
echo.
echo [HOAN TAT] Ban co the mo 'ParentPro Server Manager' ngay tren man hinh Desktop!
timeout /t 4 >nul
