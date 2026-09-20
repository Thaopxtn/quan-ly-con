@echo off
chcp 65001 >nul
title Quản Lý Con - Máy Chủ & Đường Truyền 4G Tự Động
cd /d "%~dp0"

echo [KHỞI ĐỘNG] Đang chuẩn bị môi trường chạy...
node start-all.cjs
pause
