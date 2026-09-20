@echo off
chcp 65001 >nul
title Cài Đặt Máy Chủ Chạy Ngầm 24/7 (Windows Service)

echo ================================================================
echo        ⚡ CÀI ĐẶT MÁY CHỦ QUẢN LÝ CON CHẠY TỰ ĐỘNG 24/7
echo   Tự động chạy ngầm khi bật máy tính - Không cần mở cửa sổ đen
echo ================================================================
echo.

echo [1/4] Kiểm tra PM2...
call npm install -g pm2 pm2-windows-startup

echo.
echo [2/4] Khởi động tiến trình máy chủ trong nền...
call pm2 delete quan-ly-con-server >nul 2>&1
call pm2 start server.cjs --name "quan-ly-con-server"

echo.
echo [3/4] Cài đặt tự khởi động cùng Windows...
call pm2-startup install

echo.
echo [4/4] Lưu trạng thái tiến trình...
call pm2 save

echo.
echo ================================================================
echo ✅ CÀI ĐẶT THÀNH CÔNG!
echo Máy chủ Quản Lý Con đã được đăng ký chạy ngầm cùng Windows.
echo Mỗi khi mở máy tính, server sẽ tự động chạy tại http://localhost:3000
echo.
echo Các lệnh quản lý nhanh:
echo   - Xem trạng thái: pm2 list
echo   - Xem nhật ký:    pm2 logs
echo   - Khởi động lại:  pm2 restart quan-ly-con-server
echo   - Tạm dừng:       pm2 stop quan-ly-con-server
echo ================================================================
pause
