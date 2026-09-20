@echo off
chcp 65001 >nul
title Máy Chủ Quản Lý Con (ParentPro & KidCare)

echo ================================================================
echo      🏠 MÁY CHỦ QUẢN LÝ CON - KHỞI ĐỘNG TRÊN PC CÁ NHÂN
echo ================================================================
echo.

if not exist "dist-parent" (
    echo [CẢNH BÁO] Chưa tìm thấy thư mục bản build dist-parent!
    echo Đang tự động build dự án lần đầu, vui lòng đợi...
    call npm run build:all
)

echo [INFO] Đang khởi động máy chủ tại cổng 3000...
echo [INFO] Nhấn Ctrl + C để dừng máy chủ bất cứ lúc nào.
echo.

node server.cjs
pause
