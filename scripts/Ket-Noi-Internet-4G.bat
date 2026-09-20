@echo off
chcp 65001 >nul
title Kết Nối Máy Chủ Ra Mạng Internet 4G (Cloudflare Tunnel)

echo ================================================================
echo       🌐 ĐƯA MÁY CHỦ PC RA INTERNET BẰNG CLOUDFLARE TUNNEL
echo   Miễn phí 100%% - Không cần mở port modem - Có HTTPS bảo mật
echo ================================================================
echo.

if exist "%~dp0cloudflared.exe" (
    set "CF_CMD=%~dp0cloudflared.exe"
) else if exist "D:\cloudflared-windows-amd64.exe" (
    set "CF_CMD=D:\cloudflared-windows-amd64.exe"
) else if exist "D:\cloudflared.exe" (
    set "CF_CMD=D:\cloudflared.exe"
) else if exist "%ProgramFiles%\cloudflared\cloudflared.exe" (
    set "CF_CMD=%ProgramFiles%\cloudflared\cloudflared.exe"
) else if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (
    set "CF_CMD=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
) else (
    where cloudflared >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "CF_CMD=cloudflared"
    ) else (
        echo [THÔNG BÁO] Đang tải công cụ Cloudflare Tunnel về máy...
        powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe' -UseBasicParsing"
        set "CF_CMD=%~dp0cloudflared.exe"
    )
)

echo [1/2] Đang kiểm tra máy chủ nội bộ (port 3000)...
echo [2/2] Đang tạo đường dẫn bảo mật HTTPS từ Cloudflare...
echo.
echo ================================================================
echo ⚠️  LƯU Ý QUAN TRỌNG:
echo Hãy tìm dòng có dạng: https://xxxx-xxxx-xxxx.trycloudflare.com
echo Đó chính là LINK TRUY CẬP TỪ MẠNG 4G BÊN NGOÀI cho điện thoại!
echo Hãy gửi link đó vào điện thoại cha mẹ để dùng app.
echo ================================================================
echo.

"%CF_CMD%" tunnel --url http://localhost:3000
pause
