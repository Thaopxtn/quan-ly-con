@echo off
chcp 65001 >nul
title Cai Dat May Chu Chay Ngam
cd /d "%~dp0"

echo ================================================================
echo        CAI DAT MAY CHU QUAN LY CON CHAY TU DONG 24/7
echo ================================================================
echo.

echo [1/4] Kiem tra PM2...
call npm install -g pm2 pm2-windows-startup

echo.
echo [2/4] Khoi dong tien trinh may chu...
call pm2 delete quan-ly-con-server >nul 2>&1
call pm2 start server.cjs --name "quan-ly-con-server"

echo.
echo [3/4] Cai dat tu khoi dong cung Windows...
call pm2-startup install

echo.
echo [4/4] Luu trang thai tien trinh...
call pm2 save

echo.
echo ================================================================
echo CAI DAT THANH CONG! May chu da duoc dang ky chay ngam.
echo ================================================================
pause
