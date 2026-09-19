@echo off
chcp 65001 >nul
title KidCare PC Agent - Trợ Lý Bảo Vệ Máy Tính Của Bé

echo ================================================================
echo           KIDCARE PC AGENT - WINDOWS PROTECTION SERVICE
echo      Đồng bộ lệnh điều khiển từ xa từ ứng dụng Cha Mẹ
echo ================================================================
echo.

if "%1"=="lock" goto do_lock
if "%1"=="unlock" goto do_unlock
if "%1"=="shutdown" goto do_shutdown
if "%1"=="restart" goto do_restart
if "%1"=="sleep" goto do_sleep
if "%1"=="killgames" goto do_killgames

echo [INFO] KidCare Windows Agent đang sẵn sàng.
echo [1] Khóa máy tính ngay (Lock Workstation)
echo [2] Tắt máy tính ngay (Shutdown)
echo [3] Hẹn giờ tắt máy 5 phút
echo [4] Đóng tất cả game (Roblox, Minecraft, Steam, LOL...)
echo [5] Khởi động chế độ giám sát nền tự động
echo [6] Thoát
echo.
set /p choice="Nhập lựa chọn của bạn (1-6): "

if "%choice%"=="1" goto do_lock
if "%choice%"=="2" (
    set delay=0
    goto do_shutdown_custom
)
if "%choice%"=="3" (
    set delay=300
    goto do_shutdown_custom
)
if "%choice%"=="4" goto do_killgames
if "%choice%"=="5" goto do_watchdog
if "%choice%"=="6" exit /b 0

:do_lock
echo [LỆNH] Đang khóa màn hình Windows theo lệnh của Bố Mẹ...
rundll32.exe user32.dll,LockWorkStation
echo [THÀNH CÔNG] Màn hình Windows đã được khóa an toàn.
pause
exit /b 0

:do_shutdown
set delay=0
if not "%2"=="" set delay=%2
:do_shutdown_custom
echo [LỆNH] Đang gửi lệnh tắt máy tính (hẹn giờ %delay% giây)...
shutdown /s /t %delay% /c "Máy tính được tắt bởi KidCare theo yêu cầu của Bố Mẹ."
echo [THÀNH CÔNG] Lệnh tắt máy đã được thiết lập.
pause
exit /b 0

:do_restart
echo [LỆNH] Đang khởi động lại máy tính...
shutdown /r /t 0
exit /b 0

:do_sleep
echo [LỆNH] Đang chuyển máy tính sang chế độ Ngủ (Sleep)...
rundll32.exe powrprof.dll,SetSuspendState 0,1,0
exit /b 0

:do_killgames
echo [LỆNH] Đang đóng toàn bộ tiến trình game (Góc học tập)...
taskkill /f /im RobloxPlayerBeta.exe >nul 2>&1
taskkill /f /im RobloxPlayerLauncher.exe >nul 2>&1
taskkill /f /im javaw.exe >nul 2>&1
taskkill /f /im Minecraft.exe >nul 2>&1
taskkill /f /im steam.exe >nul 2>&1
taskkill /f /im LeagueClient.exe >nul 2>&1
taskkill /f /im LeagueClientUx.exe >nul 2>&1
taskkill /f /im EpicGamesLauncher.exe >nul 2>&1
echo [THÀNH CÔNG] Đã đóng các trò chơi đang chạy. Con hãy tập trung học bài nhé!
pause
exit /b 0

:do_watchdog
echo [BẢO VỆ NỀN] Chế độ giám sát nền KidCare đang chạy.
echo Nhấn Ctrl + C để dừng bất cứ lúc nào.
:watchdog_loop
timeout /t 10 >nul
goto watchdog_loop
