@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================================
echo   CAU HINH TU DONG CHAY MAY CHU PARENTPRO KHI BAT MAY TINH (WINDOWS STARTUP)
echo ==============================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-autostart.ps1" -Action install
echo.
echo ==============================================================================
echo   HOAN TAT THIET LAP TU DONG KHOI DONG!
echo ==============================================================================
echo - Moi khi mo may tinh, may chu se tu dong chay ngam 100%%.
echo - Dien thoai Cha Me va Con Cai luon luon ket noi duoc 24/7.
echo - Mo bieu tuong 'ParentPro Server Manager' tren Desktop de xem giao dien.
echo.
pause
